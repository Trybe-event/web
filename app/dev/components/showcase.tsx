"use client";

import { useState } from "react";

import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  Input,
  Logo,
  Select,
  Skeleton,
  Switch,
  Textarea,
  ToastProvider,
  useToast,
} from "@/components/ui";
import { EventLinkState } from "@/components/registration/event-link-states";
import type { EventApiOutcome } from "@/lib/registration/link-states";

export function Showcase() {
  return (
    <ToastProvider>
      <Gallery />
    </ToastProvider>
  );
}

function Gallery() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [on, setOn] = useState(true);
  const [open, setOpen] = useState(false);
  const toast = useToast();

  function switchTheme() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Logo />
        <Button variant="secondary" onClick={switchTheme}>
          Switch to {theme === "light" ? "dark" : "light"}
        </Button>
      </div>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
        </div>
      </Section>

      <Section title="Form fields">
        <Field label="Full name" hint="As you'd like people to see it.">
          {(p) => <Input {...p} defaultValue="Tomi Ade" />}
        </Field>
        <Field label="Email" error="Enter an email address.">
          {(p) => <Input {...p} defaultValue="tomi@" />}
        </Field>
        <Field label="About you" optional>
          {(p) => <Textarea {...p} />}
        </Field>
        <Field label="Who can see this">
          {(p) => (
            <Select {...p}>
              <option>Only me</option>
              <option>My connections</option>
              <option>People at my events</option>
            </Select>
          )}
        </Field>
        <Switch
          label="Accept new connection requests"
          description="Applies to new requests only."
          checked={on}
          onChange={setOn}
        />
      </Section>

      <Section title="Display">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name="Tomi Ade" />
          <Avatar name="Ola" size={36} />
          <Badge>React</Badge>
          <Badge tone="accent">Connected</Badge>
          <Badge tone="danger">Blocked</Badge>
          <Badge tone="success">Saved</Badge>
        </div>
        <Card>A card groups one thing.</Card>
        <Alert>Something went wrong. Try again.</Alert>
        <Alert tone="success">Profile saved.</Alert>
        <EmptyState
          title="No matches yet"
          action={<Button size="sm">Edit your interests</Button>}
        >
          People appear here as they join the event.
        </EmptyState>
        <Skeleton className="h-16" />
      </Section>

      <Section title="Dialog and toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Open dialog
          </Button>
          <Button variant="secondary" onClick={() => toast("Saved")}>
            Show toast
          </Button>
        </div>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Disconnect from Tomi?"
          description="You'll stop seeing details Tomi shares only with connections."
          actions={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setOpen(false)}>
                Disconnect
              </Button>
            </>
          }
        />
      </Section>
      <Section title="Event link states (web#10)">
        <p className="text-sm text-muted">
          One screen per failure path of an event link. The unknown-event screen
          is identical for a mistyped, draft or private slug — copy never says
          whether the event exists.
        </p>
        <div className="flex flex-col gap-2">
          {(Object.entries(DEMO_OUTCOMES) as [string, EventApiOutcome][]).map(
            ([label, outcome]) => (
              <Card key={label}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  {label}
                </p>
                <EventLinkState outcome={outcome} slug="demo-event" />
              </Card>
            ),
          )}
        </div>
      </Section>
    </main>
  );
}

const DEMO_OUTCOMES: Record<string, EventApiOutcome> = {
  "Unknown slug (mistyped, draft or private)": {
    kind: "lookup",
    httpStatus: 404,
    code: "not_found",
  },
  "Registration not open yet": {
    kind: "published",
    registrationState: "not_open",
  },
  "Registration closed": {
    kind: "published",
    registrationState: "closed",
  },
  "Already joined": { kind: "already-member" },
  "API unreachable": { kind: "unreachable" },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
