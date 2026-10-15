<<<<<<< Updated upstream
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/attendee/profile/preview");
=======
import type { Metadata } from "next";

import { UnavailableNotice } from "@/components/auth/workspace";
import { requireAccount } from "@/lib/session";
import { ProfilePreview } from "./profile-preview";

export const metadata: Metadata = { title: "Preview your profile" };

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const g = await requireAccount("attendee");
  if ("unavailable" in g) return <UnavailableNotice href="/attendee/profile" />;
  const onboarding = (await searchParams).onboarding === "1";
  return <ProfilePreview onboarding={onboarding} />;
>>>>>>> Stashed changes
}
