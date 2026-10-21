import { useEffect, useRef, useState } from "react";
import { Platform, Share } from "react-native";

import { Button, Card, Choices, Detail, Field, LinkRow, Notice, Screen, Txt } from "@/components/smart/ui";
import type { Capability, Role, Priority } from "@/domain/models";
import { roles } from "@/domain/models";
import { allowed, requireCapability } from "@/domain/policy";
import { demoExport, visibleReports, reconcileReport } from "@/services/development";
import { equipment } from "@/services/fixtures";
import { useApp } from "@/state/app-state";
import { go } from "@/navigation/go";
import { DateTimeField } from '@/components/smart/date-time-field';

export const adminCapabilities: Record<string, Capability> = {
  role: "roles",
  suspend: "suspend",
  reconcile: "reconcile",
  audit: "audit",
  analytics: "analytics",
  export: "export",
  accounts: "accounts",
};
export function AdminWorkflow({ screen, id }: { screen: string; id?: string }) {
  const app = useApp();
  const { setState } = app;
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<Role>("Clinician");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [selected, setSelected] = useState("");
  const [csv, setCsv] = useState("");
  const [filter, setFilter] = useState("All");
  const [reportId, setReportId] = useState(id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const visited = useRef(false);
  const account = app.account;
  const permitted = allowed(account, adminCapabilities[screen]);
  useEffect(() => {
    if (screen !== "audit" || !permitted || visited.current || !account) return;
    visited.current = true;
    setState((s) => ({
      ...s,
      audit: [
        ...s.audit,
        {
          id: `A-${s.audit.length + 1}`,
          actorId: account.id,
          at: new Date().toISOString(),
          action: "Synthetic audit access",
          recordId: "audit",
        },
      ],
    }));
  }, [screen, permitted, account, setState]);
  if (!permitted || !account)
    return (
      <Screen title="Restricted access">
        <Notice>
          Explicit {adminCapabilities[screen]} permission is required.
        </Notice>
      </Screen>
    );
  const application = app.state.applications.find(
    (a) => a.id === (id ?? "APP-001"),
  );
  const record = (action: string, recordId: string) => {
    requireCapability(account, adminCapabilities[screen]);
    app.setState((s) => ({
      ...s,
      audit: [
        ...s.audit,
        {
          id: `A-${s.audit.length + 1}`,
          actorId: account.id,
          at: new Date().toISOString(),
          action,
          recordId,
        },
      ],
    }));
  };
  const titles: Record<string, string> = {
    role: "Role Assignment",
    suspend: "Account Suspension",
    reconcile: "Equipment Identity Reconciliation",
    audit: "Audit History",
    analytics: "Analytics and Data Quality",
    export: "Export Reports",
  };
  return (
    <Screen
      title={titles[screen]}
      subtitle="Restricted, synthetic development operations."
    >
      {message && <Notice tone="warning">{message}</Notice>}
      {screen === "role" && (
        <>
          <Card style={{ gap: 10 }}>
            <Detail
              label="Account"
              value={application?.name ?? "No application selected"}
            />
            <Detail
              label="Status"
              value={application?.state ?? "Unavailable"}
            />
          </Card>
          <Choices
            label="Requested role"
            values={roles}
            value={role}
            onChange={setRole}
          />
          <Notice>
            Only another synthetic applicant can be edited here. This does not
            grant the current session any capabilities.
          </Notice>
          <Button
            label="Save Demo Role"
            disabled={!application}
            onPress={() => {
              record(`Synthetic role request: ${role}`, application!.id);
              app.setState((s) => ({
                ...s,
                applications: s.applications.map((a) =>
                  a.id === application!.id ? { ...a, requestedRole: role } : a,
                ),
              }));
              setMessage(
                "Synthetic application role updated. Live permissions require server authorization.",
              );
            }}
          />
          {allowed(account, "suspend") && (
            <Button
              label="Account suspension"
              variant="secondary"
              onPress={() => go("suspend", application?.id)}
            />
          )}
        </>
      )}
      {screen === "suspend" && (
        <>
          <Card>
            <Txt weight="700">{application?.name ?? "No account selected"}</Txt>
          </Card>
          <Field
            label="Reason for suspension *"
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Choices
            label="Confirmation"
            values={["Keep account", "Suspend synthetic account"]}
            value={confirm ? "Suspend synthetic account" : "Keep account"}
            onChange={(v) => setConfirm(v === "Suspend synthetic account")}
          />
          <Notice tone="danger">
            Suspension must preserve history and flag active tasks for
            supervisor review. No automatic unassignment occurs.
          </Notice>
          <Button
            label="Suspend Demo Account"
            variant="danger"
            disabled={!confirm || !reason.trim() || !application}
            onPress={() => {
              record(`Synthetic suspension: ${reason}`, application!.id);
              app.setState((s) => ({
                ...s,
                applications: s.applications.map((a) =>
                  a.id === application!.id ? { ...a, state: "Suspended" } : a,
                ),
              }));
              setMessage(
                "Synthetic account marked suspended. No real identity or task assignment was changed.",
              );
            }}
          />
        </>
      )}
      {screen === "reconcile" && (
        <>
          <Notice tone="warning">
            Provisional identities require authorized review. The original
            scanned value must be retained.
          </Notice>
          <Detail
            label="Original identifier"
            value={
              visibleReports(app.state, account).find((r) => r.id === reportId)
                ?.equipmentId ?? "Select a provisional report"
            }
          />
          <Choices
            label="Provisional report"
            values={visibleReports(app.state, account)
              .filter((r) => r.equipmentProvisional)
              .map((r) => r.id)}
            value={reportId}
            onChange={setReportId}
          />
          <Choices
            label="Select verified matching equipment"
            values={equipment
              .filter((e) => e.verified && account.scope.includes(e.department))
              .map((e) => e.id)}
            value={selected}
            onChange={setSelected}
          />
          <Button
            label="Link Demo Equipment Identity"
            disabled={!selected || !reportId || !reason.trim()}
            onPress={() => {
              try {
                app.setState(
                  reconcileReport(
                    app.state,
                    account,
                    reportId,
                    selected,
                    reason,
                  ),
                );
                setMessage(
                  "Synthetic identity link recorded. Original scanned ID and reporter verification state are preserved. No live equipment record was changed.",
                );
              } catch (e) {
                setMessage(e instanceof Error ? e.message : String(e));
              }
            }}
          />
          <Field
            label="Identity review reason *"
            value={reason}
            onChangeText={setReason}
            multiline
          />
        </>
      )}
      {screen === "audit" && (
        <>
          <Notice>
            Illustrative audit history, not compliance certification. Audit
            access is recorded only in memory.
          </Notice>
          <Choices
            label="Activity type"
            values={[
              "All",
              "maintenance",
              "verification",
              "application",
              "audit",
            ]}
            value={filter}
            onChange={setFilter}
          />
          {app.state.audit
            .filter(
              (a) =>
                filter === "All" || a.action.toLowerCase().includes(filter),
            )
            .slice()
            .reverse()
            .map((a) => (
              <Card key={a.id} style={{ gap: 5 }}>
                <Txt weight="600">{a.action}</Txt>
                <Txt size={12} muted>
                  {a.at}
                </Txt>
                <Detail label="Actor" value={a.actorId} />
                <Detail label="Record" value={a.recordId} />
              </Card>
            ))}
        </>
      )}
      {screen === "analytics" && (
        <>
          <Notice>
            DEMONSTRATION DATA. No real hospital metrics are available. Pending
            and provisional reports are excluded from acknowledged sample
            counts.
          </Notice>
          <Card style={{ gap: 12 }}>
            <Detail
              label="Synthetic equipment"
              value={
                equipment.filter((e) => account.scope.includes(e.department))
                  .length
              }
            />
            <Detail
              label="Acknowledged sample reports"
              value={
                visibleReports(app.state, account).filter(
                  (r) =>
                    !r.unverified &&
                    !r.equipmentProvisional &&
                    r.sync === "Simulated acknowledgment",
                ).length
              }
            />
            <Detail
              label="Pending sample reports"
              value={
                visibleReports(app.state, account).filter(
                  (r) => r.sync !== "Simulated acknowledgment",
                ).length
              }
            />
            <Detail
              label="Active synthetic holds"
              value={app.state.holds.filter((h) => h.active).length}
            />
            <Detail label="Real confirmed metrics" value="Unavailable" />
          </Card>
          <LinkRow
            title="Review data quality"
            detail="Unverified equipment identities"
            icon="search-outline"
            onPress={() => go("reconcile")}
          />
        </>
      )}
      {screen === "export" && (
        <>
          <Notice>
            Exports include scoped, nonprovisional, simulated-acknowledged
            records only. Spreadsheet formulas are neutralized. No confirmed
            hospital data exists.
          </Notice>
          <Card style={{ gap: 12 }}>
            <Detail label="Report type" value="Reports Summary" />
            <Detail label="Format" value="CSV (synthetic)" />
            <Choices
              label="Suggested priority"
              values={["All", "Urgent", "High", "Routine"]}
              value={filter}
              onChange={setFilter}
            />
            <DateTimeField
              label="From (optional)"
              value={from}
              onChange={setFrom}
            />
            <DateTimeField
              label="To (optional)"
              value={to}
              onChange={setTo}
            />
          </Card>
          <Button
            label="Generate Demo CSV"
            icon="download-outline"
            onPress={() => {
              try {
                const output = demoExport(app.state, account, {
                  from,
                  to,
                  priority: filter === "All" ? undefined : (filter as Priority),
                });
                setCsv(output);
                record("Synthetic CSV export generated", "export");
                if (Platform.OS === "web") {
                  const url = URL.createObjectURL(
                    new Blob([output], { type: "text/csv;charset=utf-8" }),
                  );
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = "smartmaint-synthetic-reports.csv";
                  anchor.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } else
                  void Share.share({
                    message: output,
                    title: "SmartMaint synthetic records",
                  }).catch(() =>
                    setMessage(
                      "Sharing is unavailable. The CSV remains visible below.",
                    ),
                  );
              } catch (e) {
                setMessage(e instanceof Error ? e.message : String(e));
              }
            }}
          />
          {csv && (
            <Field
              label="Generated synthetic CSV"
              value={csv}
              multiline
              editable={false}
            />
          )}
        </>
      )}
    </Screen>
  );
}
