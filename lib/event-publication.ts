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
    "summary",
    "description",
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

const stageFields = [
  [
    "name",
    "format",
    "timezone",
    "starts_at",
    "ends_at",
    "venue_name",
    "venue_address",
    "attendance_url",
  ],
  ["summary", "description", "topics", "image_key", "program"],
  [
    "visibility",
    "registration_opens_at",
    "registration_closes_at",
    "networking_opens_at",
    "networking_closes_at",
  ],
];
export function eventFieldStage(name: string): number {
  const stage = stageFields.findIndex((fields) => fields.includes(name));
  return stage < 0 ? 1 : stage;
}
export function eventStageErrors(
  draft: EventDraft,
  stage: number,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(publicationErrors(draft)).filter(
      ([name]) => eventFieldStage(name) === stage,
    ),
  );
}
