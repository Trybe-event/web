# Trybe MVP Scope and Delivery Plan

**Version 1.1 | Updated 17 October 2026**

> Roadmap-only revision of the v1.0 MVP baseline. The four milestones and launch scope are unchanged. This Markdown and `trybe-mvp.pdf` include the future poster/code-entry addendum; adding it does not sign off a milestone or make those features part of the current build.

The minimum viable product proves one complete outcome: an organizer creates an event, attendees join through its link, and they discover, connect, and communicate with relevant people while controlling contact visibility.

Delivery uses four milestones with testing and an audit gate after each. Messaging is included so accepted connections can network inside Trybe. The initial product is a responsive web application, free during the demo stage.

## Mandatory account boundary

Organizer and attendee accounts are separate. An account cannot hold both roles, switch roles, or use the other account type's workspace. Organizer accounts never become event attendees. Enforce this on the server, not only through separate URL paths.

## MVP scope

| Area                 | Included capability                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Accounts             | Separate onboarding and login, email verification, password reset, immutable account type.                                     |
| Organizer            | My events, event creation and editing, registration totals, event status.                                                      |
| Event setup          | Three stages: basics; description and daily sessions; visibility, networking settings, and review.                             |
| Sharing              | Stable registration link and downloadable event-name graphic with QR code.                                                     |
| Registration         | Event landing pages, public/private visibility, new and returning attendees, explicit joining.                                 |
| Profiles             | Name, role, bio, interests; optional photo, organization, portfolio, socials, and contacts. Saved profile and event switching. |
| Privacy              | Contacts hidden by default; selected fields shared with accepted connections; portfolio optionally visible to event members.   |
| Networking           | Event-only discovery, search, filters, basic profile suggestions, connection lifecycle and preferences.                        |
| Communication        | Accepted-connection text messaging, inbox, unread state, in-app notifications.                                                 |
| Lifecycle and safety | Networking windows, archives, ongoing accepted conversations, block, report, and restricted report review.                     |

## Milestone 1 Accounts and Privacy Foundation

### Outcome

Organizer and attendee identities operate independently, with reusable attendee profiles and verified field-level permissions.

### Build

- Separate organizer and attendee routes, registration, and onboarding.
- Authentication, verification, password reset, logout, and immutable account type.
- Attendee profile creation, editing, and preview.
- Hidden, connections-only, and shared-event visibility for optional fields.
- Server-side authorization, secret management, and a permission-controlled data model.

### Tests and audit

- Organizer accounts cannot perform attendee actions, and attendee accounts cannot perform organizer actions.
- Forged role values or client metadata cannot change account type.
- Hidden profile fields never appear in unauthorized API responses.
- Password reset, invalid sessions, and session expiry work.
- Server secrets are absent from browser bundles, rendered pages, logs, and responses.
- Profile forms work on mobile and support accessible labels and keyboard navigation.

### Completion gate

Demonstrate both account types and profile permissions. Resolve release-blocking identity, authorization, and disclosure defects; retain test results and audit evidence before advancing.

### Technical foundation

Use React and TypeScript through Next.js; a thin same-origin proxy; Go for core API rules; Clerk for authentication; Supabase PostgreSQL and Storage. Backend workloads receive secrets independently. Public SDK identifiers may be visible, but privileged credentials remain server-side. Python AI services are deferred until the corresponding future milestone.

## Milestone 2 Events and Registration

### Outcome

An organizer publishes an event and a separate attendee joins successfully through its link or QR code from a phone.

### Build

- Organizer dashboard and three-stage event creation, with draft saving and review.
- Event name, dates, times, timezone, venue, description, multi-day sessions, and speakers.
- Publication, editing, public/private visibility, and registration availability.
- Stable event registration link and downloadable QR share graphic.
- New attendee registration, profile onboarding, and explicit reuse of saved profiles for returning attendees.
- Registration totals and attendee event switching.

### Tests and audit

- Invalid date ranges and sessions outside the event schedule are rejected; parallel tracks are allowed.
- Retries do not duplicate events or attendee registrations.
- QR codes open the correct event and enter the attendee flow.
- Editing details preserves the registration link.
- Private events are excluded from any public listing; nonmembers cannot access attendee directories.
- Returning attendees review their saved profile and explicitly confirm registration.
- Closed registration and invalid links produce clear states without leaking restricted information.

### Completion gate

Demonstrate event creation, sharing, and new and returning attendee registration end to end. Verify the private-event boundary and registration counts.

### Scope clarifications

Public means a shareable landing page; personalized public-event discovery is deferred. Private shared links may be forwarded. Verified invitations or organizer approval require a separate scope decision. Organizer statistics count registrations, not physical attendance. Actual attendance reporting requires future check-in evidence.

## Milestone 3 Discovery and Mutual Connections

### Outcome

Two attendees discover each other and establish an accepted connection without exposing restricted profile information.

### Build

- Default Matches view using declared roles, interests, and basic deterministic relevance.
- All attendees directory scoped to the selected joined event.
- Search and filters by role, skills, interests, and networking goals.
- Send, accept, reject, cancel, and disconnect actions.
- Incoming and outgoing pending requests, accepted connections, and incoming-request preferences.
- In-app request notifications, blocking, reporting, and restricted report review.

