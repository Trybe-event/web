// Server-side account lookup used by page guards. The account type comes from the API
// (its database binding), never from Clerk metadata.
import "server-only";

import { auth } from "@clerk/nextjs/server";

import type { components } from "./api/schema";
import { serverApi } from "./api/server";

export type Account = components["schemas"]["Account"];

export type SessionState =
  | { kind: "signed-out" }
  | { kind: "unbound" } // signed in with Clerk, no Trybe account type yet
  | { kind: "bound"; account: Account };

export async function getSession(): Promise<SessionState> {
  const { userId } = await auth();
  if (!userId) return { kind: "signed-out" };
  if (
    process.env.NEXT_PUBLIC_API_MOCKS === "1" &&
    process.env.NODE_ENV !== "production"
  ) {
    // Server components can't reach browser mocks; act as an attendee in mock mode.
    return {
      kind: "bound",
      account: {
        id: "00000000-0000-4000-8000-000000000001",
        type: "attendee",
        full_name: "Mock Attendee",
        organization: null,
        created_at: new Date().toISOString(),
      },
    };
  }
  const api = await serverApi();
  const { data, response } = await api.GET("/me/account");
  if (data) return { kind: "bound", account: data };
  if (response.status === 404) return { kind: "unbound" };
  if (response.status === 401) return { kind: "signed-out" };
  throw new Error(`GET /me/account failed with ${response.status}`);
}
