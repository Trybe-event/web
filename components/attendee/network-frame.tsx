import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/auth/workspace";
import { NetworkNavigation } from "./network-navigation";

export function AttendeeNetworkFrame({
  children,
  accountName,
}: {
  children: ReactNode;
  accountName?: string;
}) {
  return (
    <WorkspaceShell
      type="attendee"
      attendeeAccount={accountName ? { full_name: accountName } : undefined}
    >
      <div className="attendee-network-page">
        <header className="attendee-page-heading">
          <span className="attendee-kicker">PEOPLE, BEYOND THE EVENT</span>
          <h1>Your network</h1>
          <p>
            Keep up with the people you meet. Start a conversation worth
            continuing.
          </p>
        </header>
        <NetworkNavigation />
        {children}
      </div>
    </WorkspaceShell>
  );
}
