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
