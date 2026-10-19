// Pure rules for the connections page (web#14). JSX-free so node --test can
// enforce them: which list an action touches, how the lists reconcile with the
// server's answer, and which profile fields a card may show.
//
// The server owns the outcome. Accepting a request returns the final request,
// not a connection, so an accepted row becomes a connection only through
// GET /me/connections — the page never builds one itself.

import type { components } from "@/lib/api/schema";

export type ConnectionRequest = components["schemas"]["ConnectionRequest"];
export type Connection = components["schemas"]["Connection"];
export type Profile = components["schemas"]["Profile"];
export type ConnectionAction = "accept" | "reject" | "cancel";
/** The two request lists, as the contract's `direction` query names them. */
export type RequestList = "incoming" | "outgoing";
export type Tab = RequestList | "connected";

/**
 * The list an action changes. Rejecting answers a request someone sent you, so
 * it belongs to incoming; cancelling withdraws your own, so outgoing.
 */
export function actionList(action: ConnectionAction): RequestList {
  return action === "cancel" ? "outgoing" : "incoming";
}

export function actionLabel(action: ConnectionAction): string {
  if (action === "accept") return "Accept";
  if (action === "reject") return "Reject";
  return "Cancel request";
}

/** What a finished action announces, in the actor's words. */
export function actionSuccessMessage(
  action: ConnectionAction,
  name: string,
): string {
  if (action === "accept") return `You're connected with ${name}.`;
  if (action === "reject") return `You declined ${name}'s request.`;
  return `Your request to ${name} was withdrawn.`;
}

/**
 * The lists to refetch after a server-accepted action. An acceptance only
 * becomes a connection through GET /me/connections, so it always refreshes that
 * list rather than inventing an entry from the request id.
 */
export function refetchAfter(
  action: ConnectionAction,
): readonly ("requests" | "connections")[] {
  return action === "accept" ? ["requests", "connections"] : ["requests"];
}

/** Only a pending request can be acted on; the API may return decided ones. */
export function pendingOnly(
  items: readonly ConnectionRequest[],
): ConnectionRequest[] {
  return items.filter((item) => item.status === "pending");
}

const newestFirst = (left: string, right: string) => right.localeCompare(left);

/** Newest request first, with the id keeping the order stable on a tie. */
export function orderedRequests(
  items: readonly ConnectionRequest[],
): ConnectionRequest[] {
  return [...items].sort(
    (a, b) =>
      newestFirst(a.created_at, b.created_at) || newestFirst(a.id, b.id),
  );
}

export function orderedConnections(items: readonly Connection[]): Connection[] {
  return [...items].sort(
    (a, b) =>
      newestFirst(a.connected_at, b.connected_at) || newestFirst(a.id, b.id),
  );
}

export function indexOfId(
  items: readonly { id: string }[],
  id: string,
): number {
  return items.findIndex((item) => item.id === id);
}

export function removeById<T extends { id: string }>(
  items: readonly T[],
  id: string,
): T[] {
  return items.filter((item) => item.id !== id);
}

/**
 * Puts a removed row back where it was, so a failed action leaves the list
 * looking exactly as it did before the optimistic removal.
 */
export function insertAt<T>(items: readonly T[], index: number, item: T): T[] {
  const at = Math.max(
    0,
    Math.min(index < 0 ? items.length : index, items.length),
  );
  return [...items.slice(0, at), item, ...items.slice(at)];
}

/**
 * A conflict means the request moved on while it was on screen: the page shows
 * the server's final state instead of guessing. openapi-fetch reports it either
 * as the response status or as the contract's `conflict` code.
 */
export function conflict(
  error: { code?: string } | null | undefined,
  status?: number,
): boolean {
  return status === 409 || error?.code === "conflict";
}

/**
 * A request that never reached the server, or one the server failed to handle,
 * can be tried again with the same action. A 403, 404 or 409 cannot: the state
 * or the permission already moved on, and repeating it would be a no-op.
 */
export function retryable(status?: number): boolean {
  return status === undefined || status >= 500;
}

export const CONFLICT_NOTICE =
  "Someone else already answered this request. Showing the latest state.";

/** The message a failed action shows, preferring the API's own words. */
export function actionFailureMessage(
  action: ConnectionAction,
  error: { code?: string; message?: string } | null | undefined,
  status?: number,
): string {
  if (error?.message) return error.message;
  if (conflict(error, status)) return CONFLICT_NOTICE;
  return `${actionLabel(action)} didn't go through. Try again.`;
}

export const TAB_LABELS: Record<Tab, string> = {
  incoming: "Incoming",
  outgoing: "Outgoing",
  connected: "Connected",
};

export const TAB_ORDER: readonly Tab[] = ["incoming", "outgoing", "connected"];

export const TAB_EMPTY: Record<Tab, { title: string; body: string }> = {
  incoming: {
    title: "No pending requests",
    body: "When someone at your events asks to connect, their request appears here.",
  },
  outgoing: {
    title: "No outgoing requests",
    body: "Requests you send to people at your events appear here until they answer.",
  },
  connected: {
    title: "No connections yet",
    body: "Accept a request, or send one of your own, and the connection appears here.",
  },
};

export function tabLabel(tab: Tab, count: number): string {
  return `${TAB_LABELS[tab]} (${count})`;
}

export const tabId = (tab: Tab) => `connections-tab-${tab}`;
export const tabPanelId = (tab: Tab) => `connections-panel-${tab}`;

/**
 * The profile fields a connection card may show. Nothing else the API returns is
 * rendered, so a wider profile view can never leak into the markup.
 */
export type SharedProfileFields = {
  attendee_id: string;
  full_name: string;
  role?: string;
  organization?: string;
  photo_url?: string;
};

export function sharedProfile(profile: Profile): SharedProfileFields {
  return {
    attendee_id: profile.attendee_id,
    full_name: profile.full_name,
    ...(profile.role ? { role: profile.role } : {}),
    ...(profile.organization ? { organization: profile.organization } : {}),
    ...(profile.photo_url ? { photo_url: profile.photo_url } : {}),
  };
}

/** "Role · Organization", or whichever of the two the profile carries. */
export function subtitleOf(fields: SharedProfileFields): string | null {
  const parts = [fields.role, fields.organization].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * The profile view for a connection, when its origin event resolves to a slug.
 * Without one the card renders no link rather than a broken path.
 */
export function profileHref(
  eventSlug: string | undefined,
  attendeeId: string,
): string | null {
  if (!eventSlug) return null;
  return `/events/${encodeURIComponent(eventSlug)}/attendees/${encodeURIComponent(attendeeId)}`;
}

/** The event id → slug map the profile link needs, from GET /me/events. */
export function eventSlugs(
  memberships: readonly { event: { id: string; slug: string } }[],
): Map<string, string> {
  return new Map(memberships.map((item) => [item.event.id, item.event.slug]));
}

/** "Asked 16 Oct 2026", so a pending request carries the date it arrived. */
export function requestedLabel(askedAt: string): string {
  const at = new Date(askedAt);
  if (Number.isNaN(at.getTime())) return "";
  return `Asked ${at.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

export function connectedLabel(connectedAt: string): string {
  const at = new Date(connectedAt);
  if (Number.isNaN(at.getTime())) return "";
  return `Connected ${at.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}
