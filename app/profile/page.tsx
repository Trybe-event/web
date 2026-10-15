import type { Metadata } from "next";

import { requireAttendee } from "./guard";
import { ProfileHome } from "./profile-home";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const g = await requireAttendee();
  if ("blocked" in g) return g.blocked;
  return <ProfileHome />;
}
