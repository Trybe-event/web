# Trybe Event Networking Platform

## Product Requirements Document

**Project name: Trybe | Version 0.6 | Updated 13 October 2026**

**Product promise: Connection with convenience**

> Markdown rendering of `trybe-prd.pdf` (PRD v0.6). The PDF in this folder is the signed-off source of record; this Markdown exists so the document renders and diffs on GitHub. Content is unchanged.

This document defines the event networking product, its user journeys, privacy requirements, and staged delivery plan. The platform helps attendees find relevant people from their phones, connect by mutual consent, and continue conversations after an event. Organizers create events, publish programs, distribute registration links and QR graphics, and track registrations and verified attendance.

## 1 Product vision and goals

- Reduce the time and effort needed to find relevant people at an event.
- Enable networking before, during, and after events within organizer-defined networking periods.
- Keep contact information private and give attendees direct control over sharing.
- Make event creation, registration, and attendee profile reuse straightforward.
- Help organizers understand registrations, verified attendance, and aggregate networking activity.
- Recommend relevant public events and support optional shared travel coordination.

## 2 Commercial scope

The platform is free during the demo stage. Pricing, organizer subscriptions, payments, and commercial plans are future capabilities. Native streaming is a later expansion. The proposed initial delivery is a responsive web application that works comfortably on phones; native mobile applications are not part of the initial build.

## 3 Requirement status

Account separation and privacy defaults are mandatory product requirements. Items explicitly marked Proposed or To confirm are implementation decisions for review. Delivery stages represent recommended sequencing; AI matching can move into the networking MVP if it is required for launch.

# Accounts Routes and Access

## 4 Separate account types

An account must have exactly one product account type: organizer or attendee. A user account must never be both. There is no shared-role account, role-switching control, or conversion between organizer and attendee workspaces. Administrator access is separate from both product account types.

| Account type | Permitted actions |
| --- | --- |
| Organizer | Create and manage owned or authorized events, publish programs, configure networking, and view event statistics. |
| Attendee | Register for events, maintain an attendee profile, discover matches, connect, chat, and participate in carpools. |
| Administrator | Manage platform operations and review reports using a separate administrative interface. |

Organizer accounts cannot register as attendees, appear in attendee directories, receive attendee matches, send networking requests, use attendee messaging, or participate in attendee carpools. Attendee accounts cannot create events or access organizer dashboards.

## 5 Route structure

| Example route | Purpose |
| --- | --- |
| trybe.events/organizer | Organizer registration, sign-in, dashboard, and event management. |
| trybe.events/profile | Attendee account and reusable profile workspace. |
| trybe.events/{event-slug} | Event landing page and entry into attendee registration and event participation. |

These are proposed URL conventions using the working brand. Event links and QR codes always enter the attendee flow. Organizer onboarding has its own route and creates only an organizer account. Opening an event link with an organizer session may show permitted event information but cannot enroll that organizer account.

## 6 Authentication and authorization

Support email and password, email verification, password reset, and logout. Select the authentication provider before implementation; confirm whether the intended provider is Clerk. Separate routes must be backed by server-side account-type checks on every protected action and API. A valid session for one account type must not grant access to the other workspace.

To confirm: whether the same email may be used for two independent accounts. Regardless of this identity policy, the system must never merge account types or provide simultaneous organizer and attendee privileges.

# Organizer Onboarding and Event Creation

## 7 Marketing site and organizer workspace

The marketing site explains convenient networking, demonstrates privacy controls, and offers organizer registration and sign-in. Organizer onboarding collects full name, email, organization, and authentication credentials. It creates no attendee profile.

The organizer dashboard contains My events, Create new event, registration totals and trends, verified attendance when available, and event status controls. It clearly communicates free demo access.

## 8 Three stage event creation form

The form has three main stages. Scrolling updates the active stage indicator, while explicit Next, Back, and stage navigation controls remain available. Scrolling never publishes an event. Save drafts as the organizer progresses and show saved or unsaved status.

**Stage 1 Event basics.** Collect event name, start and end dates and times, time zone, venue name and address, and physical, virtual, or hybrid format. Require venue details for physical events and reject an end time before the start. Virtual and hybrid events initially use external attendance links.

**Stage 2 Description and program.** Collect a short summary, full description, topics or categories, and optional event image. Organize the program into days, each containing sessions. Sessions have a title, description, start and end times, speakers, and optional room, stage, or track. Speaker role, organization, and bio are optional. Organizers can add, edit, remove, and reorder days and sessions. Sessions must fall within the event schedule. Overlaps are allowed for parallel tracks and must be shown clearly.

**Stage 3 Visibility networking and review.** Set public or private visibility, registration opening and closing times, and networking availability before, during, and after the event. Configure explicit networking opening and closing times. Display all event details, the program, visibility, and networking settings for review before submission.

## 9 Publication and share assets

Successful submission saves and publishes the event, generates a stable registration link and QR code, creates a downloadable share graphic displaying the event name and QR code, and opens event management. Include a readable registration link on the graphic. Editing event details must not change the registration URL or invalidate the existing QR code. Failed submissions must preserve the draft and allow a safe retry without duplicate events.

