import type { Metadata } from "next";

import { InboxList } from "@/app/attendee/inbox/inbox-list";
import { requireEventWorkspace } from "@/lib/event-workspace";

export const metadata: Metadata = { title: "Messages at this event" };

export default async function EventMessagesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await requireEventWorkspace(slug);
  if (workspace.kind !== "member") return null;
  return (
    <div className="space-y-2">
      <span className="eyebrow">{workspace.event.name}</span>
      <InboxList scope={{ eventId: workspace.event.id, slug }} />
    </div>
  );
}
