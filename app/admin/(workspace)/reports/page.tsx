import Link from "next/link";
import { Alert, Badge, ButtonLink, EmptyState } from "@/components/ui";
import { loadReports } from "@/lib/admin";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const cursor = typeof query.cursor === "string" ? query.cursor : undefined;
  const result = await loadReports(cursor);
  if (result.kind === "unavailable")
    return (
      <Alert>
        Reports could not be loaded.{" "}
        <ButtonLink href="/admin/reports">Try again</ButtonLink>
      </Alert>
    );
  return (
    <section className="space-y-6 py-6" aria-labelledby="reports-heading">
      <div>
        <span className="eyebrow">RESTRICTED REVIEW</span>
        <h1 id="reports-heading" className="font-display text-3xl font-bold">
          Report queue
        </h1>
        <p className="mt-2 text-muted">
          Review reported activity. Every moderation action requires a reason
          and is audited.
        </p>
      </div>
      {result.queue.items.length === 0 ? (
        <EmptyState
          title="No reports on this page"
          action={
            cursor ? (
              <ButtonLink href="/admin/reports">Newest reports</ButtonLink>
            ) : undefined
          }
        >
          Reports will appear here when submitted.
        </EmptyState>
      ) : (
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">Reported activity, newest first</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="w-1/2 py-3 pr-2">
                Report
              </th>
              <th scope="col" className="py-3 pr-2">
                Status
              </th>
              <th scope="col" className="py-3">
                Review
              </th>
            </tr>
          </thead>
          <tbody>
            {result.queue.items.map((report) => (
              <tr key={report.id} className="border-b border-line">
                <th scope="row" className="break-words py-4 pr-2 font-normal">
                  <span className="font-semibold">{report.reason}</span>
                  <span className="block text-muted">{report.target_type}</span>
                  <time
                    className="block text-xs text-muted"
                    dateTime={report.created_at}
                  >
                    {new Date(report.created_at).toLocaleDateString("en-GB", {
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </time>
                </th>
                <td className="py-4 pr-2">
                  <Badge>{report.status}</Badge>
                </td>
                <td className="py-4">
                  <Link
                    className="inline-flex min-h-11 items-center font-semibold underline"
                    href={`/admin/reports/${report.id}`}
                    aria-label={`Review ${report.reason} report`}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <nav aria-label="Report pages" className="flex flex-wrap gap-3">
        {cursor && (
          <ButtonLink href="/admin/reports" variant="secondary">
            Newest reports
          </ButtonLink>
        )}
        {result.queue.next_cursor && result.queue.next_cursor !== cursor && (
          <ButtonLink
            href={`/admin/reports?cursor=${encodeURIComponent(result.queue.next_cursor)}`}
          >
            Older reports
          </ButtonLink>
        )}
      </nav>
    </section>
  );
}
