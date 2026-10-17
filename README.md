# Trybe Web

The Trybe organizer and attendee application, built with Next.js (App Router), Clerk and Tailwind CSS.

- How we work: [`CONVENTIONS.md`](CONVENTIONS.md) and [`AGENTS.md`](AGENTS.md)
- Shared integration and merge checklist: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Required product scope and milestone gates: [`Trybe MVP`](docs/trybe-mvp.md) ([PDF](docs/trybe-mvp.pdf))
- API contract: [`contract/openapi.yaml`](contract/openapi.yaml), synced from `Trybe-event/api`
- How M1 was consolidated and where to pick up: [`docs/m1-consolidation.md`](docs/m1-consolidation.md)

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm ci
cp .env.example .env.local   # add your Clerk development keys
npm run dev                  # http://localhost:3000
```

Mock Service Worker (`msw`) simulates browser API responses during development. Set `NEXT_PUBLIC_API_MOCKS=1` to enable those contract-shaped responses. Sign-in, account binding and route permissions still require the real Go API; mocks never assign an account type. Keep this setting at `0` when testing account setup or logging in.

To use the real API, run `Trybe-event/api` locally and set `API_INTERNAL_URL` (and `PROXY_SHARED_SECRET` if the API requires it).

If Windows reports that `next` is not recognized, run `npm ci` from this repository's `web` directory before retrying `npm run dev`. Next.js is a local dependency, so a global installation is unnecessary.

Use the consolidated API (`go run ./cmd/api`) from the matching milestone branch. It provides `GET /me/account` and `POST /accounts/attendee` or `/accounts/organizer`. The older `cmd/server` and `/v1/...` routes are incompatible with this app. The server-only variable is `API_INTERNAL_URL`, not the older `API_BASE_URL` or the Clerk domain. Use the same browser origin in `NEXT_PUBLIC_APP_URL` and the API's `PUBLIC_WEB_URL`.

## Scripts

| Command                                                 | Purpose                                           |
| ------------------------------------------------------- | ------------------------------------------------- |
| `npm run dev`                                           | Development server                                |
| `npm run build` / `npm start`                           | Production build and server                       |
| `npm run typecheck` / `npm run lint` / `npm run format` | Checks                                            |
| `npm run contract:sync`                                 | Copy the contract from `../api`                   |
| `npm run gen:api`                                       | Regenerate API types from the contract            |
| `npm run test:smoke`                                    | Smoke tests against a running server              |
| `npm run check:bundle`                                  | Fail if server secrets reached the browser bundle |

## Development ports and restart rules

Run one terminal per service: marketing on `http://localhost:5173`, web on
`http://localhost:3000`, and API on `http://localhost:8080`.
The frontend dev commands explicitly pin their ports and fail if occupied rather
than silently moving sign-in to another origin.

Use `http://localhost:3000` for signing in. Set web `NEXT_PUBLIC_APP_URL` and
API `PUBLIC_WEB_URL` to that same origin. Marketing `NEXT_PUBLIC_WEB_APP_URL`
should point there too; web `API_INTERNAL_URL` should be `http://127.0.0.1:8080`.
Keep the existing matching proxy secret in both services. Never copy secrets into
public variables or disable Clerk validation to solve a port conflict.

Before restarting, press Ctrl+C in the service's existing terminal. If API
`/readyz` already returns ready, the API is running; do not start a second copy.
For an occupied port on Windows, inspect it with:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,3001,5173,8080 |
  Select-Object LocalPort, OwningProcess
```

Identify the owning process before stopping it. Never kill all Node or Go
processes. If the workspace remains unavailable with the right ports, check the
API terminal and `/readyz`; an unavailable API is different from an empty account.
