import type { Metadata } from "next";

import { UnavailableNotice } from "@/components/auth/workspace";
import { EVENT_PARAM, parseEventParam } from "@/lib/routes";
import { requireAccount } from "@/lib/session";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Edit your profile" };

export default async function EditProfile({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const g = await requireAccount("attendee");
  if ("unavailable" in g) return <UnavailableNotice href="/attendee/profile" />;
  const query = await searchParams;
  const onboarding = query.onboarding === "1";
  // An attendee who joined from an event keeps it through onboarding, so the last
  // step hands them back to /{slug} for the join (web#7).
  const eventSlug = parseEventParam(query[EVENT_PARAM]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {onboarding ? (
        <>
          <h1 className="text-3xl font-bold">
            The next great connection starts here.
          </h1>
          <p className="mt-2 text-muted">
            Create your profile so people can understand what you do and why
            they should connect with you. You reuse it at every event you join.
          </p>
        </>
      ) : (
        <h1 className="text-3xl font-bold">Edit your profile</h1>
      )}
      <ProfileForm
        onboarding={onboarding}
        fallbackName={g.account.full_name}
        eventSlug={eventSlug}
      />
    </div>
  );
}
