import { EventBasics, EventDetails } from "@/components/organizer/event-fields";
import { EventForm } from "@/components/organizer/event-form";
import { EventSettings } from "@/components/organizer/event-settings";
import { WorkspaceShell } from "@/components/auth/workspace";
import { requireAccount } from "@/lib/session";
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await requireAccount("organizer");
  if ("unavailable" in access) return null;
  const { id: eventId } = await params;
  return (
    <WorkspaceShell type="organizer" organizerAccount={access.account}>
      <h1 className="mt-8 text-3xl font-bold">Set up your event.</h1>
      <EventForm
        organizerId={access.account.id}
        eventId={eventId}
        basics={<EventBasics />}
        details={<EventDetails />}
        settings={<EventSettings />}
      />
    </WorkspaceShell>
  );
}
