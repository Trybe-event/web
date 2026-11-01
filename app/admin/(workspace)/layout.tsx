import Link from "next/link";
import type { ReactNode } from "react";
import { SignOut } from "@/components/auth/sign-out";
import { ThemeToggle } from "@/components/auth/theme-toggle";
import { Alert, ButtonLink, Logo } from "@/components/ui";
import { requireAdministrator } from "@/lib/admin";

export default async function AdministratorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const allowed = await requireAdministrator();
  return (
    <main className="workspace">
      <header className="workspace-header">
        <Link href="/admin/reports" aria-label="Trybe moderation home">
          <Logo />
        </Link>
        <div>
          <span className="workspace-badge">Moderation workspace</span>
          <ThemeToggle />
          <SignOut />
        </div>
      </header>
      {allowed ? (
        children
      ) : (
        <Alert>
          Moderation access could not be confirmed.{" "}
          <ButtonLink href="/admin">Try again</ButtonLink>
        </Alert>
      )}
    </main>
  );
}
