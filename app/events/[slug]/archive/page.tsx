import { Alert, ButtonLink, Card, EmptyState } from "@/components/ui";
import { AttendeeCard } from "@/components/events/attendee-card";
import { ProgramView } from "@/components/events/program-view";
import { loadEventArchive } from "@/lib/event-archive";
import { requireEventWorkspace } from "@/lib/event-workspace";

export default async function EventArchivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await requireEventWorkspace(slug);
  if (workspace.kind !== "member") return null;
  if (workspace.event.networking_state !== "closed")
    return (
      <Card className="space-y-4">
        <h1 className="text-3xl font-bold">
          The archive opens when networking closes
        </h1>
        <p>Event completion and networking have separate schedules.</p>
        <ButtonLink href={`/events/${encodeURIComponent(slug)}`}>
          Back to your event
        </ButtonLink>
      </Card>
    );
  const archive = await loadEventArchive(workspace.event.id);
  if (!archive)
    return (
      <Alert>
        The archive could not be loaded.{" "}
        <ButtonLink
          variant="secondary"
          href={`/events/${encodeURIComponent(slug)}/archive`}
        >
          Try again
        </ButtonLink>
      </Alert>
    );
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        {archive.event.name}: event archive
      </h1>
      <p className="text-muted">
        Explore the program and the attendees currently visible to you. New
        connections are closed; existing accepted connections are retained.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/attendee/connections">
          Your accepted connections
        </ButtonLink>
        <ButtonLink href="/attendee/inbox" variant="secondary">
          Continue a conversation
        </ButtonLink>
      </div>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Program</h2>
        <ProgramView
          program={archive.program}
          timezone={archive.event.timezone}
        />
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Attendees</h2>
        <p className="text-sm text-muted">
          This list reflects current permissions. It is not a saved copy of
          private contact details.
        </p>
        {!archive.attendees.length ? (
          <EmptyState title="No attendees are visible">
            There are no permitted attendee profiles to show.
          </EmptyState>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {archive.attendees.map((profile) => (
              <AttendeeCard
                key={profile.attendee_id}
                profile={profile}
                slug={slug}
              />
            ))}
          </div>
        )}
      </section>
      <ButtonLink variant="secondary" href="/attendee">
        Back to your account
      </ButtonLink>
    </div>
  );
}
