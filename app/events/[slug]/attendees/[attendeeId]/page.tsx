import { notFound } from "next/navigation";
import { LINK_LABELS } from "@/app/attendee/profile/labels";
import { Alert, Avatar, Badge, ButtonLink, Card } from "@/components/ui";
import { ConnectAttendee } from "@/components/events/connect-attendee";
import { serverApi } from "@/lib/api/server";
import { profileLinkHref } from "@/lib/connection-action";
import { requireEventWorkspace } from "@/lib/event-workspace";
import { PortfolioLink } from "@/components/ui/portfolio-link";

export default async function AttendeeProfilePage({
  params,
}: {
  params: Promise<{ slug: string; attendeeId: string }>;
}) {
  const { slug, attendeeId } = await params;
  const workspace = await requireEventWorkspace(slug);
  if (workspace.kind !== "member") return null;
  if (
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
      attendeeId,
    )
  )
    notFound();
  let profile;
  let missing = false;
  try {
    const client = await serverApi();
    const result = await client.GET(
      "/events/{eventId}/attendees/{attendeeId}",
      {
        params: { path: { eventId: workspace.event.id, attendeeId } },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (result.response.ok) profile = result.data;
    missing = result.response.status === 404 || result.response.status === 403;
  } catch {
    /* Render a retry state without exposing upstream details. */
  }
  if (missing) notFound();
  if (!profile)
    return (
      <Alert>
        This profile could not be loaded.{" "}
        <ButtonLink
          variant="secondary"
          href={`/events/${encodeURIComponent(slug)}/attendees/${encodeURIComponent(attendeeId)}`}
        >
          Try again
        </ButtonLink>
      </Alert>
    );
  return (
    <div className="space-y-5">
      <ButtonLink
        variant="ghost"
        href={`/events/${encodeURIComponent(slug)}/attendees`}
      >
        Back to attendees
      </ButtonLink>
      <Card className="min-w-0 space-y-5 break-words">
        <div className="flex items-center gap-4">
          <Avatar name={profile.full_name} src={profile.photo_url} size={72} />
          <div>
            <h1 className="text-3xl font-bold">{profile.full_name}</h1>
            {profile.role && <p>{profile.role}</p>}
            {profile.organization && (
              <p className="text-muted">{profile.organization}</p>
            )}
          </div>
        </div>
        {profile.bio && <p className="whitespace-pre-wrap">{profile.bio}</p>}
        {profile.goals && (
          <p>
            <strong>Looking for: </strong>
            {profile.goals}
          </p>
        )}
        {profile.skills?.length ? (
          <section>
            <h2 className="mb-2 font-bold">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))}
            </div>
          </section>
        ) : null}
        {profile.interests?.length ? (
          <section>
            <h2 className="mb-2 font-bold">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <Badge key={interest}>{interest}</Badge>
              ))}
            </div>
          </section>
        ) : null}
        {profile.links?.length ? (
          <section className="space-y-3">
            <h2 className="font-bold">Links and contact details</h2>
            <p className="text-sm text-muted">
              These are the details this attendee has chosen to share with you.
              Information someone has already viewed cannot be recalled.
            </p>
            <ul className="space-y-2">
              {profile.links.map((link, index) => {
                const href = profileLinkHref(link.kind, link.value);
                return (
                  <li key={index}>
                    {link.kind === "portfolio" ? (
                      <PortfolioLink value={link.value} />
                    ) : (
                      <>
                        <strong>{LINK_LABELS[link.kind]}: </strong>
                        {href ? (
                          <a
                            className="underline"
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {link.value}
                          </a>
                        ) : (
                          <span>{link.value}</span>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </Card>
      <Card>
        <ConnectAttendee
          key={`${profile.attendee_id}:${profile.relationship}:${profile.accepting_requests}:${workspace.event.networking_state}`}
          profile={profile}
          eventId={workspace.event.id}
          networking={workspace.event.networking_state}
        />
      </Card>
    </div>
  );
}
