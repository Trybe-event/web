"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Alert, Button } from "@/components/ui";
import { RegistrationAnswers } from "@/components/engagement";
import { api, errorMessage, fieldErrors, type Schemas } from "@/lib/api/client";
import { routes } from "@/lib/routes";
import { LegalNotice } from "@/components/legal/legal-notice";

// What an attendee sees when the organizer has not admitted them yet.
const registrationNotice: Record<string, string> = {
  pending:
    "You're registered. The organizer reviews each registration, and you can join the event space once they approve you.",
  waitlisted:
    "This event is full, so you're on the waitlist. You'll be admitted automatically if a place frees up.",
  rejected: "The organizer didn't approve this registration.",
};

// JoinEvent is the explicit join step (web#7): the attendee presses the button, the
// API records the membership, and the workspace opens. Joining is idempotent, so a
// second press is harmless.
export function JoinEvent({
  slug,
  name,
  label,
  disabled = false,
  questions = [],
}: {
  slug: string;
  name: string;
  label?: string;
  disabled?: boolean;
  questions?: Schemas["RegistrationQuestion"][];
}) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [failure, setFailure] = useState("");
  const [waiting, setWaiting] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const pending = useRef(false);

  async function join() {
    if (pending.current || disabled) return;
    pending.current = true;
    setJoining(true);
    setFailure("");
    setWaiting("");
    setAnswerErrors({});
    try {
      const { data, error, response } = await api.POST("/e/{slug}/join", {
        params: { path: { slug } },
        ...(questions.length ? { body: { answers } } : {}),
      });
      if (response.status === 400) {
        setAnswerErrors(fieldErrors(error));
        setFailure(
          questions.length
            ? "Answer the highlighted registration questions."
            : "This event asks a few registration questions. Open the event page to answer them.",
        );
        return;
      }
      if (data && data.status !== "active") {
        setWaiting(
          registrationNotice[data.status] ??
            "Your registration is waiting for the organizer.",
        );
        return;
      }
      if (response.ok && !error) {
        router.push(routes.eventWorkspace(slug));
        router.refresh();
        return;
      }
      setFailure(
        response.status === 409
          ? errorMessage(error, "You can't join this event right now.")
          : errorMessage(
              error,
              "We couldn't join you to this event. Try again.",
            ),
      );
    } catch {
      setFailure("We couldn't join you to this event. Try again.");
    } finally {
      pending.current = false;
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <RegistrationAnswers
        questions={questions}
        values={answers}
        errors={answerErrors}
        onChange={setAnswers}
      />
      <LegalNotice action="join" />
      <Button
        loading={joining}
        disabled={disabled || joining}
        onClick={join}
        aria-label={label ?? `Join ${name}`}
      >
        {label ?? `Join ${name}`}
      </Button>
      {waiting && (
        <p role="status" className="text-sm font-medium">
          {waiting}
        </p>
      )}
      {failure && <Alert>{failure}</Alert>}
    </div>
  );
}
