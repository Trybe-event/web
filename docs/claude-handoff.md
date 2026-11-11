# Claude handoff: organizer statistics and audits

Snapshot: 9 November 2026; contact/auth-design update 10 November 2026. This handoff is for the teammate and their coding assistant. Verify live branches, issues and PRs before editing: this snapshot is not merge authorization or milestone sign-off.

Paths prefixed with `api/`, `web/` or `marketing/` refer to files inside that repository. They do not assume a particular parent folder, operating system or username. No local credentials, process IDs, private endpoints or assistant scratch files belong in this document.

## Read first

Read each repository's `AGENTS.md`, `CONTRIBUTING.md`, `CONVENTIONS.md`, required `docs/trybe-mvp.md` and matching PDF, and the relevant PRD/audit records. The API contract authority is `api/openapi/openapi.yaml`; web contract/client files are generated mirrors. Check the full issue and its dependencies before implementation.

The product master remains the marketing repository's MVP document. The requested business-signup and legal-page refinements below are explicit maintainer additions, not permission to implement every future feature. Public discovery has its own pending PRs. Payments, physical check-in, streaming and unrelated matching redesign are not part of the organizer statistics increment.

## Integration snapshot and review order

`stable` is the integration branch. Keep `main` and milestone promotion separate until their audit gates are signed off. Use descriptive feature branches, preserve teammate work and never force-push shared branches. Have a second reviewer review the implementation; do not merge your own PR as an audit shortcut.

