import type { Metadata } from "next";
import { Card, ButtonLink, Alert } from "@/components/ui";
import { EventHero } from "@/components/events/event-hero";
import { ProgramView } from "@/components/events/program-view";
import { RetryDashboard } from "@/components/organizer/retry-dashboard";
import { loadOwnedEvent, loadOwnedProgram } from "@/lib/organizer-event";
export const metadata: Metadata = { title: "Preview event" };
export default async function EventPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owned = await loadOwnedEvent(id);
  if (!owned) return null;
  const { event } = owned;
  const program = await loadOwnedProgram(id);
  const timezone = event.timezone || "UTC";
  const date = event.starts_at
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone,
      }).format(new Date(event.starts_at))
    : "Date to be confirmed";
  return (
    <div className="space-y-6">
      <header className="organizer-event-heading">
        <div>
          <h1>Preview event</h1>
          <p>
            {event.status === "draft"
              ? "Only you can see this saved draft preview."
              : "Review your saved event details and program."}
          </p>
        </div>
        {event.slug && (
          <ButtonLink
            href={`/${encodeURIComponent(event.slug)}`}
            variant="secondary"
          >
            Open invitation
          </ButtonLink>
        )}
      </header>
      <div className="organizer-preview-page">
        <EventHero
          name={event.name || "Untitled event"}
          image={event.image_url}
          date={`${date} (${timezone})`}
          venue={
            event.venue_name ||
            (event.format === "virtual"
              ? "Virtual event"
              : "Venue to be confirmed")
          }
        />
        <Card className="space-y-4">
          <h2>{event.name || "Untitled event"}</h2>
          <p className="text-sm text-muted">
            Organized by {owned.account.organization || owned.account.full_name}
          </p>
          <p className="text-sm whitespace-pre-wrap">{event.summary}</p>
          <h3 className="font-semibold">About this event</h3>
          <p className="whitespace-pre-wrap text-sm">
            {event.description || "Add your event description in Event setup."}
          </p>
        </Card>
        {program ? (
          <ProgramView program={program} timezone={timezone} />
        ) : (
          <Alert>
            The saved program could not be loaded. <RetryDashboard />
          </Alert>
        )}
      </div>
    </div>
  );
}
