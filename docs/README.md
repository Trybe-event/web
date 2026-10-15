# Trybe planning docs: web scope

Current references: [approved implementation plan](implementation-plan.md) and
[Milestone 1A implementation status, setup and audit](milestone-1a-status.md).
Canonical attendee routes are `/attendee`; `/profile` links are compatibility
redirects. The web server holds the Clerk server credential when required by the
SDK; privileged credentials never reach browser code. The original scope below
predates this implementation update.

This folder replicates the Trybe planning documents so they travel with the `web`
repository. The PDFs are the signed-off source of record; the Markdown files are faithful
renderings for GitHub viewing and diffing.

| File | What it is |
| --- | --- |
| `trybe-mvp.pdf` / `trybe-mvp.md` | MVP Scope and Delivery Plan v1.0 (four milestones). |
| `trybe-prd.pdf` / `trybe-prd.md` | Product Requirements Document v0.6 (full product, sections 1 to 64). |

The integrated, cross-repo Milestone 1 plan lives at the workspace root as
`MILESTONE-1-PLAN.md`.

## What `web` is responsible for

From the repository boundary in the product docs:

> `web` owns the organizer and attendee application workflows.

`web` is the Next.js App Router application: the organizer and attendee user interfaces, client
forms and validation, session handling through Clerk and a thin same-origin `/api`
backend-for-frontend proxy to the Go core API. It renders screens and proxies requests; it must
not duplicate Go business logic or hold privileged secrets.

## The PRD sections that drive this repo

- **Section 5 Route structure.** Separate `/organizer`, `/profile` and `/{event-slug}` route
  trees. Event links and QR codes always enter the attendee flow.
- **Section 6 Authentication and authorization.** Client sign-up, sign-in, verification,
  password reset and logout surfaces. Separate routes never grant cross-workspace access on
  their own; the server decides.
- **Sections 7 to 9 Organizer onboarding and event creation.** Organizer dashboard shell and
  the three-stage event form (foundation routes in Milestone 1, full form in Milestone 2).
- **Sections 12 to 17 Registration, profiles and the event workspace.** Attendee onboarding,
  the reusable profile editor and preview, the field-visibility controls UI and the event
  workspace shell.
- **Section 36 Web frontend.** React, TypeScript, Next.js App Router, Tailwind CSS, accessible
  component primitives, React Hook Form and Zod for validation.
- **Sections 37 to 39 Request flow and proxy controls.** The same-origin `/api` proxy forwards
  a verified session to Go, restricts destinations and methods to allowlists, strips spoofable
  headers and never exposes server secrets to the browser.

## Invariants the web app must respect

- Separate frontend routes do not establish authorization. Treat the Go API as the source of
  truth for account type and resource permissions (PRD sections 6 and 39).
- Never render or bundle server secrets. Only `NEXT_PUBLIC_` values and public SDK identifiers
  may reach the browser (PRD section 38).
- Never display profile fields the viewer is not permitted to see. The server filters fields;
  the client must not request or cache hidden values (PRD section 16).
- Forms must be mobile-friendly and accessible: labeled controls, keyboard navigation, readable
  contrast and clear validation (PRD section 30).

## Milestone 1 role

In Milestone 1 `web` delivers the organizer and attendee route trees, Clerk-backed
authentication surfaces, the attendee profile create, edit and preview experience, the
field-visibility controls and the `/api` proxy to Go. See `MILESTONE-1-PLAN.md` at the
workspace root for the story breakdown and acceptance criteria.
