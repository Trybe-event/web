# Legal pages and sign-up notices

Proposed policy version: `2026-11-10-draft`. Public routes: `/terms`, `/privacy`.

The maintainer confirmed `trybevent@gmail.com` as Trybe's public policy/support contact on 10 November 2026, replacing the previous personal contact. It is centralized in `lib/legal.ts`; policy body references, footers and authentication support links use that shared value. This is intentional public contact information, not an application credential. Changes to the email-sending account still require matching provider credentials; changing a public contact does not authorize reusing a previous account's SMTP password. The registered operator name, address and production jurisdiction details have not been supplied. Do not invent them or claim legal sign-off; both pages remain labelled proposed policies pending review.

The shared `components/legal/legal-notice.tsx` appears at attendee and organizer sign-up, including embedded event sign-up, and at the explicit join button in both returning-user review and first-time profile preview. Links open separately so the unfinished form is preserved. Joining is still an explicit action; reading a policy or opening an invitation does not create membership. A policy notice is not a versioned acceptance ledger or optional-marketing consent. No additional marketing consent or Clerk `legalAccepted` flag is inferred.

Organizer sign-up includes a "Check your email" stage with the submitted address, resend, spam-folder guidance and address correction. It uses the existing Clerk email-code verification, not a simulated email-link acknowledgement. "I've confirmed my email" submits the entered code; only a verified, complete Clerk sign-up can finalize the session. Changing the address resets the pending Clerk attempt while retaining the business form values; no passwords or confirmation codes are saved as onboarding metadata.

Draft content describes implemented product behavior and `api/docs/retention.md`: immutable account types, API omission of hidden fields, private account/business phone, event membership, connection consent, retained message history and partial deletion. It distinguishes current settings from future features and does not assert that the pilot is production-ready. Operator review should verify processing purposes/bases, provider agreements, international transfer safeguards, retention schedules, rights handling and final service terms before publication as final policies.

References reviewed for the draft:

- NDPC rights information: https://forms.ndpc.gov.ng/dsar-request/
- Clerk user metadata: https://clerk.com/docs/guides/users/extending
- Neon data processing agreement: https://neon.com/pdf/DPA.pdf

These sources inform review; they do not constitute a compliance certification for Trybe. Keep product-specific promises aligned with actual server behavior and never publish secrets or environment values in these pages.
