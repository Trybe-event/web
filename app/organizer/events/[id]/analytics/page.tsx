import type { Metadata } from "next";
import { Card, Alert } from "@/components/ui";
import { RegistrationTrend } from "@/components/organizer/registration-trend";
import { RetryDashboard } from "@/components/organizer/retry-dashboard";
import { loadOwnedEvent } from "@/lib/organizer-event";
import {
  loadEventAnalytics,
  loadRegistrationTrend,
} from "@/lib/organizer-dashboard";
import { EventAnalyticsView } from "@/components/organizer/event-analytics";
export const metadata: Metadata = { title: "Event analytics" };
export default async function EventAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owned = await loadOwnedEvent(id);
  if (!owned) return null;
  const [analytics, trend] = await Promise.all([
    loadEventAnalytics(id),
    loadRegistrationTrend(id),
  ]);
  return (
    <div className="space-y-6">
      <header className="organizer-event-heading">
        <div>
          <h1>Analytics</h1>
          <p>
            Registrations, check-ins, sessions and networking for this event,
            from your live event data.
          </p>
        </div>
      </header>
      {analytics ? (
        <EventAnalyticsView
          analytics={analytics}
          eventName={owned.event.name || "event"}
          timezone={owned.event.timezone || "UTC"}
        />
      ) : (
        <Alert>
          Analytics could not be loaded. <RetryDashboard />
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
      <p className="text-xs text-muted">
        Ticket sales and payments appear here once paid tickets are available.
      </p>
    </div>
  );
}
