import { useState, type ComponentType } from "react";
import { View, Pressable } from "react-native";
import { Redirect } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Badge, Button, Card, Choices, Detail, Field, Icon, LinkRow, Notice, Row, Screen, Section, Select, Txt, usePalette } from "@/components/smart/ui";
import { DateTimeField } from "@/components/smart/date-time-field";
import { useApp } from "@/state/app-state";
import { useCurrentTime } from "@/hooks/use-current-time";
import { StatusPanel } from "@/components/smart/status-ui";
import { AccountProfile } from "@/features/workspace/profile";
import { ManagementAnalytics, ReportsExport } from "./management-screens";
import { DeviceDrafts } from "./device-drafts";
import { IdentityReview } from "./identity-review";
import { ReportReceipt, UnmatchedEquipment } from "./report-results";
import { EquipmentHolds, EquipmentStatusTimeline } from "./equipment-status";
import { useStaffAccess } from "./provider";
import { tabItems } from "@/navigation/tabs";
import { go } from "@/navigation/go";
import { staffApi } from "@/services/staff-api";
import { StaffAdministration, StaffApplicationReview, StaffRoleAssignment, StaffAccounts, StaffAudit } from "./administration";
import { ConfirmAction } from "./ui";
import { MaintenanceFlow } from "./extensions-ui";
import { ReportingJourney, ResumeReport } from "./reporting-journey";
import { EquipmentHistory, EquipmentLookup, EquipmentRecord, EquipmentRegistry, NotificationInbox, OperationalList, ProvisionalForm, ReportDetail, ReportFilters, WorkHistory } from "./operational-screens";
import type { GenericId } from "convex/values";
import { ReleaseScreen, VerificationActions, VerificationScreen } from "./safety-screens";
import { PreventiveCreate, PreventiveSchedules } from "./preventive-screens";
import { ReportQueueScreen } from "./report-queue";
import { StaffDataBoundary } from "./data-boundary";
import { StaffHome } from './dashboard-screens';
import { EmergencyIntroduction } from './emergency-introduction';

