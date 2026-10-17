# Shared implementation and merge rules

Read this guide with [AGENTS.md](AGENTS.md) and [CONVENTIONS.md](CONVENTIONS.md). It applies to human contributors and coding assistants, including Claude. The issue defines scope; the API contract defines requests and responses; the PRD and MVP define product behavior. Report a conflict between those sources before changing their meaning.

## Start from the current integration branch

- Fetch before starting and before requesting review. Use the milestone named in the issue, then work in a descriptive issue branch such as `m2/web-event-form-shell`. Do not use `codex/` branch names.
- Merge the latest milestone into a branch that has already been pushed. Never force-push a shared branch, overwrite a partner's work, or push directly to `main` or a milestone branch.
- Keep dependent PRs in milestone and dependency order. After each merge, sync remaining branches and rerun affected checks. Do not use a historical PR number as evidence that the current milestone audit passed.
- Feature PRs normally target their milestone. A maintainer may explicitly request another target; record that decision in the PR and sync against that target. On 16 October 2026 the maintainer requested #44 and #45 be prepared for `main`, which already contains #42 and the current M2 integration. This changes their target, not their audit status.
- Promote milestones only after their audit gates pass. A conflict-free PR is not evidence that an audit passed. Only a maintainer or an agent explicitly authorized by the maintainer may merge.

## Required MVP reading and scope

Read [Trybe MVP](docs/trybe-mvp.md) and its [PDF](docs/trybe-mvp.pdf) before planning,
implementing or reviewing a task. These are required product requirements, not
background examples. The MVP defines the launch scope, milestone order, acceptance
checks and audit gates. The issue defines the approved work item; the API contract
defines request and response shapes. Surface disagreements before changing behavior.

- Follow M1 accounts/privacy, M2 events/registration, M3 discovery/mutual connections,
  then M4 messaging/pilot readiness. A screen or merged PR does not complete a gate.
- Follow current explicit maintainer decisions. In particular, attendee profile photos
  are mandatory in the current build; this later instruction supersedes the baseline
  document's optional-photo wording. Never remove validation to match stale wording.
- Keep AI agents, session personalization, streaming, carpool, payments, 4K posters and
  event-code entry in the future backlog until separately scoped and authorized.
- Preserve immutable account separation, server-side contact omission, explicit join
  confirmation and retry safety throughout every milestone.
- Every PR must cite the MVP milestone/section, related issue, acceptance evidence,
  dependencies and tests still pending. Use the repository PR template. Do not claim
  phone, browser, staging or audit checks that were not performed.
- The product master is `Trybe-event/marketing/docs/trybe-mvp.md` and its matching PDF.
  The web/API copies are exact mirrors. When the master changes, update both formats
  and synchronize all three repositories in linked PRs before using changed scope.
  Version 1.1 adds future roadmap notes; it does not expand the v1.0 four-milestone MVP.

## Keep integration consistent

- Organizer and attendee identities have exactly one immutable account type. Enforce access on the server using the API account binding, never browser state or Clerk metadata.
- Use the generated API client and same-origin `/api` proxy. Keep API URLs, Clerk secret keys, database and storage credentials server-only. Commit only `.env.example`, with placeholder values.
- Hidden contact fields must be absent from API responses. Never send them to the browser and conceal them with styling.
- Preserve an event invitation through sign-in, account completion and profile onboarding. Registration requires the attendee's explicit confirmation.
- Organizer event routes share the existing `[id]` directory. API contract parameters can still be named `eventId`. Do not introduce a competing dynamic directory at the same route level.
- Render one workspace shell per page. Layout access guards must not accidentally duplicate the shell of an existing child page.
- Keep draft creation idempotent, serialize autosaves, retain failed edits, and distinguish unsaved changes from successful saves. Scrolling and stage navigation must never publish an event.
- A contract change needs its own reviewed API change. Do not alter generated types or invent response fields to make a UI compile.

## Code and verification

- Use descriptive application names. Keep required library names and contract fields unchanged; explain library acronyms when first introduced. Remove dead code and unused imports in changed areas.
- Use shared UI components, visible labels and keyboard controls. Check 360px and 1280px layouts in both themes, including loading, empty, failure and retry states.
- Install locked dependencies with `npm ci`. Stop only this repository's dev server first if Windows reports a locked native dependency. Do not install Next.js globally or change dependencies to bypass an incomplete installation.
- Run `npm run gen:api` and confirm generated output matches the contract, then `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` and `npm run check:bundle`.
- Run regression tests and the smoke suite against a running test server. Verify authenticated journeys against the matching API. Tests must exercise failures, authorization and retries where relevant.
- Keep secrets, local caches, machine-specific absolute paths and assistant progress artifacts out of commits. Repository documentation and tooling must work from a fresh checkout on another machine.

## Review and handoff

PR bodies must state the issue, meaningful changes, every acceptance criterion, commands and results, dependencies and exact checks still pending. Do not mark browser checks, authenticated integration or an audit complete when they were not run. Keep unfinished work visible rather than replacing it with mock success.

Before handoff, push the actual commits, confirm the PR targets the correct milestone, check GitHub's conflict and CI status, and document merge order. Include the current commit and next action in the ignored `.agent/web-<issue>.md` progress file. Never describe unpushed local work as delivered.
