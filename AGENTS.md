# Trybe agent brief

Paste this whole document into your AI coding agent at the start of every session, then fill in the three lines under "You". It is the same for every team member. The issue tells the agent what to build; this brief tells it how to work.

---

## You

- **Team member (GitHub username):** `<your-username>`
- **Repositories you work in:** `<api | web | marketing>`
- **Current milestone:** `<M2 | M3 | M4>`

## Start of every session (do these in order, every time)

1. Read your progress file `.agent/<repo>-<issue-number>.md` if it exists. It says where you stopped.
2. `git fetch origin` and sync your branch with `origin/milestone/<mN>` (see "Branches and syncing").
3. Check whether `openapi/openapi.yaml` changed since your last session. If it did, adjust before writing new code.
4. Re-read the issue you are on (`gh issue view <n> -R Trybe-event/<repo>`).
5. State in three lines: the issue, the next step, and anything blocking. Then work.

## What Trybe is

Trybe is an event networking platform. Organizers create events and share a registration link and QR code. Attendees join, keep a reusable profile, discover relevant people in the event, connect by mutual consent, and chat. Contact details stay private unless the attendee chooses to share them.

Two rules override everything else:

1. **Organizer and attendee accounts are separate.** An account is exactly one type and never both. There is no role switch. The server enforces this on every request; the frontend route is never the security boundary.
2. **Fields a viewer may not see are never sent.** Every profile leaves the API through the visibility resolver. Never send a hidden value to the browser and hide it in the UI.

Breaking either rule is a release-blocking defect, even if every test passes.

## Read first

`docs/m1-consolidation.md` explains which codebase is current (`milestone/m1`), what was carried over from the second M1 implementation on `main`, and where to pick up. Read it before your first task.

## Sources of truth, in this order

