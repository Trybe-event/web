import { AttendeeDirectory } from "@/components/events/attendee-directory";
import { directoryFilters, directoryQuery } from "@/lib/directory";
import { requireEventWorkspace } from "@/lib/event-workspace";

export default async function AttendeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const workspace = await requireEventWorkspace(slug);
  if (workspace.kind !== "member") return null;
  const query = new URLSearchParams();
  for (const [name, values] of Object.entries(await searchParams))
    for (const value of Array.isArray(values) ? values : values ? [values] : [])
      query.append(name, value);
  const filters = directoryFilters(query);
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">All attendees</h1>
      <p className="text-muted">
        Discover the people at {workspace.event.name}.
      </p>
      <AttendeeDirectory
        key={directoryQuery(filters).toString()}
        eventId={workspace.event.id}
        filters={filters}
      />
    </div>
  );
}
