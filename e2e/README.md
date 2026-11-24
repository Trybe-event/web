# End-to-end pilot journey (web#22)

Playwright, on a 360px phone viewport, against a running deployment with the
seeded demo users (`go run ./cmd/seed --clerk` in the API).

```bash
npx playwright install chromium
CLERK_PUBLISHABLE_KEY=pk_test_... CLERK_SECRET_KEY=sk_test_... \
TRYBE_E2E_WEB_URL=https://<staging web> npm run test:e2e
```

The Clerk keys must belong to the deployment's development instance: the suite
signs seeded users in with Clerk sign-in tokens and never types a password.

It covers: an organizer publishes, two attendees join on the link, discover each
other, connect and chat live; an organizer cannot join; a non-member cannot open
the directory; a blocked attendee cannot message. Each run creates a "Pilot
journey" event, so run it against staging or a Neon branch of it, not production.
