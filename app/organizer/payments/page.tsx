import type { Metadata } from "next";
import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { OrganizerPayments } from "@/components/organizer/workspace-sections";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const access = await requireAccount("organizer");
  if ("unavailable" in access) return <WorkspaceUnavailable type="organizer" />;
  return (
    <WorkspaceShell type="organizer" organizerAccount={access.account}>
      <section className="organizer-section-heading">
        <h1>Payments</h1>
        <p>Your ticket sales, transactions and payouts.</p>
      </section>
      <OrganizerPayments />
    </WorkspaceShell>
  );
}
