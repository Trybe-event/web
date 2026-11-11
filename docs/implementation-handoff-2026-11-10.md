# Trybe implementation and code handoff

**Prepared 10 November 2026.** This records the November 9–10 onboarding, workspace, branding and public-page increment. It is mirrored in the web, API and marketing repositories. Read it alongside the required Trybe MVP, PRD, `CONTRIBUTING.md` and the API contract. Integration does not certify a release gate.

Paths below start with the repository name and continue relative to that repository. Commands run from the named repository root. No personal directory, environment file, credential or local tool is required by the source.

## Product and integration rules

- An identity has one immutable account type. Organizer and attendee routes, onboarding and server permissions remain separate. Clerk metadata never grants a role.
- Hidden profile/contact values must be omitted by the API. Business phone is private account input, not an attendee networking contact.
- Event registration requires explicit attendee confirmation. Preserve invitation context through authentication and profile setup.
- Preserve idempotent draft creation, serialized autosave, validation before advancing, and review before publication. Neither scrolling nor preview publishes an event.
- The maintainer authorized integration through `milestone/m4` and then `stable`. First synchronize the existing stable baseline into the milestone, review the contract before its API implementation, then integrate the web companion. Use merge commits and PRs; do not force-push shared branches.
- Main promotion, production deployment and legal release approval require their own authorization and evidence. This increment is not their sign-off.

## Delivered scope by repository

### Web: accounts and authentication

The existing custom Trybe forms integrate with Clerk rather than replacing the form design with Clerk UI. Organizer signup collects registered business name, contact first/last name, email, Nigerian phone, password and confirmation. Phone variants normalize to E.164. Existing password requirements and Clerk verification remain authoritative.

The organizer email stage uses the actual submitted address and a real email-code verification step, with resend, address correction and recovery guidance. It cannot advance a partial signup as if verified. Validated onboarding metadata excludes passwords, verification codes, role grants and redirect instructions.

Both account types share the revised full-screen authentication shell: compact form on the left; a full-height portrait scene on the right; copy over a localized lower fog; “Fostering connection with convenience.” The photograph is displayed proportionally with viewport-dependent cover cropping. The light/system/dark menu supports keyboard navigation, outside dismissal, focus return, saved preference and operating-system changes. Its external-store snapshot is a stable primitive to avoid render loops.

Relevant code:

- `web/components/auth/auth-form.tsx`, `auth-page.tsx`, `complete-account.tsx` and `complete-page.tsx`: existing authentication/account lifecycle.
- `web/lib/organizer-signup.ts`: business validation and safe prefill.
- `web/components/auth/auth-shell.tsx`, `theme-toggle.tsx`, `web/lib/theme.ts`, `web/app/layout.tsx`: presentation and theme preference.
- `web/public/images/auth/`: portrait exports and source/prompt provenance. These are illustrative AI-generated scenes, not member photographs or testimonials. The 2560 × 3840 files are proportional display exports from 1024 × 1536 sources, not native 4K photographic detail.

### API: private organizer phone

Contract PR API #110 adds the optional organizer signup phone input. Implementation PR API #111 persists it through generated SQLC queries while keeping it out of account/public event responses. Existing clients can omit it; retries cannot edit a saved phone or change account type. Verified account deletion clears the private phone.

Migration: `api/db/migrations/20261109140000_organizer_contact_phone.sql`. Apply the normal migrations to an explicitly verified target before rolling out the matching signup UI. Do not reset or recreate a shared database. The earlier local development-schema migration is not evidence that staging or production has been migrated.

The wire contract lives in `api/openapi/openapi.yaml`; the web copy and generated client are mirrors. New settings, audience or payment mutations require separately reviewed contracts before implementation.

### Web: organizer workspace

`web/components/organizer/workspace-shell.tsx` provides the full-width organizer frame. The sidebar can collapse to icons; mobile has an independent navigation toggle above the content. Business name comes from the server-resolved account organization. Owner name and “Business owner” appear at the bottom, with icon-only sign-out beside the name. Account resolution and authorization remain server-side.

Navigation is My events, Audience, Payments and Settings. The top bar shows the workspace breadcrumb, a green workspace indicator, the existing theme menu and “Ask Trybe.” Ask Trybe opens a pinned “Coming soon” notice. It is an organizer assistant entry, not a route into attendee matching. The indicator is presentation, not an infrastructure health monitor.