# Event Visibility and Attendee Registration

## 10 Public and private events

| Behavior | Public | Private |
| --- | --- | --- |
| Registration through an active shared link | Yes | Yes |
| Upcoming event discovery | Yes | No |
| AI event recommendations and platform promotion | Eligible | Excluded |
| Directory access by nonmembers | No | No |

Private events are excluded from platform search, recommendations, public listings, and promotional discovery. Only people who receive the link can enter the registration flow. A link can be forwarded; verified invitations or organizer approval are a separate control if strict invitation-only access is required.

Changing an event to private removes it from future discovery and recommendation results. Attendee directories remain membership restricted for both visibility types.

## 11 Event landing page

Display event name, description, schedule, location, program, speakers, and registration availability. The call to action can read: Join Google DevFest 2026. Set up your profile, explore the program, and meet the right people. Do not expose the attendee directory to visitors who have not joined.

## 12 New attendee registration

Collect full name, email, password or supported authentication credentials, and phone number. Proposed: make phone number optional unless a defined operational need requires it. A registration phone number must not automatically become a shared WhatsApp contact. Email used for authentication stays private.

After authentication and verification, attendees complete profile onboarding, review visibility settings, confirm event registration, and enter the event workspace. Prevent duplicate event registrations and clearly handle invalid links, closed registration, and unavailable events. Attendees can leave the event community.

## 13 Returning attendees

When an attendee opens another event link, recognize a valid attendee session or request sign-in. Show the saved attendee profile, allow edits, and require explicit confirmation to join. Opening a link alone must not register the account. Profile reuse applies only to attendee accounts and never converts organizer accounts.

The attendee home includes an event switcher. Proposed: profile edits apply account-wide. Event-specific profile versions are a later decision. A signed-out visitor must authenticate before the system retrieves private saved details.

# Attendee Profiles and Privacy

## 14 Profile onboarding

Suggested introduction: The next great connection starts here. Create your profile so people can understand what you do and why they should connect with you.

| Fields | Requirement |
| --- | --- |
| Full name, professional role, about or bio | Required |
| Skills and interests | At least one proposed for useful discovery |
| Profile photo | Encouraged; fallback avatar available |
| Organization and networking goals | Optional |
| LinkedIn, portfolio or website, X, Instagram | Optional |
| WhatsApp or separate contact details | Optional; private by default |

Let attendees edit and preview their profile as another event member or an accepted connection would see it. Initial social links are entered manually. Core identity information includes name, photo, role, organization when provided, and bio; explain shared-event visibility before registration is confirmed.

## 15 Field visibility controls

| Setting | Access |
| --- | --- |
| Hidden | Only the attendee who owns the profile |
| Connections only | Accepted connections |
| Event attendees | Registered attendees sharing an event with the owner |

Contact and social fields default to Hidden. Attendees explicitly select fields to share with accepted connections. They may expose a portfolio to event attendees while keeping WhatsApp restricted. Public portfolio in the initial product means permitted event members; open-internet profile publishing requires a separate decision.

## 16 Permission behavior

Pending requests reveal no restricted fields. Acceptance reveals only fields configured for connections; Hidden stays hidden. Visibility changes apply to existing connections. Disconnection revokes future access to connection-only information. Organizers never bypass attendee privacy through reporting or dashboard APIs.

Enforce identical permissions in profile responses, search, notifications, archives, analytics, and AI inputs. Do not send hidden values to clients and merely conceal them visually. Explain that information already viewed or copied cannot be recalled.

Settings allow attendees to disable incoming connection requests, opt out of AI matching, and manage optional notifications. To confirm: whether an attendee may hide the entire profile while remaining registered.

# Discovery Connections and Messaging

## 17 Event workspace

The default event view is Matches. All attendees opens the full membership-restricted directory. Navigation also includes Program, Connections, Inbox, Carpool, Notifications, and Profile and settings. Relevance guides the default view; server permissions protect the underlying data.

Search and filter by role, skills, interests, and networking goals. Restrict results to the selected event and exclude removed memberships, deleted accounts, and blocked relationships. Profiles with incoming requests disabled show that they are unavailable for new connections.

## 18 Connection lifecycle

Connection requests move from no relationship to Pending and then Accepted, Rejected, Cancelled, or Expired. Accepted relationships can later be disconnected. Blocking is an independent access restriction. Prevent self-requests, duplicate pending requests, and excessive repeated requests.

Attendees can send requests, accept or reject incoming requests, cancel outgoing requests, view pending outgoing requests, and browse accepted connections. Recipients receive an in-app notification with acceptance and rejection actions. No AI-generated request is sent without the attendee choosing to send it.

Accepted connections belong to attendee accounts and may continue after the event. Record the originating event. Incoming-request preferences and networking windows apply when a new request is created.

## 19 Messaging

One-to-one text messaging becomes available after a request is accepted. Provide conversation history, timestamps, unread indicators, and blocking and reporting within conversations. Unconnected attendees cannot send ordinary networking messages.

