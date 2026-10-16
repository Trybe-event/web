export function localEventTime(instant: string, timezone: string): string {
  if (!instant) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function eventTimeToISO(local: string, timezone: string): string {
  const desired = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(desired))
    throw new Error("Enter a complete date and time.");
  let instant = desired;
  for (let attempt = 0; attempt < 4; attempt++) {
    const displayed = Date.parse(
      `${localEventTime(new Date(instant).toISOString(), timezone)}:00Z`,
    );
    instant += desired - displayed;
  }
  const result = new Date(instant).toISOString();
  if (localEventTime(result, timezone) !== local)
    throw new Error(
      "This local time doesn't exist because the clocks change. Choose another time.",
    );
  return result;
}
