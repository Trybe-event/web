import type { Metadata } from "next";

import { requireAttendee } from "../guard";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Edit your profile" };

export default async function EditProfile({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const g = await requireAttendee();
  if ("blocked" in g) return g.blocked;
  const onboarding = (await searchParams).onboarding === "1";
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
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
      <ProfileForm onboarding={onboarding} fallbackName={g.account.full_name} />
    </main>
  );
}
