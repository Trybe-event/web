import { EventBasics, EventDetails } from "@/components/organizer/event-fields";
import { EventForm } from "@/components/organizer/event-form";
import { EventSettings } from "@/components/organizer/event-settings";
import { loadOwnedEvent } from "@/lib/organizer-event";
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const owned = await loadOwnedEvent(eventId);
  if (!owned) return null;
  return (
    <>
      <header className="organizer-event-heading">
        <div>
          <h1>{owned.event.name || "Create your event"}</h1>
          <p>
            {owned.event.status === "draft"
              ? "Build your invitation, then review and publish."
              : "Manage your event details and program."}
          </p>
        </div>
      </header>
      <EventForm
        organizerId={owned.account.id}
        eventId={eventId}
        basics={<EventBasics />}
        details={<EventDetails />}
        settings={<EventSettings reviewOnly />}
      />
    </>
  );
}
