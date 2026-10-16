import { eventDraftSchema, type EventDraft } from "./event-form";

export function createPublicationLock() {
  let pending: Promise<void> | undefined;
  return (action: () => Promise<void>): Promise<void> => {
    if (pending) return pending;
    pending = Promise.resolve()
      .then(action)
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
}

export function publicationErrors(draft: EventDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const parsed = eventDraftSchema.safeParse(draft);
  if (!parsed.success)
    for (const issue of parsed.error.issues)
      errors[String(issue.path[0])] = issue.message;
  const required: (keyof EventDraft)[] = [
    "name",
    "format",
    "timezone",
    "starts_at",
    "ends_at",
    "visibility",
  ];
  if (draft.format === "physical" || draft.format === "hybrid")
    required.push("venue_name", "venue_address");
  if (draft.format === "virtual" || draft.format === "hybrid")
    required.push("attendance_url");
  for (const name of required)
    if (typeof draft[name] !== "string" || !String(draft[name]).trim())
      errors[name] = "Complete this field before publishing.";
  return errors;
}
