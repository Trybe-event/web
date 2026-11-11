import type { ReactNode } from "react";
import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { loadOwnedEvent } from "@/lib/organizer-event";

export default async function EventWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owned = await loadOwnedEvent(id);
  if (!owned) return <WorkspaceUnavailable type="organizer" />;
  return (
    <WorkspaceShell
      type="organizer"
      organizerAccount={owned.account}
      organizerEvent={owned.event}
    >
      {children}
    </WorkspaceShell>
  );
}
