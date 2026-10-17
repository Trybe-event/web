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

export type Profile = components["schemas"]["Profile"];

// The review a returning attendee sees before they confirm (web#8): the profile
// exactly as event members will receive it, plus whether they are already in.
export type JoinPreview = { asEventMember: Profile; alreadyMember: boolean };

// JoinPreviewResult separates the reasons a preview is unavailable, because each one
// is a different screen: a missing profile is an invitation to create one, a non-
// attendee session must not reach the flow at all (web#8).
export type JoinPreviewResult =
  | { kind: "review"; preview: JoinPreview }
  | { kind: "needs_profile" }
  | { kind: "not_attendee" }
  | { kind: "unavailable" };

// A landing page distinguishes "no such event" from "the API is down", because the
// first is a 404 and the second is not.
export type PublicEventResult =
  | { kind: "found"; event: PublicEvent }
  | { kind: "not_found" }
  | { kind: "unavailable" };

// A failed read must not claim the attendee has no events.
export async function loadMyEvents(): Promise<EventOption[] | null> {
  try {
    const api = await serverApi();
    const { data } = await api.GET("/me/events", {
      signal: AbortSignal.timeout(8000),
    });
    if (!data) return null;
    return data.items
      .filter((item) => item.membership.status === "active" && item.event.slug)
      .map((item) => ({ slug: item.event.slug, name: item.event.name }));
  } catch {
    return null;
  }
}

export async function listMyEvents(): Promise<EventOption[]> {
  return (await loadMyEvents()) ?? [];
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

// hasEventMembership answers from the membership list (GET /me/events), not from the
// profile preview, so an attendee who joined before creating a profile still reaches
// their workspace. An unreachable API reads as false: the caller then offers the join,
// which is idempotent and cannot double-register.
export async function hasEventMembership(slug: string): Promise<boolean> {
  const memberships = await listMyEvents();
  return memberships.some((event) => event.slug === slug);
}

// getJoinPreview loads what an event member would see of the caller's saved profile
// (GET /e/{slug}/join-preview). It only reads: nothing here can create a membership,
// which is what keeps simply opening an event link from registering anyone (web#8).
export async function getJoinPreview(slug: string): Promise<JoinPreviewResult> {
  try {
    const api = await serverApi();
    const { data, response } = await api.GET("/e/{slug}/join-preview", {
      params: { path: { slug } },
      signal: AbortSignal.timeout(8000),
    });
    if (data)
      return {
        kind: "review",
        preview: {
          asEventMember: data.as_event_member,
          alreadyMember: data.already_member,
        },
      };
    if (response.status === 404) return { kind: "needs_profile" };
    if (response.status === 401 || response.status === 403)
      return { kind: "not_attendee" };
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}
