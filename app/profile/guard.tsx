import { redirect } from "next/navigation";

import { WrongAccount } from "@/components/wrong-account";
import { routes } from "@/lib/routes";
import { getSession, type Account } from "@/lib/session";

// requireAttendee renders the page only for attendee accounts. Signed-out visitors go to
// sign-in, signed-in visitors without an account finish setup, and organizer or admin
// accounts see an explanation instead of the page.
export async function requireAttendee(): Promise<
  { account: Account } | { blocked: React.ReactElement }
> {
  const s = await getSession();
  if (s.kind === "signed-out") redirect(routes.attendeeSignIn);
  if (s.kind === "unbound") redirect("/profile/setup");
  if (s.account.type !== "attendee")
    return {
      blocked: <WrongAccount actual={s.account.type} expected="attendee" />,
    };
  return { account: s.account };
}
