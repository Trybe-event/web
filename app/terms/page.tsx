import type { Metadata } from "next";
import Link from "next/link";

import { PolicyPage, type PolicySection } from "@/components/legal/policy-page";
import { legalContact } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for creating an account, hosting events and connecting on Trybe.",
};

const sections: PolicySection[] = [
  {
    id: "about",
    title: "About Trybe and these terms",
    content: (
      <>
        <p>
          Trybe is an event networking platform. Organizers create and share
          events; attendees build reusable profiles, join events, discover
          people, request connections and communicate with accepted connections.
        </p>
        <p>
          These proposed terms explain the responsibilities that come with using
          Trybe. The service is operated under the Trybe project name. Our
          registered operator details are being finalized; this draft must be
          reviewed and finalized before a production launch.
        </p>
        <p>
          Contact the Trybe team at{" "}
          <a href={`mailto:${legalContact.email}`}>{legalContact.email}</a> with
          account or service questions.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Your account and business details",
    content: (
      <>
        <p>
          Provide accurate account information and keep your sign-in credentials
          secure. You must be legally able to agree to these terms. If you
          register for a business, you must have permission to act for that
          business and use its details.
        </p>
        <p>
          Organizer and attendee accounts are separate. An identity is bound to
          one account type; the same identity cannot switch between organizer
          and attendee access. Contact us if you need help before choosing a
          type.
        </p>
        <p>
          Authentication is provided by Clerk. Email verification and any
          configured security checks must be completed before account access is
          granted. Submitting a business name does not mean Trybe has verified
          its registration or endorsed the business.
        </p>
      </>
    ),
  },
  {
    id: "events",
    title: "Hosting and joining events",
    content: (
      <>
        <p>
          Organizers are responsible for accurate event descriptions, dates,
          locations, programs and speaker information, and for permission to use
          their event images and content. Organizers are also responsible for
          delivering the event and communicating material changes.
        </p>
        <p>
          Opening an event link, signing in or viewing a profile preview does
          not register you. Registration happens when you explicitly confirm
          joining. Review the event and the profile information you will share
          before confirming.
        </p>
        <p>
          Registration counts are sign-ups, not evidence that people physically
          attended. Trybe does not guarantee attendance, a particular number of
          introductions, a suitable match or an outcome from a connection.
        </p>
        <p>
          Private events are excluded from public discovery. Their invitation
          links can still be forwarded; a private link is not an
          identity-verified invitation or a guarantee of secrecy.
        </p>
      </>
    ),
  },
  {
    id: "connections",
    title: "Connections and contact visibility",
    content: (
      <>
        <p>
          Respect other attendees&apos; choices. A connection request does not
          create a connection until the recipient accepts. Do not use profiles
          or contact details for spam, scraping, harassment or unsolicited bulk
          outreach.
        </p>
        <p>
          Review your contact visibility settings. Details you keep private are
          omitted from other attendees&apos; API responses. Where you choose
          connection-only sharing, those details become available to eligible
          accepted connections.
        </p>
        <p>
          Changing visibility, disconnecting or blocking can restrict future
          access through Trybe. It cannot remove information someone already
          saw, copied or received outside Trybe.
        </p>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content and acceptable use",
    content: (
      <>
        <p>
          You retain ownership of content you provide. You give Trybe permission
          to store, display and process that content as needed to operate your
          account, event, profile and communications, subject to your visibility
          choices and our <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          Only upload content you have the right to use. Do not impersonate
          others, post unlawful or abusive material, expose someone else&apos;s
          private information, bypass account restrictions, interfere with the
          service or attempt unauthorized access.
        </p>
        <p>
          We may restrict content or accounts to investigate abuse, protect
          users, comply with law or enforce these terms. Blocking and reporting
          tools support safety but cannot guarantee another person&apos;s
          conduct.
        </p>
      </>
    ),
  },
  {
    id: "communications",
    title: "Service messages and third-party services",
    content: (
      <>
        <p>
          Authentication and account security may require verification messages.
          When transactional delivery is enabled, Trybe may also send account
          confirmations, event registration messages, reminders and event
          reports relevant to your activity.
        </p>
        <p>
          Clerk supports authentication; Neon supports application database and
          object storage. Hosting and configured email providers also process
          data needed to deliver the service. External portfolio and social
          links take you to services with their own terms and privacy practices.
        </p>
        <p>
          Suggestions and recommendations are aids to discovery. You remain
          responsible for deciding whom to meet and what to share. Future
          features are not a promise that they are currently available.
        </p>
      </>
    ),
  },
  {
    id: "fees",
    title: "Fees, tickets and future features",
    content: (
      <>
        <p>
          The current Trybe pilot is free to use. Ticket payments, paid plans
          and payment-to-account reconciliation are not part of this
          draft&apos;s payment terms. If paid features are introduced, their
          prices, payment conditions and cancellation or refund rules must be
          disclosed before purchase.
        </p>
        <p>
          Do not treat payment requests sent by another attendee or through an
          external link as a Trybe-managed purchase. Organizers remain
          responsible for any separately arranged event charges.
        </p>
      </>
    ),
  },
  {
    id: "ending",
    title: "Ending access and retaining history",
    content: (
      <>
        <p>
          You may stop using Trybe. Attendees can request account deletion
          through account privacy settings; organizers can contact us for
          account-related requests. Removing your account does not necessarily
          erase an event&apos;s records, every audit entry or messages another
          participant was part of.
        </p>
        <p>
          Disconnecting or blocking limits communication and visibility
          according to current account and connection state. Conversation
          history may remain stored even while it cannot be opened. Account
          deletion removes profile/contact information from normal member views
          while retaining limited binding and history records as explained in
          our <Link href="/privacy#retention">retention section</Link>.
        </p>
        <p>
          Ending an event is different from deleting a draft. Published event
          history and accepted connections can continue to have a purpose after
          the event, subject to networking settings and account restrictions.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and responsibility",
    content: (
      <>
        <p>
          Trybe is being developed and may be interrupted or changed. We take
          reasonable steps to protect the service, but cannot promise
          uninterrupted access or prevent every technical failure or misuse.
        </p>
        <p>
          Nothing in these terms excludes rights, remedies or responsibilities
          that applicable law does not allow us to exclude. Trybe&apos;s
          platform role does not replace an organizer&apos;s responsibility for
          an event or a user&apos;s responsibility for their conduct.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes and questions",
    content: (
      <>
        <p>
          We will update the date on this page when these terms change. Material
          changes should be communicated before they take effect where required.
          The proposed draft is not a claim that a legal review or production
          release gate has been completed.
        </p>
        <p>
          Questions and concerns can be sent to{" "}
          <a href={`mailto:${legalContact.email}`}>{legalContact.email}</a>.
          Mandatory consumer and data-protection rights under applicable law
          continue to apply.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms of Service"
      introduction="A shared understanding of how we host, meet and connect on Trybe."
      sections={sections}
    />
  );
}
