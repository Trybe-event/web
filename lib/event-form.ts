import { z } from "zod";
import type { Schemas } from "./api/client";

// Mirrors the API's fixed category list (internal/events/patch.go).
export const eventCategories = [
  "Business & Professional",
  "Entrepreneurship & Startups",
  "Finance & Investing",
  "Technology",
  "AI & Data",
  "Science & Research",
  "Education & Learning",
  "Career & Jobs",
  "Community & Culture",
  "Government & Politics",
  "Charity & Causes",
  "Health & Wellness",
  "Sports & Fitness",
  "Food & Drink",
  "Music",
  "Film, Media & Entertainment",
  "Performing Arts",
  "Visual Arts",
  "Fashion & Beauty",
  "Design & Creativity",
  "Faith & Spirituality",
  "Travel & Outdoor",
  "Other",
] as const;

const timestamp = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        value,
      ) && Number.isFinite(Date.parse(value)),
    "Enter a valid date and time.",
  )
  .optional();
export const eventDraftSchema = z
  .object({
    name: z.string().max(160).optional(),
    format: z.enum(["physical", "virtual", "hybrid"]).optional(),
    timezone: z
      .string()
      .refine((value) => {
        try {
          if (value !== "UTC" && !value.includes("/")) return false;
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Choose a valid IANA timezone.")
      .optional(),
    starts_at: timestamp,
    ends_at: timestamp,
    venue_name: z.string().max(200).nullable().optional(),
    venue_address: z.string().max(500).nullable().optional(),
    attendance_url: z
      .string()
      .max(500)
      .refine((value) => {
        if (!value) return true;
        try {
          const url = new URL(value);
          return url.protocol === "https:" && !!url.hostname;
        } catch {
          return false;
        }
      }, "Use a full https:// link.")
      .nullable()
      .optional(),
    summary: z.string().max(280).optional(),
    description: z.string().max(10000).optional(),
    topics: z.array(z.string().max(40)).max(20).optional(),
    image_key: z.string().nullable().optional(),
    visibility: z.enum(["public", "private"]).optional(),
    registration_opens_at: timestamp.nullable(),
    registration_closes_at: timestamp.nullable(),
    networking_opens_at: timestamp.nullable(),
    networking_closes_at: timestamp.nullable(),
    category: z.string().nullable().optional(),
    approval_mode: z.enum(["automatic", "review"]).optional(),
    capacity: z
      .number({ message: "Enter a whole number." })
      .int("Enter a whole number.")
      .min(1, "Capacity must be at least 1.")
      .max(100000)
      .nullable()
      .optional(),
    waitlist_enabled: z.boolean().optional(),
  })
  .superRefine((event, context) => {
    if (event.format === "physical" || event.format === "hybrid") {
      for (const field of ["venue_name", "venue_address"] as const) {
        if (event[field] !== undefined && !event[field]?.trim())
          context.addIssue({
            code: "custom",
            path: [field],
            message: "Required for in-person and hybrid events.",
          });
      }
    }
    for (const [start, end] of [
      ["starts_at", "ends_at"],
      ["registration_opens_at", "registration_closes_at"],
      ["networking_opens_at", "networking_closes_at"],
    ] as const) {
      if (
        event[start] &&
        event[end] &&
        Date.parse(event[end]) <= Date.parse(event[start])
      )
        context.addIssue({
          code: "custom",
          path: [end],
          message: "The closing time must be after the opening time.",
        });
    }
  });
export type EventDraft = z.infer<typeof eventDraftSchema>;
export function eventDraftValues(event: Schemas["Event"]): EventDraft {
  const values: Record<string, unknown> = {};
  for (const key of Object.keys(eventDraftSchema.shape))
    if (event[key as keyof typeof event] !== undefined)
      values[key] = event[key as keyof typeof event];
  return values as EventDraft;
}
