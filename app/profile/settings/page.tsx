import type { Metadata } from "next";

import { requireAttendee } from "../guard";
import { PrivacySettings } from "./privacy-settings";

export const metadata: Metadata = { title: "Privacy settings" };

export default async function SettingsPage() {
  const g = await requireAttendee();
  if ("blocked" in g) return g.blocked;
  return <PrivacySettings />;
}
