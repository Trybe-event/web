import type { Metadata } from "next";

import { UnavailableNotice } from "@/components/auth/workspace";
import { requireAccount } from "@/lib/session";
import { PrivacySettings } from "./privacy-settings";

export const metadata: Metadata = { title: "Privacy settings" };

export default async function SettingsPage() {
  const g = await requireAccount("attendee");
  if ("unavailable" in g) return <UnavailableNotice href="/attendee/profile" />;
  return <PrivacySettings />;
}
