import type { Metadata } from "next";

import { ConnectionsTabs } from "@/app/attendee/connections/connections-tabs";
import { requireEventWorkspace } from "@/lib/event-workspace";

export const metadata: Metadata = { title: "Connections at this event" };

export default async function EventConnectionsPage({
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
      <h1 className="text-3xl font-bold">Connections</h1>
      <p className="text-muted">
        Requests and connections from this event. All your connections are in
        your general workspace.
      </p>
      <ConnectionsTabs scope={{ eventId: workspace.event.id, slug }} />
    </div>
  );
}
