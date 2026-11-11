import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { EventLifecycle } from "@/components/organizer/event-lifecycle";
import { DeleteDraft } from "@/components/organizer/delete-draft";
import { loadOwnedEvent } from "@/lib/organizer-event";
export const metadata: Metadata = { title: "Event settings" };
export default async function EventSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owned = await loadOwnedEvent(id);
  if (!owned) return null;
  const { event } = owned;
  return (
    <div className="space-y-6">
      <header className="organizer-event-heading">
        <div>
          <h1>Event settings</h1>
          <p>
            Manage networking and the lifecycle of {event.name || "your event"}.
          </p>
        </div>
      </header>
      <EventLifecycle key={event.updated_at} event={event} />
      {event.status === "draft" && (
        <Card className="space-y-3">
          <h2>Delete draft</h2>
          <p className="text-sm text-muted">
            Permanently remove this unpublished event and its program. This
            cannot be undone.
          </p>
          <DeleteDraft
            eventId={event.id}
            name={event.name || "Untitled event"}
            returnToEvents
          />
        </Card>
      )}
    </div>
  );
}
