import { http, HttpResponse } from "msw";
import type { components } from "@/lib/api/schema";

type Profile = components["schemas"]["Profile"];
const connectionRequests: components["schemas"]["ConnectionRequest"][] = [];
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
  http.get("/api/events/:eventId/attendees/:attendeeId", ({ params }) => {
    const profile = discoveryProfiles.find(
      (item) => item.attendee_id === params.attendeeId,
    );
    return profile
      ? HttpResponse.json(profile)
      : HttpResponse.json(
          { code: "not_found", message: "Profile unavailable." },
          { status: 404 },
        );
  }),
  http.post("/api/connection-requests", async ({ request }) => {
    const body = (await request.json()) as {
      event_id: string;
      recipient_id: string;
      message?: string;
    };
    const other = discoveryProfiles.find(
      (profile) => profile.attendee_id === body.recipient_id,
    );
    if (!other || !other.accepting_requests)
      return HttpResponse.json(
        {
          code: "conflict",
          message: "This attendee is not accepting requests.",
        },
        { status: 409 },
      );
    if (other.relationship !== "none")
      return HttpResponse.json(
        {
          code: "conflict",
          message: "A connection already exists or is pending.",
        },
        { status: 409 },
      );
    const connection: components["schemas"]["ConnectionRequest"] = {
      id: crypto.randomUUID(),
      event_id: body.event_id,
      other,
      direction: "outgoing",
      status: "pending",
      message: body.message,
      created_at: new Date().toISOString(),
    };
    connectionRequests.push(connection);
    other.relationship = "pending_outgoing";
    return HttpResponse.json(connection, { status: 201 });
  }),
  http.get("/api/me/connection-requests", ({ request }) =>
    HttpResponse.json({
      items: connectionRequests.filter(
        (item) =>
          item.status === "pending" &&
          item.direction === new URL(request.url).searchParams.get("direction"),
      ),
    }),
  ),
  http.post("/api/connection-requests/:requestId/:action", ({ params }) => {
    const connection = connectionRequests.find(
      (item) => item.id === params.requestId,
    );
    if (!connection) return;
    connection.status =
      params.action === "accept"
        ? "accepted"
        : params.action === "cancel"
          ? "cancelled"
          : "rejected";
    connection.other.relationship =
      connection.status === "accepted" ? "connected" : "none";
    return HttpResponse.json(connection);
  }),
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
