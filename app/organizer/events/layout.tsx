import type { ReactNode } from "react";
import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { requireAccount } from "@/lib/session";
export default async function OrganizerEventsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await requireAccount("organizer");
  return "unavailable" in access ? (
    <WorkspaceUnavailable type="organizer" />
  ) : (
    <WorkspaceShell type="organizer">{children}</WorkspaceShell>
  );
}
