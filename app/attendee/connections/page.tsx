import type { Metadata } from "next";

import { UnavailableNotice } from "@/components/auth/workspace";
import { AttendeeNetworkFrame } from "@/components/attendee/network-frame";
import { requireAccount } from "@/lib/session";

import { ConnectionsTabs } from "./connections-tabs";

export const metadata: Metadata = { title: "Connections" };

export default async function ConnectionsPage() {
  // The guard resolves the account type from the API's binding, so an organizer
  // or a signed-out visitor never reaches the lists below.
  const guard = await requireAccount("attendee");
  if ("unavailable" in guard)
    return (
      <AttendeeNetworkFrame>
        <UnavailableNotice href="/attendee/connections" />
      </AttendeeNetworkFrame>
    );
  return (
    <AttendeeNetworkFrame accountName={guard.account.full_name}>
      <ConnectionsTabs mode="connections" />
    </AttendeeNetworkFrame>
  );
}
