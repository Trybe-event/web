import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

// Fetches a Clerk testing token so sign-ins skip bot protection. Needs
// CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY for the deployment's instance.
setup("clerk", async () => {
  await clerkSetup();
});
