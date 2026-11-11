import type { Metadata } from "next";
import { AttendeeNetworkFrame } from "@/components/attendee/network-frame";
import { UnavailableNotice } from "@/components/auth/workspace";
import { ConnectionsTabs } from "../connections/connections-tabs";
import { requireAccount } from "@/lib/session";
export const metadata: Metadata = { title: "Connection requests" };
export default async function ConnectionRequestsPage() {
  const access = await requireAccount("attendee");
  return (
    <AttendeeNetworkFrame
      accountName={
        "unavailable" in access ? undefined : access.account.full_name
      }
    >
      {"unavailable" in access ? (
        <UnavailableNotice href="/attendee/requests" />
      ) : (
        <ConnectionsTabs mode="requests" />
      )}
    </AttendeeNetworkFrame>
  );
}
