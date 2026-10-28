import { useState } from "react";
import { Choices, Notice, Screen } from "@/components/smart/ui";
import { metricKeys, type ManagementCounts } from "@/domain/management-metrics";
import { ManagementOverview } from "@/features/staff/management-analytics";

const empty = Object.fromEntries(metricKeys.map(key => [key, 0])) as ManagementCounts;
const examples = {
  "Training example": { ...empty, equipment: 12, verifiedIdentities: 10, incompleteRecords: 2, reports: 3, Urgent: 1, High: 1, Routine: 1, completedRepairs: 4, timedRepairs: 3, recordedRepairElapsedMs: 12 * 3600000, openTasks: 2, activeHolds: 1, releaseDecisions: 4 },
  "Beyond 100 records": { ...empty, equipment: 250, verifiedIdentities: 240, incompleteRecords: 5, reports: 125, Urgent: 5, High: 20, Routine: 100, completedRepairs: 180, timedRepairs: 150, recordedRepairElapsedMs: 900 * 3600000, openTasks: 15, activeHolds: 2, releaseDecisions: 170 },
  "No records": empty,
};

export function ManagementPreview() {
  const [example, setExample] = useState<keyof typeof examples>("Training example");
  return <Screen title="Management analytics preview" subtitle="Development component reference">
    <Notice>Fictional data only. This uses the same overview component as the live calculation. No staff records are requested.</Notice>
    <Choices label="Sample records" values={["Training example", "Beyond 100 records", "No records"]} value={example} onChange={setExample} />
    <ManagementOverview counts={examples[example]} at={Date.UTC(2026, 9, 27, 12)} departmentCount={example === "Beyond 100 records" ? 2 : 1} />
  </Screen>;
}
