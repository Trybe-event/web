import { MemberUpdates } from "@/components/engagement";
import { requireEventWorkspace } from "@/lib/event-workspace";

export default async function UpdatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await requireEventWorkspace(slug);
  if (workspace.kind !== "member") return null;
  return (
    <div className="space-y-5">
      <span className="eyebrow">{workspace.event.name}</span>
      <h1 className="text-3xl font-bold">Updates & Q&A</h1>
      <p className="text-muted">
        Announcements from the organizer, and questions from attendees.
      </p>
      <MemberUpdates eventId={workspace.event.id} />
    </div>
  );
}
