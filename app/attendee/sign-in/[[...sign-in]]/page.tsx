import type { Metadata } from "next";

import { AuthPage } from "@/components/auth/auth-page";
import { EVENT_PARAM, parseEventParam } from "@/lib/routes";

export const metadata: Metadata = { title: "Attendee sign in" };

// A returning attendee signing in from an event page arrives with ?event=<slug>,
// which sends them back to that event instead of their workspace home.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const eventSlug = parseEventParam((await searchParams)[EVENT_PARAM]);
  return <AuthPage type="attendee" mode="sign-in" eventSlug={eventSlug} />;
}
