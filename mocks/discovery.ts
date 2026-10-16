import { http, HttpResponse } from "msw";
import type { components } from "@/lib/api/schema";

type Profile = components["schemas"]["Profile"];
export const discoveryProfiles: Profile[] = Array.from(
  { length: 25 },
  (_, index) => ({
    attendee_id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    full_name: `Sample attendee ${index + 1}`,
    role: index % 2 ? "Product designer" : "Software engineer",
    bio: "Interested in meeting people who build useful products.",
    skills: index % 2 ? ["Design"] : ["React", "TypeScript"],
    interests: ["Technology", "Community"],
    goals: "Meet collaborators",
    accepting_requests: index % 5 !== 0,
    relationship: "none",
  }),
);

export const discoveryHandlers = [
  http.get("/api/events/:eventId/attendees", ({ request }) => {
    const query = new URL(request.url).searchParams;
    const selected = discoveryProfiles.filter((profile) => {
      const includes = (value: string | undefined, filter: string | null) =>
        !filter || (value || "").toLowerCase().includes(filter.toLowerCase());
      return (
        includes(
          `${profile.full_name} ${profile.role} ${profile.bio}`,
          query.get("q"),
        ) &&
        includes(profile.role, query.get("role")) &&
        includes(profile.goals, query.get("goal")) &&
        query
          .getAll("skill")
          .every((skill) => profile.skills?.includes(skill)) &&
        query
          .getAll("interest")
          .every((interest) => profile.interests?.includes(interest))
      );
    });
    const offset = Number(query.get("cursor") || 0);
    const limit = Math.min(Number(query.get("limit") || 20), 100);
    if (
      !Number.isInteger(offset) ||
      offset < 0 ||
      !Number.isInteger(limit) ||
      limit < 1
    )
      return HttpResponse.json(
        { code: "validation", message: "Invalid page." },
        { status: 400 },
      );
    return HttpResponse.json({
      items: selected.slice(offset, offset + limit),
      next_cursor:
        offset + limit < selected.length ? String(offset + limit) : null,
    });
  }),
];
