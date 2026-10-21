import type {
  Account,
  CheckResult,
  DemoState,
  FaultDraft,
  FaultReport,
  Priority,
  TaskState,
  VerificationAttempt,
} from "../domain/models";
import {
  allowed,
  canRepair,
  csvCell,
  requireCapability,
  validateFault,
} from "../domain/policy";
import { clinicalChecks, equipment, technicalChecks } from "./fixtures";

export const unavailable = {
  mode: "unconfigured" as const,
  async execute(): Promise<never> {
    throw new Error(
      "Live operations require configured Clerk identity, Convex functions and server authorization.",
    );
  },
};
function scoped(account: Account, equipmentId: string) {
  const item = equipment.find((e) => e.id === equipmentId);
  if (!item || !account.scope.includes(item.department))
    throw new Error("Equipment is unverified or outside your scope.");
  return item;
}
function event(
  state: DemoState,
  account: Account,
  action: string,
  recordId: string,
): DemoState {
  return {
    ...state,
    audit: [
      ...state.audit,
      {
        id: `A-${state.audit.length + 1}`,
        actorId: account.id,
        at: new Date().toISOString(),
        action,
        recordId,
      },
    ],
  };
}
export function visibleReports(
  state: DemoState,
  account: Account,
): FaultReport[] {
  return state.reports.filter(
    (r) =>
      (r.ownerId === account.id ||
        account.capabilities.some((c) =>
          ["repair", "assign", "triage", "analytics"].includes(c),
        )) &&
      account.status === "approved" &&
      account.scope.includes(r.department),
  );
}
export function submitReport(
  state: DemoState,
  account: Account,
  draft: FaultDraft,
  online: boolean,
): { state: DemoState; report: FaultReport } {
  requireCapability(account, "report");
  const item = equipment.find((e) => e.id === draft.equipmentId);
  if (item && !account.scope.includes(item.department))
    throw new Error("Equipment is outside your scope.");
  const department = item?.department ?? draft.provisional?.location;
  if (!department || !account.scope.includes(department))
    throw new Error("Choose an authorized provisional equipment department.");
  const errors = validateFault(draft);
  if (errors.length) throw new Error(errors.join("\n"));
  const existing = state.reports.find(
    (r) => r.operationId === draft.operationId && r.ownerId === account.id,
  );
  if (existing) return { state, report: existing };
  const report: FaultReport = {
    ...draft,
    photos: [...draft.photos],
    id: `DEMO-REP-${String(state.reports.length + 15).padStart(3, "0")}`,
    ownerId: account.id,
    createdAt: new Date().toISOString(),
    sync: online ? "Pending synchronization" : "Saved locally",
    unverified: draft.unverified,
    equipmentProvisional: !item?.verified,
    department,
  };
  return {
    report,
    state: event(
      {
        ...state,
        reports: [report, ...state.reports],
        queue: [
          ...state.queue,
          {
            id: draft.operationId,
            reportId: report.id,
            ownerId: account.id,
            state: report.sync,
            attempts: 0,
          },
        ],
      },
      account,
      "Synthetic report saved in memory",
      report.id,
    ),
  };
}
export function updateTask(
  state: DemoState,
  account: Account,
  id: string,
  update: {
    state?: TaskState;
    assigneeId?: string;
    dueAt?: string;
    diagnosis?: string;
    notes?: string;
    parts?: string[];
  },
): DemoState {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) throw new Error("Task not found.");
  const item = scoped(account, task.equipmentId);
  if (!item.verified)
    throw new Error("Reconcile the equipment identity before maintenance.");
  if (task.state === "Completed" || task.state === "Cancelled")
    throw new Error(
      "Terminal work orders are immutable. Create linked follow-up work.",
    );
  if (
    update.state &&
    !["In progress", "Completed", "Cancelled"].includes(update.state)
  )
    throw new Error(
      "Unsupported task transition. Use the authorized assignment operation.",
    );
  if (
    update.assigneeId !== undefined &&
    !["biomedical-technician", "biomedical-technician-verifier"].includes(
      update.assigneeId,
    )
  )
    throw new Error("Select an authorized synthetic technician.");
  if (
    update.assigneeId !== undefined ||
    update.dueAt !== undefined ||
    update.state === "Cancelled"
  )
    requireCapability(account, "assign", item.department);
  if (update.dueAt !== undefined && !Number.isFinite(Date.parse(update.dueAt)))
    throw new Error("Enter a valid due date.");
  const isWork =
    update.notes !== undefined ||
    update.parts !== undefined ||
    update.diagnosis !== undefined ||
    update.state === "In progress" ||
    update.state === "Completed";
  if (isWork && !canRepair(account, task))
    throw new Error(
      "Only the assigned authorized technician can record this work.",
    );
  if (
    update.state === "Completed" &&
    (task.state !== "In progress" ||
      !(update.notes ?? task.notes).trim() ||
      !(update.diagnosis ?? task.diagnosis).trim())
  )
    throw new Error(
      "Start work and record findings and repair notes before completion.",
    );
  if (update.state === "In progress" && task.state !== "Assigned")
    throw new Error("Only assigned tasks can start.");
  const next = { ...task, ...update };
  if (update.assigneeId && task.state === "Unassigned") next.state = "Assigned";
  return event(
    { ...state, tasks: state.tasks.map((t) => (t.id === id ? next : t)) },
    account,
    "Synthetic maintenance update",
    id,
  );
}
export function verify(
  state: DemoState,
  account: Account,
  taskId: string,
  kind: "technical" | "clinical",
  checks: Record<string, CheckResult>,
  reason: string,
  online: boolean,
): DemoState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error("Task not found.");
  const item = scoped(account, task.equipmentId);
  requireCapability(account, kind, item.department);
  if (!online)
    throw new Error("Verification submission requires an online connection.");
  if (!item.verified || task.state !== "Completed")
    throw new Error("Verified identity and completed repair are required.");
  const previous = state.attempts.filter(
    (a) => a.taskId === taskId && a.cycle === task.cycle,
  );
  if (
    task.assigneeId === account.id ||
    previous.some((a) => a.kind !== kind && a.actorId === account.id)
  )
    throw new Error("An independent verifier is required.");
  if (
    kind === "clinical" &&
    previous.filter((a) => a.kind === "technical").at(-1)?.outcome !== "Pass"
  )
    throw new Error(
      "A technical pass is required before clinical verification.",
    );
  const required = kind === "technical" ? technicalChecks : clinicalChecks;
  if (
    required.some(
      (key) => !["Pass", "Fail", "Unable to Verify"].includes(checks[key]),
    )
  )
    throw new Error("Complete every checklist item.");
  const outcome: CheckResult = required.some((k) => checks[k] === "Fail")
    ? "Fail"
    : required.some((k) => checks[k] === "Unable to Verify")
      ? "Unable to Verify"
      : "Pass";
  if (outcome !== "Pass" && !reason.trim())
    throw new Error(
      "A reason is required for failed or incomplete verification.",
    );
  const attempt: VerificationAttempt = {
    id: `VERIFY-${state.attempts.length + 1}`,
    taskId,
    cycle: task.cycle,
    kind,
    actorId: account.id,
    at: new Date().toISOString(),
    outcome,
    checks: { ...checks },
    reason,
  };
  let tasks = state.tasks;
  if (
    outcome !== "Pass" &&
    !tasks.some((t) => t.parentId === taskId && t.state !== "Cancelled")
  )
    tasks = [
      ...tasks,
      {
        ...task,
        id: `${task.id}-R${task.cycle}`,
        parentId: taskId,
        state: "Unassigned",
        assigneeId: undefined,
        cycle: task.cycle + 1,
        notes: "",
        parts: [],
        diagnosis: `Follow-up: ${reason}`,
      },
    ];
  return event(
    { ...state, attempts: [...state.attempts, attempt], tasks },
    account,
    `Synthetic ${kind} verification: ${outcome}`,
    taskId,
  );
}
export function retryQueue(
  state: DemoState,
  account: Account,
  online: boolean,
  outcome:
    "success" | "transient" | "validation" | "permission" | "auth" = "success",
): DemoState {
  if (account.status !== "approved")
    throw new Error("Recover your approved session before synchronization.");
  if (!online) throw new Error("Reconnect before retrying.");
  const sync =
    outcome === "success"
      ? "Simulated acknowledgment"
      : outcome === "transient"
        ? "Failed"
        : outcome === "auth"
          ? "Pending synchronization"
          : "Rejected";
  const owned = state.queue.filter(
    (q) =>
      q.ownerId === account.id &&
      q.state !== "Simulated acknowledgment" &&
      q.state !== "Rejected",
  );
  const reportIds = new Set(owned.map((q) => q.reportId));
  return {
    ...state,
    queue: state.queue.map((q) =>
      owned.includes(q)
        ? {
            ...q,
            state: sync,
            attempts: q.attempts + 1,
            failure: outcome === "success" ? undefined : outcome,
            nextRetryAt:
              outcome === "transient"
                ? new Date(
                    Date.now() + Math.min(60000, 1000 * 2 ** q.attempts),
                  ).toISOString()
                : undefined,
          }
        : q,
    ),
    reports: state.reports.map((r) =>
      reportIds.has(r.id) ? { ...r, sync } : r,
    ),
  };
}
export function triage(
  state: DemoState,
  account: Account,
  id: string,
  priority: Priority,
  reason: string,
): DemoState {
  const report = state.reports.find((r) => r.id === id);
  if (!report) throw new Error("Report not found.");
  const item = scoped(account, report.linkedEquipmentId ?? report.equipmentId);
  requireCapability(account, "triage", item.department);
  if (!reason.trim())
    throw new Error("Record the reason for this triage decision.");
  return event(
    {
      ...state,
      reports: state.reports.map((r) =>
        r.id === id
          ? { ...r, triagedPriority: priority, triageReason: reason }
          : r,
      ),
    },
    account,
    "Synthetic priority triage",
    id,
  );
}
export function reviewApplication(
  state: DemoState,
  account: Account,
  id: string,
  decision: "Approved" | "Rejected",
): DemoState {
  requireCapability(account, "accounts");
  const application = state.applications.find((a) => a.id === id);
  if (!application || application.state !== "Pending")
    throw new Error("Only pending applications can be reviewed.");
  return event(
    {
      ...state,
      applications: state.applications.map((a) =>
        a.id === id ? { ...a, state: decision } : a,
      ),
    },
    account,
    `Synthetic application ${decision}`,
    id,
  );
}
export function reconcileReport(
  state: DemoState,
  account: Account,
  reportId: string,
  equipmentId: string,
  reason: string,
): DemoState {
  const item = scoped(account, equipmentId);
  requireCapability(account, "reconcile", item.department);
  const report = visibleReports(state, account).find((r) => r.id === reportId);
  if (!report || !report.equipmentProvisional)
    throw new Error("Select an accessible provisional report.");
  if (!item.verified || !reason.trim())
    throw new Error(
      "A verified matching identity and review reason are required.",
    );
  return event(
    {
      ...state,
      reports: state.reports.map((r) =>
        r.id === reportId
          ? { ...r, linkedEquipmentId: item.id, equipmentProvisional: false }
          : r,
      ),
    },
    account,
    `Synthetic equipment reconciliation: ${reason}`,
    reportId,
  );
}
export function createMaintenance(
  state: DemoState,
  account: Account,
  reportId: string,
  dueAt: string,
): DemoState {
  const report = visibleReports(state, account).find((r) => r.id === reportId);
  if (!report) throw new Error("Report not found in your scope.");
  const item = scoped(account, report.linkedEquipmentId ?? report.equipmentId);
  requireCapability(account, "assign", item.department);
  if (report.equipmentProvisional || !item.verified)
    throw new Error("Equipment must be reconciled before maintenance.");
  if (report.unverified)
    throw new Error(
      "Unverified emergency reports require authorized reporter review before maintenance.",
    );
  if (state.tasks.some((t) => t.reportId === reportId)) return state;
  if (!Number.isFinite(Date.parse(dueAt)))
    throw new Error("Choose an explicit due date for this work order.");
  const task = {
    id: `WO-${reportId}`,
    equipmentId: item.id,
    reportId,
    state: "Unassigned" as const,
    dueAt,
    diagnosis: "",
    notes: "",
    parts: [],
    cycle: 1,
  };
  return event(
    { ...state, tasks: [...state.tasks, task] },
    account,
    "Synthetic maintenance task created",
    task.id,
  );
}
export function demoExport(
  state: DemoState,
  account: Account,
  filters?: { from?: string; to?: string; priority?: Priority },
): string {
  requireCapability(account, "export");
  const from = filters?.from ? Date.parse(filters.from) : -Infinity;
  const to = filters?.to ? Date.parse(filters.to) : Infinity;
  if (Number.isNaN(from) || Number.isNaN(to) || from > to)
    throw new Error("Choose a valid date range.");
  const rows = visibleReports(state, account).filter(
    (r) =>
      !r.unverified &&
      !r.equipmentProvisional &&
      r.sync === "Simulated acknowledgment" &&
      Date.parse(r.createdAt) >= from &&
      Date.parse(r.createdAt) <= to &&
      (!filters?.priority || r.priority === filters.priority),
  );
  return [
    ["SYNTHETIC DEMONSTRATION DATA — no confirmed hospital records"],
    ["Report", "Equipment", "Symptoms", "Transport status"],
    ...rows.map((r) => [r.id, r.equipmentId, r.symptoms, r.sync]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
export function canSeeTask(account: Account, equipmentId: string) {
  return allowed(account, "repair") ||
    allowed(account, "assign") ||
    allowed(account, "technical") ||
    allowed(account, "clinical")
    ? account.scope.includes(
        equipment.find((e) => e.id === equipmentId)?.department ?? "",
      )
    : false;
}
