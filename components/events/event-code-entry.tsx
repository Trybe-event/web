"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Field, Input } from "@/components/ui";
import { eventSlugFromInput, routes } from "@/lib/routes";

// For an attendee who heard about an event but has no QR code to scan: paste the
// invitation link or type its code, then review and join on the event's page.
export function EventCodeEntry() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = eventSlugFromInput(value);
    if (!slug) {
      setError(
        "That isn't a Trybe event link or code. Codes look like 7lqrd4.",
      );
      return;
    }
    setError(null);
    setOpening(true);
    router.push(routes.eventLanding(slug));
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3"
      aria-labelledby="event-code-title"
    >
      <h2 id="event-code-title" className="text-xl font-bold">
        Have an event link or code?
      </h2>
      <Field
        label="Event link or code"
        hint="Paste the organizer's invitation link, or type the code at the end of it."
        error={error ?? undefined}
      >
        {(props) => (
          <Input
            {...props}
            value={value}
            onChange={(change) => setValue(change.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="7lqrd4"
          />
        )}
      </Field>
      <div>
        <Button type="submit" loading={opening}>
          Go to event
        </Button>
      </div>
    </form>
  );
}
