import { InventoryIdentityBadge } from '@/components/smart/inventory-identity';
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useDeviceDraft } from "./use-device-draft";
import { reportRecovery } from "@/services/report-recovery";
import type { RecoveryFields } from "@/domain/report-recovery";
import { requireMatchingReceipt } from "@/domain/report-queue";
import { randomUUID } from "expo-crypto";
import { useMutation, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { Button, Card, Choices, Detail, Field, Notice, Row, Screen, Select, Txt } from "@/components/smart/ui";
import { View } from 'react-native';
import { ReportSteps } from '@/components/smart/report-steps';
import { DateTimeField } from "@/components/smart/date-time-field";
import { staffApi } from "@/services/staff-api";
import { go } from "@/navigation/go";
import { authErrorMessage } from "@/features/access/auth-policy";
import { EquipmentLookup } from "./operational-screens";
import { ConfirmAction } from "./ui";
import { useStaffAccess } from "./provider";
import { ReportPhotos } from "./report-photos";
import { ReportReceipt } from "./report-results";
import { QueueAvailability } from "./queue-availability";
import { useReportQueue } from "./report-queue";
import { ReportFieldComparison } from "@/components/smart/report-field-comparison";
import { reportFieldsFromServer } from "@/domain/report-field-comparison";
import { SubmittedReportRecovery } from "./submitted-report-recovery";

export function ReportingJourney({ id, emergency = false }: { id?: string; emergency?: boolean }) {
  return id ? <Journey key={`${id}:${emergency}`} equipmentId={id as GenericId<"equipment">} emergency={emergency} /> : <EquipmentLookup emergency={emergency} />;
}
export function ResumeReport({ id, stage = 1 }: { id: string; stage?: 1 | 2 | 3 }) {
  const report = useQuery(staffApi.workflows.reportDetail, { id: id as GenericId<"faultReports"> });
  return report ? <ResumedReport key={`${report._id}:${stage}`} report={report} stage={stage} /> : <Screen title="Restore draft"><Notice>Loading your saved draft…</Notice></Screen>;
}
function ResumedReport({ report, stage }: { report: FunctionReturnType<typeof staffApi.workflows.reportDetail>; stage: 1 | 2 | 3 }) {
  // Keep an opened draft form mounted through its publication acknowledgment.
  // Journey observes fresh server changes itself and retains cleanup feedback.
  const [openedDraft] = useState(() => report.submissionState === "draft" ? report : null);
  return openedDraft ? <Journey equipmentId={openedDraft.equipmentId} emergency={!!openedDraft.emergency} initial={openedDraft} initialStage={stage} /> : <SubmittedReportRecovery report={report} />;
}
function Journey({ equipmentId, emergency: initialEmergency, initial, initialStage = 1 }: { equipmentId: GenericId<"equipment">; emergency: boolean; initial?: FunctionReturnType<typeof staffApi.workflows.reportDetail>; initialStage?: 1 | 2 | 3 }) {
  const [emergency, setEmergency] = useState(initialEmergency);
  const equipment = useQuery(staffApi.workflows.equipmentDetail, { id: equipmentId });
  const save = useMutation(staffApi.reporting.saveDraft); const directPublish = useMutation(staffApi.reporting.publish); const { connected, account } = useStaffAccess();
  const privateQueue = useReportQueue();
  const [attachmentRevision, setAttachmentRevision] = useState<number | null>(null);
  const [pendingPhotoCount, setPendingPhotoCount] = useState<number | null>(null);
  const publish = async (args: { id: GenericId<"faultReports">; expectedRevision: number }) => requireMatchingReceipt(args.id, await (privateQueue.publish ? privateQueue.publish(args.id, args.expectedRevision, attachmentRevision ?? 0) : directPublish({ ...args, expectedAttachmentRevision: attachmentRevision ?? 0 })));
  const [operationId, setOperationId] = useState(() => initial?.operationId ?? randomUUID()); const [draft, setDraft] = useState<{ id: GenericId<"faultReports">; revision: number } | null>(initial ? { id: initial._id, revision: initial.revision ?? 1 } : null);
  const currentServer = useQuery(staffApi.workflows.reportDetail, draft ? { id: draft.id } : "skip");
  const reviewedServer = currentServer ?? initial;
  const [publishing, setPublishing] = useState(false);
  const submittedElsewhere = !publishing && !!reviewedServer && reviewedServer.submissionState !== "draft";
  const [stage, setStage] = useState<1 | 2 | 3>(initialStage); const [category, setCategory] = useState(initial?.category ?? ""); const [symptoms, setSymptoms] = useState(initial?.symptoms ?? ""); const [description, setDescription] = useState(initial?.description ?? ""); const [priority, setPriority] = useState<"Urgent" | "High" | "Routine">(initial?.priority ?? (emergency ? "Urgent" : "High")); const [condition, setCondition] = useState(initial?.condition ?? ""); const [inUse, setInUse] = useState(initial ? initial.inUse ? "Yes" : "No" : ""); const [noticedAt, setNoticed] = useState(() => new Date(initial?.noticedAt ?? Date.now()).toISOString()); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [submitted, setSubmitted] = useState(false);
  const { recovery: requestedOperation } = useLocalSearchParams<{ recovery?: string }>();
  const recoveryFields: RecoveryFields = { category, symptoms, description, priority, condition, inUse: inUse as RecoveryFields["inUse"], noticedAt, emergency };
  const device = useDeviceDraft({ equipmentId, departmentId: equipment?.departmentId, operationId, fields: recoveryFields, server: draft ? { id: draft.id, revision: draft.revision } : undefined, requestedOperation: requestedOperation ?? initial?.operationId, enabled: !submitted });
  const fingerprint = JSON.stringify({ category, symptoms, description, priority, condition, inUse, noticedAt });
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(initial ? fingerprint : null);
  const [cleanupError, setCleanupError] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const cleanup = async () => {
    setCleaning(true); setCleanupError("");
    try { await device.finish(); }
    catch (failure) { setCleanupError(authErrorMessage(failure)); }
    finally { setCleaning(false); }
  };
  const loadServerDetails = () => {
    if (!reviewedServer || submittedElsewhere) return;
    const next = reportFieldsFromServer(reviewedServer);
    setCategory(next.category); setSymptoms(next.symptoms); setDescription(next.description);
    setPriority(next.priority); setCondition(next.condition); setInUse(next.inUse); setNoticed(next.noticedAt); setEmergency(next.emergency);
    setDraft({ id: reviewedServer._id, revision: reviewedServer.revision ?? 1 });
    setSavedFingerprint(null); setStage(1);
    setMessage("Server details loaded into the form. Review and save before continuing. Pending device photos are retained.");
  };
  const saveDraft = async (next: 1 | 2) => {
    setBusy(true); setMessage("");
    try {
      if (submittedElsewhere) throw Error("This report has already been submitted. Review its recorded content before deciding what to do with local edits.");
      if (reviewedServer && draft && draft.revision !== (reviewedServer.revision ?? 1)) throw Error("Review the server revision conflict before saving these details.");
      await device.save();
      if (!connected || !inUse) throw Error("Reconnect and confirm whether equipment is in use.");
      const result = await save({ equipmentId, operationId, category, symptoms, description, priority, condition, inUse: inUse === "Yes", noticedAt: Date.parse(noticedAt), emergency, expectedRevision: draft?.revision });
      setDraft(result); setSavedFingerprint(fingerprint);
      await device.save(result);
      setStage(next); setMessage("Draft saved to your account. It has not been submitted for maintenance.");
    } catch (error) { setMessage(authErrorMessage(error)); } finally { setBusy(false); }
  };
  if (submitted && draft) return <ReportReceipt id={draft.id} emergency={emergency} cleanup={{ error: cleanupError, busy: cleaning, retry: cleanup }} />;
  return <Screen>
    <ReportSteps current={stage} onChange={(next) => { if (busy) return; if (stage === 2 && next !== 2 && pendingPhotoCount !== 0) { setMessage("Upload or remove pending photos before leaving this step."); return; } if (next === 1) setStage(1); else if (next === 3 && pendingPhotoCount !== 0) setMessage("Review photos and upload or remove every pending photo before continuing."); else if (draft && savedFingerprint === fingerprint) setStage(next); else setMessage('Save your latest details before continuing.'); }} />
    <View style={{ gap: 5 }}><Txt size={27} weight="800">{emergency ? 'Emergency Fault Report' : stage === 1 ? 'Report a Fault' : stage === 2 ? 'Equipment Photos' : 'Review Fault Report'}</Txt><Txt size={16} muted>{stage === 1 ? 'Provide accurate details about the issue.' : stage === 2 ? 'Add clear photos of the equipment and fault.' : 'Check the details below before submitting.'}</Txt></View>
    {equipment && <Card style={{ gap: 7 }}><Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><Txt size={19} weight="700">{equipment.assetId}</Txt><InventoryIdentityBadge verified={equipment.identityVerified} /></Row><Txt size={16}>{equipment.name}</Txt><Txt muted>{equipment.location}</Txt></Card>}
    {emergency && <Notice tone="danger">Urgent reporting does not replace your approved emergency response process. External alert delivery is not configured.</Notice>}
    {!!message && <Notice>{message}</Notice>}
    {!!device.error && <Notice tone="warning">Device save failed: {device.error}. Do not assume this work will survive a restart.</Notice>}
    {device.available && !device.candidate && <Txt size={11} muted>{device.savedAt ? "Encrypted device draft saved. Not submitted to the server." : "Device draft save pending."}</Txt>}
    {device.candidate && <Card style={{ gap: 12 }}><Txt size={19} weight="700">Saved device draft found</Txt><Txt muted>Last saved {new Date(device.candidate.updatedAt).toLocaleString()}. Compare it with the current form before restoring.</Txt><Detail label="Device revision" value={device.candidate.server?.revision ?? "Not saved to server"} /><Detail label="Current server revision" value={reviewedServer?.revision ?? "New report"} /><Detail label="Pending device photos" value={device.candidate.photos.length} /><ReportFieldComparison left={device.candidate.fields} right={recoveryFields} leftLabel="Saved device copy" rightLabel="Current form" />
      <Button label="Restore device draft" onPress={() => { const saved = device.candidate!; setOperationId(saved.operationId); setCategory(saved.fields.category); setSymptoms(saved.fields.symptoms); setDescription(saved.fields.description); setPriority(saved.fields.priority); setCondition(saved.fields.condition); setInUse(saved.fields.inUse); setNoticed(saved.fields.noticedAt); setDraft(saved.server ? { id: saved.server.id as GenericId<"faultReports">, revision: saved.server.revision } : null); setSavedFingerprint(null); setStage(1); device.clearCandidate(); }} />
      <ConfirmAction label="Keep current form instead" title="Replace the device draft details?" detail="The current form will replace this device copy. Existing recovered photos are retained for review; no server record is overwritten by this choice." onConfirm={async () => {
        if (!reportRecovery || !account || !equipment || !device.candidate) return;
        const retainedOperation = device.candidate.operationId;
        const retainedServer = draft ?? device.candidate.server;
        await reportRecovery.saveDraft({ owner: account.id, equipmentId, departmentId: equipment.departmentId, operationId: retainedOperation, fields: recoveryFields, server: retainedServer ? { id: retainedServer.id, revision: retainedServer.revision } : undefined, updatedAt: Date.now() });
        setOperationId(retainedOperation); device.clearCandidate();
        if (retainedServer && !initial) go("resume-report", retainedServer.id);
      }} />
    </Card>}
    {draft && reviewedServer && (submittedElsewhere || draft.revision !== (reviewedServer.revision ?? 1)) && <Card style={{ gap: 10 }}><Notice tone="warning">The server revision differs from this device draft. Saving is blocked until you review the server fields and choose how to resolve the conflict.</Notice><ReportFieldComparison left={recoveryFields} right={reportFieldsFromServer(reviewedServer)} leftLabel="Local details" rightLabel="Current server" />{submittedElsewhere ? <><Notice tone="warning">This report is already submitted. Local edits may not be part of its receipt. Review the recorded report; saving over it is blocked.</Notice><Button label="View submitted report" onPress={() => go("report-detail", draft.id)} /></> : <><ConfirmAction key={`${reviewedServer._id}:${reviewedServer.revision ?? 1}`} label="Apply reviewed local details to current revision" title="Use these reviewed local details?" detail="The next save uses this reviewed server revision. Later changes are still rejected; this does not publish the report." disabled={busy || !!device.candidate} onConfirm={async () => { setDraft({ id: reviewedServer._id, revision: reviewedServer.revision ?? 1 }); setSavedFingerprint(null); }} /><ConfirmAction key={`server-${reviewedServer._id}:${reviewedServer.revision ?? 1}`} label="Use server report details" title="Replace the local form fields?" detail="The displayed server details replace this form and its next device copy. Pending device photos remain for separate review. No server report is changed by this choice." disabled={busy || !!device.candidate} onConfirm={async () => loadServerDetails()} /></>}</Card>}
    {stage === 1 && <>
      <Select disabled={busy || submittedElsewhere} label="Fault category" values={["Electrical/Power", "Mechanical/Physical", "Performance/Function", "Controls/Display", "Accessories/Connections", "Alarm/Safety Concern", "Other/Unknown"]} value={category} onChange={setCategory} />
      <Field editable={!busy && !submittedElsewhere} label="Specific symptoms" value={symptoms} onChangeText={setSymptoms} maxLength={300} /><Field editable={!busy && !submittedElsewhere} label="Full description" value={description} onChangeText={setDescription} maxLength={2000} multiline />
      <Select disabled={busy || submittedElsewhere} label="Reporter-suggested priority" values={emergency ? ["Urgent"] : ["Urgent", "High", "Routine"]} value={priority} onChange={setPriority} />
      <Select disabled={busy || submittedElsewhere} label="Reported condition" values={["Not functioning (reported)", "Functioning with concern", "Unknown"]} value={condition} onChange={setCondition} /><Choices disabled={busy || submittedElsewhere} label="Equipment in use?" values={["Yes", "No"]} value={inUse} onChange={setInUse} /><DateTimeField disabled={busy || submittedElsewhere} label="Time noticed" value={noticedAt} onChange={setNoticed} />
      <Row><View style={{ flex: 1 }}><Button label="Save draft" variant="secondary" loading={busy} disabled={!connected || !equipment || !!device.candidate || (!!reviewedServer && !!draft && (submittedElsewhere || draft.revision !== (reviewedServer.revision ?? 1)))} onPress={() => void saveDraft(1)} /></View><View style={{ flex: 1 }}><Button label="Continue to photos" icon="arrow-forward" loading={busy} disabled={!connected || !equipment || !!device.candidate || (!!reviewedServer && !!draft && (submittedElsewhere || draft.revision !== (reviewedServer.revision ?? 1)))} onPress={() => void saveDraft(2)} /></View></Row>
    </>}
    {stage === 2 && draft && <><ReportPhotos reportId={draft.id} editable={!submittedElsewhere} recoveryOperationId={operationId} onSnapshot={setAttachmentRevision} onPendingChange={setPendingPhotoCount} /><Button label="Review fault" disabled={savedFingerprint !== fingerprint || pendingPhotoCount !== 0} onPress={() => setStage(3)} /><Button label="Edit fault details" variant="secondary" disabled={pendingPhotoCount !== 0} onPress={() => setStage(1)} /></>}
    {stage === 3 && draft && <>{!!privateQueue.publish && <QueueAvailability available={privateQueue.available} loading={privateQueue.loading} error={privateQueue.error} reload={privateQueue.reload} />}<Card style={{ gap: 9 }}><Detail label="Category" value={category} /><Detail label="Symptoms" value={symptoms} /><Detail label="Description" value={description || "Not supplied"} /><Detail label="Priority suggested" value={priority} /><Detail label="Condition" value={condition} /><Detail label="In use" value={inUse} /><Detail label="Time noticed" value={new Date(noticedAt).toLocaleString()} /></Card><ReportPhotos reportId={draft.id} recoveryOperationId={operationId} onSnapshot={setAttachmentRevision} onPendingChange={setPendingPhotoCount} /><Button label="Edit fault details" variant="secondary" onPress={() => setStage(1)} /><Button label="Edit photos" variant="secondary" onPress={() => setStage(2)} /><ConfirmAction key={`${draft.id}:${draft.revision}:${attachmentRevision ?? "pending"}:${reviewedServer?.revision ?? "loading"}`} label="Submit fault report" title="Submit this report?" detail="The server will verify your account and current draft revision. Saved drafts are not submissions." disabled={!connected || (!!privateQueue.publish && !privateQueue.available) || submittedElsewhere || savedFingerprint !== fingerprint || attachmentRevision === null || pendingPhotoCount !== 0} onConfirm={async () => { if (submittedElsewhere) throw Error("This report is already submitted. Review its recorded content before using the receipt."); if (pendingPhotoCount !== 0) throw Error("Upload or remove pending photos before submitting."); setPublishing(true); try { await publish({ id: draft.id, expectedRevision: draft.revision }); setSubmitted(true); await cleanup(); } finally { setPublishing(false); } }} /></>}
  </Screen>;
}
