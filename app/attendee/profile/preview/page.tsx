import type { Metadata } from "next";

import { UnavailableNotice } from "@/components/auth/workspace";
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
  return <ProfilePreview onboarding={onboarding} eventSlug={eventSlug} />;
}
