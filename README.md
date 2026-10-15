# Trybe Web

The Trybe organizer and attendee application, built with Next.js (App Router), Clerk and Tailwind CSS.

- How we work: [`CONVENTIONS.md`](CONVENTIONS.md) and [`AGENTS.md`](AGENTS.md)
- API contract: [`contract/openapi.yaml`](contract/openapi.yaml), synced from `Trybe-event/api`
- How M1 was consolidated and where to pick up: [`docs/m1-consolidation.md`](docs/m1-consolidation.md)

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm ci
cp .env.example .env.local   # add your Clerk development keys
npm run dev                  # http://localhost:3000
```

To work without the Go API running, set `NEXT_PUBLIC_API_MOCKS=1` in `.env.local`. Browser `/api` calls are then answered by mocks built from the contract.

To use the real API, run `Trybe-event/api` locally and set `API_INTERNAL_URL` (and `PROXY_SHARED_SECRET` if the API requires it).

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
