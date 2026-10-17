import type { ReactNode } from "react";
import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { EventWorkspaceNavigation } from "@/components/events/workspace-nav";
import { requireEventWorkspace } from "@/lib/event-workspace";

export default async function EventWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await requireEventWorkspace(slug);
  if (workspace.kind === "unavailable")
    return <WorkspaceUnavailable type="attendee" />;
  return (
    <WorkspaceShell type="attendee" events={workspace.events} activeSlug={slug}>
      <div className="mt-6 flex min-w-0 gap-6 pb-[40vh] md:pb-8">
        <EventWorkspaceNavigation slug={slug} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </WorkspaceShell>
  );
}
