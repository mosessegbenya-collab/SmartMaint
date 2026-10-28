import type { TaskState } from "./models";

export type WorkflowPhase = "accepted" | "awaiting_parts" | "awaiting_verification" | "closed";
export type WorkflowAction = "accept" | "await_parts" | "resume" | "close";
export type WorkflowTask = { state: TaskState; workflowPhase?: WorkflowPhase };

// Shared structural rules only. The server separately checks identity, scope,
// assignment, both revisions and independent safety evidence.
export function canTransitionTask(task: WorkflowTask, action: WorkflowAction): boolean {
  if (action === "close") return task.state === "Completed" && task.workflowPhase !== "closed";
  if (!["Assigned", "In progress"].includes(task.state)) return false;
  if (action === "accept") return !task.workflowPhase;
  if (action === "resume") return task.workflowPhase === "awaiting_parts";
  return task.workflowPhase === "accepted";
}

export function maintenanceStatus(task: WorkflowTask): { label: string; tone: "info" | "warning" | "neutral"; detail: string } {
  if (task.state === "Cancelled") return { label: "Cancelled", tone: "neutral", detail: "This work order is cancelled. Equipment release is assessed separately." };
  if (task.state === "Completed") return task.workflowPhase === "closed"
    ? { label: "Work order closed", tone: "neutral", detail: "Administrative closure is recorded. Check equipment status before use." }
    : { label: "Awaiting verification", tone: "warning", detail: "Repair is complete. Independent verification and authorized release are still required." };
  if (task.state === "Unassigned") return { label: "Awaiting assignment", tone: "neutral", detail: "An authorized supervisor must assign a technician." };
  if (task.workflowPhase === "awaiting_parts") return { label: "Awaiting parts", tone: "warning", detail: "Repair work is paused until the assigned technician records that parts are available." };
  if (!task.workflowPhase && task.state === "Assigned") return { label: "Awaiting acceptance", tone: "info", detail: "The assigned technician can accept the work order or record work to begin." };
  return { label: task.state === "In progress" ? "In progress" : "Assignment accepted", tone: "info", detail: "Record diagnosis, evidence, repair notes and parts in this work order." };
}