export function StaffWorkspaceRoute({ screen, preview: Preview }: { screen: string; preview: ComponentType }) {
  const { account } = useStaffAccess();
  return <View style={{ flex: 1 }}>{account?.classification === "development-demo" && <Notice>Development demo · IT-DEMO · fictional training data. Clinical verification and equipment release are disabled.</Notice>}<StaffDataBoundary key={screen}><WorkspaceScreen screen={screen} preview={Preview} /></StaffDataBoundary></View>;
}
function WorkspaceScreen({ screen, preview: Preview }: { screen: string; preview: ComponentType }) {
  const { account, mode } = useApp();
  if (mode === "locked" || !account) return <Redirect href="/access/pending" />;
  if (!tabItems(account).some((tab) => tab.name === screen)) return <Restricted />;
  if (mode === "preview") return <Preview />;
  if (screen === "home") return <StaffHome />;
  if (screen === "accounts") return <StaffAdministration />;
  if (screen === "equipment") return <LiveEquipment />;
  if (screen === "reports") return <LiveReports />;
  if (screen === "tasks") return <LiveTasks />;
  if (screen === "profile") return <LiveProfile />;
  return <NotificationInbox />;
}
function Restricted() { return <Screen title="Access restricted"><Notice>This destination is outside your approved staff access.</Notice></Screen>; }
function LiveEquipment() {
  return <OperationalList kind="equipment" />;
}
function EquipmentDetail({ id }: { id: string }) {
  return <EquipmentRecord id={id} />;
}
function LiveReports() {
  const { account } = useStaffAccess();
  if (!account?.capabilities.some((c) => ["report", "triage", "assign"].includes(c))) return account?.capabilities.includes("analytics") ? <Analytics /> : account?.capabilities.includes("export") ? <Export /> : <Restricted />;
  return <ReportList />;
}
function ReportList() {
  return <OperationalList kind="reports" />;
}
function ReportForm({ id }: { id?: string }) { return <ReportingJourney id={id} />; }
function LiveTasks() {
  const { account } = useStaffAccess();
  if (!account?.capabilities.some((c) => ["assign", "repair", "clinical", "technical"].includes(c))) return <Restricted />;
  return <TaskList />;
}
function TaskList() {
  return <OperationalList kind="tasks" />;
}
function TaskLoader({ id, view = 'task-detail' }: { id: string; view?: string }) {
  const task = useQuery(staffApi.workflows.taskDetail, { id: id as GenericId<"maintenanceTasks"> });
  if (!task) return <Screen title="Maintenance task"><Notice>Loading authorized task…</Notice></Screen>;
  return <TaskForm key={`${task._id}:${task.revision}:${task.workflowRevision ?? 0}:${view}`} task={task} view={view} />;
}
function TaskForm({ task, view }: { task: FunctionReturnType<typeof staffApi.operations.tasks>[number]; view: string }) {
  const { account } = useStaffAccess();
  const equipment = useQuery(staffApi.workflows.equipmentDetail, { id: task.equipmentId });
  const [tab, setTab] = useState<'Details' | 'Activity'>('Details');
  const [newPart, setNewPart] = useState('');
  const save = useMutation(staffApi.operations.recordWork);
  const [diagnosis, setDiagnosis] = useState(task.diagnosis); const [notes, setNotes] = useState(task.notes); const [parts, setParts] = useState(task.parts.join(", "));
  const [diagnosisEvidence, setDiagnosisEvidence] = useState(task.diagnosisEvidence ?? '');
  const [cause, setCause] = useState(task.causeAssessment ?? 'Under investigation (unconfirmed)');
  const [preventiveResults, setPreventiveResults] = useState(task.preventiveResults ?? task.preventiveChecklist?.map((label) => ({ label, passed: false })));
  const terminal = ["Completed", "Cancelled"].includes(task.state);
  const canRepair = account?.capabilities.includes("repair") && task.assigneeId === account.id && !terminal && task.workflowPhase !== "awaiting_parts";
  const saveWork = (complete: boolean) => save({ id: task._id, expectedRevision: task.revision, diagnosis, diagnosisEvidence, causeAssessment: cause, notes, parts: parts.split(',').map((p) => p.trim()).filter(Boolean), complete, preventiveResults });
  const summary = <Card style={{ gap: 10 }}><Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><View style={{ flex: 1, minWidth: 180 }}><Txt muted size={13}>Work Order</Txt><Txt size={23} weight="800">{task._id}</Txt></View><Badge label={task.state} tone={task.state === 'Completed' ? 'success' : 'warning'} /></Row><Txt size={18} weight="600">{equipment?.name ?? 'Loading equipment…'}</Txt><Txt muted>{equipment?.assetId}</Txt><Txt muted>{equipment?.location}</Txt>{task.parentTaskId && <Badge label="Follow-up rework" tone="danger" />}<MaintenanceFlow task={task} /></Card>;
  if (['task-detail', 'rework', 'live-task'].includes(view)) return <Screen title={view === 'rework' ? 'Follow-up Rework' : 'Maintenance Task Details'} subtitle={view === 'rework' ? 'Review the work linked to a previous maintenance cycle.' : 'Review the fault, assigned work and recorded activity.'}>
    {summary}
    {!!task.parentTaskId && <Card style={{ gap: 10 }}><Detail label="Original maintenance task" value={task.parentTaskId} /><Detail label="Linked verification decision" value={task.failureAttemptId ?? "Not recorded"} /></Card>}
    <Card style={{ gap: 12 }}><Detail label="Due date" value={new Date(task.dueAt).toLocaleString()} /><Detail label="Assigned account" value={task.assigneeId ?? 'Unassigned'} /><Detail label="Repair cycle" value={String(task.cycle)} />{task.reportId && <Detail label="Fault report" value={task.reportId} />}</Card>
    <TaskTabs value={tab} onChange={setTab} />
    {tab === 'Activity' ? <WorkHistory id={task._id} /> : <Card style={{ gap: 14 }}><TaskText label="Diagnosis" value={task.diagnosis} /><TaskText label="Diagnostic evidence" value={task.diagnosisEvidence ?? ''} /><TaskText label="Cause assessment" value={task.causeAssessment ?? ''} /><TaskText label="Repair performed" value={task.notes} /><TaskText label="Parts used" value={task.parts.join(', ')} /></Card>}
    {canRepair && <><Button label="Update Progress" icon="create-outline" onPress={() => go('progress', task._id)} /><LinkRow title="Diagnosis and findings" icon="search-outline" onPress={() => go('diagnosis', task._id)} /><LinkRow title="Repair notes and parts" icon="construct-outline" onPress={() => go('parts', task._id)} /></>}
    {account?.capabilities.includes('assign') && !terminal && <><LinkRow title="Technician assignment" icon="person-outline" onPress={() => go('assignment', task._id)} /><LinkRow title="Change due date" icon="calendar-outline" onPress={() => go('due-date', task._id)} /></>}
    {task.state === 'Completed' && <><Button label="Repair completion" onPress={() => go('completion', task._id)} /><VerificationActions id={task._id} assignee={task.assigneeId} /></>}
    <LinkRow title="Equipment and release status" onPress={() => go('live-equipment', task.equipmentId)} />
  </Screen>;
  if (['assignment', 'due-date', 'cancellation'].includes(view)) return <Screen title={view === 'assignment' ? 'Assign Technician' : view === 'due-date' ? 'Change Due Date' : 'Cancel Work Order'}>{summary}{account?.capabilities.includes('assign') && !terminal ? <TaskAssignment task={task} focus={view} /> : <Notice>This task cannot be changed with your current access or its current state.</Notice>}</Screen>;
  if (view === 'maintenance-history') return <Screen title="Repair Timeline">{summary}<WorkHistory id={task._id} /><Button label="View task" onPress={() => go('task-detail', task._id)} /></Screen>;
  if (view === 'completion') return <Screen>
    <StatusPanel title={task.state === "Completed" ? "Repair complete" : "Complete maintenance repair"} detail={task.state === "Completed" ? "Maintenance is recorded. Equipment remains subject to independent verification and a current return-to-service decision." : "Review the recorded diagnosis, repair notes and parts before completing this task."} icon={task.state === "Completed" ? "checkmark-circle" : "time-outline"} tone={task.state === "Completed" ? "success" : "warning"} />
    {summary}<Card style={{ gap: 10 }}><TaskText label="Diagnosis" value={task.diagnosis} /><TaskText label="Repair notes" value={task.notes} /><TaskText label="Parts used" value={task.parts.join(', ')} /></Card>
    <Notice tone="warning">Repair completion does not release this equipment. Review the current equipment record for release status and required independent checks.</Notice>
    {canRepair && <ConfirmAction label="Complete maintenance" title="Complete this repair?" detail="Completion is retained in history and does not release the equipment." disabled={!diagnosis.trim() || !notes.trim()} onConfirm={() => saveWork(true)} />}
    {task.state === 'Completed' && <VerificationActions id={task._id} assignee={task.assigneeId} />}<Button label="View equipment status" variant="secondary" onPress={() => go('live-equipment', task.equipmentId)} />
  </Screen>;
  return <Screen title={view === 'diagnosis' ? 'Diagnosis and Findings' : view === 'parts' ? 'Repair Notes and Parts' : 'Work Progress'} subtitle={view === 'diagnosis' ? 'Record the observed fault and initial assessment.' : undefined}>{summary}
    {canRepair ? <>
      {task.preventiveChecklist && <Card style={{ gap: 8 }}><Txt weight="700">Scheduled maintenance checklist</Txt>{preventiveResults?.map((check, index) => <Choices key={check.label} label={check.label} values={["Not completed", "Completed"]} value={check.passed ? "Completed" : "Not completed"} onChange={(value) => setPreventiveResults((prior) => prior?.map((r, i) => i === index ? { ...r, passed: value === "Completed" } : r))} />)}</Card>}
      {view === 'diagnosis' && <Card style={{ gap: 14 }}><Field label="Diagnosis" value={diagnosis} onChangeText={setDiagnosis} maxLength={2000} multiline style={{ minHeight: 110 }} /><Txt muted size={12}>{diagnosis.length} / 2000</Txt><Field label="Evidence" value={diagnosisEvidence} onChangeText={setDiagnosisEvidence} maxLength={2000} multiline style={{ minHeight: 100 }} /><Select label="Cause assessment" values={['Under investigation (unconfirmed)', 'Suspected cause', 'Confirmed by testing', 'Undetermined']} value={cause} onChange={setCause} /></Card>}
      {view === 'parts' && <><Card style={{ gap: 12 }}><Txt size={21} weight="700">Parts Used</Txt><Txt muted>List the parts used to complete the repair.</Txt>{parts.split(',').map((p) => p.trim()).filter(Boolean).map((part, index, list) => <Row key={`${index}:${part}`}><Txt style={{ flex: 1 }}>{part}</Txt><Button label={`Remove part ${index + 1}`} variant="secondary" icon="trash-outline" onPress={() => setParts(list.filter((_, i) => i !== index).join(', '))} /></Row>)}<Field label="Part name / reference" value={newPart} onChangeText={setNewPart} maxLength={120} /><Button label="Add Part" variant="secondary" icon="add" disabled={!newPart.trim() || newPart.includes(',')} onPress={() => { setParts([parts, newPart.trim()].filter(Boolean).join(', ')); setNewPart(''); }} /></Card><Card style={{ gap: 12 }}><Txt size={21} weight="700">Repair Notes</Txt><Field label="Work performed" value={notes} onChangeText={setNotes} multiline maxLength={4000} style={{ minHeight: 125 }} /><Txt muted size={12}>{notes.length} / 4000</Txt></Card></>}
      {!['diagnosis', 'parts'].includes(view) && <><TaskProgress state={task.state} diagnosis={task.diagnosis} notes={task.notes} /><Card style={{ gap: 10 }}><Txt size={20} weight="700">Current note</Txt><Field label="Work notes" value={notes} onChangeText={setNotes} multiline maxLength={4000} style={{ minHeight: 85 }} /></Card><LinkRow title="Diagnosis and findings" onPress={() => go('diagnosis', task._id)} /><LinkRow title="Repair notes and parts" onPress={() => go('parts', task._id)} /></>}
      <ConfirmAction label={view === 'parts' ? 'Save and Continue' : view === 'diagnosis' ? 'Save Diagnosis' : 'Update Progress'} title="Record maintenance work?" detail="Your work will be recorded under your staff account. This does not release equipment." onConfirm={async () => { await saveWork(false); go(view === 'diagnosis' ? 'parts' : view === 'parts' ? 'completion' : 'task-detail', task._id); }} />
    </> : <Card style={{ gap: 8 }}><Detail label="Diagnosis" value={task.diagnosis || "Not recorded"} /><Detail label="Notes" value={task.notes || "Not recorded"} /></Card>}
    {task.state === "Completed" && <VerificationActions id={task._id} assignee={task.assigneeId} />}
    <Notice>Completing repair does not release equipment. Current independent checks and an approved institutional policy are required.</Notice>
  </Screen>;
}
function TaskText({ label, value }: { label: string; value: string }) { const p = usePalette(); return <View style={{ gap: 5, borderBottomWidth: 1, borderColor: p.border, paddingBottom: 12 }}><Txt size={13} muted>{label}</Txt><Txt>{value || 'Not recorded'}</Txt></View>; }
function TaskTabs({ value, onChange }: { value: 'Details' | 'Activity'; onChange: (value: 'Details' | 'Activity') => void }) { const p = usePalette(); return <Row style={{ backgroundColor: p.input, padding: 5, borderRadius: 16 }}>{(['Details', 'Activity'] as const).map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: value === item }} onPress={() => onChange(item)} style={{ flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: value === item ? '#0866E8' : undefined }}><Txt size={16} weight="600" color={value === item ? '#FFFFFF' : p.text}>{item}</Txt></Pressable>)}</Row>; }
function TaskProgress({ state, diagnosis, notes }: { state: string; diagnosis: string; notes: string }) { const steps = [{ label: 'Assigned', done: state !== 'Unassigned' }, { label: 'In progress', done: ['In progress', 'Completed'].includes(state) }, { label: 'Diagnosis', done: !!diagnosis }, { label: 'Repair notes', done: !!notes }, { label: 'Complete', done: state === 'Completed' }]; return <Card style={{ gap: 16 }}><Txt size={22} weight="800">Work Progress</Txt>{steps.map((step, index) => <Row key={step.label} style={{ alignItems: 'flex-start' }}><View style={{ alignItems: 'center', width: 32 }}><Icon name={step.done ? 'checkmark-circle' : 'ellipse-outline'} size={30} color={step.done ? '#0866E8' : '#AABAD0'} />{index < steps.length - 1 && <View style={{ width: 2, height: 22, backgroundColor: step.done ? '#0866E8' : '#DCE8F4' }} />}</View><View style={{ gap: 3 }}><Txt size={17} weight="700">{step.label}</Txt><Txt size={12} muted>{step.done ? 'Recorded' : 'Pending'}</Txt></View></Row>)}</Card>; }
function TaskAssignment({ task, focus }: { task: FunctionReturnType<typeof staffApi.operations.tasks>[number]; focus: string }) {
  const p = usePalette();
  const now = useCurrentTime();
  const technicians = useQuery(staffApi.operations.technicians, focus === "assignment" ? { departmentId: task.departmentId } : "skip");
  const assign = useMutation(staffApi.operations.assign);
  const changeDue = useMutation(staffApi.operations.changeDue);
  const cancel = useMutation(staffApi.operations.cancelTask);
  const [selected, setSelected] = useState(task.assigneeId ?? "");
  const [due, setDue] = useState(new Date(task.dueAt).toISOString());
  const [reason, setReason] = useState("");
  const technician = technicians?.find((candidate) => candidate.id === selected);
  const validDue = Number.isFinite(Date.parse(due)) && Date.parse(due) > now;
  const backToTask = () => go("task-detail", task._id);
  return <Section title={focus === "assignment" ? "Select Technician" : focus === "due-date" ? "Maintenance Schedule" : "Cancellation Reason"}>
    {focus === "assignment" && <>
      <Txt muted>Choose an approved technician authorized to repair equipment in this department.</Txt>
      {technicians === undefined && <Notice>Loading eligible technicians?</Notice>}
      {technicians?.length === 0 && <Notice>No eligible technicians are available in this department.</Notice>}
      {technicians?.map((candidate) => <Pressable key={candidate.id} accessibilityRole="radio" accessibilityLabel={candidate.name + ". Staff ID " + candidate.staffId} accessibilityState={{ checked: selected === candidate.id }} onPress={() => setSelected(candidate.id)}><Card style={{ borderColor: selected === candidate.id ? "#0866E8" : p.border }}><Row style={{ gap: 12 }}><Icon name={selected === candidate.id ? "radio-button-on" : "radio-button-off"} /><View style={{ flex: 1, gap: 4 }}><Txt size={17} weight="700">{candidate.name}</Txt><Txt muted size={13}>Staff ID: {candidate.staffId}</Txt></View><Icon name="person-circle-outline" size={34} /></Row></Card></Pressable>)}
    </>}
    {focus === "due-date" && <Card style={{ gap: 10 }}><Detail label="Current due date" value={new Date(task.dueAt).toLocaleString()} /><Txt muted>The previous due date and your reason will remain in the audit history.</Txt></Card>}
    {focus === "cancellation" && <StatusPanel title="Cancel maintenance work" detail="Cancellation ends this work order. It does not clear safety holds or authorize equipment use." icon="alert-circle-outline" tone="warning" />}
    {focus !== "cancellation" && <DateTimeField label="New due date" value={due} onChange={setDue} required />}
    {focus !== "cancellation" && !validDue && <Notice tone="warning">Choose a future due date before saving.</Notice>}
    <Field label="Justification" value={reason} onChangeText={setReason} maxLength={500} multiline style={{ minHeight: 95 }} />
    {focus === "assignment" && <ConfirmAction label="Assign Technician" title="Confirm technician assignment?" detail={"Assign this maintenance work to " + (technician?.name ?? "the selected technician") + ". Department access and the due date are rechecked by the server."} disabled={!technician || !reason.trim() || !validDue} onConfirm={async () => { await assign({ id: task._id, expectedRevision: task.revision, assigneeId: technician!.id, dueAt: Date.parse(due), reason }); backToTask(); }} />}
    {focus === "due-date" && <ConfirmAction label="Update Due Date" title="Change the maintenance due date?" detail="The previous date and administrative justification remain in the audit history." disabled={!reason.trim() || !validDue} onConfirm={async () => { await changeDue({ id: task._id, expectedRevision: task.revision, dueAt: Date.parse(due), reason }); backToTask(); }} />}
    {focus === "cancellation" && <ConfirmAction label="Cancel Maintenance Task" title="Cancel this maintenance task?" detail="This ends the work order and records your reason. Equipment availability is evaluated separately." danger disabled={!reason.trim()} onConfirm={async () => { await cancel({ id: task._id, expectedRevision: task.revision, reason }); backToTask(); }} />}
  </Section>;
}
function TaskCreation({ id }: { id: string }) {
  const report = useQuery(staffApi.workflows.reportDetail, { id: id as GenericId<"faultReports"> });
  const create = useMutation(staffApi.operations.createTask); const [due, setDue] = useState(""); const [message, setMessage] = useState("");
  return <Screen title="Create Maintenance Task"><Notice>{report ? report.symptoms : "Loading authorized report…"}</Notice>
    <DateTimeField label="Required due date" value={due} onChange={setDue} required />
    {!!message && <Notice>{message}</Notice>}
    <ConfirmAction label="Create task" title="Create a maintenance task?" detail="A verified equipment identity and an explicit future due date are required." disabled={!report || !due}
      onConfirm={async () => { const task = await create({ reportId: report!._id, dueAt: Date.parse(due) }); setMessage(`Maintenance task created: ${task}`); }} />
  </Screen>;
}
function LiveProfile() { return <AccountProfile />; }
function Analytics() { return <ManagementAnalytics />; }
function Export() { return <ReportsExport />; }

