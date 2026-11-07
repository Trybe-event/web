import type { Metadata } from "next";

import { UnavailableNotice } from "@/components/auth/workspace";
import { getPublicEvent } from "@/lib/events";
import { EVENT_PARAM, parseEventParam } from "@/lib/routes";
import { requireAccount } from "@/lib/session";

import { ProfilePreview } from "./profile-preview";

export const metadata: Metadata = { title: "Preview your profile" };

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const g = await requireAccount("attendee");
  if ("unavailable" in g) return <UnavailableNotice href="/attendee/profile" />;
  const query = await searchParams;
  const onboarding = query.onboarding === "1";
  const eventSlug = parseEventParam(query[EVENT_PARAM]);
  // Onboarding from an event link names the event in the review and confirm step
  // (web#7). An unavailable event never substitutes its code as a display name.
  const event = eventSlug ? await getPublicEvent(eventSlug) : null;
  const eventName =
    event?.kind === "found"
      ? event.event.name.split(/[:|]/, 1)[0]?.trim()
      : undefined;
  return (
    <ProfilePreview
      onboarding={onboarding}
      eventSlug={eventSlug}
      eventName={eventName}
    />
  );
}
