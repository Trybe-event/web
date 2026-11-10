import type { Metadata } from "next";
import { Suspense } from "react";

import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import {
  DashboardLoading,
  OrganizerDashboard,
} from "@/components/organizer/dashboard";
import { ButtonLink } from "@/components/ui";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Organizer workspace" };

export default async function OrganizerHome() {
  const accountAccess = await requireAccount("organizer");
  if ("unavailable" in accountAccess)
    return <WorkspaceUnavailable type="organizer" />;
  return (
    <WorkspaceShell type="organizer" organizerAccount={accountAccess.account}>
      <section className="organizer-section-heading organizer-events-heading">
        <div>
          <h1>My events</h1>
          <p>Create your next gathering and keep your community connected.</p>
        </div>
        <div className="organizer-event-actions">
          <ButtonLink variant="secondary" href="/organizer/experiences/new">
            Create experience
          </ButtonLink>
          <ButtonLink href="/organizer/events/new">Create event</ButtonLink>
        </div>
      </section>
      <Suspense fallback={<DashboardLoading />}>
        <OrganizerDashboard />
      </Suspense>
    </WorkspaceShell>
  );
}
