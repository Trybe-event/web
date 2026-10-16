import { Alert, ButtonLink } from "@/components/ui";
import { ProgramView } from "@/components/events/program-view";
import { getPublicEvent } from "@/lib/events";
import { requireEventWorkspace } from "@/lib/event-workspace";

export default async function ProgramPage({
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
      <h1 className="text-3xl font-bold">The program</h1>
      <p className="text-muted">{workspace.event.name}</p>
      {result.kind === "found" && result.event.program ? (
        <ProgramView
          program={result.event.program}
          timezone={result.event.timezone}
        />
      ) : (
        <Alert>
          The program could not be loaded.{" "}
          <ButtonLink
            variant="secondary"
            href={`/events/${encodeURIComponent(slug)}/program`}
          >
            Try again
          </ButtonLink>
        </Alert>
      )}
    </div>
  );
}
