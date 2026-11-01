import { redirect } from "next/navigation";
import { requireAdministrator } from "@/lib/admin";
import { Alert, ButtonLink } from "@/components/ui";

export default async function AdministratorHome() {
  if (!(await requireAdministrator()))
    return (
      <Alert>
        Moderation access could not be confirmed.{" "}
        <ButtonLink href="/admin">Try again</ButtonLink>
      </Alert>
    );
  redirect("/admin/reports");
}
