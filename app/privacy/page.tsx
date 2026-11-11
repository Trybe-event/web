import type { Metadata } from "next";
import Link from "next/link";

import { PolicyPage, type PolicySection } from "@/components/legal/policy-page";
import { legalContact } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Trybe collects, how event networking works, and the choices you have over your information.",
};

const sections: PolicySection[] = [
  {
    id: "who",
    title: "Who handles your information",
    content: (
      <>
        <p>
          Trybe provides event registration and networking tools. This proposed
          policy describes how the Trybe team handles information through those
          tools. Registered operator details are being finalized and must be
          confirmed before production launch.
        </p>
        <p>
          For privacy requests, write to{" "}
          <a href={`mailto:${legalContact.email}`}>{legalContact.email}</a>.
          This is our current contact address and will be updated if our
          dedicated support address changes.
        </p>
      </>
    ),
  },
  {
    id: "collection",
    title: "Information we collect",
    content: (
      <ul>
        <li>
          Account information: your name, email and authentication/session
          information. Organizers provide a business name, contact name and
          business phone. Clerk handles passwords and verification; passwords
          are not stored in Trybe&apos;s application database.
        </li>
        <li>
          Attendee profiles: required profile photo, role and bio; organization,
          skills, interests, goals and links you choose to add; and optional
          private account phone information.
        </li>
        <li>
          Event information: organizer details, event images, program, sessions,
          speakers, dates, venue, publication status and registration/networking
          settings.
        </li>
        <li>
          Networking activity: memberships, requests, accepted or ended
          connections, blocks, reports, messages, notification preferences and
          feedback you submit.
        </li>
        <li>
          Technical information needed for operation and security, such as
          session identifiers, request identifiers, timestamps, diagnostic
          events and device/network information processed by our hosting and
          authentication providers.
        </li>
      </ul>
    ),
  },
  {
    id: "use",
    title: "Why we use it",
    content: (
      <>
        <p>
          We use information to create and secure accounts, publish and manage
          events, confirm registrations, apply your privacy choices, provide
          discovery and mutual connections, deliver messages and relevant
          service notifications, investigate abuse and measure aggregate product
          outcomes.
        </p>
        <p>
          Processing needed to provide an account or requested event service is
          based on providing that service. Security, abuse prevention and
          service improvement may rely on legitimate interests, subject to your
          rights. Optional sharing and communications rely on your choices or
          consent where required; legal obligations may require some processing.
          Accepting the Terms is not blanket consent to unrelated marketing or
          public contact sharing.
        </p>
        <p>
          Profile-based recommendations do not automatically connect you with
          another attendee. Sending a request and accepting a connection remain
          explicit actions.
        </p>
      </>
    ),
  },
  {
    id: "visibility",
    title: "Who can see your profile and contacts",
    content: (
      <>
        <p>
          Eligible attendees who share an event can see your core profile
          information, such as your name, photo, role, organization and bio.
          Review the member-view preview before joining.
        </p>
        <p>
          Personal links and contact fields start private. You choose whether a
          field stays visible only to you, is shared with accepted connections,
          or is shared with eligible event members where that option is offered.
          Restricted values are omitted from API responses, rather than merely
          hidden on a screen.
        </p>
        <p>
          Your account email and private account phone are not automatically
          your public networking contacts. An organizer&apos;s business phone is
          private and is not part of the public event response.
        </p>
        <p>
          Connection requests and messages are available only to authorized
          participants under the connection, block and account rules. Limited
          authorized administrators may access information needed to investigate
          a report or maintain the service; we do not describe operational data
          as inaccessible to all administrators.
        </p>
      </>
    ),
  },
  {
    id: "events",
    title: "Events, organizers and sharing",
    content: (
      <>
        <p>
          Event landing pages can show the event title, cover image, organizer
          organization, program, venue and dates. Public event discovery lists
          only events eligible for public listing when that feature is enabled.
          Private events are excluded from that directory, but anyone with a
          forwarded invitation may still be able to open the landing page.
        </p>
        <p>
          When you confirm joining, your event membership and eligible profile
          information are used to provide event networking. Organizers receive
          their own registration statistics; registration totals do not prove
          physical attendance. Aggregate reports do not give organizers access
          to private contacts or message bodies.
        </p>
        <p>
          QR codes, shared links and downloaded event artwork contain
          information intended for sharing. External messaging and social
          platforms control their own link previews and copies. Changing an
          event or a profile does not guarantee removal of previously downloaded
          or cached material.
        </p>
      </>
    ),
  },
  {
    id: "providers",
    title: "Service providers and international processing",
    content: (
      <>
        <p>
          We use Clerk for identity and authentication, Neon for PostgreSQL and
          object storage, Vercel for the web application and Fly.io for
          configured API/worker hosting. Transactional email can use configured
          Gmail SMTP or Resend when delivery is enabled. The selected provider
          may change between development and production.
        </p>
        <p>
          Only information needed for a provider&apos;s role should be sent to
          it. For example, an email provider receives recipient and message
          content needed to deliver that email. Authentication providers may
          retain onboarding metadata used to resume sign-up.
        </p>
        <p>
          Providers may process or store data outside your country. Deployment
          locations, service agreements and applicable transfer safeguards must
          be reviewed for the release environment. This draft does not promise
          that all information remains in Nigeria or claim a certification for
          Trybe.
        </p>
        <p>
          We may also disclose information when required by law or to protect
          users and the service, subject to appropriate review.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies, local preferences and messages",
    content: (
      <>
        <p>
          Authentication uses cookies and session mechanisms needed to sign in
          and protect your account. Trybe also saves preferences such as your
          theme. Blocking essential cookies can stop sign-in from working.
        </p>
        <p>
          Verification and account-security messages are part of authentication.
          When automatic transactional email is enabled, relevant welcome,
          registration, reminder and outcome-report messages may be sent.
          Optional notification controls apply where provided; required security
          messages may still be necessary.
        </p>
        <p>
          This policy does not authorize new advertising trackers or optional
          analytics. If those are introduced, the notice and required choice
          controls must be updated first.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Retention, deletion and existing copies",
    content: (
      <>
        <p>
          We retain information for the purposes described here while your
          account, event or communication history needs it, and for justified
          security, dispute or legal obligations. The present implementation
          does not apply a universal automatic deletion deadline to all messages
          or audit records.
        </p>
        <p>
          Attendee account deletion erases profile content, linked contact
          values and certain account preferences, and replaces the account name
          with a placeholder. A minimal account-type binding and some historical
          records remain. Deleting a Trybe attendee account is not a promise
          that the separate Clerk identity, every provider backup or all
          third-party copies are immediately deleted.
        </p>
        <p>
          Messages can remain stored for the conversation history participants
          were part of. Disconnecting or blocking restricts communication and
          access according to live state; it does not delete that stored
          history. Event and audit records may also remain where needed. You may
          contact us about applicable deletion or restriction rights.
        </p>
        <p>
          Backups and provider retention follow their own controlled lifecycle.
          Information someone already copied outside Trybe cannot be recalled by
          changing a visibility toggle.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your choices and privacy rights",
    content: (
      <>
        <p>
          You can edit your profile, review visibility settings, control
          incoming connections where available, decline requests, disconnect,
          block and manage notification preferences. Attendees can access
          account deletion from privacy settings; organizers should contact us
          for account-related privacy requests.
        </p>
        <p>
          Depending on applicable law, you may request access, correction,
          erasure, restriction or portability of your information, object to
          certain processing, or withdraw consent without changing the
          lawfulness of earlier processing. We may need to verify that a request
          concerns your account and assess any lawful limits.
        </p>
        <p>
          Send requests to{" "}
          <a href={`mailto:${legalContact.email}`}>{legalContact.email}</a>;
          never include your password or verification codes. You may complain to
          the relevant data-protection authority, including the{" "}
          <a
            href="https://ndpc.gov.ng/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Nigeria Data Protection Commission
          </a>{" "}
          where applicable.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security and policy updates",
    content: (
      <>
        <p>
          Trybe uses authentication, server-side account authorization and
          field-level visibility checks to limit access. Organizer and attendee
          account types remain separate. No service can guarantee absolute
          security, so protect your credentials and report suspicious activity
          promptly.
        </p>
        <p>
          We update this page when our practices change. Material changes should
          be communicated where required before taking effect. Planned AI
          agents, streaming, carpool and payment features are not covered as if
          already operating; additional processing must be assessed and
          disclosed before launch.
        </p>
        <p>
          Read our <Link href="/terms">Terms of Service</Link> for account,
          organizer and acceptable-use responsibilities. This proposed policy
          remains subject to operator-detail confirmation and release review.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      introduction="Understand what you share, who can see it, and how to stay in control."
      sections={sections}
    />
  );
}
