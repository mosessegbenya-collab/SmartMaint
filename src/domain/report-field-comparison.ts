import type { RecoveryFields } from "./report-recovery";

export const reportFieldLabels: Record<keyof RecoveryFields, string> = {
  category: "Fault category", symptoms: "Specific symptoms", description: "Full description",
  priority: "Reporter-suggested priority", condition: "Reported condition", inUse: "Equipment in use",
  noticedAt: "Time noticed", emergency: "Urgent reporting workflow",
};

export function compareReportFields(left: RecoveryFields, right: RecoveryFields) {
  return (Object.keys(reportFieldLabels) as (keyof RecoveryFields)[]).map(key => {
    const a = left[key], b = right[key];
    const sameTime = key === "noticedAt" && Number.isFinite(Date.parse(String(a))) && Date.parse(String(a)) === Date.parse(String(b));
    return { key, label: reportFieldLabels[key], left: a, right: b, changed: a !== b && !sameTime };
  });
}

export function reportFieldsFromServer(report: { category: string; symptoms: string; description: string; priority: RecoveryFields["priority"]; condition: string; inUse: boolean; noticedAt: number; emergency?: boolean }): RecoveryFields {
  return { category: report.category, symptoms: report.symptoms, description: report.description, priority: report.priority, condition: report.condition, inUse: report.inUse ? "Yes" : "No", noticedAt: new Date(report.noticedAt).toISOString(), emergency: !!report.emergency };
}
