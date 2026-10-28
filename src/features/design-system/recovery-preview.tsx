import { useState } from "react";
import { Choices, Notice, Screen } from "@/components/smart/ui";
import { StatusPanel } from "@/components/smart/status-ui";
import { ReportFieldComparison } from "@/components/smart/report-field-comparison";
import { ReceiptCleanup } from "@/features/staff/report-results";
import type { RecoveryFields } from "@/domain/report-recovery";

const local: RecoveryFields = { category: "Electrical/Power", symptoms: "Fictional monitor will not power on", description: "Training equipment example only.", priority: "High", condition: "Not functioning (reported)", inUse: "No", noticedAt: "2026-10-27T12:00:00Z", emergency: false };
const server: RecoveryFields = { ...local, symptoms: "Fictional monitor intermittently restarts", priority: "Urgent", condition: "Unknown", inUse: "Yes", noticedAt: "2026-10-27T13:00:00Z" };

export function RecoveryPreview() {
  const [example, setExample] = useState("Different fields");
  const [cleanupError, setCleanupError] = useState("Synthetic device storage failure");
  return <Screen title="Report recovery preview" subtitle="Development component reference">
    <Notice>Fictional examples only. These controls do not read, submit or delete reports, photos or device drafts.</Notice>
    <Choices label="Recovery example" values={["Different fields", "Matching fields", "Cleanup failure"]} value={example} onChange={value => { setExample(value); setCleanupError("Synthetic device storage failure"); }} />
    {example === "Cleanup failure" ? <>
      <StatusPanel title="Sample confirmed receipt" detail="Example only: the report receipt remains separate from device cleanup." tone="success" icon="checkmark-circle" />
      <ReceiptCleanup error={cleanupError} busy={false} retry={async () => setCleanupError("")} />
      {!cleanupError && <Notice tone="success">Sample cleanup completed. No device files were changed.</Notice>}
    </> : <ReportFieldComparison key={example} left={local} right={example === "Matching fields" ? { ...local, noticedAt: "2026-10-27T14:00:00+02:00" } : server} leftLabel="Saved device copy" rightLabel="Current server" />}
  </Screen>;
}
