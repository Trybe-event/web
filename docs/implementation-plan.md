# Trybe implementation plan

Version 2.0 | 15 October 2026 | Status: proposed for approval

## 1. Objective and delivery order

Build Trybe as a privacy-first event networking platform, beginning with separate organizer and attendee authentication. Complete the four MVP milestones through small, reviewable Agile increments, with testing and an audit at every milestone. AI and the wider product vision follow the working MVP.

This document proposes the implementation. It does not mark the skeletons as completed features or authorize production deployment. It revises the earlier `MILESTONE-1-PLAN.md` where the route, account-binding, and secret-handling decisions differ. Existing PRD and MVP PDFs remain unchanged pending approval of these amendments.

## 2. Current implementation audit

- `marketing` contains the existing marketing site.
- `web` contains a Next.js, React, TypeScript and Tailwind skeleton. Organizer and `/profile` attendee entry pages are placeholders. Its middleware currently allows requests through and its proxy does not yet attach verified authentication.
- `api` contains a Go skeleton, an authentication verifier that intentionally rejects requests, unfinished product handlers, a profile visibility helper and test, a draft SQL migration, deployment scaffolding, and a deferred Python AI service.
- The draft migration has unique identity columns in each account table. This does **not** prevent the same identity appearing in both tables. A view for auditing is not an enforcement constraint. Correct this before account creation is implemented.
- The visibility helper requires callers to establish a permitted relationship. No public profile endpoint may return core identity merely because that helper returned it.

## 3. Non-negotiable account rules

1. An identity has exactly one immutable account type: organizer OR attendee. There is no dual-role account or role switch.
2. Sign-up establishes account type once. Sign-in only resolves the existing binding; visiting a login URL cannot create or change account type.
3. The Go API reads the binding from the database after verifying identity. Client headers, local storage, URL paths and editable identity metadata cannot grant roles.
4. Organizer sessions cannot register for events as attendees or access attendee product data. Attendees cannot create or manage events.
5. A logged-in person visiting the other workspace is redirected to their own workspace. Direct API attempts still return `403`.
6. The MVP will not offer reuse of one verified email for a second account type. Normalize and enforce the intended email uniqueness rule during provisioning; provider aliases cannot reliably establish that two addresses belong to one human. The enforceable boundary is the verified identity/account, not a claim that the system can identify every human across arbitrary emails.
7. Authentication credentials remain with Clerk. Trybe never stores passwords.

## 4. Routes and post-login behavior

Proposed canonical attendee prefix: `/attendee`. This makes the two workspaces explicit; the existing `/profile` prefix becomes a compatibility redirect rather than a second workspace.

| Page | Route | Access / behavior |
| --- | --- | --- |
| Application entry | `/` | Choose attendee or organizer entry; authenticated sessions resolve their own workspace. |
| Organizer sign-in | `/organizer/sign-in` | Organizer authentication entry. |
| Organizer sign-up | `/organizer/sign-up` | Register an organizer identity and immutable account binding. |
| Organizer verification / recovery | `/organizer/verify`, `/organizer/forgot-password`, `/organizer/reset-password` | Organizer-branded verification and recovery, using supported provider flows. |
| Organizer home | `/organizer` | Protected dashboard; onboarding gate for incomplete organizer details. |
| Organizer onboarding / settings | `/organizer/onboarding`, `/organizer/settings` | Name, organization where applicable, account settings and sign-out. |
| Attendee sign-in | `/attendee/sign-in` | Attendee authentication entry. |
| Attendee sign-up | `/attendee/sign-up` | Register an attendee identity and immutable account binding. |
| Attendee verification / recovery | `/attendee/verify`, `/attendee/forgot-password`, `/attendee/reset-password` | Attendee-branded verification and recovery. |
| Attendee home | `/attendee` | Protected home; initial profile setup gate when incomplete. |
| Attendee onboarding | `/attendee/onboarding` | Create the reusable profile and choose field visibility. |
| Profile / preview / settings | `/attendee/profile`, `/attendee/profile/preview`, `/attendee/settings` | Edit own profile, inspect sharing, manage account preferences. |
| Legacy profile links | `/profile`, `/profile/sign-in`, `/profile/sign-up` | Redirect to the corresponding attendee routes. |
| Event landing, milestone 2 | `/events/{slug}` | Public event summary or unlisted link-only landing; joining enters attendee authentication. |
| Event workspace, milestones 2 to 4 | `/attendee/events/{eventId}` | Membership-protected event home, program, discovery and connections. |
| Organizer event management, milestone 2 | `/organizer/events`, `/organizer/events/new`, `/organizer/events/{eventId}` | Own events only; event form, registrations, program and sharing. |
| Connections / messages / notifications | `/attendee/connections`, `/attendee/messages`, `/attendee/notifications` | Delivered in milestones 3 and 4. |

