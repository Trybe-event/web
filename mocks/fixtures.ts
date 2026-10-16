// Event fixtures for the browser mocks: the attendee's memberships, which drive the
// event switcher (web#9), and the event each one points at. Both come from one list so
// the switcher and the landing page can't disagree.
import type { components } from "@/lib/api/schema";

export type MyEvent = components["schemas"]["MyEvent"];
export type PublicEvent = components["schemas"]["PublicEvent"];

const at = (days: number) =>
  new Date(Date.UTC(2026, 10, 15 + days, 9)).toISOString();

export const MOCK_MY_EVENTS: MyEvent[] = [
  {
    event: {
      id: "11111111-1111-4111-8111-111111111111",
      slug: "atlas-summit",
      name: "Atlas Summit",
      format: "physical",
      timezone: "Africa/Lagos",
      starts_at: at(0),
      ends_at: at(1),
      venue_name: "Landmark Centre",
      venue_address: "Water Corporation Road, Lagos",
      attendance_url: null,
      summary: "Two days of builders, founders and quiet operators.",
      description: "",
      topics: ["product", "community"],
      image_url: null,
      status: "published",
      registration_state: "open",
      networking_state: "not_open",
      program: { days: [] },
    },
    membership: {
      event_id: "11111111-1111-4111-8111-111111111111",
      status: "active",
      joined_at: at(-14),
    },
  },
  {
    event: {
      id: "22222222-2222-4222-8222-222222222222",
      slug: "harbour-meetup",
      name: "Harbour Meetup",
      format: "hybrid",
      timezone: "Africa/Lagos",
      starts_at: at(21),
      ends_at: at(21),
      venue_name: null,
      venue_address: null,
      attendance_url: "https://example.com/harbour-meetup",
      summary: "An evening for the people who keep the lights on.",
      description: "",
      topics: ["engineering"],
      image_url: null,
      status: "published",
      registration_state: "open",
      networking_state: "not_open",
      program: { days: [] },
    },
    membership: {
      event_id: "22222222-2222-4222-8222-222222222222",
      status: "active",
      joined_at: at(-3),
    },
  },
];

export const MOCK_PUBLIC_EVENTS: PublicEvent[] = MOCK_MY_EVENTS.map(
  (item) => item.event,
);

export const toEventOptions = (items: MyEvent[]) =>
  items
    .filter((item) => item.membership.status === "active" && item.event.slug)
    .map((item) => ({ slug: item.event.slug, name: item.event.name }));
