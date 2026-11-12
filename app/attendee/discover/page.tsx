import type { Metadata } from "next";
import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { DiscoverEvents } from "@/components/events/discover-events";
import { EventCodeEntry } from "@/components/events/event-code-entry";
import { Card } from "@/components/ui";
import { loadAttendeeEventSnapshot } from "@/lib/attendee-events";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Discover events" };
export default async function DiscoverEventsPage() {
  const access = await requireAccount("attendee");
  if ("unavailable" in access) return <WorkspaceUnavailable type="attendee" />;
  // A failed snapshot only loses the "Joined" badges; the list still loads.
  const snapshot = await loadAttendeeEventSnapshot();
  const joinedSlugs = new Set(
    (snapshot?.items ?? []).map((item) => item.event.slug),
  );
  return (
    <WorkspaceShell type="attendee" attendeeAccount={access.account}>
      <header className="attendee-page-heading">
        <span className="attendee-kicker">MAKE ROOM FOR POSSIBILITY</span>
        <h1>Discover events</h1>
        <p>Find your next gathering, and the people who make it matter.</p>
      </header>
      <div className="flex flex-col gap-8">
        <Card>
          <EventCodeEntry />
        </Card>
        <DiscoverEvents joinedSlugs={joinedSlugs} />
      </div>
    </WorkspaceShell>
  );
}
