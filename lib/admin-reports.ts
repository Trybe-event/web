import { z } from "zod";

export const reportActionSchema = z.object({
  action: z.enum(["dismiss", "warn", "remove_membership", "suspend"], {
    error: "Choose an action.",
  }),
  reason: z
    .string()
    .trim()
    .min(1, "Explain the reason for this action.")
    .max(1000, "Keep the reason to 1,000 characters."),
});

export type ReportAction = z.infer<typeof reportActionSchema>["action"];

export const REPORT_ACTIONS: Record<
  ReportAction,
  { label: string; consequence: string }
> = {
  dismiss: {
    label: "Dismiss report",
    consequence:
      "Mark this report as dismissed. This does not reverse an earlier moderation action.",
  },
  warn: {
    label: "Record warning",
    consequence:
      "Record a warning in the moderation audit. This action does not send an email or notification.",
  },
  remove_membership: {
    label: "Remove event membership",
    consequence:
      "Remove the reported attendee from the event associated with this report. Other event memberships remain unchanged.",
  },
  suspend: {
    label: "Suspend attendee",
    consequence:
      "Suspend the reported attendee and remove their active event memberships. They will lose attendee access.",
  },
};
