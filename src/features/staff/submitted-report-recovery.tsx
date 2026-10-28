import { useEffect, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { Button, Detail, Notice, Screen } from "@/components/smart/ui";
import { ReportFieldComparison } from "@/components/smart/report-field-comparison";
import { LoadingState } from "@/components/smart/status-ui";
import { reportFieldsFromServer } from "@/domain/report-field-comparison";
import { recoveryForReport, type RecoveryDraft } from "@/domain/report-recovery";
import { reportRecovery } from "@/services/report-recovery";
import { staffApi } from "@/services/staff-api";
import { authErrorMessage } from "@/features/access/auth-policy";
import { go } from "@/navigation/go";
import { useStaffAccess } from "./provider";
import { ConfirmAction } from "./ui";

export function SubmittedReportRecovery({ report }: { report: FunctionReturnType<typeof staffApi.workflows.reportDetail> }) {
  const { account } = useStaffAccess();
  const [copy, setCopy] = useState<RecoveryDraft | null>(null);
  const [loading, setLoading] = useState(!!reportRecovery);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const owner = account?.id;
  const inScope = !!account?.scope.includes(report.departmentId);
  useEffect(() => {
    let current = true;
    if (!reportRecovery || !owner || !inScope) return;
    void reportRecovery.list(owner).then(rows => { if (current) setCopy(recoveryForReport(rows, owner, { ...report, id: report._id })); })
      .catch(failure => { if (current) setError(authErrorMessage(failure)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [owner, inScope, report, refresh]);
  return <Screen title="Report already received" subtitle="Review any remaining device copy separately from the recorded report.">
    <Notice>The server has this submitted report. A remaining device copy can contain edits or photos that were not included. It cannot overwrite the submitted record.</Notice>
    {loading && <LoadingState label="Checking your encrypted device copy…" />}
    {!!error && <Notice tone="warning">{error}</Notice>}
    {copy && !loading && !error && <><Detail label="Pending device photos" value={copy.photos.length} /><ReportFieldComparison left={copy.fields} right={reportFieldsFromServer(report)} leftLabel="Saved device copy" rightLabel="Submitted server report" /><ConfirmAction label="Discard reviewed device copy" title="Discard this reviewed device copy?" detail="This removes its local fields and pending photos. The submitted server report and its attachments are retained. A publication queue entry is not removed." danger onConfirm={async () => {
      if (!reportRecovery || !owner || !inScope) throw Error("Fresh access to this report is required.");
      await reportRecovery.removeDraft(owner, copy.operationId, copy); setCopy(null);
    }} /></>}
    {!loading && !copy && !error && <Notice>{reportRecovery ? "No matching device copy remains for your account." : "Encrypted device recovery is available in the Android/iOS app."}</Notice>}
    {!!reportRecovery && <Button label="Reload device copy" variant="secondary" disabled={loading} onPress={() => { setLoading(true); setError(""); setRefresh(value => value + 1); }} />}
    <Button label="View submitted report" onPress={() => go("report-detail", report._id)} />
  </Screen>;
}
