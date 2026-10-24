import { useState, type ComponentType } from "react";
import { Platform, Share, View, Pressable } from "react-native";
import { Redirect, router } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Badge, Button, Card, Choices, Detail, Field, Icon, LinkRow, Notice, Row, Screen, Section, Select, Txt, usePalette } from "@/components/smart/ui";
import { DateTimeField } from "@/components/smart/date-time-field";
import { useApp } from "@/state/app-state";
import { useIdentity } from "@/features/access/identity";
import { useStaffAccess } from "./provider";
import { tabItems } from "@/navigation/tabs";
import { go } from "@/navigation/go";
import { staffApi } from "@/services/staff-api";
import { authErrorMessage } from "@/features/access/auth-policy";
import { StaffAdministration, StaffApplicationReview, StaffRoleAssignment, StaffAccounts, StaffAudit } from "./administration";
import { ConfirmAction } from "./ui";
import { ReportingJourney, ResumeReport } from "./reporting-journey";
import { EquipmentHistory, EquipmentLookup, EquipmentRecord, EquipmentRegistry, HoldControls, NotificationInbox, OperationalList, ProvisionalForm, ReportDetail, ReportFilters, WorkHistory } from "./operational-screens";
import type { GenericId } from "convex/values";
import { ReleaseScreen, VerificationActions, VerificationScreen } from "./safety-screens";
import { PreventiveCreate, PreventiveSchedules } from "./preventive-screens";
import { ReportQueueScreen } from "./report-queue";
import { StaffDataBoundary } from "./data-boundary";
import { StaffHome } from './dashboard-screens';
import { EmergencyIntroduction } from './emergency-introduction';

