import type { Metadata } from "next";
import { EventSharePanel } from "@/components/organizer/event-share";
import { loadOwnedEvent } from "@/lib/organizer-event";
export const metadata: Metadata = { title: "Event reach" };
export default async function ShareEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owned = await loadOwnedEvent(id);
  if (!owned) return null;
  const { event } = owned;
  return (
    <>
      <header className="organizer-event-heading">
        <div>
          <h1>Reach your people</h1>
          <p>
            {event.status === "draft"
              ? "Publish your event to activate its invitation."
              : "Share your event link and downloadable QR graphic."}
          </p>
        </div>
      </header>
      <EventSharePanel
        event={{
          name: event.name || "Untitled event",
          slug: event.slug || null,
          registration_url: event.registration_url || null,
        }}
      />
    </>
  );
}
