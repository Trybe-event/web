import type { Metadata } from "next";

import { EntryPass } from "@/components/events/entry-pass";
import { requireEventWorkspace } from "@/lib/event-workspace";

export const metadata: Metadata = { title: "Entry pass" };

export default async function EntryPassPage({
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
      <h1 className="text-3xl font-bold">Entry pass</h1>
      {workspace.event.checkin_enabled ? (
        <EntryPass eventId={workspace.event.id} />
      ) : (
        <p className="text-muted">
          This event does not check people in, so you do not need a pass.
        </p>
      )}
    </div>
  );
}
