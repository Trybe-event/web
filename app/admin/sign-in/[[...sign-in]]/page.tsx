import { notFound, redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { Alert, ButtonLink, Logo } from "@/components/ui";
import { getSession } from "@/lib/session";

export default async function AdministratorSignIn() {
  const session = await getSession();
  if (session.kind === "bound") {
    if (session.account.type === "admin") redirect("/admin");
    notFound();
  }
  if (session.kind === "unbound") notFound();
  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-12">
      <Logo />
      <h1 className="font-display text-3xl font-bold">Moderation sign-in</h1>
      <p className="text-muted">
        For administrators provisioned by Trybe operators.
      </p>
      {session.kind === "unconfigured" ? (
        <Alert>Administrator sign-in is not configured.</Alert>
      ) : session.kind === "unavailable" ? (
        <Alert>
          Administrator access could not be confirmed.{" "}
          <ButtonLink href="/admin/sign-in">Try again</ButtonLink>
        </Alert>
      ) : (
        <AuthForm type="admin" mode="sign-in" />
      )}
    </main>
  );
}