1. **The GitHub issue you are working on.** Its Scope, Implementation plan and Acceptance criteria define the work. Read the whole issue, including "Depends on", "Your sequence" and "Workflow".
2. **`openapi/openapi.yaml`** in `Trybe-event/api`. The contract between frontend and backend. Every request, response, field name and error code comes from here.
3. **`CONVENTIONS.md`** in the repository. Layout, branches, migrations, logging, tests.
4. **The PRD and MVP documents** (sections cited in the issue's "Spec" line).
5. Existing code on the milestone branch.

If two sources disagree, stop and ask the human. Never pick one silently.

## Find your work

```bash
gh issue list -R Trybe-event/api --assignee <your-username> --state open
gh issue list -R Trybe-event/web --assignee <your-username> --state open
gh issue view <number> -R Trybe-event/<repo>
```

Work issues in the order of **"Your sequence (step N of M)"** in each issue body. One issue at a time. Do not start the next issue until the current one has an open PR.

## Before writing any code

1. Read the full issue. Then read every issue in its "Depends on" list.
2. Read `CONVENTIONS.md` and the parts of `openapi/openapi.yaml` that the issue touches (search for its paths and schemas).
3. Read the existing code you will change or call. Never guess at a function, table, route or component: open it.
4. Create your progress file (see "Memory") with the issue's checklist copied in.
5. Tell the human, in five lines or fewer: what you will build, which files and folders you will touch, and anything unclear. If something is unclear, ask before you start.

## Scope: do exactly the issue, completely

**You must deliver every item** in the issue's Scope, every step of the Implementation plan, and every Acceptance criterion. Partial delivery is not done. If an item turns out to be impossible or wrong, stop and explain why. Do not skip it quietly.

**"Better" is allowed only inside the issue's scope:** more negative tests, clearer error messages, better accessibility, safer concurrency, smaller diffs. "Better" never means extra features, extra endpoints, extra screens or redesigns.

**You must not:**

- Touch files outside your issue's area. If your issue is `internal/events`, don't edit `internal/connections`. If you believe another area needs a change, write it down for the human and leave the code alone.
- Change `openapi/openapi.yaml` inside a feature PR. If the contract is wrong or missing something, stop. The human opens a separate contract PR and tags the affected owners.
- Edit or reorder someone else's migration. Add your own timestamped migration (`make migration name=<thing>`).
- Rename, move or reformat code you are not changing. No drive-by refactors, no formatting sweeps, no import reordering in untouched files.
- Upgrade, add or remove dependencies unless the issue says so. If you truly need a new library, ask first.
- Delete, skip or weaken existing tests to get green. Never loosen an authorization check, a visibility rule or a validation to make something pass.
- Add mock data, placeholder text or TODOs and call the work finished. A TODO is only allowed when it names the issue that will resolve it (`// TODO(api#14): replace stub with live connections`).
- Create documentation files the issue does not ask for. No `NOTES.md`, `SUMMARY.md`, `IMPLEMENTATION.md` or similar.
- Commit secrets, `.env` files, real connection strings, tokens or personal data.
- Push to `main` or to `milestone/*` directly, force-push a shared branch, merge PRs, or close issues. Humans merge.

## Branches and syncing across milestones

- Your branch name is in the issue (for example `m2/api-event-drafts`). Create it from the milestone branch named in the issue:

  ```bash
  git fetch origin
  git switch -c <branch> origin/milestone/<mN>
  ```

- Open the PR into `milestone/<mN>`, never into `main`.
- Sync with the milestone branch **at the start of every session and before opening the PR**:

  ```bash
  git fetch origin
  git rebase origin/milestone/<mN>   # or merge, if the branch is already shared
  ```

  Resolve conflicts by keeping both sides' intent. If a conflict is in someone else's area, stop and ask.

- When an earlier milestone merges into `main`, the milestone branches pick it up. Re-sync your branch after that and rerun all checks.
- If your issue depends on work that hasn't merged yet:
  - Frontend: use the generated API client and the MSW mocks built from the contract.
  - Backend: code against an interface with a small stub, and mark it `TODO(<repo>#<n>)`.
  - Never copy another person's unmerged code into your branch.
- Check the contract for changes each session (`git log origin/milestone/<mN> -- openapi/openapi.yaml`). If it changed, regenerate types (web) and adjust.

## Memory: never lose track

Keep a progress file **outside git**: `.agent/<repo>-<issue-number>.md`. `.agent/` is git-ignored; never commit it. Create it before coding:

```markdown
# <repo>#<n> <issue title>

Branch: <branch> Base: milestone/<mN> Status: in progress

## Checklist (copied from the issue: scope, plan, acceptance)

- [ ] ...

## Decisions

- <date> <decision and why, one line each>

## Open questions for the human

- ...

## Next step

<exactly what to do next>
```

Rules:

- Re-read the progress file at the start of every session and every time your context is summarized or reset.
- After each completed step, tick it and rewrite "Next step". Do this before moving on.
- Before saying anything is done, compare the code against every line of the checklist.
- When you are unsure what you were doing, read the progress file and `git diff origin/milestone/<mN>`. Don't guess.

## How to write code here

- Use descriptive names that explain each value's purpose. Avoid single-letter names and unexplained abbreviations in application code. Keep third-party package names and contract field names unchanged; explain library acronyms at their first use.
- Remove unused imports, variables, unreachable code and obsolete styling in changed areas. TypeScript checks unused locals and parameters; do not disable those checks to make a build pass.
- Match the code around you: naming, error handling, comment density, file layout. When in doubt, copy the pattern from the nearest existing file.
- Small, focused commits with conventional messages: `feat(events): idempotent draft create`, `fix(profiles): omit hidden links`.
- Comments explain _why_, only where it isn't obvious. No narration (`// now we loop over users`) and no restating the code.
- Do not add AI attribution lines (such as `Co-Authored-By` trailers) to commits or PRs.
- Backend (Go): every route registered with an explicit access level that matches the operation's `x-account` in the contract. Account type comes from the database binding, never from the token or headers. Use `httpx.Error` and the standard error codes. Never log bodies, tokens, emails, phone numbers, message bodies or contact fields.
- Frontend (Next.js): call the API only through `lib/api` (the generated client over the same-origin `/api` proxy). Render only what the API returns. Use the shared components in `components/ui`; don't style raw elements. Every form control has a label; everything works with the keyboard and at 360px wide.

## Verification before opening a PR

Run all of these, and paste the commands with short results into the PR:

**api**

```bash
go vet ./...
go test ./...                                  # unit
TEST_DATABASE_URL=<neon dev branch> go test ./...   # integration
```

Then call your endpoints over HTTP with each account type (organizer, attendee, admin, anonymous) and confirm the status codes. For anything touching profiles, look at the **raw JSON** and confirm hidden fields are absent.

**web**

```bash
npm run typecheck && npm run lint && npm run build
```

Then check your screens at 360px and 1280px, keyboard-only, in light and dark, with the real API or mocks. Check the network tab: no field appears that the screen shouldn't have.

If any check fails, fix it. If it fails for a reason outside your issue, report it in the PR; don't paper over it.

## Pull request

Title: the issue title. Body, in this shape and no longer than it needs to be:

```markdown
Closes Trybe-event/<repo>#<n>

## What changed

- <one line per meaningful change>

## Acceptance criteria

- [x] <criterion copied from the issue>: <how it was verified, one line>
- ... (every criterion, none omitted)

## Checks run

<commands and one-line results>

## Deviations and follow-ups

- <anything not done exactly as the issue says, and why; "None" if none>
```

Then add a short comment on the issue linking the PR and stating the next issue in your sequence.

## When to stop and ask the human

- The issue is ambiguous or conflicts with the contract, CONVENTIONS or PRD.
- You need a contract change, a new dependency, or a change in someone else's area.
- A dependency isn't merged and can't be stubbed cleanly.
- You need credentials or secrets.
- A test you didn't write fails, or you find a privacy or authorization bug anywhere.

Ask once, clearly, with your recommended option. Don't wait silently, and don't invent an answer.

## Reporting to the human

Keep updates short and factual: what's done, what's next, what's blocked. No restating the issue and no padding. At the end of each issue, report:

1. The PR link
2. Acceptance criteria met (all of them, or the exact ones that aren't, and why)
3. Checks run and their results
4. The next issue in your sequence

## Definition of done (all must be true)

- [ ] Every scope item, plan step and acceptance criterion delivered
- [ ] Tests cover the rules, including negative cases (wrong account type, other owner, hidden fields, retries, concurrency where relevant)
- [ ] All checks above pass locally
- [ ] Only files in the issue's area changed; no contract edits; no unrelated formatting
- [ ] Branch synced with `milestone/<mN>`; PR opened into `milestone/<mN>` with the template filled in
- [ ] Progress file shows every checklist item ticked
