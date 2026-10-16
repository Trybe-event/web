# Shared implementation and merge rules

Read this guide with [AGENTS.md](AGENTS.md) and [CONVENTIONS.md](CONVENTIONS.md). It applies to human contributors and coding assistants, including Claude. The issue defines scope; the API contract defines requests and responses; the PRD and MVP define product behavior. Report a conflict between those sources before changing their meaning.

## Start from the current integration branch

- Fetch before starting and before requesting review. Use the milestone named in the issue, then work in a descriptive issue branch such as `m2/web-event-form-shell`. Do not use `codex/` branch names.
- Merge the latest milestone into a branch that has already been pushed. Never force-push a shared branch, overwrite a partner's work, or push directly to `main` or a milestone branch.
- Keep dependent work in issue order. Dashboard #1 and event form issues #2/#3 are merged. Publish/review #4 precedes M3 workspace #11, directory #12 and profiles #13. M4 lifecycle #20 precedes archive #21; the archive also requires the M3 discovery/profile work. After each merge, sync the remaining branches and rerun checks.
- Feature PRs normally target their milestone. A maintainer may explicitly request another target; record that decision in the PR and sync against that target. On 16 October 2026 the maintainer requested #44 and #45 be prepared for `main`, which already contains #42 and the current M2 integration. This changes their target, not their audit status.
- Promote milestones only after their audit gates pass. A conflict-free PR is not evidence that an audit passed. Humans perform merges.

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

### Integration gates for the current delivery

The event review/publish implementation is PR #54 into `main`, following the maintainer's M2 integration request. M3 workspace, directory and profile implementations are PRs #55, #56 and #57 into `milestone/m3`; review and merge in that order. M4 organizer lifecycle is PR #58 into `milestone/m4`; the archive PR includes those controls and the M3 discovery dependencies. Integrate completed M3 work into M4 before reviewing the archive's final standalone diff.

The web implementations do not replace backend work. API issues #10/#11/#12 provide discovery, #14 provides connection lifecycle, and #23/#24 provide independent networking windows, auditing and archive permissions. They were open at this handoff. Keep those integrations and authenticated raw-payload privacy checks visible in the PR checklists. Development-only mocks are not evidence that a production endpoint or server audit exists.

Connections and Inbox account destinations are owned by their separate UI tasks. Event navigation must not link to missing routes or disable working account destinations because an event's networking closes. Until those destinations land, show their unavailable state honestly; do not claim the accepted-connections/Inbox journey has been verified.
