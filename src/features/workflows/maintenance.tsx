import { useState } from "react";
import { View } from "react-native";
import {
  Badge,
  Button,
  Card,
  Choices,
  Detail,
  Field,
  LinkRow,
  Notice,
  Screen,
  Section,
  Txt,
} from "@/components/smart/ui";
import { allowed, canRepair } from "@/domain/policy";
import { updateTask, canSeeTask } from "@/services/development";
import { equipment } from "@/services/fixtures";
import { useApp } from "@/state/app-state";
import { go } from "@/navigation/go";
const titles: Record<string, string> = {
  "task-detail": "Maintenance Task",
  assignment: "Assign Technician",
  "due-date": "Set Due Date",
  cancellation: "Cancel Work Order",
  progress: "Work Progress",
  diagnosis: "Diagnosis and Findings",
  parts: "Repair Notes and Parts",
  completion: "Repair Completion",
  rework: "Follow-up Work Order",
  "maintenance-history": "Maintenance Timeline",
};
export function MaintenanceWorkflow({
  screen,
  id,
}: {
  screen: string;
  id?: string;
}) {
  const app = useApp();
  const task = app.state.tasks.find((t) => t.id === (id ?? "WO-DEMO-014"));
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [diagnosis, setDiagnosis] = useState(task?.diagnosis ?? "");
  const [part, setPart] = useState("");
  const [parts, setParts] = useState(task?.parts ?? []);
  const [due, setDue] = useState(task?.dueAt ?? "");
  const [assignee, setAssignee] = useState(
    task?.assigneeId ?? "biomedical-technician",
  );
  const [confirm, setConfirm] = useState(false);
  if (!task || !app.account || !canSeeTask(app.account, task.equipmentId))
    return (
      <Screen title="Task unavailable">
        <Notice>This task is outside your account scope.</Notice>
      </Screen>
    );
  const item = equipment.find((e) => e.id === task.equipmentId);
  const account = app.account;
  const assign = allowed(account, "assign");
  const repair = canRepair(account, task);
  const mutate = (update: Parameters<typeof updateTask>[3], next?: string) => {
    try {
      const result = updateTask(app.state, account, task.id, update);
      app.setState(result);
      setMessage("Synthetic work order updated in memory.");
      if (next) go(next, task.id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <Screen
      title={titles[screen] ?? "Maintenance"}
      subtitle="Demonstration maintenance work order."
    >
      <Card style={{ gap: 8 }}>
        <Txt size={20} weight="700">
          {task.id}
        </Txt>
        <Detail
          label="Equipment"
          value={`${task.equipmentId} · ${item?.name}`}
        />
        <Detail label="Location" value={item?.location ?? "Unknown"} />
        <Detail label="Assigned to" value={task.assigneeId ?? "Unassigned"} />
        <Detail label="Due" value={new Date(task.dueAt).toLocaleString()} />
        <Badge
          label={task.state}
          tone={task.state === "Completed" ? "success" : "warning"}
        />
      </Card>
      {message && <Notice tone="warning">{message}</Notice>}
      {screen === "task-detail" && (
        <>
          <Card style={{ gap: 10 }}>
            <Detail
              label="Diagnosis"
              value={task.diagnosis || "Not recorded"}
            />
            <Detail label="Repair notes" value={task.notes || "Not recorded"} />
            <Detail
              label="Parts"
              value={task.parts.join(", ") || "None recorded"}
            />
            <Notice tone="danger">
              Equipment is not released. Completion does not establish technical
              or clinical safety.
            </Notice>
          </Card>
          {repair && (
            <>
              <Button
                label="Update Progress"
                onPress={() => go("progress", task.id)}
              />
              <LinkRow
                title="Diagnosis and Findings"
                icon="search-outline"
                onPress={() => go("diagnosis", task.id)}
              />
              <LinkRow
                title="Repair Notes and Parts"
                icon="construct-outline"
                onPress={() => go("parts", task.id)}
              />
              <LinkRow
                title="Complete Repair"
                icon="checkmark-circle-outline"
                onPress={() => go("completion", task.id)}
              />
            </>
          )}
          {assign && (
            <>
              <LinkRow
                title="Assignment / Reassignment"
                icon="person-add-outline"
                onPress={() => go("assignment", task.id)}
              />
              <LinkRow
                title="Adjust Due Date"
                icon="calendar-outline"
                onPress={() => go("due-date", task.id)}
              />
              <LinkRow
                title="Cancel Work Order"
                icon="close-circle-outline"
                onPress={() => go("cancellation", task.id)}
              />
            </>
          )}
          <LinkRow
            title="Maintenance Timeline"
            icon="time-outline"
            onPress={() => go("maintenance-history", task.id)}
          />
          <LinkRow
            title="Technical Verification"
            icon="shield-checkmark-outline"
            onPress={() => go("technical-checklist", task.id)}
          />
          <LinkRow
            title="Clinical Verification"
            icon="medkit-outline"
            onPress={() => go("clinical-checklist", task.id)}
          />
        </>
      )}
      {screen === "assignment" && (
        <>
          <Notice>
            Only authorized supervisors can assign work. Reassignment preserves
            history.
          </Notice>
          <Choices
            label="Select synthetic technician"
            values={["biomedical-technician", "biomedical-technician-verifier"]}
            value={assignee}
            onChange={setAssignee}
          />
          <Button
            label="Assign Task"
            disabled={!assign}
            onPress={() => mutate({ assigneeId: assignee }, "task-detail")}
          />
        </>
      )}
      {screen === "due-date" && (
        <>
          <Field
            label="Due date and time (ISO, UTC)"
            value={due}
            onChangeText={setDue}
            autoCapitalize="none"
          />
          <Txt muted size={12}>
            Example: 2026-10-22T17:00:00.000Z · Displayed in device time.
          </Txt>
          <Button
            label="Save Due Date"
            disabled={!assign}
            onPress={() => mutate({ dueAt: due }, "task-detail")}
          />
        </>
      )}
      {screen === "cancellation" && (
        <>
          <Notice tone="danger">
            Cancellation is irreversible in this demonstration. Completed tasks
            cannot be cancelled. All historical events remain.
          </Notice>
          <Choices
            label="Confirm cancellation"
            values={["Keep task", "Cancel task"]}
            value={confirm ? "Cancel task" : "Keep task"}
            onChange={(v) => setConfirm(v === "Cancel task")}
          />
          <Button
            label="Confirm Cancellation"
            variant="danger"
            disabled={!assign || !confirm}
            onPress={() => mutate({ state: "Cancelled" }, "task-detail")}
          />
        </>
      )}
      {screen === "progress" && (
        <>
          <Section title="Work Progress">
            {["Assigned", "In progress", "Diagnosis", "Repair", "Complete"].map(
              (label) => (
                <Card key={label}>
                  <Txt weight="600">{label}</Txt>
                  <Txt size={12} muted>
                    {label === task.state
                      ? "Current state"
                      : "Progress requires explicit technician action"}
                  </Txt>
                </Card>
              ),
            )}
          </Section>
          <Field
            label="Current note"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <Button
            label={task.state === "Assigned" ? "Start Work" : "Save Progress"}
            disabled={
              !repair ||
              ["Completed", "Cancelled", "Unassigned"].includes(task.state)
            }
            onPress={() =>
              mutate({
                state: task.state === "Assigned" ? "In progress" : undefined,
                notes,
              })
            }
          />
          <Button
            label="Record Diagnosis"
            variant="secondary"
            onPress={() => go("diagnosis", task.id)}
          />
        </>
      )}
      {screen === "diagnosis" && (
        <>
          <Field
            label="Diagnosis *"
            value={diagnosis}
            onChangeText={setDiagnosis}
            multiline
            maxLength={1000}
          />
          <Field
            label="Evidence and findings *"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={2000}
          />
          <Notice>
            Record observed evidence. Unconfirmed causes remain provisional.
          </Notice>
          <Button
            label="Save Findings"
            disabled={!repair}
            onPress={() =>
              diagnosis.trim() && notes.trim()
                ? mutate({ diagnosis, notes }, "parts")
                : setMessage("Record both diagnosis and supporting findings.")
            }
          />
        </>
      )}
      {screen === "parts" && (
        <>
          <Section title="Parts Used">
            {parts.map((p, index) => (
              <LinkRow
                key={`${p}-${index}`}
                title={p}
                detail="Tap to remove from this unsaved edit"
                icon="trash-outline"
                onPress={() => setParts(parts.filter((_, i) => i !== index))}
              />
            ))}
          </Section>
          <Field
            label="Part name and quantity"
            value={part}
            onChangeText={setPart}
          />
          <Button
            label="Add Part"
            variant="secondary"
            icon="add-outline"
            onPress={() => {
              if (part.trim()) {
                setParts([...parts, part.trim()]);
                setPart("");
              } else setMessage("Enter a part name and quantity.");
            }}
          />
          <Field
            label="Repair notes *"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={2000}
          />
          <Button
            label="Save and Continue"
            disabled={!repair}
            onPress={() =>
              notes.trim()
                ? mutate({ parts, notes }, "completion")
                : setMessage("Record repair notes.")
            }
          />
        </>
      )}
      {screen === "completion" && (
        <>
          {task.state === "Completed" ? (
            <Notice tone="success">
              Maintenance repair complete. Historical work is preserved.
            </Notice>
          ) : (
            <>
              <Notice tone="warning">
                Confirm findings and repair notes before marking work complete.
              </Notice>
              <Field
                label="Final repair notes *"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
              <Button
                label="Complete Repair"
                disabled={!repair}
                onPress={() => mutate({ state: "Completed", notes })}
              />
            </>
          )}
          <Notice tone="danger">
            Not released for use. Independent technical verification, clinical
            verification, safety-hold review, and configured release policy are
            required.
          </Notice>
          <LinkRow
            title="Technical Verification Queue"
            icon="shield-checkmark-outline"
            onPress={() => go("technical-queue")}
          />
          <LinkRow
            title="Release Requirements"
            icon="lock-closed-outline"
            onPress={() => go("release", task.equipmentId)}
          />
        </>
      )}
      {screen === "rework" && (
        <>
          {app.state.tasks
            .filter(
              (t) => t.parentId === task.id || (t.id === task.id && t.parentId),
            )
            .map((t) => (
              <LinkRow
                key={t.id}
                title={t.id}
                detail={`Linked to ${t.parentId}\n${t.diagnosis}`}
                icon="construct-outline"
                onPress={() => go("task-detail", t.id)}
              />
            ))}
          <Notice>
            Failed or unable verification creates one linked follow-up task. The
            original completed work order remains unchanged.
          </Notice>
        </>
      )}
      {screen === "maintenance-history" && (
        <>
          <Notice>
            Demonstration activity only. Production audit enforcement is
            unavailable.
          </Notice>
          {app.state.audit
            .filter((a) => a.recordId === task.id)
            .slice()
            .reverse()
            .map((a) => (
              <Card key={a.id}>
                <Txt weight="600">{a.action}</Txt>
                <Txt size={12} muted>
                  {a.at} · {a.actorId}
                </Txt>
              </Card>
            ))}
          {app.state.attempts
            .filter((a) => a.taskId === task.id)
            .map((a) => (
              <Card key={a.id}>
                <Txt weight="600">
                  {a.kind} · {a.outcome}
                </Txt>
                <Txt size={12} muted>
                  {a.at} · {a.actorId}
                </Txt>
                <Txt size={12}>{a.reason}</Txt>
              </Card>
            ))}
          <LinkRow
            title="Linked follow-up work"
            icon="git-branch-outline"
            onPress={() => go("rework", task.id)}
          />
        </>
      )}
    </Screen>
  );
}
