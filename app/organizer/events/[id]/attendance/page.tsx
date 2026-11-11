import type { Metadata } from "next";
import { OrganizerAudience } from "@/components/organizer/workspace-sections";
import { serverApi } from "@/lib/api/server";
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
  const [events, registrations] = await Promise.all([
    loadOrganizerEvents(),
    (async () => {
      try {
        const api = await serverApi();
        const { data, response } = await api.GET("/organizer/registrations", {
          params: { query: { event_id: id } },
          signal: AbortSignal.timeout(8000),
        });
        return response.ok && data ? data.items : null;
      } catch {
        return null;
      }
    })(),
  ]);
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
      <OrganizerAudience initial={registrations} scopeEventId={id} />
      <p className="text-xs text-muted">
        Check-in is being built. Registration and approval do not prove physical
        attendance.
      </p>
    </div>
  );
}