Accepted connections can continue messaging after the originating event closes. Proposed: disconnection prevents new messages and removes restricted profile access while retaining existing history subject to the retention and deletion policy. Blocking immediately prevents new communication.

## 20 Notifications

Provide connection-request and acceptance notifications, new-message notifications, AI match suggestions, event and selected-session reminders, carpool updates, event recommendations, and material organizer updates.

Users can enable or disable optional categories and real-time alerts. Disabling an alert does not remove the underlying request or message from its screen. In-app notifications launch first; email and push follow. Respect timezone settings, networking windows, and visibility in notification content.

## 21 Safety

Provide block and report controls for attendee profiles, conversations, and carpools. Administrators review reports in a separate restricted interface. Log administrative actions and protect report information from other users.

# AI Matching and Event Recommendations

## 22 Conversational attendee matching

Attendees describe who they want to meet, such as: I am a frontend developer looking for developers interested in building startup products. The assistant returns relevant profiles and short explanations supported by real profile attributes.

- Match only within the selected event and its active networking period.
- Use only profile information the requester is permitted to access.
- Exclude blocked accounts, inactive memberships, matching opt-outs, and people unavailable for incoming requests.
- Allow follow-up questions and refinement without inventing skills, interests, or attendee identities.
- Show a useful empty state when suitable people are unavailable.
- Require the attendee to choose whether to send a connection request.
- Provide standard search when the AI service is unavailable.
- Avoid inferring sensitive personal traits; provide matching participation controls.

Optional proactive suggestions can notify an attendee that a relevant person has joined. Respect notification preferences and do not automatically connect the pair. Select the AI provider, data retention rules, and permitted processing before this feature launches.

## 23 Public event discovery

Show upcoming public events with descriptions, schedules, venues, and programs. Users explicitly register through the event flow; recommendations never enroll them automatically.

Recommendations may use declared interests, skills, professional role, previously joined events, and a user-selected location. Explain the reason, such as a similar topic to an event the user previously joined. Let attendees disable history-based personalization and recommendation alerts.

Recommend only public events with open registration. Private events are never candidates, even if a user attended them. Private event history must not be exposed in another user's recommendation explanation or public promotion. Use selected location initially; device location requires permission.

## 24 Platform promotion boundaries

AI marketing initially means public-event discovery and recommendations inside the platform. External advertising, campaign publishing, and automatic messages to third parties are separate future capabilities. Organizer visibility controls determine recommendation eligibility, not access to private attendee contact data.

# Carpool Event Closure and Organizer Reporting

## 25 Event carpool coordination

Attendees can post I need a seat, I am driving with seats available, or I want to share a booked ride. Collect a public pickup landmark, travel date, departure time, destination event, available or requested seats, optional return-trip details, and a short note.

Only event members can browse listings or request participation. Drivers or coordinators accept or reject requests. Private coordination becomes available after acceptance through a carpool-specific permission; this does not create a professional connection or reveal connection-only profile fields.

Prevent accepted allocations from exceeding capacity. Support withdrawal, cancellation, expired listings, blocking, and reporting. Use public landmarks rather than home addresses. Attendees arrange Uber or other transport externally. Automated booking, payments, driver verification, and live tracking are outside this release.

## 26 Event completion and networking closure

Event completion and networking closure are distinct. Organizers can end an event while its configured post-event networking period remains open. Registration, event activity, and networking status must be displayed separately.

When networking closes, prevent new requests and new AI match suggestions. Preserve permitted program information and an archived attendee list. Existing accepted connections and conversations remain available. Proposed: expire pending requests at closure; confirm this rule before implementation.

Archived lists respect current field permissions, blocks, deleted accounts, and event membership. They do not freeze previously visible contact data. Close obsolete travel listings when their journey time passes.

## 27 Organizer statistics and verified attendance

Show registration totals and trends, verified check-ins, attendance rate, aggregate networking activity, and event status. Count physical attendance only from check-in evidence; registration and app visits are not proof of attendance.

Proposed initial check-in: organizers search the registration list and mark attendees checked in. Attendee-specific check-in QR codes can follow. The shareable event registration QR is not an attendance credential. For virtual events, define a separate participation measurement before reporting verified virtual attendance.

Organizers may use aggregate reports for planning, project reporting, and future-event evaluation. Attendee names and necessary registration status can support check-in, but hidden contact fields remain inaccessible. Future marketing to attendee contacts requires a separate attendee choice. Exports and permitted export fields remain to be defined.

# Delivery Plan and Data Model

## 28 Delivery stages

