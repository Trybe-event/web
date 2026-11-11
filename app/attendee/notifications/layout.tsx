import { ToastProvider } from "@/components/ui";
import { UnavailableNotice, WorkspaceShell } from "@/components/auth/workspace";
import { requireAccount } from "@/lib/session";

// The guard runs here, before the shell renders, so signed-out visitors are
// redirected before any account-only UI is drawn — same as the profile area.
export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireAccount("attendee");
  return (
    <ToastProvider>
      <WorkspaceShell
        type="attendee"
        attendeeAccount={"unavailable" in access ? undefined : access.account}
      >
        {"unavailable" in access ? (
          <UnavailableNotice href="/attendee/notifications" />
        ) : (
          children
        )}
      </WorkspaceShell>
    </ToastProvider>
  );
}
