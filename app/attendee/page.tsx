import type { Metadata } from "next";

import {
  WorkspaceHome,
  WorkspaceUnavailable,
  WorkspaceShell,
} from "@/components/auth/workspace";
import { Alert, ButtonLink } from "@/components/ui";
import { serverApi } from "@/lib/api/server";
import { loadMyEvents } from "@/lib/events";
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
  const [profileExists, events] = await Promise.all([
    hasProfile(),
    loadMyEvents(),
  ]);
  if (events === null || profileExists === null)
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
  const attendsEvents = events.length > 0;
  const firstName = accountAccess.account.full_name.split(" ")[0] ?? "there";
  return (
    <WorkspaceHome
      type="attendee"
      firstName={firstName}
      events={events}
      card={
        profileExists === false
          ? {
              title: "Introduce yourself.",
              body: "Create the profile you'll bring to every event. Your contact details stay private until you choose to share them.",
              href: "/attendee/profile/edit?onboarding=1",
              cta: "Create your profile",
            }
          : {
              title: "Your profile is ready.",
              body: attendsEvents
                ? "Pick an event above to open its workspace, or review what people at your events will see."
                : "Your event list is empty. Open an organizer's invitation link to review your profile and join an event.",
              href: attendsEvents
                ? "/attendee/profile/preview"
                : "/attendee/profile",
              cta: attendsEvents ? "Review your profile" : "View your profile",
            }
      }
      privacy={{
        body: "Your contact details stay private by default. You choose what to share with event members and with connections.",
        status:
          profileExists === false
            ? "Profile setup comes next"
            : "Privacy settings available",
      }}
    />
  );
}