### Tests and audit

- Results and profile access remain within permitted event membership.
- Self-requests, duplicate pending requests, and excessive repeated requests are prevented.
- Incoming-request opt-outs and blocked relationships are enforced.
- Acceptance reveals only fields explicitly configured for connections; Hidden remains hidden.
- Changing visibility or disconnecting revokes subsequent access to restricted fields.
- Concurrent acceptance and cancellation produce one consistent result.
- Notifications expose only permitted content.

### Completion gate

Demonstrate discovery, request handling, acceptance, privacy-controlled sharing, and revocation. Audit API responses directly rather than relying on what the screen displays.

### MVP recommendation boundary

Basic suggestions use profile fields and filters; they are not conversational AI. AI agents, chatbot matching, proactive AI alerts, and personalized session guidance are retained in the future roadmap.

## Milestone 4 Conversations and Pilot Readiness

### Outcome

Accepted connections communicate inside Trybe, and event closure preserves permitted existing relationships.

### Build

- One-to-one text messaging between accepted connections.
- Inbox, timestamps, unread indicators, and in-app message notifications.
- Configurable networking opening and closing times.
- Archived event program and permitted attendee list after networking closes.
- Continued messaging between accepted connections after event completion.
- Moderation workflow, operational monitoring, backup and recovery procedures.

### Tests and audit

- Unconnected or blocked attendees cannot send messages or read private conversations.
- Changing a conversation identifier does not grant access.
- New requests stop when networking closes; archives enforce current permissions and account deletion.
- Notifications and message history remain available after reconnecting.
- Registration, discovery, connection, and chat work end to end on mobile.
- Backup restoration and operational recovery are verified.

### Lifecycle rules to confirm

Proposed: pending requests expire when networking closes. Accepted connections remain. Disconnection prevents future messaging and restricted contact access; message retention and deletion behavior must be documented before release.

### Completion gate

Run the complete pilot journey with no unresolved release-blocking privacy, authorization, or data-integrity defects. Confirm operational ownership and the scale expected for the pilot.

## Agile Delivery Testing and Future Roadmap

### Agile framework

Use short timeboxed sprints; two weeks is a proposed cadence. Refine stories with acceptance criteria and dependencies, select a demonstrable increment in sprint planning, hold brief progress check-ins, review working software, and conduct a retrospective. A milestone may span multiple sprints. Estimate stories and team capacity before committing to a launch date.

### Definition of done after every milestone

- Reviewed implementation and demonstrated acceptance criteria.
- Relevant unit tests for meaningful rules, API and database integration tests, and essential end-to-end journeys including negative cases.
- Mobile and accessibility review, plus targeted performance checks at expected pilot scale.
- Recorded audit results, defect severity, owner, and retest evidence.
- No unresolved release-blocking privacy, authorization, or integrity issue.

### Pilot success measures

Track registration and profile completion, networking activation, request acceptance, time to first connection, conversations started, and attendee feedback on relevance. Define active attendee and measurement windows before the pilot. Set growth targets from observed results. Unauthorized disclosure is a release-blocking defect.

### Future plans retained outside this MVP

- AI chatbot matchmaking, bounded AI agents, and proactive match alerts.
- Personalized sessions based on role, interests, and schedule, with optional prior-day and 30-minute reminders.
- Public event discovery and personalized recommendations; private events stay excluded.
- Carpool, driver and seat listings, shared-ride coordination, and participation approvals.
- Scheduled email and push notifications.
- Verified check-in, attendance statistics, and advanced organizer reporting.
- Commercial plans and payments beyond the free demo.
- Integrated streaming for virtual and hybrid attendees, followed by separately scoped conferencing enhancements.

### Launch gate

An organizer publishes an event; separate attendee accounts join and reuse profiles; two attendees discover, connect, and chat. Account separation and contact privacy remain enforced throughout.

## Future addendum: branded posters and event-code entry

These enhancements are outside the current four-milestone MVP. The current M2 deliverable remains the stable registration link and downloadable QR graphic.

- Generate a branded high-resolution event image, proposed as a portrait 2160 x 3840 PNG. Place Trybe and its logo at the top left, the saved organizer organization name at the top right, and the event title prominently in the body. Include "Scan to join the event", the QR, a readable event code beside it and the full registration URL as a fallback.
- Reuse the organization name captured during organizer onboarding. Never place private organizer contacts or credentials on the poster. Preview long titles and names before downloading.
- Evaluate HTML-to-image capture such as html2canvas against the existing renderer when this feature is scoped. No new rendering dependency is selected or required for the current MVP.
- Let attendees enter an event code to resolve an invitation, then sign in or create a profile as needed, review their details and explicitly confirm joining. Preserve the intended event through onboarding. Looking up a code never registers anyone, and an organizer account cannot join as an attendee.
- Add event-code storage and lookup through a future reviewed API contract. Codes must resolve the same event as the QR, honor private-event and registration rules, resist enumeration and never grant access to attendee directories or contacts on their own.
- Release only after final-resolution QR scans on two phones, typed-code lookup, mobile download, long-text, failure, privacy and account-boundary checks pass. Full requirements are in PRD section 65.
