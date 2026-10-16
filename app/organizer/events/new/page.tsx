import { EventForm } from "@/components/organizer/event-form";
import { WorkspaceShell } from "@/components/auth/workspace";
import { requireAccount } from "@/lib/session";
export default async function NewEventPage() {
  const access = await requireAccount("organizer");
  if ("unavailable" in access) return null;
  return (
    <WorkspaceShell type="organizer">
      <h1 className="mt-8 text-3xl font-bold">Create your event.</h1>
      <EventForm organizerId={access.account.id} />
    </WorkspaceShell>
  );
}
