# Trybe web

> Current build: Milestone 1A now includes separate `/organizer` and `/attendee`
> authentication routes, server-resolved workspaces, account confirmation and a
> restricted API proxy. Read [the current status and setup guide](docs/milestone-1a-status.md)
> and [the approved implementation plan](docs/implementation-plan.md).
> Live authentication still requires the intended Clerk and database configuration.

The organizer and attendee application for Trybe: a Next.js App Router frontend with a thin
same-origin API proxy to the Go core service.

> Connection with convenience.

This repository is one of three. See `docs/README.md` for how `web` fits with `marketing` and
`api`; see `MILESTONE-1-PLAN.md` at the workspace root for the Milestone 1 build.

## Initial scaffold (historical description)

This is a Milestone 1 skeleton. It boots and shows the shape of the app; the account,
authentication, profile and privacy features are built during Milestone 1 implementation.

What is here now:

- Next.js 16 App Router with TypeScript and Tailwind CSS v4 (Trybe design tokens).
- Separate account entry routes: `/organizer` and `/profile`, each with sign-in and sign-up
  placeholders.
- A same-origin backend-for-frontend proxy at `app/api/[...path]/route.ts` that forwards to the
  Go core API with a method allowlist and header stripping.
- A route-protection extension point in `middleware.ts` for Clerk and account-type enforcement.

What is deliberately not here yet: Clerk integration, real forms and data, profile and privacy
screens, the organizer dashboard and the event flows. Those land in Milestone 1 and later.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss`, tokens in `app/globals.css` |
| Forms | React Hook Form and Zod (ready for Milestone 1 forms) |
| Identity | Clerk (added in Milestone 1) |

The web app renders screens and proxies requests. It does not duplicate Go business logic and
holds no privileged secrets (PRD section 36).

## Run locally

Requires Node.js 22.13.0 or newer.

```bash
npm install
cp .env.example .env.local   # optional; defaults assume the Go API on :8080
npm run dev
```

Open http://localhost:3000. The home page links to the organizer and attendee entry routes.

The `/api/*` proxy forwards to `API_BASE_URL` (default `http://127.0.0.1:8080`). Until the Go
core API in the `api` repository is running, proxied calls return a clear 502. The UI itself
runs without the API.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000. |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | ESLint (Next core-web-vitals and TypeScript rules). |
| `npm run typecheck` | `tsc --noEmit`. |

## Project structure

```text
app/
  layout.tsx                 Root layout and metadata
  page.tsx                   Landing: links to the two account workspaces
  globals.css                Tailwind v4 import and Trybe design tokens
  organizer/                 Organizer entry, sign-in, sign-up (placeholders)
  profile/                   Attendee entry, sign-in, sign-up (placeholders)
  api/[...path]/route.ts     Same-origin proxy to the Go core API
components/                  BrandLogo, EntryPage, AuthPlaceholder
lib/
  utils.ts                   cn() class merge helper
  account.ts                 Account-type model (display and routing hints)
middleware.ts                Route-protection extension point
```

## Boundaries to keep

- Organizer and attendee accounts are strictly separate. Routes do not grant access; the Go API
  enforces the immutable account type (PRD sections 4, 6, 40).
- Only `NEXT_PUBLIC_` values and public SDK identifiers may reach the browser. Server secrets
  stay server-side (PRD section 38).
- Never request, render, or cache profile fields the viewer is not permitted to see. The server
  filters fields (PRD section 16).