| Stage | Deliverables and completion gate |
| --- | --- |
| 1 Event and identity foundation | Marketing site; separate authentication and routes; organizer dashboard; three-stage event form; programs; visibility; links and QR graphics; attendee registration; reusable profiles; privacy settings. Gate: publish an event and join with a permission-controlled attendee profile. |
| 2 Networking MVP | Basic profile relevance; Matches and All attendees; search; requests; incoming-request controls; notifications; event switching; networking windows; archives; blocking and reporting. Gate: two attendees connect and see only allowed fields. |
| 3 Messaging and attendance | Inbox; unread states; notification preferences; reminders; organizer check-in and attendance statistics. Gate: connected attendees chat and registrations remain distinct from verified attendance. |
| 4 AI and public discovery | Matching chatbot; proactive suggestions; upcoming public events; personalized recommendations and controls. Gate: matching respects event permissions and recommendations exclude private events. |
| 5 Carpool coordination | Travel listings; participation requests; capacity controls; private coordination. Gate: event attendees coordinate travel without exposing private addresses or contacts. |
| 6 Commercial and virtual expansion | Pricing; payments; advanced organizer tools; streaming integration or native streaming. Gate: separate scope, cost, and operational requirements approved. |

Recommended networking MVP: Stages 1 and 2. If AI matching is required for the first launch, move the chatbot into Stage 2 while keeping public event recommendations in Stage 4. Native streaming is a substantial later feature and needs its own requirements document.

## 29 Data relationships

OrganizerAccount owns or manages Event records. AttendeeAccount owns Profile, PrivacyPreference, EventMembership, ConnectionRequest, Connection, Conversation, and CarpoolParticipation records. Never use a multi-role account or assign attendee membership to an organizer account. AdministratorAccount is separate.

Additional entities include ProgramDay, Session, Speaker, AttendanceRecord, Message, CarpoolListing, Notification, NotificationPreference, Block, Report, and Recommendation. Attendance records reference attendee event memberships. Connections reference attendee accounts. Registration and networking timestamps use the event timezone for display and a consistent stored time standard.

# Quality Metrics and Release Acceptance

## 30 Nonfunctional requirements

- **Security:** enforce account-type and resource authorization on every server operation, hash passwords through the authentication provider, encrypt network traffic, and protect sessions.
- **Privacy:** collect necessary information only; define account deletion, data access, and retention; exclude private contact values from logs and analytics.
- **Reliability:** prevent duplicate events, registrations, requests, and carpool allocations under retries or concurrent actions.
- **Accessibility:** provide keyboard navigation, readable contrast, labeled controls, clear validation, and accessible stage navigation.
- **Mobile usability:** verify organizer review and attendee registration, discovery, requests, and chat on common phone widths.
- **Performance:** define expected event membership and concurrent usage before setting measurable load-test targets.
- **Auditability:** record privileged administrative actions, event lifecycle changes, and attendance edits.

## 31 Success metrics

Primary measure: accepted connections per active attendee per event. Define active attendee and the measurement window before launch.

Track landing-page registration conversion, profile completion, request activation and acceptance, time to first accepted connection, conversations started, verified attendance rate, attendee satisfaction, AI match usefulness, carpool participation, reports, blocks, and confirmed unauthorized disclosures. Set growth targets after the pilot; unauthorized disclosure is a release-blocking defect.

## 32 Release acceptance criteria

- An account has one product type only. Organizer and attendee sessions cannot access each other's protected actions, APIs, or workspaces; no role switch exists.
- An organizer publishes a validated event and downloads a working registration QR graphic. Editing details preserves the link.
- An attendee joins through the event link, completes onboarding, and explicitly reuses a profile for another event.
- Only registered attendees access a selected event directory. Private events never appear in public discovery or recommendations.
- Requests support send, cancel, accept, reject, and closure behavior without duplicates. Incoming-request opt-outs and blocks are enforced.
- Hidden contacts remain hidden before and after acceptance; selected connection fields appear only when permitted and are revoked on preference change or disconnection.
- Networking closes as configured while accepted connections continue permitted messaging. Archives enforce current permissions.
- Organizer reports separate registration from verified check-in and never reveal hidden contact fields.
- AI, when released, returns real eligible profiles, respects opt-outs and networking windows, and never sends requests automatically.
- Carpool, when released, respects membership, capacity, and its own coordination permissions.
- Password reset, account deletion, reporting, responsive layouts, and accessible forms work end to end.

# Open Decisions and Implementation Readiness

## 33 Decisions to confirm before dependent development

| Decision | Current position |
| --- | --- |
| Product name and domain | Trybe is the confirmed project name; domain examples remain illustrative. |
| Authentication provider | Email and password supported; confirm Clerk or alternative. |
| Email reuse across account types | To confirm. Accounts and privileges must remain fully separate. |
| Phone number | Proposed optional; never automatically share it as WhatsApp contact. |
| Private-event invitation enforcement | Shared-link access initially; confirm whether verified invitations or approval are required. |
| Network opening and closure | Organizer-defined periods; confirm defaults and pending-request expiry. |
| Profile versions and directory visibility | Account-wide edits proposed; confirm whole-profile hiding and event-specific variants. |
| AI launch scope | Decide whether chatbot enters Stage 2 or remains Stage 4. |
| Attendance verification | Manual organizer check-in proposed; define virtual participation separately. |
| Retention and exports | Define archive, conversation, deletion, and export policies and permitted fields. |
| Pilot capacity | Confirm attendee count, concurrent usage, and required performance targets. |

## 34 Build sequence and dependencies

