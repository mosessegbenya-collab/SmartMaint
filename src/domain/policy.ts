import type {
  Account,
  Capability,
  DemoState,
  Equipment,
  FaultDraft,
  MaintenanceTask,
} from "./models";

export function allowed(
  account: Account | null,
  capability: Capability,
  department?: string,
): boolean {
  return (
    !!account &&
    account.status === "approved" &&
    account.capabilities.includes(capability) &&
    (!department || account.scope.includes(department))
  );
}
export function requireCapability(
  account: Account | null,
  capability: Capability,
  department?: string,
) {
  if (!allowed(account, capability, department))
    throw new Error(
      "This action is outside your authorized role or equipment scope.",
    );
}
export function validateFault(draft: FaultDraft): string[] {
  const errors: string[] = [];
  if (!draft.equipmentId.trim()) errors.push("Enter the equipment identifier.");
  if (!draft.category) errors.push("Select a fault category.");
  if (!draft.symptoms.trim()) errors.push("Describe the specific symptoms.");
  if (!draft.condition) errors.push("Select the reported equipment condition.");
  if (draft.inUse === null)
    errors.push("Confirm whether the equipment is in use.");
  const timestamp = Date.parse(draft.noticedAt);
  if (!Number.isFinite(timestamp) || timestamp > Date.now())
    errors.push("Enter a valid noticed time that is not in the future.");
  return errors;
}
export function releaseBlockers(
  equipment: Equipment,
  state: DemoState,
): string[] {
  const blockers: string[] = [];
  if (!equipment.verified) blockers.push("Equipment identity is not verified");
  if (!equipment.releasePolicy)
    blockers.push("Production release policy is unconfigured");
  if (state.holds.some((h) => h.equipmentId === equipment.id && h.active))
    blockers.push("Active safety hold");
  const tasks = state.tasks.filter(
    (t) => t.equipmentId === equipment.id && t.state !== "Cancelled",
  );
  if (!tasks.length) blockers.push("Maintenance prerequisites are unknown");
  for (const task of tasks) {
    if (task.state !== "Completed")
      blockers.push(`${task.id}: maintenance incomplete`);
    const attempts = state.attempts.filter(
      (a) => a.taskId === task.id && a.cycle === task.cycle,
    );
    const technical = attempts.filter((a) => a.kind === "technical").at(-1);
    const clinical = attempts.filter((a) => a.kind === "clinical").at(-1);
    if (!technical || technical.outcome !== "Pass")
      blockers.push(`${task.id}: technical pass required`);
    if (!clinical || clinical.outcome !== "Pass")
      blockers.push(`${task.id}: clinical pass required`);
    if (
      technical &&
      (technical.actorId === task.assigneeId ||
        technical.actorId === clinical?.actorId)
    )
      blockers.push(`${task.id}: independent verifiers required`);
  }
  return [...new Set(blockers)];
}
export function canRepair(account: Account, task: MaintenanceTask) {
  return allowed(account, "repair") && task.assigneeId === account.id;
}
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
