import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Badge, Button, Card, Detail, Notice, Screen, Txt } from "@/components/smart/ui";
import { StatusPanel } from "@/components/smart/status-ui";
import { staffApi } from "@/services/staff-api";
import { go } from "@/navigation/go";
import { useStaffAccess } from "./provider";

type Cleanup = { error: string; busy: boolean; retry: () => Promise<void> };
export function ReceiptCleanup({ error, busy, retry }: Cleanup) {
  return error ? <Card style={{ gap: 10 }}><Notice tone="warning">Server receipt confirmed. Device cleanup did not finish: {error}. A private copy may remain on this device.</Notice><Button label="Retry device cleanup" loading={busy} variant="secondary" onPress={() => void retry()} /></Card> : busy ? <Notice>Server receipt confirmed. Removing the saved device copy…</Notice> : null;
}
export function ReportReceipt({ id, emergency = false, cleanup }: { id: string; emergency?: boolean; cleanup?: Cleanup }) {
  const report = useQuery(staffApi.workflows.reportDetail, { id: id as GenericId<"faultReports"> });
  return <Screen title={!report ? "Checking Report Status" : report.submissionState === "draft" ? "Report Draft Saved" : emergency ? "Urgent Report Receipt" : "Report Received"} subtitle="Review the recorded submission status.">
    {cleanup && <ReceiptCleanup {...cleanup} />}
    {!!cleanup?.error && <Button label="Review remaining device copy" variant="secondary" onPress={() => go("device-drafts")} />}
    {report ? <>
      <StatusPanel title={report.submissionState === "draft" ? "Saved as a draft" : "Server receipt confirmed"} detail={report.submissionState === "draft" ? "Your details are saved to your account. The report has not been submitted for maintenance." : "The staff service has recorded your report. Maintenance acceptance and equipment availability are checked separately."} icon={report.submissionState === "draft" ? "document-text-outline" : "checkmark-circle"} tone={report.submissionState === "draft" ? "warning" : "success"} />
      <Card style={{ gap: 12 }}><Badge label={report.submissionState === "draft" ? "Draft" : "Submitted"} tone={report.submissionState === "draft" ? "warning" : "success"} /><Detail label="Report reference" value={report._id} /><Detail label="Recorded" value={new Date(report.createdAt).toLocaleString()} /><Detail label="Category" value={report.category} /><Detail label="Reported priority" value={report.priority} /><Txt size={18} weight="700">{report.symptoms}</Txt></Card>
      {(emergency || report.emergency) && <Notice tone="warning">External emergency alert delivery is not confirmed. Follow your institution’s approved urgent-response procedure.</Notice>}
      {report.submissionState === "draft" ? <Button label="Continue report" onPress={() => go("resume-report", report._id)} /> : <Button label="View report timeline" onPress={() => go("report-detail", report._id)} />}
      <Button label="View my reports" variant="secondary" onPress={() => go("live-reports")} />
    </> : <Notice>Checking the recorded report status…</Notice>}
  </Screen>;
}
export function UnmatchedEquipment({ identifier }: { identifier?: string }) {
  const { account } = useStaffAccess();
  return <Screen title="Equipment Not Recognised" subtitle="The identifier could not be matched to authorized inventory.">
    <StatusPanel title="No verified match" detail="An unmatched identifier does not establish equipment identity or availability." icon="qr-code-outline" tone="warning" />
    <Card style={{ gap: 10 }}><Txt size={17} weight="700">Original identifier</Txt><Txt>{identifier || "No identifier supplied. Scan the QR code or enter the asset ID again."}</Txt><Txt muted>Check the label and try again. Records outside your authorized department scope are not shown.</Txt></Card>
    <Button label="Scan again" icon="scan-outline" onPress={() => go("scan")} />
    <Button label="Enter ID manually" icon="keypad-outline" variant="secondary" onPress={() => go("manual", identifier)} />
    {!!identifier && !!account?.capabilities.includes("report") && <Button label="Report unverified equipment" variant="secondary" onPress={() => go("provisional", identifier)} />}
  </Screen>;
}
