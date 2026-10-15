# Trybe Milestone 1A: authentication foundation

15 October 2026. Implementation in progress. This is not a Milestone 1 completion sign-off.

## Delivered

- Separate `/organizer/sign-in`, `/organizer/sign-up`, `/attendee/sign-in`, and `/attendee/sign-up` screens. Clerk's nested authentication routes support provider-managed verification and password recovery.
- Responsive Trybe layouts, distinct organizer/attendee presentation, labels, focus states, light/dark toggle and persisted theme choice.
- Explicit `/organizer/complete` and `/attendee/complete` confirmation before the API creates an immutable product account. Sign-in never assigns an account type.
- Protected `/organizer` and `/attendee` workspace shells, resolved on the server. Existing accounts visiting the wrong workspace are redirected to their own. Unprovisioned sessions go to `/account/setup` for an explicit choice.
- Legacy `/profile`, `/profile/sign-in`, and `/profile/sign-up` redirect to attendee routes.
- A same-origin proxy with an explicit endpoint/method allowlist, server-derived token, origin checks, request size/time limits, filtered headers and uncached personal responses.
- Go session verification, primary-email verification, transactional provisioning and PostgreSQL-enforced account separation. No passwords in Trybe's database.
- A single `account_identities` registry using Claude's updated initial migration. Follow-up migration adds immutable identity/type enforcement and workspace setup fields. No parallel registry remains.
- Marketing account-entry routes hand off to `web` in local development, or a configured public app origin in production. No hosted marketing deployment performed.

## Run locally

From `web`, install dependencies with `npm ci`, copy `.env.example` to `.env.local`, and supply the project's Clerk publishable/server credentials privately. Run `npm run dev`. The default product app port is 3000; marketing retains its separate development port.

Configure the Clerk project for email/password, email verification and supported recovery. Disable unwanted social/account-switching options in the provider configuration; the database remains the authority for product account type. Clerk Organizations are not the Trybe organizer account model.

In development, the Go server and migration command load `.env.local` first, then `.env` for missing values; existing process variables take precedence. Explicit staging/production processes use only provisioned environment variables. Supply `DATABASE_URL`, `CLERK_ISSUER`, `CLERK_SECRET_KEY`, and `CLERK_AUTHORIZED_PARTIES` using your private environment configuration. The issuer is the exact HTTPS Clerk Frontend API origin without a trailing slash. Authorized parties are exact web origins, including the localhost/127.0.0.1 origin actually used during development.

From `api`, run `go run ./cmd/migrate` with a migration-capable database connection. The runner records checksums and refuses changes to already applied files. It is intended for fresh databases managed by this migration ledger; externally pre-applied schemas need explicit baselining, not blind reruns. Use a separate least-privilege application database role for `go run ./cmd/server`. Do not run schema migrations automatically on every API startup.

`API_BASE_URL` in `web` points to the private API, locally `http://127.0.0.1:8080`. Configure `NEXT_PUBLIC_WEB_APP_URL` in `marketing` only with the product app's public origin. Production marketing retains the existing entry preview if this value is unset.

## Verification performed

- Web TypeScript and ESLint checks passed; the obsolete ESLint compatibility configuration was replaced with the framework's flat configuration.
- Final production build passed after updating Next.js and its ESLint package to 16.4.1. All account/application routes render dynamically so sessions are resolved per request.
- Marketing TypeScript and production build passed with the account-entry adapter.
- Four HTTP smoke-test groups passed: separate unconfigured auth screens, signed-out workspace redirects, legacy aliases, and proxy restrictions.
- Go unit/HTTP tests passed for invalid signature/claims scenarios, unverified primary email, unknown input fields, wrong-type access and rebinding conflicts.
- Real PostgreSQL integration test passed on an isolated local PostgreSQL 18 instance: migrations, competing account types, idempotent retry, email uniqueness, immutable type and cross-type child constraints. Production PostgreSQL 16/Supabase still needs its own staging verification.
- The migration runner applied the schema and then reran successfully without reapplying completed migrations.
- Browser inspection confirmed attendee and organizer authentication screens. Both had no horizontal overflow at a 390px layout viewport; theme switching worked.
- Production-only dependency audit reported zero vulnerabilities after the update. Five high-severity findings remain in development lint dependencies through `braces`/`micromatch`/`fast-glob`; no forced framework downgrade was applied. Review patched tooling before the milestone audit.
- Temporary local PostgreSQL, API and web-preview processes were stopped after checks. No production database was used and no hosted site was deployed.

Run checks: `npm run typecheck`, `npm run lint`, `npm run build`. With an unconfigured local app running, use `npm run test:smoke`. Go checks: `go test ./...` and `go vet ./...`. Set `TRYBE_TEST_DATABASE_URL` to a disposable PostgreSQL database to include constraint/concurrency tests; otherwise that integration test explicitly skips. The test creates and removes a unique schema.

## Not yet verified or delivered

Project Clerk credentials were not configured during this build. Live registration, verification email delivery, password recovery, sign-out, browser refresh with real sessions, and post-login routing through Clerk plus Go remain integration checks. The app displays a clear unavailable state and disables credentials entry without configuration; no simulated login is used.

This increment does not deliver attendee profile onboarding/editing/privacy previews, event creation, event registration, discovery, connections, messaging, notifications or AI. The attendee shell clearly states profile setup comes next; `onboardingComplete` remains false until that feature is implemented. The full Milestone 1 audit gate remains open.

## Next audit gate

1. Connect the intended Clerk development project and private database environment.
2. Create independent test identities for each account type and run full browser journeys, recovery, logout and wrong-workspace checks.
3. Verify exact issuer/authorized parties, deployment network isolation, least-privilege database grants, production bundle secret handling, and current dependency advisories.
4. Finish attendee profiles and field-level privacy for Milestone 1B, then perform the full Milestone 1 audit before proceeding to events.

Integration references: [Clerk Next.js setup](https://clerk.com/docs/nextjs/getting-started/quickstart), [session verification](https://clerk.com/docs/guides/sessions/verifying). Installed Next.js documentation was also reviewed for server authorization and `proxy.ts` behavior.
