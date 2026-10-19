// Pure rules for one conversation thread (web#19). JSX-free so node --test can
// enforce them: history pages merge without gaps or duplicates, day separators
// follow the browser's timezone, and the composer only enables when the API
// says messaging is allowed.

import type { components } from "@/lib/api/schema";

export type Message = components["schemas"]["Message"];
export type Conversation = components["schemas"]["Conversation"];
export type MessagePage = {
  items: Message[];
  next_cursor?: string | null;
};

export const MAX_MESSAGE_LENGTH = 4000;

/** Oldest first, matching how a chat reads. Ids break timestamp ties. */
export function byOldestFirst(left: Message, right: Message): number {
  const byTime = left.created_at.localeCompare(right.created_at);
  return byTime !== 0 ? byTime : left.id.localeCompare(right.id);
}

/**
 * Fold a page of messages into the ones already held. Ids are the identity: a
 * message that arrives twice (socket echo plus REST response, or a backfill
 * overlapping the held page) appears once, and the newly fetched copy wins
 * because the server is the source of truth.
 */
export function mergeMessages(
  held: readonly Message[],
  incoming: readonly Message[],
): Message[] {
  const byId = new Map(held.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(byOldestFirst);
}

/** The cursor for the next older page, or null when history is exhausted. */
export function olderPageCursor(page: MessagePage | null | undefined) {
  return page?.next_cursor ?? null;
}

/**
 * A one-to-one thread has exactly one other participant, so anything not sent
 * by them was sent by the viewer. This avoids a second call for the viewer's
 * attendee id.
 */
export function isOwnMessage(
  message: Message,
  otherAttendeeId: string,
): boolean {
  return message.sender_id !== otherAttendeeId;
}

const sameLocalDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

/** Local calendar day key; null for a timestamp the client can't parse. */
export function dayKey(iso: string): string | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return `${at.getFullYear()}-${at.getMonth() + 1}-${at.getDate()}`;
}

/** "Today", "Yesterday", or a short date in the viewer's own timezone. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  if (sameLocalDay(at, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameLocalDay(at, yesterday)) return "Yesterday";
  return at.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(at.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export type DayGroup = { key: string; label: string; messages: Message[] };

/**
 * Split an ascending thread into day sections. Consecutive messages on the
 * same local day share one separator; an unparseable timestamp is skipped
 * rather than starting a section labelled "Invalid Date".
 */
export function groupMessagesByDay(
  messages: readonly Message[],
  now: Date = new Date(),
): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const message of messages) {
    const key = dayKey(message.created_at);
    if (!key) continue;
    const last = groups.at(-1);
    if (last && last.key === key) {
      last.messages.push(message);
      continue;
    }
    groups.push({
      key,
      label: dayLabel(message.created_at, now),
      messages: [message],
    });
  }
  return groups;
}

/** "14:05" in the viewer's timezone; empty for an unparseable timestamp. */
export function messageTimeLabel(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type ComposerState = {
  /** The API says messaging isn't allowed, so the control is unusable. */
  locked: boolean;
  canSubmit: boolean;
  /** Why it is locked or why the text can't be sent. Null when neither. */
  reason: string | null;
  length: number;
};

/**
 * Composer rules. A block or a closed connection locks the control and always
 * wins over a text-length message, so the reason shown is the real one.
 * Whitespace is not a message, and the API's 4000-character limit is enforced
 * here as well as there.
 */
export function composerState({
  canSend,
  blocked,
  sending,
  body,
}: {
  canSend: boolean;
  blocked: boolean;
  sending: boolean;
  body: string;
}): ComposerState {
  const text = body.trim();
  const length = text.length;
  if (blocked)
    return {
      locked: true,
      canSubmit: false,
      reason: "You blocked this person. Unblock them to message again.",
      length,
    };
  if (!canSend)
    return {
      locked: true,
      canSubmit: false,
      reason: "This connection has ended, so you can't send new messages.",
      length,
    };
  if (length > MAX_MESSAGE_LENGTH)
    return {
      locked: false,
      canSubmit: false,
      reason: "Messages can be up to 4,000 characters.",
      length,
    };
  return {
    locked: false,
    canSubmit: length > 0 && !sending,
    reason: null,
    length,
  };
}

/** The newest message the other person sent, or null when there is none. */
export function newestIncomingAt(
  messages: readonly Message[],
  otherAttendeeId: string,
): string | null {
  let newest: string | null = null;
  for (const message of messages) {
    if (message.sender_id !== otherAttendeeId) continue;
    if (!newest || message.created_at > newest) newest = message.created_at;
  }
  return newest;
}

/**
 * Read receipts are per conversation in the contract (POST .../read), so the
 * thread only calls it when a message from the other person is newer than the
 * last time it marked the thread read. Own messages never trigger it.
 */
export function shouldMarkRead(
  messages: readonly Message[],
  otherAttendeeId: string,
  lastMarkedAt: string | null,
): boolean {
  const newest = newestIncomingAt(messages, otherAttendeeId);
  if (!newest) return false;
  return lastMarkedAt === null || newest > lastMarkedAt;
}