My events uses the exact description “Create your next gathering and keep your community connected.” Aggregate metric cards and registration trend charts were removed from this main page at the maintainer’s request. `web/components/organizer/event-list.tsx` supplies Upcoming/Drafts/Past filters and case-insensitive search over real organizer-owned event summaries. Thumbnail rows, edit/share destinations and draft deletion confirmation remain functional. Registration counts on a row count sign-ups rather than physical attendance.

`web/components/organizer/event-form.tsx` retains the MVP’s three validated stages and all existing daily program, session, speaker, networking, autosave and publication behavior. A side card previews the saved cover and current event name/venue. Create experience is another entry into this supported event model; it does not introduce an unreviewed paid-experience backend.

### Organizer screens awaiting deeper business logic

These screens are reachable only after the organizer guard. Their unfinished actions are disclosed rather than represented by mock success:

| Screen               | Current behavior                                                                     | Next implementation boundary                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Audience             | Real aggregate event-registration count; directory/status UI identifies pending work | Reviewed organizer-scoped directory, pagination, search and approval-state contract; no private contact or message leakage                |
| Business settings    | Read-only saved organization and owner                                               | Validated persistence contract, authorization, retry/error handling and audit evidence                                                    |
| Team                 | Current owner shown; invitations disclosed as upcoming                               | Explicit membership/permissions model; never infer permissions from client input                                                          |
| Notifications        | Describes supported lifecycle mail; no new delivery setting is changed               | Reviewed organizer preferences and their relationship to required service messages                                                        |
| Security             | Saved name/role and password-reset guidance                                          | Supported current-user device/security actions; never fake a reset or device revocation                                                   |
| Payments and payouts | Explicit coming-soon screen; free events remain usable                               | Payment provider, ticket/claim contracts, verified webhook/idempotency model and reconciliation before collecting payment or bank details |
| Ask Trybe            | Coming-soon dialog only                                                              | Separate organizer assistant design, authorization and safe tool/data access                                                              |

The route pages are under `web/app/organizer/{audience,payments,settings,experiences/new}`; shared presentation is in `web/components/organizer/workspace-sections.tsx`. Claude’s next logic work should start from these declared boundaries, not client-only values or invented endpoints.

### Public pages and legal presentation

The approved public support/privacy contact is now **trybevent@gmail.com**, centralized in `web/lib/legal.ts`. This does not replace SMTP usernames/passwords or enable mail delivery. Provider secrets stay ignored and server-only.

Both signup types and explicit event joining link to Trybe’s Terms and Privacy. The documents remain proposed drafts pending operator details and release review. Their wording was not rewritten during the layout change. Each now has a centered reading column, justified body/list text, readable line height and a collapsible contents list above the article.

`web/app/not-found.tsx` provides the branded missing-page screen, recovery link, support link, theme control and legal navigation. Its browser title is **404 page · Trybe**, including mistyped single-segment links such as `/privacya`. A confirmed missing event uses this same boundary; a temporary API failure remains retryable and is not misrepresented as proof that the event does not exist. Missing pages are not indexed.

### Brand and marketing

The approved tilted eight-spoke mark keeps its geometry and stroke thickness. Green gap ornaments were removed from the web/marketing components and the mail source SVG. Added edge clearance prevents the mark touching its frame. The email PNG was regenerated in the existing brand green and its template URL cache version changed; no delivery adapter behavior was changed by that artwork update.

Workspace marks roll for about 4.8 seconds in a 60-second CSS cycle, with no JavaScript timer. Reduced-motion disables the roll. The marketing animation remains available.

Assets:

- `web/public/brand/trybe-email-profile.png` and `.svg`: 1024 × 1024 team email-avatar artwork with circular-crop padding. Updating the Gmail profile picture is a team account action, not an automatic deployment effect.
- `web/public/brand/trybe-mark-email.png`: static email-header asset.
- `api/internal/mail/assets/trybe-mark.svg`: mail mark source.
- `marketing/public/images/networking/{attendee,organizer}-landscape.webp`: preserved shorter compositions for future marketing use. They are not published as real attendees or testimonials.