Existing bare event-slug links can be aliases to `/events/{slug}` after auditing reserved paths. QR links always resolve through the attendee join flow. Private means unlisted and link-accessible for the MVP, not approval-only or immune to forwarded links. Stronger invitation enforcement is a later extension unless added to scope.

Successful organizer login goes to `/organizer`; successful attendee login goes to `/attendee`. Incomplete setup redirects once to the appropriate onboarding page. An attendee signing in from an event invitation may resume that join flow after setup. Any return path must be relative, allowlisted, and appropriate to the account type. Neither external redirects nor cross-workspace return paths are accepted.

## 5. Repository responsibilities and architecture

| Repository | Responsibilities |
| --- | --- |
| `marketing` | Brand, product explanation, responsive marketing UI, organizer/attendee entry links and event-code handoff. No product authorization or identity database. |
| `web` | React/TypeScript UI in Next.js, accessible components, Clerk authentication surfaces, server session handling, protected layouts, profile/event workflows and a same-origin API proxy. |
| `api` | Go business rules, verified identity resolution, database migrations, privacy, event ownership, connections, messaging, notifications, jobs and deployment configuration. Python AI stays under `api/ai` for later delivery. |

Request path: browser → Next.js same-origin `/api` → Go API → Supabase PostgreSQL/storage. A public authentication provider SDK may communicate with its provider as designed. Production Go/database access is restricted through deployment networking; a proxy alone does not make a service private.

Use the existing React/TypeScript/Next.js scaffold and Go service. Add Clerk for identity and Supabase PostgreSQL for persistence; use storage for profile photos. Add packages only when their implementation slice requires them. Keep AI and infrastructure within these three repositories. Do not build a redundant second general-purpose backend in Next.js.

Secrets remain on the server that needs them. The Next.js server may require Clerk server credentials; Go/database/storage credentials remain server-side in their appropriate services. Public Clerk publishable keys and intentionally public configuration are not secrets. No privileged value uses a browser-public environment prefix. HTTPS, authorization and safe responses protect data; hiding an endpoint is not the security model.

## 6. Milestone 1: accounts and privacy foundation

### Increment 1A: login routes, account binding and workspace shells

**Web:** establish the route table above; create shared Trybe auth components with separate attendee and organizer copy. Preserve the marketing visual language, rounded logo, theme support and responsive layouts. Include input labels, password visibility, loading, validation, provider failure, expired-session and retry states. Create meaningful dashboard empty states without presenting unfinished event controls as working features.

Integrate real email/password registration, email verification, sign-in, password recovery and sign-out. Protect pages and server actions using the supported Next.js/Clerk integration for the installed versions. Resolve the canonical account through `/v1/me` before rendering protected data. Avoid redirect loops and do not use client-only guards as authorization.

**API/database:** implement verified token handling and a single account-binding registry with a unique identity subject and immutable account type. Link organizer and attendee records to matching registry types through database constraints, using a composite reference or equivalent enforced design. Transactionally create the binding and appropriate account record; conflicting simultaneous submissions must not create both types. Provisioning must be idempotent.

Validate token signature, issuer, expiry and applicable audience/authorized-party requirements. Resolve account type independently from database state. A valid provider session without a product binding receives an explicit setup-required state, not an inferred role. Verify email ownership before final provisioning. If webhooks are introduced, verify signatures and handle retries idempotently; avoid depending on webhook timing to complete normal login.

**Marketing:** wire attendee and organizer calls to action to the deployed app origin through public configuration. Preserve local-development targets. Do not publish links to broken production routes.

**Acceptance:** a newly registered organizer reaches only organizer onboarding/home; an attendee reaches only attendee onboarding/home. Sign-out clears access. Refresh and direct URL visits preserve the correct behavior. Wrong-type entry never changes the binding. Invalid tokens, concurrent provisioning and direct cross-type API access fail safely.

### Increment 1B: reusable profiles and privacy

Build attendee photo upload, full name, professional role, optional organization, bio, goals and optional personal links. Contact/social fields default to hidden. Each optional field supports hidden, accepted-connections-only, or shared-event-attendees visibility. Account email remains private and distinct from any voluntarily shared contact field.

