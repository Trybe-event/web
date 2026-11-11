import type { Metadata } from "next";

import {
  WorkspaceUnavailable,
  WorkspaceShell,
} from "@/components/auth/workspace";
import { Alert, ButtonLink } from "@/components/ui";
import { serverApi } from "@/lib/api/server";
import { loadAttendeeEventSnapshot } from "@/lib/attendee-events";
import { AttendeeMyEvents } from "@/components/attendee/my-events";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Attendee workspace" };

async function hasProfile(): Promise<boolean | null> {
  if (process.env.NEXT_PUBLIC_API_MOCKS === "1") return null;
  try {
    const { response } = await (await serverApi()).GET("/me/profile");
    if (response.ok) return true;
    if (response.status === 404) return false;
  } catch {}
  return null;
}

export default async function AttendeeHome() {
  const accountAccess = await requireAccount("attendee");
  if ("unavailable" in accountAccess)
    return <WorkspaceUnavailable type="attendee" />;
  const [profileExists, eventSnapshot] = await Promise.all([
    hasProfile(),
    loadAttendeeEventSnapshot(),
  ]);
  if (eventSnapshot === null || profileExists === null)
    return (
      <WorkspaceShell type="attendee">
        <Alert>
          Your profile and events could not be loaded.{" "}
          <ButtonLink href="/attendee" variant="secondary">
            Try again
          </ButtonLink>
        </Alert>
      </WorkspaceShell>
    );
  const events = eventSnapshot.items;
  const activeEvents = events
    .filter((item) => item.membership.status === "active")
    .map((item) => ({ slug: item.event.slug, name: item.event.name }));
  return (
    <WorkspaceShell
      type="attendee"
      attendeeAccount={accountAccess.account}
      events={activeEvents}
    >
      <header className="attendee-page-heading attendee-page-heading-row">
        <div>
          <span className="attendee-kicker">
            YOUR PEOPLE. YOUR NEXT CHAPTER.
          </span>
          <h1>My events</h1>
          <p>Make the most of every room you�re part of.</p>
        </div>
        <ButtonLink href="/attendee/discover" variant="secondary">
          Discover events
        </ButtonLink>
      </header>
      {!profileExists && (
        <div className="attendee-onboarding-callout">
          <div>
            <strong>Let people get to know you.</strong>
            <p>Set up your reusable profile before joining the conversation.</p>
          </div>
          <ButtonLink href="/attendee/profile/edit?onboarding=1">
            Create your profile
          </ButtonLink>
        </div>
      )}
      <AttendeeMyEvents items={events} now={eventSnapshot.readAt} />
    </WorkspaceShell>
  );
}