Begin with separate account boundaries, route authorization, and the privacy permission model. Build organizer event creation and attendee registration on that foundation. Then add directory discovery and consent-based requests. Messaging depends on accepted relationships; AI depends on permitted profile retrieval; carpool depends on event membership and a distinct participation permission.

Before each stage is released, verify its completion gate and all applicable privacy and account separation acceptance criteria. Expand testing when a new feature introduces a new permission path, lifecycle state, or concurrency risk.

## 35 Pilot outcome

The pilot should demonstrate that an organizer can create and manage an event while a separate attendee account can join, find relevant people, and exchange mutually accepted connections from a phone. Evaluate connection relevance, onboarding friction, privacy comprehension, and organizer reporting before expanding the roadmap.

# Recommended Technology Stack

## 36 Architecture recommendation

Use React and TypeScript through Next.js for the web application, a Go core API for product rules and data access, and a Python FastAPI service for AI matching when that stage launches. Next.js serves pages and a thin backend-for-frontend proxy; it must not duplicate Go business logic. Start with a modular Go service rather than separate microservices for every feature.

| Layer | Recommended technology and responsibility |
| --- | --- |
| Web frontend | React, TypeScript, Next.js App Router, Tailwind CSS, accessible component primitives, React Hook Form and Zod for form validation. |
| Public API boundary | Same-origin Next.js route handlers under /api; reverse proxy routes authenticated long-lived connections to Go when needed. |
| Core backend | Go with net/http or chi; SQL migrations and sqlc with pgx. Own accounts, events, permissions, requests, messages, reporting, and carpool transactions. |
| AI backend | Python FastAPI and Pydantic. Called by Go using authorized candidate data; no unrestricted attendee database access. |
| Identity | Clerk for authentication. Go owns immutable organizer or attendee account type and validates sessions before authorization. |
| Database | Supabase-managed PostgreSQL with connection pooling, migrations, constraints, and least-privilege database roles. |
| Files | Supabase Storage for avatars and event assets, accessed through controlled backend operations. |
| Notifications | PostgreSQL notification records, Go worker and transactional outbox, authenticated SSE for live updates; Resend for email; FCM for opt-in push. |
| Operations | Docker for Go and Python, managed container hosting with private ingress, CI checks, structured redacted logs, error monitoring, and tested backups. |

Use PostgreSQL search and structured interest tags for the MVP. Add pgvector only when semantic matching requires it. Redis is optional for measured caching or distributed rate-limit needs, not a prerequisite. Pin supported dependency versions at implementation time.

## 37 Request flow

Browser -> HTTPS same-origin /api -> Next.js proxy -> private Go API -> PostgreSQL or storage. For matching: Go -> private Python service -> AI provider. Go returns permission-filtered responses through the proxy. Only the public web entry point and intended authentication or push SDK traffic are browser reachable.

# Proxy Security and Identity Boundaries

## 38 What remains visible and what stays secret

Browsers can inspect frontend code, public routes, requests, and returned data. A proxy does not make these invisible or prevent all attacks. Its purpose is to keep privileged credentials and internal services off the client while enforcing authentication and authorization. Never rely on an obscure URL for security.

Do not pass server environment variables from browser to backend or serialize them into HTML, JavaScript, error messages, or API responses. Provision secrets independently to server workloads through the hosting secret manager. Database credentials, Clerk secret keys, storage administrative keys, email keys, Firebase service credentials, and AI provider keys stay server-side.

Clerk publishable configuration and Firebase browser configuration may be visible because their SDKs require public identifiers. They must not grant privileged access. NEXT_PUBLIC_ variables are bundled for the browser; use them only for deliberately public values, never secrets. The no-secret-exposure requirement does not prohibit necessary public configuration.

## 39 Proxy and internal service controls

Restrict proxy destinations and methods to fixed allowlists. Do not accept arbitrary forwarding URLs, credentials, or trusted identity headers from callers. Strip spoofable headers; forward a verified session token or a short-lived signed internal assertion. Go verifies the identity and its account type and resource permissions on every request. Protect private service ingress using network restrictions and service credentials.

Enforce body limits, schema validation, rate limits, timeouts, secure cookies where appropriate, CSRF protection for cookie-authenticated mutations, restrictive CORS, TLS, and safe error handling. Verify webhook signatures and deduplicate delivery. Avoid caching personalized responses across users. Keep secrets out of source control and logs; rotate them after suspected exposure.

## 40 Clerk and strict account separation

Use separate organizer and attendee entry flows. Each Clerk identity is bound to exactly one application account type, stored server-side and immutable through user-editable metadata. The backend rejects any attempt to reuse an organizer identity as an attendee or vice versa. Separate Clerk instances can be evaluated if stronger provider-level isolation is required; one instance with immutable backend enforcement is the proposed default.

## 41 Database and file permissions

Use separate organizer and attendee tables and constraints preventing dual binding. Ordinary application access uses restricted database privileges. Enable and test RLS on exposed tables or disable unused Data API exposure. Secret or service-role access may bypass RLS, so RLS must not be assumed to protect privileged requests. Go enforces field visibility regardless of storage mechanism. Use private buckets or short-lived authorized URLs for restricted files; validate upload size and content type.

