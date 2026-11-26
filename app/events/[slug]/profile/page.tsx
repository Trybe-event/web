import type { Metadata } from "next";

import { ProfileForm } from "@/app/attendee/profile/edit/profile-form";
import { requireEventWorkspace } from "@/lib/event-workspace";

export const metadata: Metadata = { title: "Edit your profile" };

// The same profile form as the general workspace, kept inside the event frame; Save
// and Cancel come back to the event. The profile is one profile for every event.
export default async function EventProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await requireEventWorkspace(slug);
  if (workspace.kind !== "member") return null;
  return (
    <div className="space-y-5">
      <span className="eyebrow">{workspace.event.name}</span>
      <h1 className="text-3xl font-bold">Edit your profile</h1>
      <p className="text-muted">Changes apply to every event you join.</p>
      <ProfileForm
        onboarding={false}
        fallbackName={workspace.account.full_name}
        returnTo={`/events/${encodeURIComponent(slug)}`}
      />
    </div>
  );
}
