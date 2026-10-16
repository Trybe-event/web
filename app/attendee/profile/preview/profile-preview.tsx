"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JoinEvent } from "@/components/events/join-event";
import {
  Alert,
  Avatar,
  Badge,
  ButtonLink,
  Card,
  Skeleton,
} from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { routes, withEventParam } from "@/lib/routes";

import { LINK_LABELS } from "../labels";

type Viewer = "event_member" | "connection";
const VIEWERS: { id: Viewer; label: string; explain: string }[] = [
  {
    id: "event_member",
    label: "Someone at your event",
    explain: "An attendee who shares an event with you but hasn't connected.",
  },
  {
    id: "connection",
    label: "A connection",
    explain: "Someone who accepted a connection request with you.",
  },
];

// ProfilePreview shows exactly what the API sends to each kind of viewer. When the
// attendee is onboarding from an event, this screen is also the visibility review
// of web#7: it carries the explicit confirm that joins the event and opens the
// workspace, and nothing registers until that button is pressed.
export function ProfilePreview({
  onboarding,
  eventSlug,
  eventName,
}: {
  onboarding: boolean;
  eventSlug?: string;
  eventName?: string;
}) {
  const [viewer, setViewer] = useState<Viewer>("event_member");
  const [views, setViews] = useState<
    Partial<Record<Viewer, Schemas["Profile"]>>
  >({});
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    for (const v of VIEWERS) {
      api
        .GET("/me/profile/preview", { params: { query: { as: v.id } } })
        .then(({ data, error }) => {
          if (data) setViews((prev) => ({ ...prev, [v.id]: data }));
          else setFailure(errorMessage(error));
        });
    }
  }, []);

  const current = views[viewer];
  const active = VIEWERS.find((v) => v.id === viewer)!;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">
          {onboarding
            ? eventName
              ? `Here's how people at ${eventName} will see you`
              : "Here's how people will see you"
            : "Preview your profile"}
        </h1>
        <p className="mt-2 text-muted">
          Contact details you set to &ldquo;Only me&rdquo; never leave your
          account.
        </p>
      </div>
      <div role="tablist" aria-label="View as" className="flex flex-wrap gap-2">
        {VIEWERS.map((v) => (
          <button
            key={v.id}
            role="tab"
            type="button"
            aria-selected={viewer === v.id}
            aria-controls="preview-panel"
            onClick={() => setViewer(v.id)}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold aria-selected:bg-ink aria-selected:text-paper"
          >
            {v.label}
          </button>
        ))}
      </div>
      {failure && <Alert>{failure}</Alert>}
      <section id="preview-panel" role="tabpanel" aria-label={active.label}>
        <p className="mb-3 text-sm text-muted">{active.explain}</p>
        {!current && !failure && <Skeleton className="h-64" />}
        {current && <PreviewCard profile={current} />}
      </section>
      <div className="flex flex-wrap gap-3">
        <ButtonLink
          href={withEventParam(
            onboarding
              ? "/attendee/profile/edit?onboarding=1"
              : "/attendee/profile/edit",
            eventSlug,
          )}
          variant="secondary"
        >
          Edit profile
        </ButtonLink>
        {onboarding && eventSlug ? (
          <>
            <JoinEvent
              slug={eventSlug}
              name={eventName ?? eventSlug}
              label={`Confirm and join ${eventName ?? eventSlug}`}
            />
            <Link
              className="text-sm font-semibold"
              href={routes.eventLanding(eventSlug)}
            >
              Continue to the event page without joining yet
            </Link>
          </>
        ) : (
          <ButtonLink
            href={
              onboarding ? "/attendee/profile" : "/attendee/profile/settings"
            }
            variant={onboarding ? "primary" : "secondary"}
          >
            {onboarding ? "Looks good" : "Privacy settings"}
          </ButtonLink>
        )}
      </div>
      {onboarding && eventSlug && (
        <p className="text-sm text-muted">
          Nothing has been shared yet. You join {eventName ?? eventSlug} only
          when you confirm.
        </p>
      )}
    </div>
  );
}

// PreviewCard is the shared rendering of a profile as one viewer kind receives it: the
// profile preview screen and the join review on /{slug} both use it, so what an attendee
// is shown before joining is exactly what the API sends to event members (web#8).
export function PreviewCard({ profile }: { profile: Schemas["Profile"] }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar name={profile.full_name} src={profile.photo_url} size={56} />
        <div>
          <p className="text-lg font-bold">{profile.full_name}</p>
          {profile.role && (
            <p className="text-muted">
              {profile.role}
              {profile.organization ? ` · ${profile.organization}` : ""}
            </p>
          )}
        </div>
      </div>
      {profile.bio && <p>{profile.bio}</p>}
      {profile.goals && (
        <p>
          <span className="font-semibold">Looking for: </span>
          {profile.goals}
        </p>
      )}
      {[...(profile.skills ?? []), ...(profile.interests ?? [])].length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Skills and interests">
          {[...(profile.skills ?? []), ...(profile.interests ?? [])].map(
            (t) => (
              <li key={t}>
                <Badge>{t}</Badge>
              </li>
            ),
          )}
        </ul>
      )}
      {profile.links && profile.links.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {profile.links.map((l, i) => (
            <li key={i}>
              <span className="font-semibold">{LINK_LABELS[l.kind]}:</span>{" "}
              {l.value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          No links or contact details are visible to this person.
        </p>
      )}
      {profile.accepting_requests === false && (
        <Badge>Not accepting new connection requests</Badge>
      )}
    </Card>
  );
}