# Notification Delivery and Technical Release Gates

## 42 Durable notifications and reminders

When a connection or event change commits, insert its notification or outbox entry in the same database transaction. A Go worker processes durable jobs, applies preferences, retries transient failures with backoff, and uses idempotency keys to avoid duplicate sends. Store scheduled reminder times consistently and recheck event cancellation, membership, and preferences immediately before delivery.

In-app notifications are database records with unread state and an authenticated SSE feed. Reconnect using a cursor and fetch missed records. For live chat, use an authenticated WebSocket through the same-origin reverse proxy, with authorization on connection and every conversation action. Long-lived connections require a hosting plan that supports their duration; do not assume short-lived Next.js serverless handlers can host them.

FCM delivers browser or device push; it does not send email. Web push requires supported browsers, permission, and a service worker. Email notifications and reminders use Resend from a verified sending domain and can reach Gmail or other inbox providers. Gmail is a recipient mailbox, not the recommended application mail transport. Neither push nor email guarantees exact-time receipt; schedule dispatch and record provider outcomes.

## 43 Deployment and scope

Deploy Next.js on a supported web host and Go plus its worker on managed container infrastructure. Keep Go and Python ingress restricted to trusted services. Place database and API workloads in compatible regions, configure connection pool limits, and separate development, staging, and production secrets and databases. Choose hosting after verifying private connectivity, persistent connection support, budget, region, and service quotas.

Stage 1 establishes Next.js, Clerk, Go, PostgreSQL, storage, and secret management. Stage 2 adds in-app notifications and outbox processing. Stage 3 adds live chat, scheduled email, and optional FCM push. Stage 4 adds FastAPI and AI retrieval. Later stages reuse the existing permissions and workers.

## 44 Technical acceptance gates

- Inspect production bundles and responses: no server secrets or restricted profile values are present. Public SDK identifiers alone are expected.
- Verify organizer-to-attendee and attendee-to-organizer denial at proxy, API, database relationships, and realtime authorization boundaries.
- Test signed identity handling, invalid tokens, cross-event access, field visibility, request opt-outs, and blocked relationships.
- Test retries, duplicate jobs, cancelled reminders, revoked push tokens, offline reconnect, and email failures.
- Confirm internal API ingress is restricted, database roles are least privilege, and migrations, backups, and restore procedures work.

# Technical References and Stack Decisions

## 45 Official documentation reviewed on 13 October 2026

- Next.js environment variables: https://nextjs.org/docs/app/guides/environment-variables
- Clerk session verification in Go: https://clerk.com/docs/guides/sessions/verifying
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase database security: https://supabase.com/docs/guides/database/secure-data
- Firebase web push setup: https://firebase.google.com/docs/cloud-messaging/web/get-started
- Firebase message types: https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type
- Resend email API: https://resend.com/features/email-api
- FastAPI container deployment: https://fastapi.tiangolo.com/deployment/docker/

## 46 Decisions before implementation

Confirm Next.js as the React framework, Clerk as the identity provider, the immutable identity-binding policy, hosting and region, email sending domain, notification channels for launch, and expected concurrent chat connections. The stack above is a recommended design; it does not imply that services have been provisioned or integrated.

This technical plan supplements the delivery stages without changing the product requirement that organizer and attendee accounts are separate. Do not add Supabase Auth alongside Clerk for the same user lifecycle unless a specific integration requirement justifies the additional identity system.

# Future Plans for Virtual and Hybrid Events

## 47 Integrated streaming for virtual attendees

The long-term product includes an integrated streaming interface where attendees can watch and participate in event sessions inside the platform. Physical, virtual, and hybrid events share the event program and networking experience. This capability is a committed product direction with implementation details to be defined before development; it is outside the initial networking MVP.

A virtual attendee registers through the event link, completes or reuses an attendee profile, enters the event workspace, explores the program, and selects a live session to watch. The attendee can find relevant people, send connection requests, and message accepted connections without leaving the event experience. Organizer accounts remain separate and never become virtual attendee accounts.

## 48 Organizer streaming tools

- Create virtual or hybrid events and mark sessions as physical, streamed, or both.
- Assign a stream or virtual room to each scheduled session and support parallel program tracks.
- Provide an organizer or authorized production interface to prepare, start, pause where supported, and end broadcasts. Production permissions do not create attendee privileges.
- Show the current live session, scheduled sessions, and clear pre-start or ended states.
- Configure whether a session is live-only or recorded, and whether replay is available. Recording and replay are proposed extensions requiring an explicit policy.
- Track registrations separately from actual virtual participation and present aggregate session engagement.

## 49 Virtual attendee experience

- View a mobile-friendly video player with session title, speaker information, and program navigation.
- Join authorized streams from the event workspace; private events and their streams must remain excluded from public discovery.
- Support muted playback controls, captions when available, connection-status feedback, and a useful reconnect state.
- Receive permitted session reminders and switch between available tracks.
- Continue attendee matching, connection requests, and accepted-connection messaging during the event.
- Consider moderated session chat and audience questions as extensions distinct from private connection messaging.

