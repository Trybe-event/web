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
import { ButtonLink, Card } from "@/components/ui";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Organizer workspace" };

export default async function OrganizerHome() {
  const accountAccess = await requireAccount("organizer");
  if ("unavailable" in accountAccess)
    return <WorkspaceUnavailable type="organizer" />;
  const firstName = accountAccess.account.full_name.split(" ")[0] ?? "there";
  return (
    <WorkspaceShell type="organizer">
      <section className="workspace-welcome">
        <span className="eyebrow">MAKE ROOM FOR CONNECTION</span>
        <h1>
          Welcome, {firstName}
          <span className="accent-period">.</span>
        </h1>
        <p>
          Your events, your community. Keep track of the people signing up and
          bring your next gathering to life.
        </p>
        <ButtonLink href="/organizer/events/new" className="mt-5">
          Create event
        </ButtonLink>
      </section>
      <Card className="border-lime bg-lime/10 text-sm">
        <strong>Free demo access.</strong> Create and manage events at no cost
        during this stage.
      </Card>
      <Suspense fallback={<DashboardLoading />}>
        <OrganizerDashboard />
      </Suspense>
    </WorkspaceShell>
  );
}
