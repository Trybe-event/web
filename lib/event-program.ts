import { z } from "zod";
import type { Schemas } from "./api/client";
import { localEventTime } from "./event-time";

export const programDaySchema = z.object({
  date: z.string().date("Choose a valid program date."),
  title: z.string().max(200).nullable().optional(),
});
export const sessionSchema = z
  .object({
    title: z.string().trim().min(1, "Add the session title.").max(200),
    description: z.string().max(4000).optional(),
    starts_at: z
      .string()
      .datetime({ offset: true, message: "Choose when this session starts." }),
    ends_at: z
      .string()
      .datetime({ offset: true, message: "Choose when this session ends." }),
    room: z.string().max(120).nullable().optional(),
    track: z.string().max(120).nullable().optional(),
    speakers: z
      .array(
        z.object({
          name: z.string().trim().min(1, "Add the speaker's name.").max(120),
          role: z.string().max(120).nullable().optional(),
          organization: z.string().max(160).nullable().optional(),
          bio: z.string().max(1000).nullable().optional(),
        }),
      )
      .max(10)
      .optional(),
  })
  .superRefine((session, context) => {
    if (Date.parse(session.ends_at) <= Date.parse(session.starts_at))
      context.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "End must be after start.",
      });
    const names = new Set<string>();
    session.speakers?.forEach((speaker, index) => {
      const normalized = speaker.name.trim().replace(/\s+/g, " ").toLowerCase();
      if (names.has(normalized))
        context.addIssue({
          code: "custom",
          path: ["speakers", index, "name"],
          message: "This speaker is already listed.",
        });
      names.add(normalized);
    });
  });
export function programDayError(
  date: string,
  event: Schemas["Event"],
): string | undefined {
  if (!event.starts_at || !event.ends_at || !event.timezone)
    return "Save the event dates and timezone before adding program days.";
  const first = localEventTime(event.starts_at, event.timezone).slice(0, 10);
  const last = localEventTime(event.ends_at, event.timezone).slice(0, 10);
  return date < first || date > last
    ? "Choose a program date within the event's schedule."
    : undefined;
}
export function sessionScheduleErrors(
  session: Schemas["SessionInput"],
  day: Schemas["ProgramDayInput"],
  event: Schemas["Event"],
): Record<string, string> {
  if (Date.parse(session.ends_at) <= Date.parse(session.starts_at))
    return { ends_at: "End must be after start." };
  if (
    !event.starts_at ||
    !event.ends_at ||
    !event.timezone ||
    Date.parse(session.starts_at) < Date.parse(event.starts_at) ||
    Date.parse(session.ends_at) > Date.parse(event.ends_at) ||
    localEventTime(session.starts_at, event.timezone).slice(0, 10) !== day.date
  )
    return {
      starts_at:
        "Choose a time on this program day within the event's saved schedule.",
    };
  return {};
}
