import type { Metadata } from "next";
import { Card, Alert } from "@/components/ui";
import { RegistrationTrend } from "@/components/organizer/registration-trend";
import { RetryDashboard } from "@/components/organizer/retry-dashboard";
import { loadOwnedEvent } from "@/lib/organizer-event";
import {
  loadOrganizerEvents,
  loadRegistrationTrend,
} from "@/lib/organizer-dashboard";
export const metadata: Metadata = { title: "Event analytics" };
export default async function EventAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await loadOwnedEvent(id))) return null;
  const [events, trend] = await Promise.all([
    loadOrganizerEvents(),
    loadRegistrationTrend(id),
  ]);
  const summary = events?.find((event) => event.id === id);
  return (
    <div className="space-y-6">
      <header className="organizer-event-heading">
        <div>
          <h1>Analytics</h1>
          <p>
            Registration activity for this event, from your live event data.
          </p>
        </div>
      </header>
      <Card className="organizer-event-stat">
        <span>Registrations</span>
        <strong>
          {summary ? summary.registrations.toLocaleString("en") : "Unavailable"}
        </strong>
        <p>Sign-ups, not verified physical attendance.</p>
      </Card>
      {!summary && (
        <Alert>
          Registration totals could not be loaded. <RetryDashboard />
        </Alert>
      )}
      <Card className="space-y-4">
        <h2>Registration trend</h2>
        {trend ? (
          <>
            <RegistrationTrend points={trend} />
            <details>
              <summary className="cursor-pointer text-sm">
                View daily data
              </summary>
              <table className="organizer-data-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Registrations</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((point) => (
                    <tr key={point.date}>
                      <th scope="row">{point.date}</th>
                      <td>{point.registrations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        ) : (
          <>
            <Alert>Daily registration data could not be loaded.</Alert>
            <RetryDashboard />
          </>
        )}
      </Card>
      <Card>
        <h2>More insights are being built</h2>
        <p className="mt-3 text-sm text-muted">
          Check-in, page views, ticket revenue and conversion reports will
          appear when their underlying measurements are available.
        </p>
      </Card>
    </div>
  );
}
