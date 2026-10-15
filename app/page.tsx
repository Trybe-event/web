import Link from "next/link";

import { routes } from "@/lib/routes";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <h1 className="text-3xl font-bold">Trybe</h1>
      <p>Meet the right people at your next event.</p>
      <nav aria-label="Get started" className="flex flex-wrap gap-4">
        <Link className="underline" href={routes.attendeeProfile}>
          I&apos;m an attendee
        </Link>
        <Link className="underline" href={routes.organizerHome}>
          I&apos;m an organizer
        </Link>
      </nav>
    </main>
  );
}
