// Chat socket transport for web#19. The browser can't put the Clerk session on
// a WebSocket and the /api proxy can't carry an upgrade, so the socket opens on
// the API directly with a single-use ticket from POST /ws/tickets (contract
// §/ws). Everything protocol-shaped lives here so the rest of the thread only
// sees messages.
//
// Frame shapes follow the API's docs/messaging.md (api#21). If the protocol
// changes, this module is the only place that does.

import type { components } from "@/lib/api/schema";

export type SocketMessage = components["schemas"]["Message"];

export type ClientFrame =
  { type: "subscribe"; conversation_id: string } | { type: "ping" };

export type ServerFrame =
  | { type: "message"; message: SocketMessage }
  | { type: "unsubscribed"; conversation_id: string; reason: string }
  | { type: "error"; code: string; conversation_id?: string; reason?: string };

/** The API's idle sockets stay open only while the client pings (25 s). */
export const PING_INTERVAL_MS = 25_000;

export function subscribeFrame(conversationId: string): ClientFrame {
  return { type: "subscribe", conversation_id: conversationId };
}

export function pingFrame(): ClientFrame {
  return { type: "ping" };
}

/**
 * Whether a frame means this viewer can no longer use the conversation: a
 * block or disconnect (`unsubscribed` with reason `forbidden`) or a rejected
 * subscription. Rate limits and invalid frames are not access changes.
 */
export function endsAccess(
  frame: ServerFrame,
  conversationId: string,
): boolean {
  if (frame.type === "unsubscribed")
    return (
      frame.reason === "forbidden" && frame.conversation_id === conversationId
    );
  if (frame.type === "error")
    return (
      (frame.code === "forbidden" || frame.code === "not_found") &&
      (frame.conversation_id === undefined ||
        frame.conversation_id === conversationId)
    );
  return false;
}

/**
 * Public origin of the API for the socket upgrade (`NEXT_PUBLIC_API_URL`). It is
 * separate from the server-only `API_INTERNAL_URL` because the browser connects
 * to it directly. Null means live updates are off and the thread polls instead.
 */
export function socketOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  return configured ? configured : null;
}

/**
 * ws(s)://<api>/ws?ticket=... for the one-time ticket. The ticket is a secret
 * until it is used, so it is encoded rather than interpolated. Null for an
 * origin the browser can't upgrade.
 */
export function chatSocketUrl(origin: string, ticket: string): string | null {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/ws`;
  url.search = new URLSearchParams({ ticket }).toString();
  url.hash = "";
  return url.toString();
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function isMessage(value: unknown): value is SocketMessage {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.conversation_id === "string" &&
    typeof value.sender_id === "string" &&
    typeof value.body === "string" &&
    typeof value.created_at === "string"
  );
}

/** A frame worth acting on, or null for anything malformed or unknown. */
export function parseServerFrame(raw: unknown): ServerFrame | null {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isRecord(value)) return null;
  if (value.type === "message" && isMessage(value.message))
    return { type: "message", message: value.message };
  if (
    value.type === "unsubscribed" &&
    typeof value.conversation_id === "string" &&
    typeof value.reason === "string"
  )
    return {
      type: "unsubscribed",
      conversation_id: value.conversation_id,
      reason: value.reason,
    };
  if (value.type === "error" && typeof value.code === "string") {
    const frame: ServerFrame = { type: "error", code: value.code };
    if (typeof value.conversation_id === "string")
      frame.conversation_id = value.conversation_id;
    if (typeof value.reason === "string") frame.reason = value.reason;
    return frame;
  }
  return null;
}

/** Exponential backoff, capped so a long outage doesn't retry once an hour. */
export function reconnectDelay(attempt: number): number {
  const step = Math.min(Math.max(0, Math.trunc(attempt)), 4);
  return Math.min(1000 * 2 ** step, 15_000);
}

/**
 * A normal close or a policy close is not retried: the API closes with 1008
 * when the account is no longer active or the client keeps exceeding the rate
 * limit, and reconnecting would only repeat it. The user sees why messaging is
 * unavailable instead.
 */
export function shouldReconnect(closeCode: number): boolean {
  return closeCode !== 1000 && closeCode !== 1008;
}