## 50 Phased streaming delivery

First support organizer-provided external attendance links. Next evaluate an embedded or managed streaming integration with event-level access controls. Build more extensive native conferencing, speaker rooms, screen sharing, and other Zoom-like capabilities only after usage, cost, moderation, and operational requirements are validated. Interactive meetings and one-to-many broadcasts need different designs; choose the initial format before selecting a provider.

# Future Product Roadmap and Release Boundaries

## 51 Streaming safeguards and completion criteria

Define host permissions, stream access tokens, concurrent viewing capacity, latency, bandwidth costs, caption support, moderation, recording consent, retention, and replay permissions before implementation. A shared registration QR must not grant unrestricted viewing access. Stream credentials and production keys remain server-side; authorized playback still exposes the media being watched and cannot prevent every recording or redistribution.

Virtual attendance reporting requires evidence such as authorized session joins and qualified viewing time, with a stated measurement definition. Do not equate registration with attendance or assume that an open player proves continuous viewing.

Streaming is ready for a pilot when an organizer can publish a virtual session, a registered attendee can access it, unauthorized users are denied, disconnects recover clearly, networking stays permission-controlled, and physical versus virtual participation is reported distinctly. Provider selection and infrastructure capacity are separate technical decisions.

## 52 Other future capabilities from the product vision

| Capability | Planned behavior and delivery position |
| --- | --- |
| AI matchmaking | Conversational discovery within the selected event, explanations, and opt-in proactive match alerts. Stage 4, or Stage 2 if required for launch. |
| Public event discovery and AI promotion | Upcoming events near a selected location, recommendations based on interests and history, and in-platform promotion of public events. Private events remain excluded. Stage 4. |
| Carpool and shared rides | Seat requests, driver listings, public pickup landmarks, shared Uber coordination, participation approval, and private coordination. Stage 5; automatic booking is not included. |
| Commercial plans and payments | Move beyond the free demo with a separately defined pricing model and payment workflow. Stage 6; ticketing or subscriptions require a business decision. |
| Advanced organizer reporting | Verified attendance, aggregate engagement, planning reports, and permitted exports. Initial reporting arrives in Stage 3; advanced reporting and exports follow defined privacy rules. |
| Expanded notification delivery | In-app updates first, then scheduled email and optional push for connections, messages, sessions, match suggestions, and relevant public events. User preferences remain enforced. |
| Reusable attendee identity | Saved profiles and switching among registered events remain core features from the foundation stage, with event-specific profile variants considered later. |
| Continued post-event networking | Organizer-defined networking periods, archived attendee lists after closure, and continuing conversations with accepted connections. Core lifecycle behavior, not dependent on streaming. |

## 53 Roadmap intent

The product grows from convenient event connections into a combined physical and virtual event community. The full roadmap is preserved here; delivery stages control sequencing rather than removing capabilities from the vision. New features must retain strict organizer and attendee account separation, contact privacy, event visibility rules, and explicit attendee choices.

# Future AI Agents and Personalized Sessions

## 54 Profile based session recommendations

Trybe will recommend relevant sessions inside an event the attendee has registered for. Use the attendee's professional role, declared skills, interests, networking goals, and session schedule to identify useful talks. This is a future capability, distinct from attendee matchmaking and recommendations for other events.

For example, a cybersecurity attendee registered for a multi-track DevFest should receive relevant cybersecurity talks, with their title, speaker, description, day, time, timezone, room or track, and attendance format. Android engineering or software engineering sessions may also be suggested when their topics genuinely overlap with the attendee's stated interests.

## 55 Timely suggestions and reminders

Example: A cybersecurity session begins at 11:00 AM. Trybe can provide a recommendation the day before and an optional reminder at 10:30 AM, explaining why the session fits the attendee's profile. The attendee controls reminder timing and channels. One day before and thirty minutes before are suggested presets, not mandatory alerts.

- Show personalized recommendations in the event program and a My recommended sessions view. Keep the complete program available.
- Explain relevance using actual session topics and permitted profile attributes; never invent speakers, locations, or times.
- Allow attendees to bookmark sessions, dismiss suggestions, adjust interests, and disable personalization.
- Avoid presenting overlapping sessions as a conflict-free itinerary. Show conflicts and let the attendee choose.
- Recheck schedule changes, cancellations, timezone, membership, and notification preferences before dispatch. Update or cancel stale jobs.
- Deduplicate reminders across recommendation and bookmarked-session triggers. Do not repeatedly notify about the same session.
- Do not send recommendations for an unjoined private event. Restrict virtual viewing to separately authorized streams.

## 56 Program data required

Extend session records with topics or tags, target audience, optional skill level, track, speaker information, scheduled start and end, room, format, and cancellation status. Organizers supply this information. Where detail is insufficient, show limited confidence or ordinary program browsing rather than a fabricated recommendation.

## 57 Future AI agents

