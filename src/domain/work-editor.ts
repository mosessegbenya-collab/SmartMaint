export type WorkFields = {
  diagnosis: string; diagnosisEvidence: string; causeAssessment: "Under investigation (unconfirmed)" | "Suspected cause" | "Confirmed by testing" | "Undetermined";
  notes: string; parts: string; preventiveResults?: { label: string; passed: boolean }[];
};
export type WorkSource = {
  _id: string; revision: number; workflowRevision?: number;
  diagnosis: string; diagnosisEvidence?: string; causeAssessment?: WorkFields["causeAssessment"];
  notes: string; parts: string[]; preventiveResults?: WorkFields["preventiveResults"]; preventiveChecklist?: string[];
};
export function workFields(task: WorkSource): WorkFields {
  return { diagnosis: task.diagnosis, diagnosisEvidence: task.diagnosisEvidence ?? "", causeAssessment: task.causeAssessment ?? "Under investigation (unconfirmed)", notes: task.notes, parts: task.parts.join(", "), preventiveResults: task.preventiveResults?.map(row => ({ ...row })) ?? task.preventiveChecklist?.map(label => ({ label, passed: false })) };
}
export function workRevision(task: Pick<WorkSource, "_id" | "revision" | "workflowRevision">) {
  return `${task._id}:${task.revision}:${task.workflowRevision ?? 0}`;
}
export function compareWorkFields(local: WorkFields, current: WorkFields) {
  const checklist = (fields: WorkFields) => fields.preventiveResults?.map(row => `${row.label}: ${row.passed ? "Completed" : "Not completed"}`).join("\n") ?? "";
  const rows = [
    ["diagnosis", "Diagnosis", local.diagnosis, current.diagnosis],
    ["evidence", "Diagnostic evidence", local.diagnosisEvidence, current.diagnosisEvidence],
    ["cause", "Cause assessment", local.causeAssessment, current.causeAssessment],
    ["notes", "Repair notes", local.notes, current.notes],
    ["parts", "Parts used", local.parts, current.parts],
    ["checklist", "Scheduled maintenance checklist", checklist(local), checklist(current)],
  ];
  return rows.map(([key, label, left, right]) => ({ key, label, left, right, changed: left !== right }));
}
