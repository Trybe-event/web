import type { ReactNode } from "react";
import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { EventWorkspaceNavigation } from "@/components/events/workspace-nav";
import { NetworkingNotice } from "@/components/events/networking-notice";
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
      <div className="mt-3 flex min-w-0 flex-col gap-4 pb-6 md:mt-6 md:flex-row md:gap-6 md:pb-8">
        <EventWorkspaceNavigation
          slug={slug}
          networkingClosed={workspace.event.networking_state === "closed"}
        />
        <div className="min-w-0 flex-1">
          <NetworkingNotice
            state={workspace.event.networking_state}
            slug={slug}
          />
          {children}
        </div>
      </div>
    </WorkspaceShell>
  );
}
