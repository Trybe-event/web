import { Avatar, Badge, ButtonLink, Card } from "@/components/ui";
import type { Schemas } from "@/lib/api/client";

export function AttendeeCard({
  profile,
  reasons,
  slug,
}: {
  profile: Schemas["Profile"];
  reasons?: string[];
  slug?: string;
}) {
  return (
    <Card className="min-w-0 space-y-3 break-words">
      <div className="flex items-center gap-3">
        <Avatar name={profile.full_name} src={profile.photo_url} />
        <div className="min-w-0">
          <h2 className="text-xl font-bold">{profile.full_name}</h2>
          {profile.role && <p>{profile.role}</p>}
          {profile.organization && (
            <p className="text-sm text-muted">{profile.organization}</p>
          )}
        </div>
      </div>
      {profile.bio && <p className="text-sm text-muted">{profile.bio}</p>}
      <div className="flex flex-wrap gap-2">
        {profile.skills?.map((skill) => (
          <Badge key={skill}>{skill}</Badge>
        ))}
        {reasons?.map((reason, index) => (
          <Badge key={index}>{reason}</Badge>
        ))}
      </div>
      {profile.accepting_requests === false && (
        <Badge>Not accepting requests</Badge>
      )}
      {slug && (
        <ButtonLink
          variant="secondary"
          href={`/events/${encodeURIComponent(slug)}/attendees/${encodeURIComponent(profile.attendee_id)}`}
        >
          View profile
        </ButtonLink>
      )}
    </Card>
  );
}
