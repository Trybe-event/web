import { UnavailableNotice, WorkspaceShell } from "@/components/auth/workspace";
import { requireAccount } from "@/lib/session";

// The guard runs here, before the shell renders, so signed-out visitors are
// redirected before any account-only UI is drawn — same as the profile and
// notification areas.
export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireAccount("attendee");
  return (
    <WorkspaceShell type="attendee">
      {"unavailable" in access ? (
        <UnavailableNotice href="/attendee/inbox" />
      ) : (
        children
      )}
    </WorkspaceShell>
  );
}
