import { EventBasics, EventDetails } from "@/components/organizer/event-fields";
import { EventForm } from "@/components/organizer/event-form";
import { EventSettings } from "@/components/organizer/event-settings";
import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { requireAccount } from "@/lib/session";

export default async function NewExperiencePage() {
  const access = await requireAccount("organizer");
  if ("unavailable" in access) return <WorkspaceUnavailable type="organizer" />;
  return (
    <WorkspaceShell type="organizer" organizerAccount={access.account}>
      <section className="organizer-section-heading">
        <span className="eyebrow">EXPERIENCE</span>
        <h1>Create an experience</h1>
        <p>
          Bring people together around a shared interest. Experiences use
          Trybe’s event registration, program and networking settings.
        </p>
      </section>
      <EventForm
        organizerId={access.account.id}
        basics={<EventBasics />}
        details={<EventDetails />}
        settings={<EventSettings reviewOnly />}
      />
    </WorkspaceShell>
  );
}
