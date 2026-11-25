"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Field, Input } from "@/components/ui";
import { api } from "@/lib/api/client";
import { eventSlugFromInput, routes } from "@/lib/routes";

// For an attendee who heard about an event but has no QR code to scan: paste the
// invitation link or type its code, then review and join on the event's page.
export function EventCodeEntry() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) {
      setError("Enter an event code or link.");
      return;
    }
    const slug = eventSlugFromInput(value);
    if (!slug) {
      setError(
        "That isn't a Trybe event link or code. Codes look like 7lqrd4.",
      );
      return;
    }
    setError(null);
    setOpening(true);
    // Check the code first, so a mistyped one is answered here instead of a 404 page.
    try {
      const { response } = await api.GET("/e/{slug}", {
        params: { path: { slug } },
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 404) {
        setError("That event code is not correct. Check it and try again.");
        setOpening(false);
        return;
      }
    } catch {
      // Network trouble: let the event page load and explain itself.
    }
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
