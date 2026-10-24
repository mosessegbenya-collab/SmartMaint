import { useState } from "react";
import { View } from 'react-native';
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { randomUUID } from "expo-crypto";
import type { GenericId } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { Badge, Button, Card, Choices, Detail, Field, Icon, LinkRow, Notice, Row, Screen, Txt } from "@/components/smart/ui";
import { StatusPanel } from "@/components/smart/status-ui";
import { DateTimeField } from "@/components/smart/date-time-field";
import { staffApi } from "@/services/staff-api";
import { go } from "@/navigation/go";
import { useStaffAccess } from "./provider";
import { ConfirmAction } from "./ui";

export function VerificationScreen({ id, kind, view = 'checklist' }: { id: string; kind: "technical" | "clinical"; view?: 'checklist' | 'result' | 'history' }) {
  const { account } = useStaffAccess();
  return account?.capabilities.includes(kind) ? <VerificationLoader id={id as GenericId<"maintenanceTasks">} kind={kind} view={view} /> : <Screen title="Verification restricted"><Notice>This verification requires an approved verifier capability.</Notice></Screen>;
}
function VerificationLoader({ id, kind, view }: { id: GenericId<"maintenanceTasks">; kind: "technical" | "clinical"; view: 'checklist' | 'result' | 'history' }) {
  const context = useQuery(staffApi.safety.verificationContext, { taskId: id, kind });
  return context ? view === 'checklist' ? <VerificationForm key={`${id}:${context.task.revision}:${context.policy?.id ?? "disabled"}`} context={context} kind={kind} /> : <VerificationDecisions context={context} kind={kind} history={view === 'history'} /> : <Screen title="Verification"><Notice>Loading authorized repair and policy…</Notice></Screen>;
}