| Repository | Synchronized stable revision | Included work                                                                                                                                                      |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API        | `8b1e92e`                    | Draft management, retry-safe program creation and email improvements (#104/#105); Neon deployment/storage documentation (#106); Clerk seed-email correction (#107) |
| Web        | `374660a`                    | Invitation/artwork/sharing and draft controls (#86); Message action for accepted connections (#87)                                                                 |
| Marketing  | `6596337`                    | Approved curved-spoke Trybe symbol (#6)                                                                                                                            |

Organizer signup is published for review, **not merged into stable**:

1. [API #110](https://github.com/Trybe-event/api/pull/110): optional private organizer phone contract. Review/merge this first.
2. [API #111](https://github.com/Trybe-event/api/pull/111): storage, validation, deletion and tests. It is stacked on `contract/organizer-contact-phone`; after #110 merges, retarget #111 to `stable`. Do not merge implementation into the contract branch.
3. [Web #90](https://github.com/Trybe-event/web/pull/90): business signup, email-confirmation stage and draft legal pages. It depends on the matching API and migration.

The application commits were API contract `53a2d5b`, API implementation `3aa292c` and web `0bf77f7`. Their Actions passed, and the web Vercel preview passed. Documentation commits change the branch heads: recheck current-head checks after every push rather than treating these historical results as current CI.

Related work is still open at this snapshot:

- [API #108](https://github.com/Trybe-event/api/pull/108) public discovery precedes [web #88](https://github.com/Trybe-event/web/pull/88) attendee event lookup/listing. Do not duplicate this work or expose private events through a new statistics endpoint.
- [API #109](https://github.com/Trybe-event/api/pull/109) contains the teammate's 7 November handoff and deployment notes; review alongside this document. Neither handoff silently overrides current code or explicit maintainer decisions.
- [Web #89](https://github.com/Trybe-event/web/pull/89) is draft mobile end-to-end QA. It still needs accessibility scanning and staging CI according to that handoff; inspect the latest PR before extending it.
- Promotion PRs API #86 and web #68 remain separate from feature integration.

## Business signup and legal changes to preserve

- Organizer signup collects registered business name, contact first/last names, email, Nigerian phone with a visible +234 prefix, password and matching confirmation. Existing password requirements are retained. Organization maps to API `organization`; contact names combine into `full_name`.
- Clerk handles authentication and email-code verification. The "Check your email" stage displays the actual submitted address and offers resend, spam guidance and address correction. "I've confirmed my email" verifies the entered code; it is not an email-link acknowledgement or a bypass. Existing-account sign-in routes remain on Trybe.
- Validated onboarding metadata only carries business/contact fields. It never determines an account type or stores passwords, codes or redirect destinations. The API binding remains authoritative and immutable. Completion pre-fills the details for explicit confirmation.
- Migration `20261109140000_organizer_contact_phone.sql` adds nullable organizer phone storage. The API validates E.164 input, excludes phone from account/public responses, preserves the existing contact on binding retries and clears phone on organizer deletion. Older no-phone clients remain valid.
- Public `/terms` and `/privacy` pages are proposed drafts. Shared notices appear on organizer/attendee signup, embedded attendee signup and both explicit joining controls. Reading a policy never joins an event.
- The public policy/support contact is now `trybevent@gmail.com`, explicitly confirmed by the maintainer on 10 November. It is centralized in `web/lib/legal.ts`. See `web/docs/legal.md` for that decision, policy version, references and unresolved registered operator/legal review details.
- A displayed policy notice is not a versioned consent ledger or optional-marketing consent. Do not infer a Clerk legal-acceptance flag, production legal approval or permission to share contacts.

## Organizer statistics already implemented

Audit and extend these paths instead of recreating a second dashboard:

| Area            | Existing files / behavior                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard       | `web/components/organizer/dashboard.tsx`: event count, total/per-event registrations, status, thumbnails, draft deletion and loading/empty/error states |
| Server loaders  | `web/lib/organizer-dashboard.ts`: generated-client requests to `/organizer/events` and `/organizer/events/{eventId}/registrations/trend`                |
| Chart           | `web/components/organizer/registration-trend.tsx`: SVG trend with accessible numeric description, empty and single-point handling                       |
| API             | `api/internal/events/organizer_stats.go`: authenticated owner-scoped summaries, trends and end-event transition                                         |
| Queries         | `api/db/queries/organizer_stats.sql`: active-membership totals and daily counts grouped in the event timezone                                           |
| Tests / metrics | `web/tests/organizer-dashboard.test.mjs`, API event tests and `api/docs/metrics.md`                                                                     |

Current daily counts represent **current active memberships by joined date**, not an immutable log of all signup attempts. Leaving/rejoining can change the series. Agree on that definition before adding cumulative, conversion or retention charts. Counts must never be labelled physical attendance without check-in evidence.

The administrator metrics endpoint remains admin-only. Never expose `/admin/metrics` to organizers as a shortcut. New owner-scoped request/connection/conversation aggregates need explicit definitions, measurement windows and a separately reviewed API contract before implementation. Do not infer which event caused an account-level connection without a defined attribution rule.

## Next deliverable: audit, then implementation plan

1. Fetch all relevant repositories, inspect current stable/feature branches and open issues/PRs, and verify contract changes. Start the statistics work on its own descriptive branch after identifying its dependencies.
2. Trace every current statistic from persisted rows through SQL, API ownership checks, generated types and the UI. Record discrepancies and loading/empty/failure behavior.
3. Propose organizer views and exact measures. Separate what existing endpoints support from additions requiring contract/query changes. Specify timezone, event/status filters, attribution, denominators and zero-data semantics.
4. Produce a coherent API/web implementation plan and acceptance checklist aligned with MVP scope. Then implement the approved increment with focused regressions and cross-repository dependencies.
5. Record audit findings with severity, reproduction, owner and retest evidence. After organizer work, the planned area is attendee matching, connection requests and inbox behavior/design.

## Required audit boundaries

| MVP area                 | Evidence to collect; do not mark complete from CI alone                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 accounts/privacy      | Live organizer verification and attendee onboarding; wrong-account denial; raw contact omission; profile editing and controls on phone/keyboard in both themes                                                      |
| M2 events/registration   | Publication/program/speakers, stable-link editing, QR scans, new and returning explicit joins, private/closed boundaries, retry-safe drafts/sessions and honest registration counts                                 |
| M3 discovery/connections | Event membership boundaries, private-event exclusion, request acceptance/decline, blocks/disconnects and correct profile/contact visibility                                                                         |
| M4 messaging/readiness   | Accepted connections open conversations; message/reconnect/history behavior; networking closure blocks new requests while preserving eligible existing conversations; mobile/accessibility and operational evidence |

For statistics specifically test owner, other organizer, attendee, anonymous and unknown event access. Check zero/one/many registrations, leave/rejoin, retry duplicates, timezone/day boundaries, draft/published/ended states and failed requests. Failures must not silently become zero. Aggregates must omit attendee identities, hidden contacts and message bodies.

Test realistic volumes and query behavior, recording dataset size, concurrency and environment. A local test is not hosted capacity proof. Check 360px and desktop layouts, keyboard access and both themes. Preserve the existing event artwork proportions, header behavior and registration placement.

## Environments and safe verification

- Deployment documentation currently specifies Vercel, Fly.io and Neon PostgreSQL/object storage. Some existing local setups still use the earlier Supabase development database. Verify the actual configured database/provider/schema before writes; do not assume a documentation change migrated a developer's environment.
- The organizer-phone migration was applied and verified in the existing local development schema. This is not evidence of a staging or production migration. Apply reviewed migrations to the explicitly selected target before running the matching API/web combination elsewhere.
- Read each service's environment-loading order. Keep values in ignored files or the provider's secret store. Do not source connection strings as shell code, publish them in handoffs, or copy local development credentials into production.
- The teammate's updated handoff reports the team Gmail sender is configured and a labelled test was received. Automatic transactional delivery remains off until the worker is deployed on Fly. Preserve that hold and the separate mail-provider work; do not start a worker, reuse credentials from a previous sender, bulk-resend historical messages or change the activation cutoff during a design audit. Clerk verification is separate from transactional delivery.
- Never reset a shared application database to make tests pass. Use disposable databases for destructive integration tests; verify the server actually honors the selected test database before migration. Do not change buckets without an asset migration plan.

Run the repository-prescribed checks: Go vet/build/tests, isolated database integration and SQLC diff; generated web client verification, typecheck, lint, formatting, production build, bundle checks and regressions. Inspect raw API responses for authorization/privacy. Run authenticated browser/device/staging journeys separately and label unperformed checks honestly.

## Evidence and local recovery

Before these documentation updates, the business-signup change passed 193 web regressions, production build/type/lint/format/bundle checks, Go vet/build/SQLC and 10 real PostgreSQL account tests. Those account tests include phone persistence, omission, retry immutability, malformed input, legacy signup and deletion. No live new-account verification or real email send was performed by that task.

A local dev runtime later repeatedly reloaded pages with a recoverable Suspense error. Stopping only the owned web process, archiving its `.next/dev` folder under an ignored local directory and restarting unchanged `npm run dev` resolved the loop on Privacy, confirmed by the maintainer. Fresh logs had no Suspense or aborted-render errors, and the policy pages/API readiness responded successfully. No application, dependency, authentication or database change was needed; an upstream Next.js bug was not established.

If this recurs, capture evidence first. Verify the server/port belongs to this checkout, stop only that process, and verify any cache/archive paths resolve inside the repository before moving the dev cache. Keep the archive ignored, use a unique destination and restart the normal launcher. Never delete source, terminate unrelated processes, disable authentication or upgrade packages solely to hide the symptom. Recheck the affected pages afterward.

## PR and release handoff

Keep substantial related work together, link API/web dependencies and use the repository PR template. Describe the concrete behavior, measurement definitions, schema/migration requirements, exact-head checks and remaining audit gates. Monitor GitHub Actions **and** external preview status after pushing. Keep runtime caches, logs, credentials and assistant progress artifacts ignored. Main promotion requires explicit authorization and recorded release-gate evidence.

## Organizer workspace presentation update (10 November, local review)

The maintainer supplied a video reference for the organizer workspace. The working UI now uses a full-width shell with collapsible navigation for My events, Audience, Payments and Settings. The organization name is taken from the server-resolved Account.organization and the owner from Account.full_name. The owner footer has an icon-only sign-out control. Appearance is not a sidebar item: the existing Light/System/Dark menu is in the top-right header beside Ask Trybe. Ask Trybe opens a pinned Coming soon notice; it is not attendee AI matching.

My events uses the exact description “Create your next gathering and keep your community connected.” Aggregate event/registration cards and per-row registration charts were removed at the maintainer’s request. Status tabs and search filter real organizer-owned event summaries. Draft deletion keeps its existing confirmation. The event editor retains the MVP’s three validated stages, autosave, program/speaker editing and publication logic, with a side cover preview. Create experience is another entry to the supported event model, not a new paid-experience backend.

Audience directory/approval data, business-profile editing, team invitations, per-organizer notification controls, device management, ticket payments and payouts are not implemented by this presentation update. Their screens disclose this explicitly; there are no fake saves, bank submissions, approval actions or attendee records. Audience aggregate registration counts use the reviewed organizer-events endpoint and are labelled as event sign-ups rather than unique people or attendance. Settings business/owner fields are saved account values and remain read-only until the relevant contracts and mutations are reviewed. Claude’s deeper logic work should start from these boundaries, not invent client-only data or allow an organizer into attendee matching endpoints.

Authentication, authorization, visibility rules, database schema, API contracts and email-provider work were not changed. The maintainer’s screen review is still required; the browser audit reached the signed-out organizer form and did not establish an authenticated visual pass. Keep these related changes together for review and verify the final pushed commit before claiming CI or release gates passed.

Brand update, 10 November: preserve the approved swept eight-spoke mark and its stroke thickness, with no green inserts/dots in the gaps. The web/marketing SVG components and mail source asset share the same geometry; the static email PNG has been regenerated with the existing brand-green color and a new cache version. Workspace logos use a gentle 4.8-second rotation in a 60-second CSS cycle, with motion disabled under prefers-reduced-motion. Do not reintroduce decorative gap shapes or replace the wordmark while strengthening the business logic. Mail delivery/provider logic was not changed and no email was sent for this visual update.

## Consolidated stable release candidate (11 November 2026)

This section supersedes the older presentation-only limitations above for the changes listed here. The stable baseline was web `8bb5ad0` when this review began. Later local commits had not been pushed, so changing Vercel to stable alone could not include the new workspaces. Main is not a release target for this increment.

### Completed web integration

- Organizer business settings now save through the account API, including explicitly public support contacts and event email preferences. Private signup contacts remain separate. Device management uses the authenticated provider integration.
- Selecting or creating an event opens the event-specific sidebar: Overview, Event setup, Attendance, Reach, Analytics, Preview event and Event settings. The redundant THIS EVENT caption is removed. Business navigation remains outside the selected event.
- Draft setup uses Event details, Tickets, Registration, Experience, Page and Review. Published events expose management tabs including Agenda & lineup. Serialized saves, retry-safe draft creation, image guidance, real days/sessions/speakers, publication review and six-character invitations remain intact.
- Registration approval, capacity and waitlist controls live in the visible Registration step. Event Attendance uses the owner-authorized, event-scoped registration list and approval decisions. It shows sign-ups and admission states, not physical attendance. A decision refreshes the list because admitting one person can change the waitlist; repeated submissions are locked while pending.
- Attendee navigation groups Discover, My events, Network and Profile. Desktop has a collapsible sidebar; mobile has four bottom navigation items and event controls above event content. Connections, Messages and Requests have separate Network views. Profile editing, preview, visibility and account actions retain the existing API behavior.
- My events uses real registrations, filters and event images. Pending/waitlisted registrations open their invitation status; they cannot enter the member-only event workspace. Accepted connections and messages retain networking-closure behavior.
- Discover explicitly says In progress, as requested by the maintainer. Do not merge public-discovery PRs as a dependency of this release. Paid ticketing, physical check-in, sponsors and polls remain disclosed future capabilities.

### API and migration prerequisites

Contract review is separate in API PR #117. Its implementation companion adds organizer profile updates, event category and admission settings, owner registration listing/decisions and preference-aware email scheduling. Apply the normal migrations to the verified deployment database before deploying the matching API: `20261111090000_organizer_business_profile.sql` and `20261111100000_event_category_and_registration_review.sql`. Do not reset a shared database or run destructive tests against it. CI uses disposable PostgreSQL for integration, latency and restore checks. Keep the existing stable job-runner configuration and current email activation choices.

The web contract mirror and generated routes/types must match this API. Review contract, API implementation/migrations and web in that order. Merged Git branches do not prove that the deployed API/database were upgraded. Check the actual runtime before production promotion.

### Vercel verification

At review time `https://trybe-event.vercel.app` still returned the older auth headings and no portrait images, while stable source already contained the new portrait layout and business signup. A successful GitHub Vercel status alone does not establish which deployment the production domain serves. No Vercel setting, production credential or domain was changed during this audit.

In the trybe-event Vercel project, confirm the repository is Trybe-event/web, then Settings > Environments > Production > Branch Tracking = stable. On Deployments, verify the deployment's branch, commit and environment; the production domain must point to the deployment marked Current. A preview URL is not the production alias. After the dependency PRs and runtime migrations are ready, deploy/promote the correct stable revision and check both `/attendee/sign-in` and `/organizer/sign-up` for the portrait and business form. Keep API credentials server-only and preserve Clerk instance-key consistency.

References: https://vercel.com/docs/git and https://vercel.com/docs/deployments/promoting-a-deployment.

### Work reserved for Claude and remaining evidence

Claude is separately implementing Q&A, announcements, registration questions/answers, related organizer/attendee screens and their migration/deployment path. This release does not claim those features or overwrite that work. Merge later additions through their own reviewed contract and compatible API/web PRs.

Production build, generated-client verification, lint/format/bundle checks, regression tests and GitHub CI are recorded in the release PR body at the tested revision. Browser automation timed out during the earlier attendee visual audit; phone, keyboard, authenticated admission and production-alias checks must not be marked passed from unit tests or CI alone. This is a release candidate, not a completed MVP gate or main-promotion authorization.
