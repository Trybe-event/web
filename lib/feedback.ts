// Pure rules for the attendee relevance prompt (web#28). JSX-free so node --test can
// enforce them. The prompt fires from two contract facts only: an accepted connection
// reports the event it came from, and a membership reports its event's networking
// window. Nothing here reads or writes anything but those responses.

import type { components } from "@/lib/api/schema";

export type MyEvent = components["schemas"]["MyEvent"];
export type Connection = components["schemas"]["Connection"];

/** Why the prompt is being offered right now. */
export type FeedbackTrigger = "connection" | "networking_closed";

export type FeedbackCandidate = {
  /** The event the feedback is about; this is the `event_id` POST /feedback wants. */
  eventId: string;
  eventName: string;
  trigger: FeedbackTrigger;
  /** The moment that triggered the prompt, used only to order candidates. */
  triggeredAt: string;
};

/** A prompt is offered once per event: either it was answered or it was dismissed. */
export type FeedbackDecision = "submitted" | "dismissed";
export type FeedbackDecisions = Record<string, FeedbackDecision>;

export const FEEDBACK_STORAGE_KEY = "trybe.feedback.v1";
export const MAX_COMMENT_LENGTH = 1000;

/** The one-to-five scale, with the wording each radio button shows. */
export const RELEVANCE_CHOICES = [
  { score: 1, label: "Not relevant" },
  { score: 2, label: "Slightly" },
  { score: 3, label: "Somewhat" },
  { score: 4, label: "Relevant" },
  { score: 5, label: "Very relevant" },
] as const;

/**
 * The events that have earned a prompt, newest trigger first. An event with an
 * accepted connection is offered once, and an event whose networking has closed is
 * offered too — but never twice: the connection trigger is the earlier, more specific
 * reason, so it wins when both apply. Memberships that are not active are ignored,
 * because an attendee who left has nothing to rate.
 */
export function rankFeedbackCandidates(
  memberships: readonly MyEvent[],
  connections: readonly Connection[],
): FeedbackCandidate[] {
  const latestConnectionAt = new Map<string, string>();
  for (const connection of connections) {
    const eventId = connection.origin_event_id;
    const connectedAt = connection.connected_at;
    if (!eventId || !connectedAt) continue;
    const latest = latestConnectionAt.get(eventId);
    if (!latest || connectedAt > latest)
      latestConnectionAt.set(eventId, connectedAt);
  }

  const candidates: FeedbackCandidate[] = [];
  for (const { event, membership } of memberships) {
    if (membership.status !== "active") continue;
    const eventId = membership.event_id;
    const connectedAt = latestConnectionAt.get(eventId);
    if (connectedAt) {
      candidates.push({
        eventId,
        eventName: event.name,
        trigger: "connection",
        triggeredAt: connectedAt,
      });
    } else if (event.networking_state === "closed") {
      candidates.push({
        eventId,
        eventName: event.name,
        trigger: "networking_closed",
        triggeredAt: event.ends_at,
      });
    }
  }

  return candidates.sort(
    (left, right) =>
      right.triggeredAt.localeCompare(left.triggeredAt) ||
      left.eventId.localeCompare(right.eventId),
  );
}

/** The first candidate the attendee has not answered or dismissed yet. */
export function nextFeedbackCandidate(
  candidates: readonly FeedbackCandidate[],
  decisions: FeedbackDecisions,
): FeedbackCandidate | null {
  return (
    candidates.find(
      (candidate) => decisions[candidate.eventId] === undefined,
    ) ?? null
  );
}

/**
 * Read what this browser remembers. Anything malformed, unreadable or written by a
 * different version is treated as "nothing decided yet", so a prompt can come back
 * rather than disappear for good.
 */
export function parseDecisions(raw: string | null): FeedbackDecisions {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    const decisions: FeedbackDecisions = {};
    for (const [eventId, decision] of Object.entries(parsed)) {
      if (decision === "submitted" || decision === "dismissed")
        decisions[eventId] = decision;
    }
    return decisions;
  } catch {
    return {};
  }
}

/** The next stored value, keeping every earlier event's decision. */
export function recordDecision(
  raw: string | null,
  eventId: string,
  decision: FeedbackDecision,
): string {
  return JSON.stringify({ ...parseDecisions(raw), [eventId]: decision });
}

/**
 * The reason a submission cannot be sent, or null when it can. The contract accepts
 * only integers from 1 to 5 and a comment of at most 1,000 characters; the server
 * still validates, this just keeps the browser from sending a request it must reject.
 */
export function feedbackProblem(
  relevance: number | null,
  comment: string,
): string | null {
  if (
    relevance === null ||
    !Number.isInteger(relevance) ||
    relevance < 1 ||
    relevance > 5
  )
    return "Choose a relevance score from 1 to 5.";
  if (comment.length > MAX_COMMENT_LENGTH)
    return "Keep your comment to 1,000 characters or fewer.";
  return null;
}

/** The POST /feedback body. A blank comment is left out rather than sent empty. */
export function feedbackSubmission(
  eventId: string,
  relevance: number,
  comment: string,
): { event_id: string; relevance: number; comment?: string } {
  const trimmed = comment.trim();
  return {
    event_id: eventId,
    relevance,
    ...(trimmed ? { comment: trimmed } : {}),
  };
}
