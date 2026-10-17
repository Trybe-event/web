import { redirect } from "next/navigation";
export default async function EventManagementEntry({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/organizer/events/${encodeURIComponent(id)}/share`);
}
