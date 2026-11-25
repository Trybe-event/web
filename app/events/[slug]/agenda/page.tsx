import type { Metadata } from "next";

import { Alert } from "@/components/ui";
import { MyAgenda } from "@/components/events/member-program";
import { getPublicEvent } from "@/lib/events";
import { requireEventWorkspace } from "@/lib/event-workspace";

export const metadata: Metadata = { title: "My agenda" };

export default async function AgendaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await requireEventWorkspace(slug);
  if (workspace.kind !== "member") return null;
  const result = await getPublicEvent(slug);
  return (
    <div className="space-y-5">
      <span className="eyebrow">{workspace.event.name}</span>
      <h1 className="text-3xl font-bold">My agenda</h1>
      {result.kind === "found" && result.event.program ? (
        <MyAgenda
          eventId={workspace.event.id}
          slug={slug}
          program={result.event.program}
          timezone={result.event.timezone}
        />
      ) : (
        <Alert>
          The program could not be loaded. Reload the page to try again.
        </Alert>
      )}
    </div>
  );
}
