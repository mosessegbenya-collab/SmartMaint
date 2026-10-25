import type { DocumentByName } from "convex/server";
import type { DataModel, QueryCtx } from "./server";

type Task = DocumentByName<DataModel, "maintenanceTasks">;
type Attempt = DocumentByName<DataModel, "safetyAttempts">;
type Policy = DocumentByName<DataModel, "safetyPolicies">;
type Work = DocumentByName<DataModel, "workEntries">;

/** Include immutable work history, since reassignment does not undo contributions. */
export async function repairContributors(ctx: QueryCtx, task: Task) {
  const entries = await ctx.db.query("workEntries").withIndex("by_task", (q) => q.eq("taskId", task._id)).collect();
  return new Set([task.assigneeId, ...entries.map((entry) => entry.actorId)].filter((id) => id !== undefined));
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}

/** Opaque digest avoids disclosing private repair/report evidence through release status. */
export async function evidenceDigest(value: unknown) {
  const bytes = new TextEncoder().encode(canonical(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `release-evidence-v1:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function byIdentity<T extends { _id: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a._id < b._id ? -1 : a._id > b._id ? 1 : 0);
}

/** A failed cycle is superseded only by its own successfully verified rework. */
export function repairChainBlockers(tasks: Task[], attempts: Attempt[], work: Work[], policy: Policy | null) {
  const blockers: string[] = [];
  const children = (task: Task) => tasks.filter((child) => child.parentTaskId === task._id);
  const seen = new Set<string>();
  const verified = (task: Task) => {
    const contributors = new Set([task.assigneeId, ...work.filter((entry) => entry.taskId === task._id).map((entry) => entry.actorId)]);
    const current = attempts.filter((attempt) => attempt.taskId === task._id && attempt.policyId === policy?._id && attempt.taskRevision === task.revision);
    const technical = current.find((attempt) => attempt.kind === "technical");
    const clinical = current.find((attempt) => attempt.kind === "clinical");
    const passes = (attempt: Attempt | undefined, labels: string[]) => !!attempt && attempt.outcome === "pass" && !contributors.has(attempt.actorId) && attempt.checks.length === labels.length && attempt.checks.every((check, i) => check.label === labels[i] && check.passed);
    if (!policy || !passes(technical, policy.technicalChecks)) blockers.push(`Repair ${task._id}: current independent technical verification has not passed.`);
    if (policy?.clinicalRequired && (!passes(clinical, policy.clinicalChecks) || clinical?.actorId === technical?.actorId || !technical || !clinical || clinical._creationTime < technical._creationTime)) blockers.push(`Repair ${task._id}: independent clinical verification has not passed after the current technical check.`);
  };
  const visit = (task: Task, path = new Set<string>()) => {
    if (path.has(task._id)) { blockers.push("Repair chain contains a cycle; authoritative reconciliation is required."); return; }
    seen.add(task._id);
    const next = children(task);
    if (task.state === "Cancelled") {
      if (task.parentTaskId || attempts.some((attempt) => attempt.taskId === task._id && attempt.outcome !== "pass")) blockers.push(`Repair ${task._id}: cancelled rework does not resolve a failed verification.`);
    } else if (task.state !== "Completed") blockers.push(`Repair ${task._id}: maintenance or linked rework remains open.`);
    else if (!next.length) verified(task);
    for (const child of next) {
      const failure = attempts.find((attempt) => attempt._id === child.failureAttemptId && attempt.taskId === task._id && attempt.outcome !== "pass");
      if (!failure) blockers.push(`Repair ${child._id}: linked failure evidence is missing.`);
      visit(child, new Set([...path, task._id]));
    }
  };
  for (const task of tasks.filter((task) => !task.parentTaskId)) visit(task);
  if (tasks.some((task) => !seen.has(task._id))) blockers.push("Repair chain ancestry is incomplete; authoritative reconciliation is required.");
  return blockers;
}
