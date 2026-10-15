import { notFound } from "next/navigation";

import { isEventSlug } from "@/lib/routes";

// Event landing page placeholder. Built in web#6 (M2).
export default async function EventLanding({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isEventSlug(slug)) notFound();
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">Event</h1>
      <p>The event landing page arrives in M2.</p>
    </main>
  );
}
