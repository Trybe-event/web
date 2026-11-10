import type { Metadata } from "next";
import { Card, Alert } from "@/components/ui";
import { RetryDashboard } from "@/components/organizer/retry-dashboard";
import { loadOwnedEvent } from "@/lib/organizer-event";
import { loadOrganizerEvents } from "@/lib/organizer-dashboard";
export const metadata: Metadata = { title: "Event attendance" };
export default async function EventAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await loadOwnedEvent(id))) return null;
  const events = await loadOrganizerEvents();
  const summary = events?.find((event) => event.id === id);
  return (
    <div className="space-y-6">
      <header className="organizer-event-heading">
        <div>
          <h1>Attendance</h1>
          <p>Keep track of registrations for your event.</p>
        </div>
      </header>
      <Card className="organizer-event-stat">
        <span>Registered attendees</span>
        <strong>
          {summary ? summary.registrations.toLocaleString("en") : "Unavailable"}
        </strong>
        <p>People who confirmed joining this event.</p>
      </Card>
      {!summary && (
        <Alert>
          Registrations could not be loaded. <RetryDashboard />
        </Alert>
      )}
      <Card className="space-y-3">
        <h2>Attendee management is being built</h2>
        <p className="text-sm text-muted">
          A registration list, approval workflow and check-in tools need their
          own permission-controlled API. They are not active in this trial.
          Registration does not prove that someone attended.
        </p>
        <p className="text-sm text-muted">
          Attendee contacts remain private. This workspace does not expose
          hidden profile information.
        </p>
      </Card>
    </div>
  );
}
