import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Users } from "lucide-react";

import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { LeaveEvent } from "@/components/events/leave-event";
import { listMyEvents } from "@/lib/events";
import { isEventSlug, routes } from "@/lib/routes";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Event workspace" };

// Attendee event workspace (web#11). The slug must be one of the caller's active
// memberships from GET /me/events, so a non-member never sees the workspace.
export default async function EventWorkspace({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isEventSlug(slug)) notFound();

  const g = await requireAccount("attendee");
  if ("unavailable" in g) return <WorkspaceUnavailable type="attendee" />;

  const events = await listMyEvents();
  const current = events.find((event) => event.slug === slug);
  if (!current) notFound();

  return (
    <WorkspaceShell type="attendee" events={events} activeSlug={slug}>
      <section className="workspace-welcome">
        <span className="eyebrow">YOUR EVENT</span>
        <h1>
          {current.name}
          <span className="accent-period">.</span>
        </h1>
        <p>
          Welcome back, {g.account.full_name.split(" ")[0] ?? "there"}. Use the
          switcher above to move between the events you belong to.
        </p>
      </section>
      <section className="workspace-grid">
        <div className="workspace-empty">
          <div className="empty-icon">
            <Users size={30} />
          </div>
          <span className="eyebrow">WHO IS HERE</span>
          <h2>Matches and the attendee directory arrive next.</h2>
          <p>
            Once discovery is on, this is where you will see who else is at{" "}
            {current.name} and who you should meet.
          </p>
        </div>
        <aside className="privacy-card">
          <CalendarDays size={26} aria-hidden="true" />
          <h2>Event details</h2>
          <p>
            The public page for this event carries the programme, venue and
            joining details.
          </p>
          <Link href={routes.eventLanding(slug)}>View the event page</Link>
        </aside>
      </section>
      <section className="workspace-actions">
        <LeaveEvent slug={slug} name={current.name} />
      </section>
    </WorkspaceShell>
  );
}
