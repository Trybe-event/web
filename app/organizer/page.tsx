import type { Metadata } from "next";

import {
  WorkspaceHome,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Organizer workspace" };

// Organizer home. The events dashboard replaces the placeholder card in web#1 (M2).
export default async function OrganizerHome() {
  const g = await requireAccount("organizer");
  if ("unavailable" in g) return <WorkspaceUnavailable type="organizer" />;
  const firstName = g.account.full_name.split(" ")[0] ?? "there";
  return (
    <WorkspaceHome
      type="organizer"
      firstName={firstName}
      card={{
        title: "The next room is yours to create.",
        body: "Event creation and your registration dashboard arrive next. Your organizer account is ready.",
        cta: "Account foundation ready",
      }}
      privacy={{
        body: `This account manages events for ${g.account.organization ?? "your organization"}. It stays separate from attendee accounts.`,
        status: "Organizer account confirmed",
      }}
    />
  );
}
