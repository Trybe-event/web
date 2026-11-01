import { ButtonLink, Card } from "@/components/ui";
import type { Schemas } from "@/lib/api/client";
export function NetworkingNotice({
  state,
  slug,
}: {
  state: Schemas["WindowState"];
  slug: string;
}) {
  if (state === "open") return null;
  return (
    <Card className="mb-5 space-y-3 border-lime" role="status">
      <h2 className="font-bold">
        {state === "closed"
          ? "Networking is closed"
          : "Networking has not opened yet"}
      </h2>
      <p className="text-sm text-muted">
        New connection requests are unavailable. Existing accepted connections
        and conversations are not removed by this networking window.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink variant="secondary" href="/attendee/connections">
          Your connections
        </ButtonLink>
        <ButtonLink variant="secondary" href="/attendee/inbox">
          Open inbox
        </ButtonLink>
        {state === "closed" && (
          <ButtonLink
            variant="secondary"
            href={`/events/${encodeURIComponent(slug)}/archive`}
          >
            View the event archive
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}
