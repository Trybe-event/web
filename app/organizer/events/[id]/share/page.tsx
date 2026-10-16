import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  WorkspaceShell,
  WorkspaceUnavailable,
} from "@/components/auth/workspace";
import { EventSharePanel } from "@/components/organizer/event-share";
import { Badge } from "@/components/ui";
import { serverApi } from "@/lib/api/server";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Share event" };

type ShareEvent = {
  name: string;
  slug: string | null;
  registration_url: string | null;
  status: "draft" | "published" | "ended";
  registration_state: "not_open" | "open" | "closed";
};

// web#5: event management shows the registration link and the downloadable
// QR graphic. The URL comes from the API (`registration_url`, set once on
// publish by api#4) — never rebuilt client-side, so edits can't change it.
export default async function ShareEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireAccount("organizer");
  if ("unavailable" in access) return <WorkspaceUnavailable type="organizer" />;

  let event: ShareEvent | null = null;
  let gone = false;
  try {
    const api = await serverApi();
    const { data, response } = await api.GET("/events/{eventId}", {
      params: { path: { eventId: id } },
      signal: AbortSignal.timeout(8000),
    });
    if (!data) {
      gone = response.status === 404;
    } else {
      event = {
        name: data.name ?? "Unnamed event",
        slug: data.slug ?? null,
        registration_url: data.registration_url ?? null,
        status: data.status,
        registration_state: data.registration_state ?? "not_open",
      };
    }
  } catch {
    event = null;
  }

  if (gone) notFound();
  if (!event) return <WorkspaceUnavailable type="organizer" />;

  return (
    <WorkspaceShell type="organizer">
      <section className="workspace-welcome">
        <span className="eyebrow">EVENT MANAGEMENT</span>
        <h1>
          Share {event.name}
          <span className="accent-period">.</span>
        </h1>
        <p>
          {event.status === "published"
            ? "Send the link or the QR graphic: both open your registration page."
            : "This event is still a draft. Publish it to get its permanent link."}
        </p>
        <div className="mt-3 flex gap-2">
          <Badge tone={event.status === "published" ? "success" : "neutral"}>
            {event.status}
          </Badge>
          <Badge tone="neutral">{`Registration ${event.registration_state}`}</Badge>
        </div>
      </section>
      <section className="workspace-grid">
        <div>
          <EventSharePanel event={event} />
        </div>
        <aside className="privacy-card">
          <h2>Private by design.</h2>
          <p>
            Only the registration link is shared. Attendee contact details stay
            private unless each attendee chooses to show them.
          </p>
        </aside>
      </section>
    </WorkspaceShell>
  );
}
