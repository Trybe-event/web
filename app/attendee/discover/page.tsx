import type { Metadata } from "next";
import { Compass } from "lucide-react";
import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { ButtonLink, Card } from "@/components/ui";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Discover events" };
export default async function DiscoverEventsPage() {
  const access = await requireAccount("attendee");
  if ("unavailable" in access) return <WorkspaceUnavailable type="attendee" />;
  return (
    <WorkspaceShell type="attendee" attendeeAccount={access.account}>
      <header className="attendee-page-heading">
        <span className="attendee-kicker">MAKE ROOM FOR POSSIBILITY</span>
        <h1>Discover events</h1>
        <p>Find your next gathering, and the people who make it matter.</p>
      </header>
      <Card className="attendee-discover-progress">
        <Compass size={34} aria-hidden="true" />
        <span className="attendee-progress-label">In progress</span>
        <h2>More ways to find your people.</h2>
        <p>
          We’re building a place to explore public events on Trybe. For now, use
          an organizer’s invitation link to join an event.
        </p>
        <ButtonLink href="/attendee" variant="secondary">
          View my events
        </ButtonLink>
      </Card>
    </WorkspaceShell>
  );
}
