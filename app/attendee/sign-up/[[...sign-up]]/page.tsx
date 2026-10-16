import type { Metadata } from "next";

import { AuthPage } from "@/components/auth/auth-page";
import { EVENT_PARAM, parseEventParam } from "@/lib/routes";

export const metadata: Metadata = { title: "Attendee sign up" };

// Clerk owns the sub-paths under this catch-all, so the event being joined arrives
// as ?event=<slug> and is passed on to Clerk's redirect for the rest of the flow.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const eventSlug = parseEventParam((await searchParams)[EVENT_PARAM]);
  return <AuthPage type="attendee" mode="sign-up" eventSlug={eventSlug} />;
}
