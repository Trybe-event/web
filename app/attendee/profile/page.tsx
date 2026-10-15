import type { Metadata } from "next";

import { UnavailableNotice } from "@/components/auth/workspace";
import { requireAccount } from "@/lib/session";
import { ProfileHome } from "./profile-home";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const g = await requireAccount("attendee");
  if ("unavailable" in g) return <UnavailableNotice href="/attendee/profile" />;
  return <ProfileHome />;
}
