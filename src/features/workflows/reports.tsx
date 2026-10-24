import { useState } from "react";

import {
  Button,
  Card,
  Choices,
  Detail,
  Field,
  LinkRow,
  Notice,
  Screen,
  Txt,
} from "@/components/smart/ui";

import { allowed } from "@/domain/policy";
import {
  triage,
  visibleReports,
  createMaintenance,
} from "@/services/development";

import { useApp } from "@/state/app-state";
import { go } from "@/navigation/go";
import { DateTimeField } from "@/components/smart/date-time-field";

export function ReportWorkflow({
  screen,
  id,
}: {
  screen: string;
  id?: string;
}) {
  const app = useApp();
  const [priority, setPriority] = useState<"Urgent" | "High" | "Routine">(
    "High",
  );
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");
  const [department, setDepartment] = useState("All");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [dueAt, setDueAt] = useState("");
  if (!app.account) return null;
  const reports = visibleReports(app.state, app.account);
  const report = reports.find((r) => r.id === (id ?? "DEMO-REP-014"));
  if (screen === "filters") {
    const filtered = reports.filter(
      (r) =>
        (status === "All" || r.sync === status) &&
        (type === "All" || r.priority === type) &&
        (department === "All" || r.department === department) &&
        `${r.id} ${r.symptoms}`.toLowerCase().includes(query.toLowerCase()),
    );
    return (
      <Screen title="Report Filters">
        <Choices
          label="Status"
          values={[
            "All",
            "Pending synchronization",
            "Simulated acknowledgment",
            "Failed",
            "Rejected",
          ]}
          value={status}
          onChange={setStatus}
        />
        <Choices
          label="Suggested priority"
          values={["All", "Urgent", "High", "Routine"]}
          value={type}
          onChange={setType}
        />
        <Choices
          label="Department"
          values={["All", ...app.account.scope]}
          value={department}
          onChange={setDepartment}
        />
        <Field label="Search" value={query} onChangeText={setQuery} />
        <Button
          label="Reset Filters"
          variant="secondary"
          onPress={() => {
            setStatus("All");
            setType("All");
            setDepartment("All");
            setQuery("");
          }}
        />
        <Txt weight="700">{filtered.length} matching reports</Txt>
        {filtered.map((r) => (
          <LinkRow
            key={r.id}
            title={r.id}
            detail={r.symptoms}
            onPress={() => go("report-detail", r.id)}
          />
        ))}
      </Screen>
    );
  }
  if (!report)
    return (
      <Screen title="Report unavailable">
        <Notice>This record is not in the current account scope.</Notice>
      </Screen>
    );
  return (
    <Screen
      title={
        screen === "triage" ? "Authorised Priority Triage" : "Report Timeline"
      }
      subtitle="Track the progress and current status of this report."
    >
      {!!message && <Notice tone="warning">{message}</Notice>}
      <Card style={{ gap: 10 }}>
        <Txt size={18} weight="700">
          {report.id}
        </Txt>
        <Detail label="Equipment" value={report.equipmentId} />
        {!!report.linkedEquipmentId && (
          <Detail
            label="Reconciled equipment"
            value={report.linkedEquipmentId}
          />
        )}
        <Detail label="Department" value={report.department} />
        <Detail label="Fault category" value={report.category} />
        <Detail label="Specific symptoms" value={report.symptoms} />
        <Detail label="Description" value={report.description} />
        <Detail label="Reporter suggestion" value={report.priority} />
        <Detail
          label="Authorized triage"
          value={report.triagedPriority ?? "Not yet triaged"}
        />
        <Detail label="Triage reason" value={report.triageReason ?? "None"} />
        <Detail label="Status" value={report.sync} />
      </Card>
      {(report.unverified || report.equipmentProvisional) && (
        <Notice tone="danger">
          Unverified identity / provisional equipment. Not confirmed hospital
          information.
        </Notice>
      )}
      {screen === "triage" ? (
        <>
          <Choices
            label="Authorized triage priority *"
            values={["Urgent", "High", "Routine"]}
            value={priority}
            onChange={setPriority}
          />
          <Field
            label="Rationale *"
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Button
            label="Save Triage"
            disabled={!allowed(app.account, "triage")}
            onPress={() => {
              try {
                app.setState(
                  triage(app.state, app.account!, report.id, priority, reason),
                );
                setMessage(
                  "Synthetic triage recorded. Reporter suggestion remains unchanged.",
                );
              } catch (e) {
                setMessage(e instanceof Error ? e.message : String(e));
              }
            }}
          />
        </>
      ) : (
        <>
          <Card style={{ gap: 10 }}>
            <Detail label="Saved in memory" value={report.createdAt} />
            <Detail
              label="Server receipt"
              value={
                report.sync === "Simulated acknowledgment"
                  ? "SIMULATED only"
                  : "Not confirmed"
              }
            />
            <Detail
              label="Assigned maintenance"
              value={
                app.state.tasks
                  .filter((t) => t.reportId === report.id)
                  .map((t) => t.id)
                  .join(", ") || "Not assigned"
              }
            />
            <Detail label="Release" value="Not available" />
          </Card>
          {allowed(app.account, "triage") && (
            <Button
              label="Review Priority Triage"
              onPress={() => go("triage", report.id)}
            />
          )}
          <Button
            label="View Sync Status"
            variant="secondary"
            onPress={() => go("sync")}
          />
          {allowed(app.account, "assign") && (
            <>
              <DateTimeField
                label="New task due date *"
                value={dueAt}
                onChange={setDueAt}
                required
              />
              <Button
                label="Create Demo Maintenance Task"
                variant="secondary"
                onPress={() => {
                  try {
                    const next = createMaintenance(
                      app.state,
                      app.account!,
                      report.id,
                      dueAt,
                    );
                    app.setState(next);
                    const task = next.tasks.find(
                      (t) => t.reportId === report.id,
                    );
                    if (task) go("assignment", task.id);
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : String(e));
                  }
                }}
              />
            </>
          )}
          {report.equipmentProvisional && allowed(app.account, "reconcile") && (
            <Button
              label="Reconcile Equipment Identity"
              variant="secondary"
              onPress={() => go("reconcile", report.id)}
            />
          )}
        </>
      )}
    </Screen>
  );
}
