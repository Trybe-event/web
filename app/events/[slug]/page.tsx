import { notFound } from "next/navigation";

import { isEventSlug } from "@/lib/routes";

// Attendee event workspace placeholder. Built in web#11 (M3).
export default async function EventWorkspace({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isEventSlug(slug)) notFound();
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">Event workspace</h1>
      <p>Matches, the attendee directory and connections arrive in M3.</p>
    </main>
  );
}
