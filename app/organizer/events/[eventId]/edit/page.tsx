import { EventForm } from "@/components/organizer/event-form";
import { requireAccount } from "@/lib/session";
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const access = await requireAccount("organizer");
  if ("unavailable" in access) return null;
  const { eventId } = await params;
  return (
    <>
      <h1 className="mt-8 text-3xl font-bold">Set up your event.</h1>
      <EventForm organizerId={access.account.id} eventId={eventId} />
    </>
  );
}
