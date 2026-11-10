import type { Metadata } from "next";
import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { OrganizerAudience } from "@/components/organizer/workspace-sections";
import { loadOrganizerEvents } from "@/lib/organizer-dashboard";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Audience" };

export default async function AudiencePage() {
  const access = await requireAccount("organizer");
  if ("unavailable" in access) return <WorkspaceUnavailable type="organizer" />;
  const events = await loadOrganizerEvents();
  const total =
    events?.reduce((sum, event) => sum + event.registrations, 0) ?? null;
  return (
    <WorkspaceShell type="organizer" organizerAccount={access.account}>
      <section className="organizer-section-heading">
        <h1>Audience</h1>
        <p>
          People who register for your events, brought together in your
          workspace.
        </p>
      </section>
      <OrganizerAudience registrationTotal={total} />
    </WorkspaceShell>
  );
}
