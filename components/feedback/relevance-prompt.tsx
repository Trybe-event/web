"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { Button, Card, Field, Textarea, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api/client";
import {
  FEEDBACK_STORAGE_KEY,
  MAX_COMMENT_LENGTH,
  RELEVANCE_CHOICES,
  feedbackProblem,
  feedbackSubmission,
  nextFeedbackCandidate,
  parseDecisions,
  rankFeedbackCandidates,
  recordDecision,
  type FeedbackCandidate,
  type FeedbackDecision,
} from "@/lib/feedback";

// remember writes this event's decision into the browser's memory. Losing storage
// (private mode, full quota) must not cost the attendee their submission, so the
// failure is ignored here and the prompt simply returns on a later page.
function remember(candidate: FeedbackCandidate, decision: FeedbackDecision) {
  try {
    const raw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
    window.localStorage.setItem(
      FEEDBACK_STORAGE_KEY,
      recordDecision(raw, candidate.eventId, decision),
    );
  } catch {}
}

// RelevancePrompt is an in-flow card, never a dialog: it can't block the page behind
// it, and every control is a normal keyboard-reachable form control. It offers one
// event at a time, and never the same event twice once answered or dismissed (web#28).
export function RelevancePrompt() {
  const [candidate, setCandidate] = useState<FeedbackCandidate | null>(null);
  const [relevance, setRelevance] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();
  const id = useId();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [events, connections] = await Promise.all([
          api.GET("/me/events", { signal: AbortSignal.timeout(8000) }),
          api.GET("/me/connections", { signal: AbortSignal.timeout(8000) }),
        ]);
        if (!active) return;
        const decisions = parseDecisions(
          window.localStorage.getItem(FEEDBACK_STORAGE_KEY),
        );
        const candidates = rankFeedbackCandidates(
          events.data?.items ?? [],
          connections.data?.items ?? [],
        );
        setCandidate(nextFeedbackCandidate(candidates, decisions));
      } catch {
        // An unreachable API simply means no prompt; nothing else is affected.
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (!candidate) return null;

  if (sent) {
    return (
      <Card className="mt-6">
        <p role="status" className="text-sm font-semibold">
          Thanks — your feedback was recorded. It helps organizers make the next
          event better.
        </p>
      </Card>
    );
  }

  const reason =
    candidate.trigger === "connection"
      ? `You connected with someone at ${candidate.eventName}.`
      : `Networking has closed at ${candidate.eventName}.`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!candidate) return;
    const score = relevance;
    const validation = feedbackProblem(score, comment);
    if (validation) {
      setProblem(validation);
      return;
    }
    if (score === null) return;
    setSubmitting(true);
    const { error } = await api.POST("/feedback", {
      body: feedbackSubmission(candidate.eventId, score, comment),
    });
    setSubmitting(false);
    if (error) {
      setProblem(errorMessage(error, "Your feedback wasn't sent. Try again."));
      return;
    }
    remember(candidate, "submitted");
    setSent(true);
    toast("Thanks — your feedback was recorded.");
  }

  function dismiss() {
    if (!candidate) return;
    remember(candidate, "dismissed");
    setCandidate(null);
  }

  return (
    <Card className="mt-6" aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Pilot feedback
          </span>
          <h2 id={`${id}-title`} className="mt-1 text-lg font-bold">
            How relevant was {candidate.eventName}?
          </h2>
          <p className="mt-1 text-sm text-muted">
            {reason} One question, a moment of your time — dismiss it if you
            would rather not answer.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={dismiss}
          aria-label={`Dismiss the feedback prompt for ${candidate.eventName}`}
        >
          Dismiss
        </Button>
      </div>

      <form className="mt-4 flex flex-col gap-4" onSubmit={submit} noValidate>
        <fieldset>
          <legend className="text-sm font-semibold">
            How relevant was it to you?
          </legend>
          <p className="mt-1 text-sm text-muted">
            1 means not relevant, 5 means very relevant.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RELEVANCE_CHOICES.map((choice) => (
              <label
                key={choice.score}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm has-checked:border-ink has-checked:bg-lime/40"
              >
                <input
                  type="radio"
                  name={`${id}-relevance`}
                  value={choice.score}
                  checked={relevance === choice.score}
                  onChange={() => {
                    setRelevance(choice.score);
                    setProblem(null);
                  }}
                  disabled={submitting}
                  className="size-4"
                />
                <span className="font-semibold">{choice.score}</span>
                <span className="text-muted">{choice.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          label="Anything to add?"
          optional
          hint={`Up to ${MAX_COMMENT_LENGTH.toLocaleString()} characters.`}
        >
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              rows={3}
              maxLength={MAX_COMMENT_LENGTH}
              value={comment}
              disabled={submitting}
              onChange={(event) => {
                setComment(event.target.value);
                setProblem(null);
              }}
            />
          )}
        </Field>

        {problem && (
          <p role="alert" className="text-sm font-medium text-danger">
            {problem}
          </p>
        )}

        <div>
          <Button type="submit" loading={submitting}>
            Send feedback
          </Button>
        </div>
      </form>
    </Card>
  );
}
