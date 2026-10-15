// MSW handlers built from the API contract. They let screens be built before the backend
// lands. Each feature issue adds handlers for its endpoints; keep shapes identical to
// contract/openapi.yaml (the types below enforce it).
import { http, HttpResponse } from "msw";

import type { components } from "@/lib/api/schema";

type S = components["schemas"];

const now = () => new Date().toISOString();

let account: S["Account"] | null = null;
let profile: S["OwnProfile"] | null = null;
let privacy: S["PrivacySettings"] = {
  accepting_requests: true,
  ai_matching_opt_out: false,
};

const notFound = (message: string) =>
  HttpResponse.json<S["Error"]>(
    { code: "not_found", message },
    { status: 404 },
  );

export const handlers = [
  http.get("/api/me/account", () =>
    account
      ? HttpResponse.json(account)
      : notFound("No account is set up for this sign-in yet."),
  ),

  http.post("/api/accounts/attendee", async ({ request }) => {
    const body = (await request.json()) as S["AttendeeSignup"];
    if (account && account.type !== "attendee") {
      return HttpResponse.json<S["Error"]>(
        {
          code: "account_type_conflict",
          message:
            "This sign-in already belongs to a different kind of Trybe account.",
        },
        { status: 409 },
      );
    }
    const created = !account;
    account ??= {
      id: crypto.randomUUID(),
      type: "attendee",
      full_name: body.full_name,
      organization: null,
      created_at: now(),
    };
    return HttpResponse.json(account, { status: created ? 201 : 200 });
  }),

  http.get("/api/me/profile", () =>
    profile
      ? HttpResponse.json(profile)
      : notFound("You haven't created your profile yet."),
  ),

  http.put("/api/me/profile", async ({ request }) => {
    const body = (await request.json()) as S["ProfileInput"];
    profile = {
      ...body,
      links: body.links ?? [],
      attendee_id: account?.id ?? crypto.randomUUID(),
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
    const view: S["Profile"] = {
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
    privacy = (await request.json()) as S["PrivacySettings"];
    return HttpResponse.json(privacy);
  }),

  http.post("/api/uploads", () =>
    HttpResponse.json<S["Error"]>(
      {
        code: "unavailable",
        message: "Image uploads aren't available in mock mode.",
      },
      { status: 503 },
    ),
  ),
];
