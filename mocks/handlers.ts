// Mock Service Worker handlers built from the API contract. They let screens be built before the backend
// lands. Each feature issue adds handlers for its endpoints; keep shapes identical to
// contract/openapi.yaml (the types below enforce it).
import { http, HttpResponse } from "msw";

import type { components } from "@/lib/api/schema";

type ApiSchemas = components["schemas"];

const now = () => new Date().toISOString();

let profile: ApiSchemas["OwnProfile"] | null = null;
let privacy: ApiSchemas["PrivacySettings"] = {
  accepting_requests: true,
  ai_matching_opt_out: false,
};

const notFound = (message: string) =>
  HttpResponse.json<ApiSchemas["Error"]>(
    { code: "not_found", message },
    { status: 404 },
  );

export const apiMockHandlers = [
  http.get("/api/me/profile", () =>
    profile
      ? HttpResponse.json(profile)
      : notFound("You haven't created your profile yet."),
  ),

  http.put("/api/me/profile", async ({ request }) => {
    const body = (await request.json()) as ApiSchemas["ProfileInput"];
    profile = {
      ...body,
      links: body.links ?? [],
      attendee_id: crypto.randomUUID(),
      photo_url: null,
      updated_at: now(),
    };
    return HttpResponse.json(profile);
  }),

  http.get("/api/me/profile/preview", ({ request }) => {
    if (!profile) return notFound("You haven't created your profile yet.");
    const as = new URL(request.url).searchParams.get("as");
    const allowed =
      as === "connection"
        ? ["connections", "event_members"]
        : ["event_members"];
    const view: ApiSchemas["Profile"] = {
      attendee_id: profile.attendee_id,
      full_name: profile.full_name,
      role: profile.role,
      bio: profile.bio,
      ...(profile.organization ? { organization: profile.organization } : {}),
      ...(profile.goals ? { goals: profile.goals } : {}),
      skills: profile.skills,
      interests: profile.interests,
      links: (profile.links ?? [])
        .filter((l) => allowed.includes(l.visibility))
        .map(({ kind, value }) => ({ kind, value })),
      accepting_requests: privacy.accepting_requests,
      relationship: as === "connection" ? "connected" : "none",
    };
    return HttpResponse.json(view);
  }),

  http.get("/api/me/privacy", () => HttpResponse.json(privacy)),
  http.put("/api/me/privacy", async ({ request }) => {
    privacy = (await request.json()) as ApiSchemas["PrivacySettings"];
    return HttpResponse.json(privacy);
  }),

  http.post("/api/uploads", () =>
    HttpResponse.json<ApiSchemas["Error"]>(
      {
        code: "unavailable",
        message: "Image uploads aren't available in mock mode.",
      },
      { status: 503 },
    ),
  ),
];
