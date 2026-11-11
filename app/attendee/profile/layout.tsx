import { UnavailableNotice, WorkspaceShell } from "@/components/auth/workspace";
import { ToastProvider } from "@/components/ui";
import { requireAccount } from "@/lib/session";

// The guard runs here, before the shell renders, so signed-out visitors are redirected
// before any account-only UI (such as Clerk's sign-out button) is drawn.
export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const g = await requireAccount("attendee");
  return (
    <ToastProvider>
      <WorkspaceShell
        type="attendee"
        attendeeAccount={"unavailable" in g ? undefined : g.account}
      >
        {"unavailable" in g ? (
          <UnavailableNotice href="/attendee/profile" />
        ) : (
          children
        )}
      </WorkspaceShell>
    </ToastProvider>
  );
}
