import type { Metadata } from "next";

import { requireAttendee } from "../guard";
import { ProfilePreview } from "./profile-preview";

export const metadata: Metadata = { title: "Preview your profile" };

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const g = await requireAttendee();
  if ("blocked" in g) return g.blocked;
  const onboarding = (await searchParams).onboarding === "1";
  return <ProfilePreview onboarding={onboarding} />;
}
