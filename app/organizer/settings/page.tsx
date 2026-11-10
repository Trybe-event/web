import type { Metadata } from "next";
import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { OrganizerSettings } from "@/components/organizer/workspace-sections";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Workspace settings" };

export default async function SettingsPage() {
  const access = await requireAccount("organizer");
  if ("unavailable" in access) return <WorkspaceUnavailable type="organizer" />;
  return (
    <WorkspaceShell type="organizer" organizerAccount={access.account}>
      <section className="organizer-section-heading">
        <h1>Settings</h1>
        <p>
          Manage your business, team, communications, account access and
          payouts.
        </p>
      </section>
      <OrganizerSettings
        organization={access.account.organization ?? ""}
        ownerName={access.account.full_name}
      />
    </WorkspaceShell>
  );
}