export function LiveFlow({ screen, id }: { screen: string; id?: string }) {
  return <StaffDataBoundary key={`${screen}:${id ?? ""}`}><LiveFlowContent screen={screen} id={id} /></StaffDataBoundary>;
}
function LiveFlowContent({ screen, id }: { screen: string; id?: string }) {
  const { account } = useStaffAccess();
  if (!account) return <Restricted />;
  if (screen === "device-drafts") return account.capabilities.includes("report") ? <DeviceDrafts /> : <Restricted />;
  if (screen === "reconcile") return account.capabilities.includes("reconcile") ? <IdentityReview /> : <Restricted />;
  if (["sync", "queue", "upload-failed", "conflict"].includes(screen) && account.capabilities.includes("report")) return <ReportQueueScreen view={screen} />;
  if (["technical-queue", "clinical-queue"].includes(screen)) {
    const kind = screen === "technical-queue" ? "technical" : "clinical";
    return account.capabilities.includes(kind) ? <OperationalList kind="tasks" verification={kind} /> : <Restricted />;
  }
  if (["technical-checklist", "technical-result", "technical-history"].includes(screen)) return !account.capabilities.includes("technical") ? <Restricted /> : id ? <VerificationScreen id={id} kind="technical" view={screen.endsWith('result') ? 'result' : screen.endsWith('history') ? 'history' : 'checklist'} /> : <OperationalList kind="tasks" verification="technical" />;
  if (["clinical-checklist", "clinical-result", "clinical-history"].includes(screen)) return !account.capabilities.includes("clinical") ? <Restricted /> : id ? <VerificationScreen id={id} kind="clinical" view={screen.endsWith('result') ? 'result' : screen.endsWith('history') ? 'history' : 'checklist'} /> : <OperationalList kind="tasks" verification="clinical" />;
  if (screen === "equipment-history") return id ? <EquipmentHistory id={id} /> : <LiveEquipment />;
  if (screen === "status-timeline") return id ? <EquipmentStatusTimeline id={id} /> : <LiveEquipment />;
  if (screen === "equipment-detail") return id ? <EquipmentDetail id={id} /> : <LiveEquipment />;
  if (["task-detail", "assignment", "due-date", "cancellation", "progress", "diagnosis", "parts", "completion", "rework", "maintenance-history"].includes(screen)) return id ? <TaskLoader id={id} view={screen} /> : <LiveTasks />;
  if (screen === 'triage') return account.capabilities.includes('triage') ? id ? <ReportDetail id={id} triageOnly /> : <LiveReports /> : <Restricted />;
  if (["submitted", "emergency-result"].includes(screen)) return id ? <ReportReceipt id={id} emergency={screen === "emergency-result"} /> : <LiveReports />;
  if (screen === 'filters') return account.capabilities.some((c) => ['report', 'triage', 'assign'].includes(c)) ? <ReportFilters /> : <Restricted />;
  if (screen === "fault-details" && account.capabilities.includes("report")) return <ReportForm id={id} />;
  if (["camera", "attachments", "review", "emergency-review"].includes(screen) && account.capabilities.includes("report")) return id ? <ResumeReport id={id} stage={["review", "emergency-review"].includes(screen) ? 3 : 2} /> : <LiveReports />;
  if (screen === "analytics" && account.capabilities.includes("analytics")) return <Analytics />;
  if (screen === "export" && account.capabilities.includes("export")) return <Export />;
  if (screen === "audit" && account.capabilities.includes("audit")) return <StaffAudit />;
  if (["role", "suspend"].includes(screen)) return id ? <StaffRoleAssignment id={id} focus={screen as 'role' | 'suspend'} /> : <StaffAccounts />;
  if (screen === "preventive-schedules") return <PreventiveSchedules />;
  if (screen === "preventive-create") return <PreventiveCreate id={id} />;
  if (screen === "technical-verification" && id) return <VerificationScreen id={id} kind="technical" />;
  if (screen === "clinical-verification" && id) return <VerificationScreen id={id} kind="clinical" />;
  if (["release", "availability"].includes(screen) && id) return <ReleaseScreen id={id} overview={screen === "availability"} />;
  if (screen === "resume-report" && id && account.capabilities.includes("report")) return <ResumeReport id={id} />;
  if (screen === 'emergency' && account.capabilities.includes('report')) return <EmergencyIntroduction />;
  if (screen === 'emergency-verify' && account.capabilities.includes('report')) return <EquipmentLookup emergency />;
  if (screen === 'emergency-form' && account.capabilities.includes('report')) return <ReportingJourney id={id} emergency />;
  if (screen === "unmatched") return <UnmatchedEquipment identifier={id} />;
  if (["scan", "manual"].includes(screen)) return <EquipmentLookup scan={screen === "scan"} initialIdentifier={id} />;
  if (screen === "equipment-registry") return <EquipmentRegistry />;
  if (screen === "provisional") return <ProvisionalForm identifier={id ?? ""} />;
  if (screen === "live-provisional-reports") return <OperationalList kind="provisional" />;
  if (screen === "report-detail" && id) return <ReportDetail id={id} />;
  if (["holds", "hold-detail"].includes(screen)) return id ? <EquipmentHolds id={id} details={screen === "hold-detail"} /> : <LiveEquipment />;
  if (screen === "staff-review" && id) return <StaffApplicationReview id={id} />;
  if (screen === "staff-accounts") return <StaffAccounts />;
  if (screen === "staff-role" && id) return <StaffRoleAssignment id={id} />;
  if (screen === "staff-audit" && account.capabilities.includes("audit")) return <StaffAudit />;
  if (screen === "live-report" && account.capabilities.includes("report")) return <ReportForm id={id} />;
  if (screen === "live-reports") return <LiveReports />;
  if (screen === "live-equipment" && id) return <EquipmentDetail id={id} />;
  if (screen === "live-tasks") return <LiveTasks />;
  if (screen === "live-task" && id && account.capabilities.some((c) => ["repair", "assign", "technical", "clinical"].includes(c))) return <TaskLoader id={id} />;
  if (screen === "live-task-create" && id && account.capabilities.includes("assign")) return <TaskCreation id={id} />;
  if (screen === "live-analytics" && account.capabilities.includes("analytics")) return <Analytics />;
  if (screen === "live-export" && account.capabilities.includes("export")) return <Export />;
  return <Restricted />;
}
