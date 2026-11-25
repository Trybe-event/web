import { z } from "zod";
import type { Schemas } from "./api/client";
export const networkingWindowSchema = z
  .object({
    opens_at: z
      .string()
      .datetime({ offset: true, message: "Choose an opening date and time." }),
    closes_at: z
      .string()
      .datetime({ offset: true, message: "Choose a closing date and time." }),
  })
  .superRefine((window, context) => {
    if (Date.parse(window.closes_at) <= Date.parse(window.opens_at))
      context.addIssue({
        code: "custom",
        path: ["closes_at"],
        message: "Networking must close after it opens.",
      });
  });
export type NetworkingWindow = z.infer<typeof networkingWindowSchema>;
export function lifecycleStatuses(
  event: Pick<
    Schemas["Event"],
    "status" | "registration_state" | "networking_state"
  >,
) {
  const eventLabels = {
    draft: "Draft",
    published: "Published",
    ended: "Ended",
  };
  const windowLabels = { not_open: "Not open", open: "Open", closed: "Closed" };
  return [
    { label: "Event", value: eventLabels[event.status] },
    {
      label: "Registration",
      value: event.registration_state
        ? windowLabels[event.registration_state]
        : "Unavailable",
    },
    {
      label: "Networking",
      value: event.networking_state
        ? windowLabels[event.networking_state]
        : "Unavailable",
    },
  ];
}

// Trybe ends a published event this long after its scheduled end (api: event-auto-end).
export const AUTO_END_GRACE_MINUTES = 30;

type Timed = {
  status: "draft" | "published" | "ended";
  ends_at?: string | null;
};

// awaitingEnd: published, and the scheduled end has passed.
export function awaitingEnd(event: Timed, now = Date.now()) {
  return (
    event.status === "published" &&
    !!event.ends_at &&
    Date.parse(event.ends_at) <= now
  );
}

// eventListTab places an event on the organizer dashboard. A finished event belongs
// under Past even in the few minutes before it is formally ended.
export function eventListTab(event: Timed, now = Date.now()) {
  return awaitingEnd(event, now) ? "ended" : event.status;
}

export function autoEndTime(endsAt: string) {
  return new Date(Date.parse(endsAt) + AUTO_END_GRACE_MINUTES * 60_000);
}
