import { SignOutButton } from "@clerk/nextjs";

import { Button, ButtonLink, Card } from "@/components/ui";

const names = {
  organizer: "an organizer",
  attendee: "an attendee",
  admin: "an administrator",
} as const;

// WrongAccount explains that organizer and attendee accounts are separate (PRD §4) when
// someone signed in with one type opens the other's area.
export function WrongAccount({
  actual,
  expected,
}: {
  actual: keyof typeof names;
  expected: keyof typeof names;
}) {
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <Card className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">
          This area is for {names[expected]} account
        </h1>
        <p>
          You&apos;re signed in as {names[actual]}. Trybe keeps organizer and
          attendee accounts separate, so one sign-in can&apos;t be both. To
          continue, sign out and use a different email for {names[expected]}{" "}
          account.
        </p>
        <div className="flex flex-wrap gap-3">
          <SignOutButton>
            <Button>Sign out</Button>
          </SignOutButton>
          <ButtonLink
            variant="secondary"
            href={actual === "organizer" ? "/organizer" : "/profile"}
          >
            Back to my account
          </ButtonLink>
        </div>
      </Card>
    </main>
  );
}