The marketing shell/navigation now uses the full screen width with compact headings and a branded 404 page. Browser-visible scrollbar tracks are hidden in both web and marketing while touch, wheel and keyboard scrolling remain available. Form fields, reading columns and message content retain intentional internal width limits.

### Partner SMTP fix

API #112 changes SMTP Message-ID domain selection to the parsed sender’s own domain while preserving the existing deterministic outbox-key hash. Its tests cover sender-domain normalization. Review it alongside, but separately from, logo/template source changes. Do not overwrite this partner work while updating mail artwork.

## MVP alignment and audit boundaries

| Milestone                             | Relationship to this increment                                                                                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1: accounts and privacy              | Business onboarding, email verification presentation, separate account guards, private phone omission, theme and account-page polish                                              |
| M2: events and registration           | Organizer frame around existing editor/share flow; explicit join notices; event context, previews, missing-link handling and draft management                                     |
| M3: discovery and connections         | Existing attendee logic is preserved; organizer Ask Trybe does not implement matching or change connection rules                                                                  |
| M4: communication and pilot readiness | Branding/mail asset consistency, public policy/recovery pages, portable handoff and regression/integration review; remaining operational and authenticated audits remain explicit |

Do not close unrelated issues or infer that all roadmap work is done. Streaming, carpool, AI agents, personalized session recommendations, ticket payments and broader organizer analytics remain separate future work until their real contracts, services and audits are complete.

## Verification and review procedure

The final prepared source passed an isolated production build and 204 regressions, including missing-invitation/title coverage, with zero failures or skips. The browser bundle passed the secret scan. Generated API types/routes match the contract. Web TypeScript, lint and formatting passed; marketing TypeScript/lint and its two invitation tests passed (four pre-existing image-optimization warnings remain). API vet/build and mail-package tests passed locally; disposable PostgreSQL integration and the complete API pipeline must pass in CI on the pushed revision. The PR bodies record final command results and exact revisions rather than inheriting older green checks.

Observed browser evidence: the 404 screen renders; an unknown route returns HTTP 404; Terms and Privacy return HTTP 200; `/privacya` and an unmatched nested path have the requested title. The policy column was centered at 1280px (896px width with equal side margins), with computed justified paragraph alignment. Responsive screenshots showed the policy and 404 layouts without horizontal overflow at the checked sizes. Authenticated organizer interaction, a new real signup, physical-phone journeys and provider inbox receipt were not established by this visual check and must not be claimed as release evidence.

Required checks from each repository root:

```sh
# web
npm ci
npm run gen:api
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run check:bundle
npm run test:smoke

# api
go vet ./...
go test ./...
go build ./...
sqlc diff

# marketing
npm ci
npm run typecheck
npm run lint
node --test tests/*.test.mjs
npm run build
```

Run web smoke tests against their documented isolated server without Clerk secrets and with an unavailable API for negative cases. Do not treat those assertions as failures of a separately configured live developer server. Use a separate build/cache directory so production verification does not corrupt an active development server’s cache. Database integration tests must use an explicitly selected disposable database; CI supplies PostgreSQL. Never run destructive tests against shared application data.

## Operational and teammate handoff

1. Merge reviewed contract changes before the API implementation and matching generated web client. Apply migrations to the selected environment before rollout.
2. Keep sender credentials and delivery enablement separate from public contact and logo changes. Preserve the existing mail-worker activation hold until its deployment and provider checks are complete. Clerk verification and transactional lifecycle mail are separate systems.
3. Continue organizer logic in small reviewed contract/implementation increments. Start with real account settings or scoped audience data, then add analytics whose definitions distinguish registrations, unique people and actual attendance.
4. Audit event publication, same-link edits, registration, QR scanning, privacy, connections, accepted conversations and archived networking with authorized independent accounts. Store evidence under the existing milestone audit records.
5. Review pending older PRs by their actual scope and draft state. Do not merge main-promotion PRs or draft E2E evidence merely because this increment is green.
6. Monitor Actions and external preview checks on each pushed revision, require no conflicts, then integrate milestone/m4 into stable through PRs. Record the actual merge links in the final PR notes. Avoid branch deletion or unrelated production changes as part of this handoff.

All application configuration remains relative or environment-driven. Do not commit `.env*`, credentials, local media-decoder tools, screenshots, caches, raw logs or assistant progress files. The committed image assets and documentation can be cloned and used on another system without the original user’s directory structure.