Introduce bounded agents for attendee discovery, session guidance, and opt-in reminder assistance. An attendee can ask: Which cybersecurity sessions should I attend tomorrow? The session agent explains suitable options and may propose a schedule. The attendee approves any bookmark or reminder changes. Agents must not autonomously send connection requests, register for events, reveal contacts, change visibility, or book rides.

Agents use authenticated, permission-scoped tools and the existing Go API. They receive only the data necessary for the task. Record permitted actions, protect against instructions embedded in event or profile content, apply rate and cost limits, and provide manual browsing when the agent fails. Expanded organizer agents remain a separate scope decision.

# Agile Framework Milestones and Audits

## 58 Product backlog and MVP selection

Maintain two visible backlog groups: current basic product and future capabilities. The current baseline covers separate accounts, organizer event setup, links and QR sharing, attendee registration and saved profiles, privacy, discovery, and consent-based connections. Messaging and attendance follow the existing sequence. AI agents, personalized sessions, advanced recommendations, carpool, payments, and streaming remain explicitly visible in the future backlog.

This PRD preserves the full scope. The final MVP cut will be selected in the next planning step using milestones, dependencies, audit results, and team capacity. The existing delivery stages are candidate sequencing, not a finalized launch commitment.

## 59 Agile working cycle

Use short, timeboxed sprints; two weeks is a proposed starting cadence. In backlog refinement, turn requirements into stories with acceptance criteria and dependencies. Sprint planning selects a small demonstrable increment. Hold brief progress check-ins, then a sprint review with working software and a retrospective to improve the next cycle.

A sprint may deliver part of a milestone. Milestones mark verified product outcomes, not simply elapsed dates. Defects and audit findings return to the backlog with severity and ownership. Do not expand a milestone until its critical acceptance criteria are satisfied.

| Milestone | Outcome and audit focus |
| --- | --- |
| M1 Identity boundaries | Organizer and attendee onboarding and routes. Audit authentication, immutable account type, API denial, sessions, and secret exposure. |
| M2 Event creation and entry | Three-stage setup, program, visibility, QR, registration. Audit private-event exclusion, validation, duplicate submissions, and link lifecycle. |
| M3 Profiles and connections | Reusable profiles, field controls, discovery, requests. Audit hidden fields, cross-event access, opt-outs, blocks, and revocation. |
| M4 Conversations and operations | Messaging, notifications, check-in, closure. Audit conversation access, reminder reliability, archived privacy, and attendance evidence. |
| Future increments | Split AI matching, session agents, public discovery, carpool, commercial features, and streaming into independently testable milestones. Audit each feature before release. |

## 60 Definition of done

Each milestone requires implemented stories, reviewed changes, passing relevant tests, demonstrated acceptance criteria, documented material decisions, and a completed audit checklist. Resolve release-blocking privacy, authorization, and data-integrity findings before progression. Review accessibility, mobile usability, performance at the expected scale, and operational recovery as applicable. Release approval confirms a concrete tested increment.

# Testing and Future AI Acceptance

## 61 Testing after every milestone

Use focused unit tests for meaningful rules, integration tests for API and database boundaries, and end-to-end tests for essential journeys. Include negative cases, not only successful paths. Perform manual mobile and accessibility review. Run regression checks for existing critical flows whenever a new milestone changes their behavior.

Maintain a test and audit record with milestone, build revision, acceptance criteria, executed checks, results, defects, owners, and retest evidence. Verify audit closure at the sprint review or milestone review. Testing is continuous during development; the milestone gate consolidates the evidence.

## 62 Audit categories

- **Identity and authorization:** no organizer-attendee role sharing, spoofed identity, unauthorized event access, or private conversation access.
- **Privacy and secrets:** field-level visibility, revoked access, private-event exclusion, redacted logs, and no server secrets in frontend output.
- **Data integrity:** request retries, duplicate records, concurrent capacity allocation, and accurate lifecycle transitions.
- **Notification operations:** timing, preferences, timezone, idempotency, cancellation, and provider failures.
- **Usability and accessibility:** registration, program navigation, mobile layouts, keyboard access, and understandable sharing settings.
- **AI quality:** evidence-based explanations, permission-scoped retrieval, inappropriate tool use, stale schedules, and graceful fallback.

## 63 Personalized session release acceptance

- A cybersecurity attendee sees relevant cybersecurity sessions within the selected joined event, with complete organizer-supplied schedule details and an explanation.
- An 11:00 AM session can trigger an opted-in 10:30 AM reminder and a prior-day alert, using the correct timezone and current schedule.
- Schedule edits update future reminders; cancellations prevent stale recommendations and sends.
- Conflicting sessions are flagged, and attendees can bookmark, dismiss, or change preferences without losing access to the full program.
- Matching uses only permitted profile data and honors personalization opt-outs, private-event membership, and notification preferences.
- Agent actions remain within authorized tools; requested changes require user choice and are recorded. A failed agent leaves standard browsing usable.

## 64 Next planning step

After reviewing this updated PRD, select the MVP stories and milestone boundaries, assign owners, estimate capacity, and create the sprint backlog. Keep all deferred capabilities in the future roadmap with their dependencies and acceptance criteria so the basic build remains focused without losing the product vision.
