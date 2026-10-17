import { AttendeeCard } from "@/components/events/attendee-card";
import { Alert, ButtonLink, EmptyState } from "@/components/ui";
import { LeaveEvent } from "@/components/events/leave-event";
import { serverApi } from "@/lib/api/server";
import { requireEventWorkspace } from "@/lib/event-workspace";

export default async function EventWorkspace({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await requireEventWorkspace(slug);
  if (workspace.kind !== "member") return null;
  let matches;
  try {
    const client = await serverApi();
    const result = await client.GET("/events/{eventId}/matches", {
      params: { path: { eventId: workspace.event.id } },
      signal: AbortSignal.timeout(8000),
    });
    if (result.response.ok) matches = result.data?.items;
  } catch {
    /* The retry state below preserves access to the rest of the event. */
  }
  return (
    <div className="space-y-5">
      <span className="eyebrow">{workspace.event.name}</span>
      <h1 className="text-3xl font-bold">Your matches</h1>
      <p className="text-muted">
        Find people who share your interests and goals.
      </p>
      {!matches ? (
        <Alert>
          Matches could not be loaded.{" "}
          <ButtonLink
            variant="secondary"
            href={`/events/${encodeURIComponent(slug)}`}
          >
            Try again
          </ButtonLink>
        </Alert>
      ) : !matches.length ? (
        <EmptyState title="No matches yet">
          Update your skills, interests and goals to help people find you.
        </EmptyState>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {matches.map(({ profile, reasons }) => (
            <AttendeeCard
              key={profile.attendee_id}
              profile={profile}
              reasons={reasons}
              slug={slug}
            />
          ))}
        </div>
      )}
      <LeaveEvent slug={slug} name={workspace.event.name} />
    </div>
  );
}
