// Attendee event helpers shared by the workspace pages, the event switcher and the
// public event landing page. Authentication and account permissions always come from
// the real API; development simulation lives in mocks/.
import "server-only";

import type { components } from "./api/schema";
import { serverApi } from "./api/server";

// EventOption is what the switcher and workspace routes need: the slug the
// /events/{slug} route uses, plus the name shown to the attendee.
export type EventOption = { slug: string; name: string };

export type PublicEvent = components["schemas"]["PublicEvent"];

// A landing page distinguishes "no such event" from "the API is down", because the
// first is a 404 and the second is not.
export type PublicEventResult =
  | { kind: "found"; event: PublicEvent }
  | { kind: "not_found" }
  | { kind: "unavailable" };

// listMyEvents returns the caller's active memberships (GET /me/events), which the
// contract documents as the source for the event switcher. It never throws: a missing
// or unreachable API yields an empty list, and the page still renders.
export async function listMyEvents(): Promise<EventOption[]> {
  try {
    const api = await serverApi();
    const { data } = await api.GET("/me/events", {
      signal: AbortSignal.timeout(8000),
    });
    if (!data) return [];
    return data.items
      .filter((item) => item.membership.status === "active" && item.event.slug)
      .map((item) => ({ slug: item.event.slug, name: item.event.name }));
  } catch {
    return [];
  }
}

// getPublicEvent returns the landing data for a published event. Drafts and unknown
// slugs return the same 404 from the API, so both are "not_found".
export async function getPublicEvent(slug: string): Promise<PublicEventResult> {
  try {
    const api = await serverApi();
    const { data, response } = await api.GET("/e/{slug}", {
      params: { path: { slug } },
      signal: AbortSignal.timeout(8000),
    });
    if (data) return { kind: "found", event: data };
    return response.status === 404
      ? { kind: "not_found" }
      : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

// isEventMember reports whether the caller already belongs to the event, so the
// landing page can offer the workspace instead of the join button. null means the API
// couldn't say; joining is idempotent, so callers may still offer it.
export async function isEventMember(slug: string): Promise<boolean | null> {
  try {
    const api = await serverApi();
    const { data } = await api.GET("/e/{slug}/join-preview", {
      params: { path: { slug } },
      signal: AbortSignal.timeout(8000),
    });
    return data ? data.already_member : null;
  } catch {
    return null;
  }
}
