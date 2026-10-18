// Chat socket transport for web#19. The browser can't put the Clerk session on
// a WebSocket and the /api proxy can't carry an upgrade, so the socket opens on
// the API directly with a single-use ticket from POST /ws/tickets (contract
// §/ws). Everything protocol-shaped lives here so the rest of the thread only
// sees messages.
//
// TODO(api#21): the contract says frames are JSON and points at
// docs/messaging.md, which api#21 hasn't published yet. The `subscribe`,
// `message` and `error` shapes below are provisional; when that document lands,
// this module is the only place that changes.

import type { components } from "@/lib/api/schema";

export type SocketMessage = components["schemas"]["Message"];

export type ClientFrame = { type: "subscribe"; conversation_id: string };

export type ServerFrame =
  | { type: "message"; message: SocketMessage }
  | { type: "error"; code: string; message: string };

export function subscribeFrame(conversationId: string): ClientFrame {
  return { type: "subscribe", conversation_id: conversationId };
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
    value.type === "error" &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  )
    return { type: "error", code: value.code, message: value.message };
  return null;
}

/** Exponential backoff, capped so a long outage doesn't retry once an hour. */
export function reconnectDelay(attempt: number): number {
  const step = Math.min(Math.max(0, Math.trunc(attempt)), 4);
  return Math.min(1000 * 2 ** step, 15_000);
}

/**
 * A normal close or a rejected session is not retried with the same ticket
 * flow; the user sees why messaging is unavailable instead.
 */
export function shouldReconnect(closeCode: number): boolean {
  return closeCode !== 1000 && closeCode !== 4401 && closeCode !== 4403;
}