Build organizer details and settings separately. Provide profile edit, save feedback and owner-only visibility preview. Preview changes the projection of the owner's own profile; it cannot impersonate another viewer or create real connections. Use fixtures for relationship testing until milestone 3.

Validate URLs, text limits and uploads on the server. Restrict photo size and supported types, reject unsafe content, and avoid public indexing of private originals. Persist preferences and return filtered projections from Go. No hidden fields in unauthorized payloads, logs or shared caches.

### Increment 1C: integration and audit

Replace the permissive proxy with explicit path/method mappings, server-derived session tokens, selected request/response headers, body limits, timeouts and safe upstream failures. Remove spoofable identity headers and arbitrary upstream destinations. Check origin/CSRF requirements for cookie-authenticated mutations. Disable shared caching for personal responses.

Complete automated account/visibility coverage and browser flows. Confirm development authentication substitutes cannot start in production. Readiness reflects required dependencies; liveness does not expose configuration. Document environment setup with names and examples only.

### Proposed milestone 1 API contracts

| Endpoint | Purpose |
| --- | --- |
| `GET /v1/me` | Verified identity's account type, account ID and onboarding status; explicit unprovisioned state. |
| `POST /v1/accounts/organizer` | One-time organizer provisioning after verified registration. |
| `POST /v1/accounts/attendee` | One-time attendee provisioning after verified registration. |
| `GET /v1/organizer/me`, `PUT /v1/organizer/me` | Organizer's own details. |
| `GET /v1/attendee/profile`, `PUT /v1/attendee/profile` | Attendee's own reusable profile and visibility settings. |
| `GET /v1/attendee/profile/preview` | Owner-only filtered preview with validated preview mode. |
| `POST /v1/attendee/profile/photo` | Validated profile photo upload through the backend. |

Record schemas, validation limits and errors in `api/docs/openapi.yaml` during implementation. Standardize `401` unauthenticated, `403` forbidden, `409` account conflict, validation errors, `429` rate limiting and safe service errors. Never include credentials in diagnostics. Authentication provider recovery/session endpoints remain provider-owned.

## 7. Milestone 2: events and registration

Organizer pages: event list; create/edit wizard; review/publish; sharing and QR download; registration dashboard; program management. Wizard stages: (1) name, dates, timezone and venue; (2) description and day-by-day sessions/speakers; (3) visibility, networking window and final review. Save drafts, validate scheduling and generate stable share links plus branded QR artwork.

Attendee pages: event landing/code lookup, join confirmation, reusable profile review, joined events, event home and program. Returning attendees authenticate and confirm registration without repeating profile setup. Prevent duplicate registrations with a database uniqueness constraint. Do not silently auto-register from a link visit.

API owns event ownership, slug/code uniqueness, publish state, membership and public/private eligibility. Private event details do not appear in public discovery or recommendations. Distinguish registrations from verified attendance; do not label registration totals as people who attended. Actual check-in counts require a check-in mechanism.

Gate: end-to-end create → publish → share/QR → attendee registration → organizer count; unauthorized editing and private-event leakage tests; mobile/keyboard wizard audit; timezone and duplicate-submission tests.

## 8. Milestone 3: discovery and connections

Deliver event-scoped directory, search/filter, permitted profile cards, incoming/outgoing requests and accepted connections. The event home can emphasize relevant people while offering an explicit all-attendees view. Initial relevance uses declared profile fields and transparent rules; do not present it as a completed AI chatbot.

API validates shared membership, networking window, incoming-request preferences, blocking and state transitions. Make request/accept/reject/cancel operations idempotent where appropriate. Prevent self-requests and duplicate reciprocal pending requests. Only acceptance unlocks connections-only fields; visibility changes and blocking revoke access on subsequent requests.

Add in-app connection notifications and reporting/block controls. Gate: two-user browser tests, object-access and privacy audit, race tests for reciprocal requests, query/pagination checks and moderated abuse scenarios.

## 9. Milestone 4: messaging, event closure and pilot

Deliver accepted-connection conversations, inbox, message states, in-app notification list/read states and user preferences. Select the simplest reliable delivery mechanism after measuring pilot needs; guaranteed real-time push is not a prerequisite for the first auth slice.

Implement scheduled/manual event closure and attendee archive views. Once networking closes, disable new requests and expire unresolved pending requests so later acceptance cannot bypass closure. Existing accepted connections retain permitted chat access, subject to blocking/deletion. Historical attendee lists remain membership-protected and follow visibility rules.