function VerificationDecisions({ context, kind, history }: { context: FunctionReturnType<typeof staffApi.safety.verificationContext>; kind: 'technical' | 'clinical'; history: boolean }) {
  const attempts = context.attempts.filter((attempt) => attempt.kind === kind).sort((a, b) => b.at - a.at);
  const shown = history ? attempts : attempts.slice(0, 1);
  return <Screen title={`${kind === 'technical' ? 'Technical' : 'Clinical'} ${history ? 'Verification History' : 'Verification Results'}`}>
    <Card style={{ gap: 8 }}><Txt size={20} weight="700">Maintenance work order</Txt><Txt>{context.task._id}</Txt><Detail label="Repair cycle" value={String(context.task.cycle)} /><Detail label="Current repair revision" value={String(context.task.revision)} /></Card>
    {!shown.length && <Notice>No {kind} verification decision has been recorded for this repair.</Notice>}
    {shown.map((attempt) => <Card key={attempt._id} style={{ gap: 16 }}><Row><Icon name={attempt.outcome === 'pass' ? 'checkmark-circle' : attempt.outcome === 'unable' ? 'help-circle' : 'close-circle'} size={44} color={attempt.outcome === 'pass' ? '#13835E' : '#C92E40'} /><View style={{ flex: 1, gap: 5 }}><Txt size={23} weight="800">{attempt.outcome === 'pass' ? 'Checks passed' : attempt.outcome === 'unable' ? 'Unable to verify' : 'Verification failed'}</Txt><Txt muted>{new Date(attempt.at).toLocaleString()}</Txt></View></Row><Detail label="Recorded repair revision" value={String(attempt.taskRevision)} /><Detail label="Verified by" value={attempt.actorId} />{attempt.checks.map((check) => <Row key={check.label} style={{ alignItems: 'flex-start' }}><Icon name={check.passed ? 'checkmark-circle-outline' : 'close-circle-outline'} color={check.passed ? '#13835E' : '#C92E40'} /><Txt style={{ flex: 1 }}>{check.label}</Txt><Badge label={check.passed ? 'Pass' : 'Not passed'} tone={check.passed ? 'success' : 'danger'} /></Row>)}<View style={{ gap: 7 }}><Txt size={18} weight="700">Findings</Txt><Txt>{attempt.notes || 'No additional findings recorded.'}</Txt></View><Detail label="Evidence reference" value={attempt.evidenceReference} /><Notice tone="warning">This recorded decision does not establish current equipment release. The current policy, repair revision and safety holds must still be checked.</Notice></Card>)}
    <LinkRow title="Current checklist and policy" icon="clipboard-outline" onPress={() => go(`${kind}-checklist`, context.task._id)} />{!history && <LinkRow title="View verification history" icon="time-outline" onPress={() => go(`${kind}-history`, context.task._id)} />}<Button label="Equipment release status" variant="secondary" onPress={() => go('release', context.task.equipmentId)} />
  </Screen>;
}
function VerificationForm({ context, kind }: { context: FunctionReturnType<typeof staffApi.safety.verificationContext>; kind: "technical" | "clinical" }) {
  const { account } = useStaffAccess(); const verify = useMutation(staffApi.safety.verify); const [checks, setChecks] = useState<Record<string, "Not checked" | "Pass" | "Fail">>({}); const [outcome, setOutcome] = useState<"pass" | "fail" | "unable">("pass"); const [notes, setNotes] = useState(""); const [reference, setReference] = useState(""); const [due, setDue] = useState(""); const [operationId, setOperationId] = useState(randomUUID); const [received, setReceived] = useState("");
  const policy = context.policy; const self = context.task.assigneeId === account?.id;
  return <Screen title={kind === "technical" ? "Technical Safety Checklist" : "Clinical Safety Checklist"} subtitle="Record an independent decision against the approved institutional policy.">
    <Card style={{ gap: 9 }}><Detail label="Linked repair" value={context.task._id} /><Detail label="Repair status" value={context.task.state} /><Detail label="Repair diagnosis" value={context.task.diagnosis || "Not recorded"} /><Detail label="Maintenance cycle" value={String(context.task.cycle)} /></Card>
    {!policy ? <Notice tone="warning">Institutional safety policy is not approved/configured. Verification is disabled. No illustrative checklist is used for a live safety decision.</Notice> : <>
      <Card style={{ gap: 10 }}><Detail label="Approved policy reference" value={policy.approvalReference} /><Detail label="Checks marked pass" value={`${policy.checks.filter((label) => checks[label] === "Pass").length} / ${policy.checks.length}`} /><Txt muted size={12}>Every required check must pass before a pass decision can be recorded.</Txt></Card>
      {self && <Notice tone="warning">The repairing technician cannot verify their own work. An independent authorized verifier is required.</Notice>}
      {policy.checks.map((label) => <Card key={label}><Choices label={label} values={["Not checked", "Pass", "Fail"]} value={checks[label] ?? "Not checked"} onChange={(value) => setChecks((old) => ({ ...old, [label]: value }))} /></Card>)}
      <Choices label="Verification outcome" values={["pass", "fail", "unable"]} value={outcome} onChange={setOutcome} /><Field label="Findings / failure or inability reason" value={notes} onChangeText={setNotes} multiline maxLength={2000} /><Field label="Evidence reference" value={reference} onChangeText={setReference} maxLength={500} />
      {outcome !== "pass" && <><Notice>A failed/unable decision creates linked rework and blocks return to service.</Notice><DateTimeField label="Required rework due date" value={due} onChange={setDue} required /></>}
      {!!received && <><Notice>Verification recorded: {received}</Notice><Button label="View recorded verification results" onPress={() => go(`${kind}-result`, context.task._id)} /></>}
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
export function ReleaseScreen({ id, overview = false }: { id: string; overview?: boolean }) {
  const equipment = useQuery(staffApi.workflows.equipmentDetail, { id: id as GenericId<"equipment"> });
  return <Screen title={overview ? "Equipment Availability" : "Equipment Release Checklist"} subtitle={overview ? "Review current restrictions before using this equipment." : "Review current prerequisites for an authorized return-to-service decision."}>
    {equipment && <Card style={{ gap: 7 }}><Txt size={23} weight="800">{equipment.assetId}</Txt><Txt size={17}>{equipment.name}</Txt><Txt muted>{equipment.location}</Txt><Badge label={equipment.identityVerified ? "Inventory identity verified" : "Unverified inventory identity"} tone={equipment.identityVerified ? "info" : "warning"} /></Card>}
    <ReleaseControls id={id} />
    <LinkRow title="Active safety holds" detail="Review restrictions and authorized resolutions" icon="lock-closed-outline" onPress={() => go("holds", id)} />
    <LinkRow title="Equipment status timeline" icon="time-outline" onPress={() => go("status-timeline", id)} />
    <Button label={overview ? "Review release checklist" : "View equipment record"} variant="secondary" onPress={() => go(overview ? "release" : "equipment-detail", id)} />
  </Screen>;
}
export function ReleaseControls({ id }: { id: string }) {
  const equipmentId = id as GenericId<"equipment">; const result = useQuery(staffApi.safety.releaseStatus, { equipmentId }); const release = useMutation(staffApi.safety.release); const [reason, setReason] = useState("");
  return result ? <View style={{ gap: 14 }}>
    <StatusPanel title={result.available ? "Released for service" : "Not released for service"} detail={result.available ? "The current release decision satisfies the recorded prerequisites. Later faults or safety holds can change this status." : "Do not infer availability from a completed repair or an individual verification pass."} icon={result.available ? "shield-checkmark" : "alert-circle"} tone={result.available ? "success" : "warning"} />
    <Card style={{ gap: 14 }}><Txt size={20} weight="800">Return-to-service prerequisites</Txt><Detail label="Approved policy" value={result.policyReference ?? "Not approved/configured"} />
      {result.blockers.map((blocker, index) => <Row key={blocker} style={{ alignItems: "flex-start" }}><Icon name="close-circle-outline" color="#C92E40" /><View style={{ flex: 1, gap: 3 }}><Txt size={12} muted>Restriction {index + 1}</Txt><Txt>{blocker}</Txt></View></Row>)}
      {result.available && <Notice tone="success">Current release confirmed by the staff service.</Notice>}
      {result.canRelease && !result.available && <><Field label="Return-to-service justification" value={reason} onChangeText={setReason} maxLength={500} multiline /><ConfirmAction label="Authorize Return to Service" title="Release equipment for service?" detail="All current repairs, verifications, identity and holds are checked atomically by the server." disabled={!result.eligible || !reason.trim() || result.expectedTaskRevision === null} onConfirm={() => release({ equipmentId, expectedTaskRevision: result.expectedTaskRevision!, reason })} /></>}
    </Card>
  </View> : <Notice>Checking current release prerequisites?</Notice>;
}
export function ResolveHold({ id, equipmentId }: { id: GenericId<"safetyHolds">; equipmentId: GenericId<"equipment"> }) {
  const status = useQuery(staffApi.safety.releaseStatus, { equipmentId }); const resolve = useMutation(staffApi.safety.resolveHold); const [reason, setReason] = useState("");
  return status?.canRelease ? <><Field label="Hold resolution evidence / reason" value={reason} onChangeText={setReason} maxLength={500} /><ConfirmAction label="Resolve hold" title="Resolve this safety hold?" detail="The original hold and an audited resolution remain in history. This action does not release equipment." disabled={!reason.trim()} onConfirm={() => resolve({ id, reason })} /></> : <Notice>Hold clearance is disabled without approved policy and clearance authority.</Notice>;
}
