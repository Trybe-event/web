import { publicationErrors } from "./event-publication";
import type { EventDraft } from "./event-form";

export const eventSetupSteps = [
  "Event details",
  "Tickets",
  "Registration",
  "Experience",
  "Page",
  "Review",
] as const;

export const publishedEventSetupSteps = [
  "Event details",
  "Tickets",
  "Registration",
  "Experience",
  "Agenda & lineup",
  "Sponsors",
  "Polls",
  "Page",
  "Review",
] as const;

export function eventSetupFieldStep(field: string, published = false): number {
  if (published && field === "program") return 4;
  if (field === "program" || field.startsWith("networking_")) return 3;
  if (field === "visibility" || field.startsWith("registration_")) return 2;
  return 0;
}

export function eventSetupStepErrors(
  draft: EventDraft,
  step: number,
  published = false,
) {
  return Object.fromEntries(
    Object.entries(publicationErrors(draft)).filter(
      ([field]) => eventSetupFieldStep(field, published) === step,
    ),
  );
}
