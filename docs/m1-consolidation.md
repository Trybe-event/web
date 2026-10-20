# M1 consolidation: one codebase

Current documentation policy (17 October 2026): the maintainer now requires exact
MVP Markdown/PDF copies in all three repos. Follow `CONTRIBUTING.md`; the historical
copy-removal discussion below is not an instruction to delete these required copies.

**Read this before starting any Trybe work.** It explains why there were two versions of Milestone 1, which one is now the codebase, what was carried over, what was dropped, and where to pick up. The same document is in `Trybe-event/api` and `Trybe-event/web` at `docs/m1-consolidation.md`.

Date: 15 October 2026. Agreed by the team: `milestone/m1` is the codebase.

## What happened

M1 was built twice, at the same time:

1. **`milestone/m1`** (api and web): built against the shared API contract (`api/openapi/openapi.yaml`) and the 67 GitHub issues. It covers accounts, authorization, profiles and field visibility, uploads, the `/api` proxy, the design system, attendee profile screens, deployment config and the M1 audit.
2. **A second implementation** merged straight into `main` in both repos (api PR #43 `codex/account-foundation`, web PR #29). It covered organizer and attendee sign-in/sign-up with Clerk, explicit account creation, workspace shells, and an account-binding API under `/v1/...`.

The two don't share files, routes or API paths, so they couldn't both stay. The team chose `milestone/m1` because the contract and every M2–M4 issue are written against it. The second implementation's best parts, the **organizer and attendee entry flows**, were ported onto it.

## The codebase now

| Repo         | Branch                                         | Status                                                                                                                                       |
| ------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `api`, `web` | `main`                                         | **The M1 codebase** (merged from `milestone/m1` on 15 October 2026 in api#44 and web#30). The second implementation is kept in history only. |
| `api`, `web` | `milestone/m2`, `milestone/m3`, `milestone/m4` | Cut from that `main`. Branch your issues from these.                                                                                         |
| `api`, `web` | `milestone/m1`                                 | Done; kept for reference. Don't branch from it.                                                                                              |
| `marketing`  | PR #2 `chore/marketing-standard-nextjs`        | Standard Next.js, with the account-entry handoff merged in. Waiting for review.                                                              |

Sources of truth, in order: the GitHub issue → `api/openapi/openapi.yaml` → `CONVENTIONS.md` → `AGENTS.md` → this document.

## Carried over from the second implementation

All of these now live on `web` `milestone/m1`, adapted to the contract and the shared components.

| From (`main`)                                                                                                           | Now (`milestone/m1`)                                                               | Adaptation                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home page with the attendee / organizer choice                                                                          | `app/page.tsx`                                                                     | Same design; uses `getSession()`                                                                                                                                                                                                              |
| `/attendee/sign-in`, `/attendee/sign-up`, `/organizer/sign-in`, `/organizer/sign-up`                                    | Same routes, `components/auth/auth-page.tsx`, `auth-form.tsx`                      | Clerk `SignIn`/`SignUp` per account type; unchanged "account access is being prepared" state when Clerk isn't configured                                                                                                                      |
| `/attendee/complete`, `/organizer/complete` (explicit, permanent account choice with confirmation checkbox)             | Same routes, `components/auth/complete-page.tsx`, `complete-account.tsx`           | Calls `POST /accounts/attendee` / `POST /accounts/organizer` from the contract (not `/v1/...`). Organizer must give an organization (PRD §7). Attendee may add a private phone (PRD §12). Attendees then go straight into profile onboarding. |
| `/account/setup` (signed in, no account type yet)                                                                       | `app/account/setup/page.tsx`                                                       | Unchanged behaviour                                                                                                                                                                                                                           |
| `/attendee` and `/organizer` workspace shells                                                                           | `app/attendee/page.tsx`, `app/organizer/page.tsx`, `components/auth/workspace.tsx` | The attendee home now links to the real profile, or to onboarding if no profile exists. The organizer home keeps a placeholder card for the M2 dashboard.                                                                                     |
| `/profile` redirecting into the attendee area                                                                           | `app/profile/**` redirects                                                         | Also covers `/profile/edit`, `/preview` and `/settings`                                                                                                                                                                                       |
| Wrong account type → redirect to your own workspace                                                                     | `requireAccount(type)` in `lib/session.ts`                                         | Replaces the earlier "wrong account" screen                                                                                                                                                                                                   |
| Theme toggle with a remembered choice (cookie)                                                                          | `components/auth/theme-toggle.tsx`, `app/layout.tsx`                               | Without a saved choice the theme follows the system                                                                                                                                                                                           |
| App runs without Clerk keys                                                                                             | `lib/auth-config.ts`, `proxy.ts`, `app/layout.tsx`, `/api` proxy                   | The proxy only asks Clerk for a token when Clerk is configured                                                                                                                                                                                |
| Auth, entry and workspace styles                                                                                        | `app/globals.css` (bottom section)                                                 | Colours read the shared tokens (`--paper`, `--ink`, `--muted`, `--line`, `--lime`) so both themes work                                                                                                                                        |
| Smoke tests                                                                                                             | `tests/smoke.test.mjs`, `npm run test:smoke`, and in CI                            | Rewritten for the contract's routes                                                                                                                                                                                                           |
| Marketing buttons handing off to the app (`accountHref`, `AccountEntry`, `/attendee/*` and `/organizer/*` entry routes) | marketing PR #2                                                                    | Merged onto the cleaned-up marketing site                                                                                                                                                                                                     |

The attendee profile screens from `milestone/m1` moved under the attendee area:

| Before                                            | Now                                                  |
| ------------------------------------------------- | ---------------------------------------------------- |
| `/profile`                                        | `/attendee/profile`                                  |
| `/profile/edit` (onboarding with `?onboarding=1`) | `/attendee/profile/edit`                             |
| `/profile/preview`                                | `/attendee/profile/preview`                          |
| `/profile/settings`                               | `/attendee/profile/settings`                         |
| `/profile/setup`                                  | Replaced by `/attendee/complete`                     |
| `/profile/sign-in`, `/profile/sign-up`            | Replaced by `/attendee/sign-in`, `/attendee/sign-up` |
| "Wrong account" screen                            | Replaced by redirect to your own workspace           |

## Not carried over, and why

| Item (on `main`)                                                                                                    | Why it was dropped                                                                                                                                                                                    | Where the equivalent lives                                                                             |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| API `codex/account-foundation` (`cmd/server`, `internal/httpapi`, `internal/auth`, `migrations/`, `/v1/...` routes) | It duplicates api#29, #30, #31 and #35 with different paths and layout. The contract and all M2–M4 issues use `/me/account`, `/accounts/{type}`, `/me/profile`, `internal/<domain>`, `db/migrations`. | `api` `milestone/m1`: `internal/accounts`, `internal/platform/auth`, `internal/authz`, `db/migrations` |
| `docs/openapi.yaml` (122 lines)                                                                                     | Superseded by the full M1–M4 contract                                                                                                                                                                 | `api/openapi/openapi.yaml`                                                                             |
| `ai/` Python service                                                                                                | AI matching is outside the MVP (MVP v1.0 "Future plans"); the stack plan adds FastAPI only in a later stage                                                                                           | Future roadmap                                                                                         |
| Supabase references                                                                                                 | The database is Neon                                                                                                                                                                                  | `api/docs/neon.md`                                                                                     |
| PRD/MVP copies and PDFs in `api` and `web` `docs/`                                                                  | Keep one copy of the product documents outside the code repos, or in marketing `docs/` where they already are                                                                                         | marketing `docs/`                                                                                      |
| `docs/implementation-plan.md`, `docs/milestone-1a-status.md`                                                        | Describe the second implementation, so they would mislead agents                                                                                                                                      | This document and `api/docs/audits/M1.md`                                                              |
| `/v1/me` response shape (`state`, `onboardingComplete`, `fullName`)                                                 | The contract's `Account` schema is used everywhere                                                                                                                                                    | `GET /me/account`                                                                                      |
| `lib/utils.ts` (`clsx`, `tailwind-merge`), `BrandLogo`                                                              | Shared components already cover them                                                                                                                                                                  | `components/ui` (`cn`, `Logo`)                                                                         |
| The second implementation's `/api` proxy                                                                            | The contract-generated allowlist proxy is stricter and tested end to end                                                                                                                              | `app/api/[...path]/route.ts`, `lib/proxy.ts`                                                           |

Nothing was lost: the second implementation stays in `main`'s git history (`55ce237` in api, `18eb302` in web) until the reconciliation merge, and remains in history after it.

## Good ideas to adopt later

These were in the second implementation's API and aren't in `milestone/m1` yet. Each needs a small issue and its own PR into the right milestone branch.

1. **Refuse account binding until the primary email is verified.** Clerk verifies email at sign-up, but the API doesn't re-check yet. Suggested home: `internal/accounts`, checking the Clerk user via the backend API before binding.
2. **Email uniqueness across account types.** One Clerk instance already gives one user per email, so this mostly holds. An explicit database constraint would be a cheap extra guarantee.
3. **A migration runner that refuses edited migrations.** goose records versions; adding a checksum check in CI would catch edits to applied files.

## Where to pick up

### Finishing M1 (owner: samjay8)

Done: all M1 code is on `main`, and `milestone/m2`–`m4` exist. Still open (api#36, the M1 audit): provision Neon, Clerk, Cloudflare R2, Fly.io and Vercel (`api/docs/deploy.md`). Then run the live checks in `api/docs/audits/M1.md`:

- attendee and organizer sign-up with separate emails,
- password reset,
- each account type redirected away from the other's area,
- hidden contacts absent from the preview,
- a 360px and keyboard-only pass.

None of this blocks starting M2.

### Starting M2–M4 (everyone)

Each person's issues are on GitHub with an implementation plan, dependencies and their sequence. Branch from your issue's milestone branch (`milestone/m2`, `m3` or `m4`). Route notes that changed with this consolidation:

| Issue                           | Where it plugs in                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| web#1 organizer dashboard       | Replace the placeholder card in `app/organizer/page.tsx`; keep `requireAccount("organizer")` and `WorkspaceShell`                                                       |
| web#2–#4 event form             | New routes under `app/organizer/events/...`, guarded with `requireAccount("organizer")`                                                                                 |
| web#5 share graphic             | Event management under `app/organizer/events/[id]/...`                                                                                                                  |
| web#6 event landing             | `app/[slug]/page.tsx` (public; reserved slugs in `lib/routes.ts` include `attendee`, `organizer`, `account`, `profile`)                                                 |
| web#7 new attendee join         | `/attendee/sign-up` → `/attendee/complete` → `/attendee/profile/edit?onboarding=1`. Carry the event slug through Clerk's redirect so the join step returns to `/{slug}` |
| web#8 returning attendee        | `/attendee/sign-in` back to `/{slug}`; reuse `app/attendee/profile` components for the review step                                                                      |
| web#9 event switcher            | Attendee workspace (`app/attendee/page.tsx`, `components/auth/workspace.tsx`)                                                                                           |
| web#11 onward (event workspace) | `app/events/[slug]/...`, guarded with `requireAccount("attendee")`                                                                                                      |
| All api issues                  | Unchanged: `internal/<domain>`, paths from `openapi/openapi.yaml`, migrations in `db/migrations`                                                                        |

Use `getSession()` and `requireAccount()` from `lib/session.ts` for every server-side account decision. Never read the account type from Clerk metadata.

## How this was verified

- **api `milestone/m1`:** `go vet`; 33 Go tests against Postgres 16 (none skipped); contract lint; Docker image build in CI; gitleaks over the full history.
- **web `milestone/m1`:** typecheck, lint, format, production build, and the bundle secret scan.
- **6 smoke tests** against the built app with no Clerk secret: unconfigured auth screens, signed-out redirects for both workspaces and the profile area, `/profile` redirects, home links, proxy refusals, reserved slugs.
- **15 end-to-end checks** with the real Go API behind the built web app (`api/scripts/e2e-proxy.sh`).
- **marketing PR #2:** typecheck, lint, format and build after merging the account-entry handoff.

To check locally: in `web`, run `npm ci`, then `npm run build && npm start`. In another terminal, run `TRYBE_TEST_WEB_URL=http://127.0.0.1:3000 npm run test:smoke`.
