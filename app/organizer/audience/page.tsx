import type { Metadata } from "next";
import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { OrganizerAudience } from "@/components/organizer/workspace-sections";
import { serverApi } from "@/lib/api/server";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Audience" };

export default async function AudiencePage() {
  const access = await requireAccount("organizer");
  if ("unavailable" in access) return <WorkspaceUnavailable type="organizer" />;
  const api = await serverApi();
  const { data } = await api
    .GET("/organizer/registrations")
    .catch(() => ({ data: undefined }));
  return (
    <WorkspaceShell type="organizer" organizerAccount={access.account}>
      <section className="organizer-section-heading">
        <h1>Audience</h1>
        <p>
          Everyone who registered across your events. Approve or reject
          registrations for events that need review.
        </p>
      </section>
      <OrganizerAudience initial={data?.items ?? null} />
    </WorkspaceShell>
  );
}