export function StaffWorkspaceRoute({ screen, preview: Preview }: { screen: string; preview: ComponentType }) {
  return <StaffDataBoundary key={screen}><WorkspaceScreen screen={screen} preview={Preview} /></StaffDataBoundary>;
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
  return <TaskForm key={`${task._id}:${task.revision}:${view}`} task={task} view={view} />;
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
  const canRepair = account?.capabilities.includes("repair") && task.assigneeId === account.id && !terminal;
  const saveWork = (complete: boolean) => save({ id: task._id, expectedRevision: task.revision, diagnosis, diagnosisEvidence, causeAssessment: cause, notes, parts: parts.split(',').map((p) => p.trim()).filter(Boolean), complete, preventiveResults });
  const summary = <Card style={{ gap: 10 }}><Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><View style={{ flex: 1, minWidth: 180 }}><Txt muted size={13}>Work Order</Txt><Txt size={23} weight="800">{task._id}</Txt></View><Badge label={task.state} tone={task.state === 'Completed' ? 'success' : 'warning'} /></Row><Txt size={18} weight="600">{equipment?.name ?? 'Loading equipment…'}</Txt><Txt muted>{equipment?.assetId}</Txt><Txt muted>{equipment?.location}</Txt>{task.parentTaskId && <Badge label="Follow-up rework" tone="danger" />}</Card>;
  if (['task-detail', 'rework', 'live-task'].includes(view)) return <Screen>
    {summary}
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
    <Card style={{ gap: 10 }}><Row><Icon name={task.state === 'Completed' ? 'checkmark-circle' : 'time-outline'} size={44} color={task.state === 'Completed' ? '#13835E' : '#A86508'} /><View style={{ flex: 1 }}><Txt size={23} weight="800">{task.state === 'Completed' ? 'Maintenance Repair Complete' : 'Complete Maintenance Repair'}</Txt><Txt muted>{task.state === 'Completed' ? 'The repair has been completed.' : 'Review the recorded work before completing this task.'}</Txt></View></Row></Card>
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
  const technicians = useQuery(staffApi.operations.technicians, { departmentId: task.departmentId });
  const assign = useMutation(staffApi.operations.assign); const changeDue = useMutation(staffApi.operations.changeDue); const cancel = useMutation(staffApi.operations.cancelTask);
  const [selected, setSelected] = useState(""); const [due, setDue] = useState(new Date(task.dueAt).toISOString()); const [reason, setReason] = useState("");
  const technician = technicians?.find((t) => `${t.name} · ${t.staffId}` === selected);
  return <Section title={focus === 'assignment' ? 'Select Technician' : focus === 'due-date' ? 'Schedule' : 'Cancellation reason'}>
    {focus === 'assignment' && <Select label="Authorized technician" values={technicians?.map((t) => `${t.name} · ${t.staffId}`) ?? []} value={selected} onChange={setSelected} />}
    {focus !== 'cancellation' && <DateTimeField label="Due date" value={due} onChange={setDue} />}<Field label="Justification" value={reason} onChangeText={setReason} maxLength={500} multiline />
    {focus === 'assignment' && <ConfirmAction label="Assign technician" title="Confirm assignment?" detail="The assignee and due date will be validated against department access." disabled={!technician || !reason.trim()} onConfirm={() => assign({ id: task._id, expectedRevision: task.revision, assigneeId: technician!.id, dueAt: Date.parse(due), reason })} />}
    {focus === 'due-date' && <ConfirmAction label="Update due date" title="Change due date?" detail="The previous due date is retained in the audit history." disabled={!reason.trim()} onConfirm={() => changeDue({ id: task._id, expectedRevision: task.revision, dueAt: Date.parse(due), reason })} />}
    {focus === 'cancellation' && <ConfirmAction label="Cancel task" title="Cancel this maintenance task?" detail="This affects active maintenance work and is audited." danger disabled={!reason.trim()} onConfirm={() => cancel({ id: task._id, expectedRevision: task.revision, reason })} />}
  </Section>;
}
function TaskCreation({ id }: { id: string }) {
  const report = useQuery(staffApi.workflows.reportDetail, { id: id as GenericId<"faultReports"> });
  const create = useMutation(staffApi.operations.createTask); const [due, setDue] = useState(""); const [message, setMessage] = useState("");
  return <Screen title="Create Maintenance Task"><Notice>{report ? report.symptoms : "Loading authorized report…"}</Notice>
    <DateTimeField label="Required due date" value={due} onChange={setDue} required />
    {message && <Notice>{message}</Notice>}
    <ConfirmAction label="Create task" title="Create a maintenance task?" detail="A verified equipment identity and an explicit future due date are required." disabled={!report || !due}
      onConfirm={async () => { const task = await create({ reportId: report!._id, dueAt: Date.parse(due) }); setMessage(`Maintenance task created: ${task}`); }} />
  </Screen>;
}
function LiveProfile() {
  const { account } = useStaffAccess(); const identity = useIdentity();
  return <Screen title="Profile and Security" back={false}>
    <Card style={{ gap: 14 }}><Row><View style={{ backgroundColor: '#E8F3FF', borderRadius: 45, padding: 16 }}><Icon name="person" size={44} /></View><View style={{ flex: 1, gap: 5 }}><Txt size={24} weight="800">{account?.name}</Txt><Txt muted size={16}>{account?.role}</Txt><Badge label="Approved staff access" tone="success" /></View></Row><Detail label="Verified Staff ID" value={account?.staffId ?? ''} /><Detail label="Email" value={account?.email ?? ''} /><Detail label="Authorized departments" value={String(account?.scope.length ?? 0)} /></Card>
    <Section title="Account Security"><Card style={{ gap: 12 }}><Row><Icon name="shield-checkmark-outline" size={30} /><View style={{ flex: 1, gap: 4 }}><Txt size={17} weight="700">Verified identity</Txt><Txt muted size={13}>{identity.email ?? account?.email}</Txt></View></Row><Txt muted size={13}>Your institutional Staff ID and approved role are managed by authorized staff administrators.</Txt></Card></Section>
    <LinkRow title="Appearance and accessibility" icon="settings-outline" onPress={() => go("settings")} />
    <LinkRow title="Notification preferences" icon="notifications-outline" onPress={() => go('notification-settings')} />
    {account?.capabilities.includes('report') && <LinkRow title="Synchronization status" icon="sync-outline" onPress={() => go('sync')} />}
    <ConfirmAction label="Sign out" title="Sign out of SmartMaint?" detail="Protected views and account data will be cleared from this session." onConfirm={async () => { await identity.signOut(); router.replace("/access/sign-in"); }} />
  </Screen>;
}
function Analytics() {
  const result = useQuery(staffApi.operations.analytics);
  return <Screen title="Department Summary">{result ? <Card style={{ gap: 10 }}><Detail label="Authorized departments" value={String(result.scopeCount)} /><Detail label="Reports" value={String(result.reports)} /><Detail label="High or urgent priority" value={String(result.highPriority)} /><Txt size={11} muted>Limited to {result.truncatedAtPerDepartment} recent reports per department.</Txt></Card> : <Notice>Loading authorized summary…</Notice>}</Screen>;
}
function Export() {
  const result = useQuery(staffApi.operations.exportReports);
  const [message, setMessage] = useState("");
  const share = async () => { try { if (!result) return;
    if (Platform.OS === "web") { const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "smartmaint-authorized-reports.csv"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    else await Share.share({ message: result.csv, title: "Authorized SmartMaint reports" });
  } catch (e) { setMessage(authErrorMessage(e)); } };
  return <Screen title="Authorized Reports Export"><Notice>Only reports in your authorized departments are included. Up to {result?.truncatedAtPerDepartment ?? 100} reports per department.</Notice>{message && <Notice tone="warning">{message}</Notice>}<Button label="Share CSV" disabled={!result} onPress={() => void share()} /></Screen>;
}

export function LiveFlow({ screen, id }: { screen: string; id?: string }) {
  return <StaffDataBoundary key={`${screen}:${id ?? ""}`}><LiveFlowContent screen={screen} id={id} /></StaffDataBoundary>;
}
function LiveFlowContent({ screen, id }: { screen: string; id?: string }) {
  const { account } = useStaffAccess();
  if (!account) return <Restricted />;
  if (screen === "reconcile") return account.capabilities.includes("reconcile") ? <OperationalList kind="provisional" /> : <Restricted />;
  if (["sync", "queue", "upload-failed", "conflict"].includes(screen) && account.capabilities.includes("report")) return <ReportQueueScreen view={screen} />;
  if (["technical-queue", "clinical-queue"].includes(screen)) {
    const kind = screen === "technical-queue" ? "technical" : "clinical";
    return account.capabilities.includes(kind) ? <OperationalList kind="tasks" verification={kind} /> : <Restricted />;
  }
  if (["technical-checklist", "technical-result", "technical-history"].includes(screen)) return !account.capabilities.includes("technical") ? <Restricted /> : id ? <VerificationScreen id={id} kind="technical" view={screen.endsWith('result') ? 'result' : screen.endsWith('history') ? 'history' : 'checklist'} /> : <OperationalList kind="tasks" verification="technical" />;
  if (["clinical-checklist", "clinical-result", "clinical-history"].includes(screen)) return !account.capabilities.includes("clinical") ? <Restricted /> : id ? <VerificationScreen id={id} kind="clinical" view={screen.endsWith('result') ? 'result' : screen.endsWith('history') ? 'history' : 'checklist'} /> : <OperationalList kind="tasks" verification="clinical" />;
  if (["equipment-history", "status-timeline"].includes(screen)) return id ? <EquipmentHistory id={id} /> : <LiveEquipment />;
  if (screen === "equipment-detail") return id ? <EquipmentDetail id={id} /> : <LiveEquipment />;
  if (["task-detail", "assignment", "due-date", "cancellation", "progress", "diagnosis", "parts", "completion", "rework", "maintenance-history"].includes(screen)) return id ? <TaskLoader id={id} view={screen} /> : <LiveTasks />;
  if (screen === 'triage') return account.capabilities.includes('triage') ? id ? <ReportDetail id={id} triageOnly /> : <LiveReports /> : <Restricted />;
  if (["submitted", "emergency-result"].includes(screen)) return id ? <ReportDetail id={id} /> : <LiveReports />;
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
  if (["release", "availability"].includes(screen) && id) return <ReleaseScreen id={id} />;
  if (screen === "resume-report" && id && account.capabilities.includes("report")) return <ResumeReport id={id} />;
  if (screen === 'emergency' && account.capabilities.includes('report')) return <EmergencyIntroduction />;
  if (screen === 'emergency-verify' && account.capabilities.includes('report')) return <EquipmentLookup emergency />;
  if (screen === 'emergency-form' && account.capabilities.includes('report')) return <ReportingJourney id={id} emergency />;
  if (["scan", "manual", "unmatched"].includes(screen)) return <EquipmentLookup scan={screen === "scan"} />;
  if (screen === "equipment-registry") return <EquipmentRegistry />;
  if (screen === "provisional") return <ProvisionalForm identifier={id ?? ""} />;
  if (screen === "live-provisional-reports") return <OperationalList kind="provisional" />;
  if (screen === "report-detail" && id) return <ReportDetail id={id} />;
  if (["holds", "hold-detail"].includes(screen) && id) return <HoldControls id={id} />;
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
