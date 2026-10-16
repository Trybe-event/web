import type { Metadata } from "next";

import { CompletePage } from "@/components/auth/complete-page";
import { EVENT_PARAM, parseEventParam } from "@/lib/routes";

export const metadata: Metadata = { title: "Finish your account" };

// The event being joined survives Clerk's redirect as ?event=<slug>, so the last
// step of the account flow can hand it on to profile onboarding (web#7).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const eventSlug = parseEventParam((await searchParams)[EVENT_PARAM]);
  return <CompletePage type="attendee" eventSlug={eventSlug} />;
}
