# Conventions

How we build the Trybe web app. Read this, `AGENTS.md`, and `contract/openapi.yaml` before starting an issue.

## Branches and merges

- `main` only receives audited milestone merges (M1 → M2 → M3 → M4).
- Each milestone has an integration branch: `milestone/m1` … `milestone/m4`.
- One branch per issue, named in the issue (for example `m2/web-landing`), cut from its milestone branch. PRs go into the milestone branch, never into `main`.

## Layout

```text
app/
  page.tsx                Home: choose attendee or organizer
  account/setup/          Signed in but no account type yet: choose one
  attendee/               Attendee workspace
    sign-in/ sign-up/     Clerk screens for attendees
    complete/             Create the attendee account (permanent choice)
    profile/              Profile, edit (onboarding), preview, settings
  organizer/              Organizer workspace
    sign-in/ sign-up/     Clerk screens for organizers
    complete/             Create the organizer account (permanent choice)
  profile/                Legacy links; redirect into /attendee
  [slug]/                 Event landing page (public)
  events/[slug]/          Attendee event workspace
  api/[...path]/          Same-origin proxy to the Go API
components/
  ui/                     Base components (Button, Field, Card, Dialog, ...)
  auth/                   Auth shell, Clerk forms, account completion, workspace frame
lib/
  api/                    Generated types, browser client, server client
  session.ts              getSession() and requireAccount(type) for server pages
  account.ts              Account types and workspace paths
  routes.ts               Route helpers and reserved slugs
mocks/                    MSW handlers built from the contract
contract/openapi.yaml     Copy of the API contract
tests/                    Smoke tests (node --test) against a running server
```

## Talking to the API

- The contract lives in `Trybe-event/api` at `openapi/openapi.yaml`. Keep a clone next to this repo, then `npm run contract:sync && npm run gen:api`. CI fails if `lib/api/schema.d.ts` doesn't match `contract/openapi.yaml`.
- **Client components** use `api` from `lib/api/client.ts`. It calls `/api/...` on this origin only.
- **Server components and route handlers** use `serverApi()` from `lib/api/server.ts`. It's guarded by `server-only`.
- Never call the Go API from the browser directly, and never put its URL or any secret in a `NEXT_PUBLIC_` variable. `npm run check:bundle` fails the build if a server secret reaches the browser.
- Render only what the API returns. If a field is missing, it's because the viewer may not see it; don't fill it in from elsewhere.

## Mocks

Set `NEXT_PUBLIC_API_MOCKS=1` to answer browser `/api` calls from `mocks/handlers.ts`. Mocks are typed from the contract. Add handlers for your issue's endpoints when the backend isn't merged yet. Server components always call the real API.

## Access

- Clerk handles sign-in. The account type (organizer or attendee) comes from `GET /me/account`, which the API reads from its database. Never from Clerk metadata.
- Guard every protected page on the server with `requireAccount("attendee" | "organizer")` from `lib/session.ts`. Signed-out visitors go to that type's sign-in, sessions with no account type go to `/account/setup`, and the other account type is sent to its own workspace. Guard in a `layout.tsx` when the layout renders account-only UI.

## UI

- Use components from `components/ui` (web#27); don't style raw elements.
- Every control has a visible label; everything works with the keyboard at 360px width, in light and dark.
- Forms use React Hook Form with Zod. Map API `fields` errors back onto the form with `fieldErrors()`.

## Checks before a PR

```bash
npm run typecheck && npm run lint && npm run format:check && npm run build && npm run check:bundle
npm start & TRYBE_TEST_WEB_URL=http://127.0.0.1:3000 npm run test:smoke
```
