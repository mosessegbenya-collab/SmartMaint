import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { randomUUID } from "expo-crypto";
import type { GenericId } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { Badge, Button, Card, Choices, Detail, Field, LinkRow, Notice, Screen, Txt } from "@/components/smart/ui";
import { DateTimeField } from "@/components/smart/date-time-field";
import { staffApi } from "@/services/staff-api";
import { go } from "@/navigation/go";
import { useStaffAccess } from "./provider";
import { ConfirmAction } from "./ui";

export function VerificationScreen({ id, kind }: { id: string; kind: "technical" | "clinical" }) {
  const { account } = useStaffAccess();
  return account?.capabilities.includes(kind) ? <VerificationLoader id={id as GenericId<"maintenanceTasks">} kind={kind} /> : <Screen title="Verification restricted"><Notice>This verification requires an approved verifier capability.</Notice></Screen>;
}
function VerificationLoader({ id, kind }: { id: GenericId<"maintenanceTasks">; kind: "technical" | "clinical" }) {
  const context = useQuery(staffApi.safety.verificationContext, { taskId: id, kind });
  return context ? <VerificationForm key={`${id}:${context.task.revision}:${context.policy?.id ?? "disabled"}`} context={context} kind={kind} /> : <Screen title="Verification"><Notice>Loading authorized repair and policy…</Notice></Screen>;
}
function VerificationForm({ context, kind }: { context: FunctionReturnType<typeof staffApi.safety.verificationContext>; kind: "technical" | "clinical" }) {
  const { account } = useStaffAccess(); const verify = useMutation(staffApi.safety.verify); const [checks, setChecks] = useState<Record<string, "Not checked" | "Pass" | "Fail">>({}); const [outcome, setOutcome] = useState<"pass" | "fail" | "unable">("pass"); const [notes, setNotes] = useState(""); const [reference, setReference] = useState(""); const [due, setDue] = useState(""); const [operationId, setOperationId] = useState(randomUUID); const [received, setReceived] = useState("");
  const policy = context.policy; const self = context.task.assigneeId === account?.id;
  return <Screen title={kind === "technical" ? "Technical Verification" : "Clinical Verification"}>
    <Card style={{ gap: 9 }}><Detail label="Linked repair" value={context.task._id} /><Detail label="Repair status" value={context.task.state} /><Detail label="Repair diagnosis" value={context.task.diagnosis || "Not recorded"} /><Detail label="Maintenance cycle" value={String(context.task.cycle)} /></Card>
    {!policy ? <Notice tone="warning">Institutional safety policy is not approved/configured. Verification is disabled. No illustrative checklist is used for a live safety decision.</Notice> : <>
      <Detail label="Approved policy reference" value={policy.approvalReference} />
      {self && <Notice tone="warning">The repairing technician cannot verify their own work. An independent authorized verifier is required.</Notice>}
      {policy.checks.map((label) => <Card key={label}><Choices label={label} values={["Not checked", "Pass", "Fail"]} value={checks[label] ?? "Not checked"} onChange={(value) => setChecks((old) => ({ ...old, [label]: value }))} /></Card>)}
      <Choices label="Verification outcome" values={["pass", "fail", "unable"]} value={outcome} onChange={setOutcome} /><Field label="Findings / failure or inability reason" value={notes} onChangeText={setNotes} multiline maxLength={2000} /><Field label="Evidence reference" value={reference} onChangeText={setReference} maxLength={500} />
      {outcome !== "pass" && <><Notice>A failed/unable decision creates linked rework and blocks return to service.</Notice><DateTimeField label="Required rework due date" value={due} onChange={setDue} required /></>}
      {received && <Notice>Verification recorded: {received}</Notice>}
      <ConfirmAction label="Record verification" title="Record this safety decision?" detail="This creates an immutable decision tied to the current policy, repair revision and your account. A pass does not release equipment." disabled={self || context.task.state !== "Completed" || !reference.trim() || !!received || (outcome === "pass" && policy.checks.some((label) => checks[label] !== "Pass")) || (outcome !== "pass" && (!notes.trim() || !due))}
        onConfirm={async () => { const id = await verify({ taskId: context.task._id, expectedRevision: context.task.revision, kind, outcome, checks: policy.checks.map((label) => ({ label, passed: checks[label] === "Pass" })), notes, evidenceReference: reference, operationId, reworkDueAt: outcome === "pass" ? undefined : Date.parse(due) }); setReceived(id); setOperationId(randomUUID()); }} />
    </>}
    <Txt size={20} weight="700">Verification history</Txt>{context.attempts.map((r) => <Card key={r._id} style={{ gap: 8 }}><Badge label={`${r.kind} · ${r.outcome}`} tone={r.outcome === "pass" ? "success" : "danger"} /><Detail label="Verifier account" value={r.actorId} /><Detail label="Recorded" value={new Date(r.at).toLocaleString()} /><Txt>{r.notes || "No additional findings"}</Txt></Card>)}
    <LinkRow title="Equipment availability and release" onPress={() => go("release", context.task.equipmentId)} />
  </Screen>;
}
export function VerificationActions({ id, assignee }: { id: string; assignee?: string }) {
  const { account } = useStaffAccess();
  return <Card style={{ gap: 8 }}><Txt weight="700">Independent verification</Txt>{assignee === account?.id && <Notice>Another authorized staff member must verify your completed repair.</Notice>}
    {account?.capabilities.includes("technical") && <LinkRow title="Technical checks and history" onPress={() => go("technical-verification", id)} />}{account?.capabilities.includes("clinical") && <LinkRow title="Clinical checks and history" onPress={() => go("clinical-verification", id)} />}
    {(account?.capabilities.includes("assign") || (account?.capabilities.includes("repair") && account.id === assignee)) && <VerificationRequest id={id as GenericId<"maintenanceTasks">} />}
  </Card>;
}
function VerificationRequest({ id }: { id: GenericId<"maintenanceTasks"> }) {
  const context = useQuery(staffApi.safety.verificationRequestContext, { taskId: id }); const [kind, setKind] = useState<"technical" | "clinical">("technical");
  if (!context) return <Notice>Loading verification-request prerequisites…</Notice>;
  if (!context.approved) return <Notice>Verification requests are disabled until the institutional safety policy is approved and configured.</Notice>;
  if (!context.completed || context.superseded) return <Notice>Complete the current linked repair cycle before requesting verification.</Notice>;
  return <><Choices label="Request independent review" values={context.clinicalRequired ? ["technical", "clinical"] : ["technical"]} value={kind} onChange={setKind} /><VerifierChoices key={`${id}:${kind}:${context.revision}`} id={id} kind={kind} revision={context.revision} /></>;
}
function VerifierChoices({ id, kind, revision }: { id: GenericId<"maintenanceTasks">; kind: "technical" | "clinical"; revision: number }) {
  const page = usePaginatedQuery(staffApi.safety.verifierPage, { taskId: id, kind }, { initialNumItems: 20 }); const request = useMutation(staffApi.safety.requestVerification); const [selected, setSelected] = useState<GenericId<"staffAccounts"> | null>(null); const [received, setReceived] = useState(false);
  return <><Notice>Select an independent authorized verifier. This creates an in-app request; external delivery is not configured.</Notice>{page.results.map((candidate) => <Button key={candidate.id} variant={selected === candidate.id ? "primary" : "secondary"} label={`${candidate.name} · ${candidate.staffId}`} onPress={() => { setSelected(candidate.id); setReceived(false); }} />)}{page.status !== "Exhausted" && <Button label="Load more verifiers" loading={page.isLoading} disabled={page.status !== "CanLoadMore"} onPress={() => page.loadMore(20)} />}{page.status === "Exhausted" && !page.results.length && <Notice>No eligible independent verifiers in this department.</Notice>}{received && <Notice>In-app verification request recorded.</Notice>}<ConfirmAction label="Request verification" title="Request independent verification?" detail="The server rechecks the repair revision, policy and recipient authority. Clinical review requires a distinct technical pass first." disabled={!selected || received} onConfirm={async () => { await request({ taskId: id, expectedRevision: revision, kind, recipientId: selected! }); setReceived(true); }} /></>;
}
export function ReleaseScreen({ id }: { id: string }) {
  return <Screen title="Equipment Return to Service"><ReleaseControls id={id} /></Screen>;
}
export function ReleaseControls({ id }: { id: string }) {
  const equipmentId = id as GenericId<"equipment">; const result = useQuery(staffApi.safety.releaseStatus, { equipmentId }); const release = useMutation(staffApi.safety.release); const [reason, setReason] = useState("");
  return result ? <Card style={{ gap: 10 }}><Badge label={result.available ? "Available — current release confirmed" : "Not released for service"} tone={result.available ? "success" : "warning"} /><Detail label="Policy" value={result.policyReference ?? "Not approved/configured"} />{result.blockers.map((blocker) => <Notice key={blocker} tone="warning">{blocker}</Notice>)}
    {result.canRelease && !result.available && <><Field label="Return-to-service justification" value={reason} onChangeText={setReason} maxLength={500} /><ConfirmAction label="Authorize return to service" title="Release equipment for service?" detail="All current repairs, verifications, identity and holds are checked atomically by the server." disabled={!result.eligible || !reason.trim() || result.expectedTaskRevision === null} onConfirm={() => release({ equipmentId, expectedTaskRevision: result.expectedTaskRevision!, reason })} /></>}
  </Card> : <Notice>Checking current release prerequisites…</Notice>;
}
export function ResolveHold({ id, equipmentId }: { id: GenericId<"safetyHolds">; equipmentId: GenericId<"equipment"> }) {
  const status = useQuery(staffApi.safety.releaseStatus, { equipmentId }); const resolve = useMutation(staffApi.safety.resolveHold); const [reason, setReason] = useState("");
  return status?.canRelease ? <><Field label="Hold resolution evidence / reason" value={reason} onChangeText={setReason} maxLength={500} /><ConfirmAction label="Resolve hold" title="Resolve this safety hold?" detail="The original hold and an audited resolution remain in history. This action does not release equipment." disabled={!reason.trim()} onConfirm={() => resolve({ id, reason })} /></> : <Notice>Hold clearance is disabled without approved policy and clearance authority.</Notice>;
}
