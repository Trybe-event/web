import { UnavailableNotice } from "@/components/auth/workspace";
import { AttendeeNetworkFrame } from "@/components/attendee/network-frame";
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
    <AttendeeNetworkFrame
      accountName={
        "unavailable" in access ? undefined : access.account.full_name
      }
    >
      {"unavailable" in access ? (
        <UnavailableNotice href="/attendee/inbox" />
      ) : (
        children
      )}
    </AttendeeNetworkFrame>
  );
}