Organizer reporting includes registrations and connection aggregates where appropriate, without exposing private chats or hidden contact details. Add check-in only if actual attendance reporting is included in the approved pilot scope. Finish basic moderation, backup/restore rehearsal, retention/deletion behavior and operational documentation.

Gate: cross-user message isolation, closure/timezone boundary tests, notification preference tests, accessibility review, backup restore and a supervised pilot. Fix release-blocking defects before public launch.

## 10. Future product phases

These remain in the product vision and marketing narrative; they are not prerequisites for MVP completion. Describe capabilities accurately as they become available.

| Phase | Features and dependencies |
| --- | --- |
| AI networking | Connect AI conversation, natural-language people search, explainable suggestions and proactive agents. Python under `api/ai`; only authorized event/profile projections supplied; opt-in controls, evaluation, rate/cost limits and no autonomous connection acceptance. |
| Personalized sessions | Recommend registered-event sessions using role, interests, program and timezone. For an 11:00 cybersecurity session, offer configurable reminders such as the previous day and 30 minutes before. Support schedule changes, cancellation, quiet hours, duplicate prevention and notification consent. |
| Public event discovery | Interest/history-based upcoming events and approximate-location preferences. Exclude private events from indexing and AI promotion. |
| Travel coordination | Event-scoped offer-seat/need-seat posts, public landmarks, requests and coordination. Precise home addresses remain private. Ride booking/payment integrations require separate scope. |
| Virtual/hybrid attendance | Virtual registration and provider-backed streaming first; permissions, session access, moderation and recordings policy. Native Zoom-like video infrastructure is a separate major project. |
| Commercial and operations | Paid plans, billing, organizer teams, richer verified-attendance analytics and scaled moderation after permissions, ownership and commercial requirements are approved. |

In-app notifications come first. Email uses a transactional email service; FCM is a push transport and does not send Gmail email. Future agents, scheduled reminders and delivery retries run in backend jobs with explicit user preferences.

## 11. Testing and milestone audits

- **API:** domain/state tests, real PostgreSQL integration tests for constraints and concurrent writes, token failure cases, ownership checks and privacy projections.
- **Web:** typecheck, lint, production build, meaningful form/route tests and browser end-to-end tests using separate organizer and attendee sessions.
- **UX:** small-screen layouts, keyboard navigation, visible focus, screen-reader labels, contrast, reduced motion, loading/error/empty states and light/dark themes.
- **Security:** cross-account access attempts, spoofed roles, unsafe redirects, CSRF, upload handling, secrets in bundles/logs and cache isolation.
- **Operations:** migration forward/rollback or recovery strategy, environment validation, health/readiness, logs, deployment smoke checks and restore verification before pilot.

For every milestone, produce an audit record with scope delivered, commands and results, manual evidence, defects and severity, unresolved risks and a release recommendation. No passing audit based only on mocked authentication or screenshots. Do not claim tests have run while only drafting this plan.

## 12. Agile execution and approval gates

Use a prioritized backlog and short increments: define acceptance criteria → implement → integrate → test → demonstrate → audit → review. Plan sprint capacity after the first increment; dates are estimates, not promises. Maintain one working vertical slice before widening scope.

Each milestone closes with a reviewable working result and an audit. Critical account separation, privacy, authentication and data-loss defects block progression. Lower-priority issues receive owners and backlog entries. Re-estimate when requirements change.

Replicate this plan in each repository's `docs` directory so it travels with that repo. Maintain API contracts in `api/docs`, UI route/interaction specifications in `web/docs`, and entry-link/configuration guidance in `marketing/docs`. Update affected README instructions as implementation changes the scaffold. The copies are snapshots of one plan and must stay synchronized when approved scope changes.

## 13. First approved build deliverable

Start with increment 1A: separate registration/login/recovery routes, immutable server-enforced account provisioning, correct post-login redirects, and protected organizer/attendee dashboard shells. Include real Clerk integration, database persistence and automated separation tests. Continue with profile/privacy work after this vertical slice is demonstrated.

Before connecting external environments, verify Clerk project settings, database access and deployment origins through private environment configuration. Missing credentials should produce a clear setup blocker rather than fake authentication. Routine UI and local scaffolding can proceed independently after plan approval.

Approval requested: canonical `/attendee` routes with `/profile` compatibility redirects, the immutable binding and email policy above, and milestone 1A as the first implementation slice. No feature implementation is included in this planning change.
