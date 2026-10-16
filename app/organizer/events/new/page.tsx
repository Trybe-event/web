import { EventForm } from "@/components/organizer/event-form";
import { requireAccount } from "@/lib/session";
export default async function NewEventPage() {
  const access = await requireAccount("organizer");
  if ("unavailable" in access) return null;
  return (
    <>
      <h1 className="mt-8 text-3xl font-bold">Create your event.</h1>
      <EventForm organizerId={access.account.id} />
    </>
  );
}
