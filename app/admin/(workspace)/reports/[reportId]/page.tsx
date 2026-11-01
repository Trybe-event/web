import { notFound } from "next/navigation";
import { Alert, Badge, ButtonLink, Card } from "@/components/ui";
import { loadReport } from "@/lib/admin";
import { ReportActions } from "./report-actions";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const result = await loadReport(reportId);
  if (result.kind === "not_found") notFound();
  if (result.kind === "unavailable")
    return (
      <Alert>
        This report could not be loaded.{" "}
        <ButtonLink href="/admin/reports">Back to reports</ButtonLink>
      </Alert>
    );
  const report = result.report;
  return (
    <section className="space-y-6 py-6">
      <ButtonLink href="/admin/reports" variant="secondary">
        Back to reports
      </ButtonLink>
      <h1 className="font-display text-3xl font-bold">Review report</h1>
      <Card className="space-y-4 p-5">
        <Badge>{report.status}</Badge>
        <dl className="space-y-3 break-words">
          <div>
            <dt className="font-semibold">Reported reason</dt>
            <dd>{report.reason}</dd>
          </div>
          <div>
            <dt className="font-semibold">Target type</dt>
            <dd>{report.target_type}</dd>
          </div>
          <div>
            <dt className="font-semibold">Target identifier</dt>
            <dd className="break-all font-mono text-sm">{report.target_id}</dd>
          </div>
          <div>
            <dt className="font-semibold">Submitted</dt>
            <dd>
              <time dateTime={report.created_at}>
                {new Date(report.created_at).toLocaleString("en-GB", {
                  timeZone: "UTC",
                })}{" "}
                UTC
              </time>
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Details</dt>
            <dd className="whitespace-pre-wrap">
              {report.details || "No additional details provided."}
            </dd>
          </div>
        </dl>
      </Card>
      <ReportActions reportId={report.id} reportStatus={report.status} />
    </section>
  );
}
