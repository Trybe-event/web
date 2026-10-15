<<<<<<< Updated upstream
import { redirect } from "next/navigation";

// Legacy entry from the marketing site and PRD route list.
export default function Page() {
  redirect("/attendee");
=======
import type { Metadata } from "next";

import { UnavailableNotice } from "@/components/auth/workspace";
import { requireAccount } from "@/lib/session";
import { ProfileHome } from "./profile-home";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const g = await requireAccount("attendee");
  if ("unavailable" in g) return <UnavailableNotice href="/attendee/profile" />;
  return <ProfileHome />;
>>>>>>> Stashed changes
}
