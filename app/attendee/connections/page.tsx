import type { Metadata } from "next";
import Link from "next/link";

import { requireAccount } from "@/lib/session";
import { ConnectionsTabs } from "./connections-tabs";

export const metadata: Metadata = { title: "Connections" };

export default async function ConnectionsPage() {
  const g = await requireAccount("attendee");
  if ("unavailable" in g) {
    return (
      <main className="workspace">
        <section className="workspace-welcome notice" role="alert">
          <h1>Your workspace is temporarily unavailable.</h1>
          <p>
            We couldn&apos;t confirm your account. No account details have been
            changed.
          </p>
          <Link href="/attendee/sign-in">Try again</Link>
        </section>
      </main>
    );
  }

  return <ConnectionsTabs />;
}
