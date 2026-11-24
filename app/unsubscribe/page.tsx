import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/ui";
import { UnsubscribeConfirm } from "./unsubscribe-confirm";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

// Opening the link changes nothing: email security scanners follow links, so the
// person confirms first. Mail providers' one-click unsubscribe calls the API directly.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-4 py-10">
      <Link href="/" aria-label="Trybe home">
        <Logo />
      </Link>
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">Unsubscribe from these emails</h1>
        {token ? (
          <UnsubscribeConfirm token={token} />
        ) : (
          <p className="text-muted">
            This unsubscribe link is incomplete. Open it again from the email,
            or change your email choices in your Trybe settings.
          </p>
        )}
      </section>
    </main>
  );
}
