import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Badge, brandAssets, Button, Card, Choices, Detail, Field, Icon, Notice, Row, Screen, Txt } from "@/components/smart/ui";
import { equipment } from "@/services/fixtures";
import { releaseBlockers, allowed } from "@/domain/policy";
import { canSeeTask, visibleReports } from "@/services/development";
import type { Equipment } from "@/domain/models";
import { useApp } from "@/state/app-state";
import { go } from "@/navigation/go";
import { useCurrentTime } from '@/hooks/use-current-time';
import { MaintenanceBadge } from '@/components/smart/status-ui';
export function EquipmentCard({
  item,
  onPress,
}: {
  item: Equipment;
  onPress?: () => void;
}) {
  const { state } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.id}`}
      onPress={onPress ?? (() => go("equipment-detail", item.id))}
    >
      <Card>
        <Row>
          <Image
            source={brandAssets[item.asset]}
            style={{ width: 66, height: 70, borderRadius: 10 }}
          />
          <View style={{ flex: 1, gap: 3 }}>
            <Txt weight="700">{item.id}</Txt>
            <Txt size={13}>{item.name}</Txt>
            <Txt muted size={12}>
              {item.location}
            </Txt>
            <Badge
              label={
                !item.verified
                  ? "Unverified"
                  : releaseBlockers(item, state).length
                    ? "Not available"
                    : "Available"
              }
              tone={!item.verified ? "warning" : "danger"}
            />
          </View>
          <Icon name="chevron-forward" size={18} />
        </Row>
      </Card>
    </Pressable>
  );
}
export function EquipmentList() {
  const app = useApp();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const items = equipment.filter(
    (e) =>
      app.account?.scope.includes(e.department) &&
      (type === "All" || e.name === type) &&
      `${e.id} ${e.name} ${e.model}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <Screen
      title="Equipment Search"
      subtitle="Search for equipment by name, model or ID."
      back={false}
    >
      <Field
        label="Search equipment"
        value={query}
        onChangeText={setQuery}
        placeholder="Search equipment…"
      />
      <Choices
        label="Equipment type"
        values={["All", "Ventilator", "Patient Monitor", "Infusion Pump"]}
        value={type}
        onChange={setType}
      />
      <Txt muted size={12}>
        {items.length} synthetic results
      </Txt>
      {items.map((e) => (
        <EquipmentCard item={e} key={e.id} />
      ))}
      {!items.length && <Notice>No equipment matches this search.</Notice>}
      <Button
        label="Scan Equipment QR"
        icon="qr-code-outline"
        onPress={() => go("scan")}
      />
      <Button
        label="Enter ID manually"
        variant="secondary"
        onPress={() => {
          app.startReport("");
          go("manual");
        }}
      />
    </Screen>
  );
}
export function ReportsList() {
  const { account, state } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  if (!account) return null;
  const reports = visibleReports(state, account).filter(
    (r) =>
      `${r.id} ${r.equipmentId} ${r.symptoms}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All" ||
        (filter === "Pending"
          ? ["Saved locally", "Pending synchronization", "Uploading"].includes(
              r.sync,
            )
          : r.sync === filter)),
  );
  return (
    <Screen
      title="My Reports"
      subtitle="View and track the faults you have reported."
      back={false}
    >
      <Field
        label="Search reports"
        value={query}
        onChangeText={setQuery}
        placeholder="Search by reference, device or issue…"
      />
      <Choices
        label="Status"
        values={["All", "Pending", "Failed", "Rejected"]}
        value={filter}
        onChange={setFilter}
      />
      <Button
        label="Advanced filters"
        icon="options-outline"
        variant="secondary"
        onPress={() => go("filters")}
      />
      {reports.map((r) => (
        <Pressable
          accessibilityRole="button"
          key={r.id}
          onPress={() => go("report-detail", r.id)}
        >
          <Card style={{ gap: 10 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Txt weight="700">{r.id}</Txt>
              <Badge
                label={r.sync}
                tone={
                  r.sync === "Failed" || r.sync === "Rejected"
                    ? "danger"
                    : "warning"
                }
              />
            </Row>
            <Txt size={12} muted>
              {r.equipmentId}
            </Txt>
            <Detail label="Issue" value={r.symptoms} />
            <Detail label="Suggested priority" value={r.priority} />
            <Detail
              label="Reported"
              value={new Date(r.createdAt).toLocaleString()}
            />
            {(r.unverified || r.equipmentProvisional) && (
              <Badge label="UNVERIFIED / PROVISIONAL" tone="danger" />
            )}
          </Card>
        </Pressable>
      ))}
      {!reports.length && <Notice>No matching reports in this account.</Notice>}
    </Screen>
  );
}
export function TasksList() {
  const now = useCurrentTime();
  const { account, state } = useApp();
  const [filter, setFilter] = useState("Active");
  if (!account) return null;
  const items = state.tasks.filter(
    (t) =>
      canSeeTask(account, t.equipmentId) &&
      (account.role !== "Biomedical Technician" ||
        t.assigneeId === account.id) &&
      (filter === "All" ||
        (filter === "Completed"
          ? t.state === "Completed"
          : !["Completed", "Cancelled"].includes(t.state))),
  );
  return (
    <Screen
      title={
        account.role === "Biomedical Technician"
          ? "My Assigned Tasks"
          : "Maintenance Tasks"
      }
      subtitle="Maintenance tasks within your authorized scope."
      back={false}
    >
      <Choices
        label="Task status"
        values={["Active", "Completed", "All"]}
        value={filter}
        onChange={setFilter}
      />
      {items.map((t) => (
        <Pressable
          key={t.id}
          accessibilityRole="button"
          onPress={() => go("task-detail", t.id)}
        >
          <Card style={{ gap: 8 }}>
            <Row>
              <Icon name="construct-outline" />
              <View style={{ flex: 1 }}>
                <Txt weight="700">
                  {equipment.find((e) => e.id === t.equipmentId)?.name}
                </Txt>
                <Txt size={12} muted>
                  {t.id} · {t.equipmentId}
                </Txt>
              </View>
              <Icon name="chevron-forward" size={18} />
            </Row>
            <Detail
              label="Findings"
              value={t.diagnosis || "Not yet recorded"}
            />
            <Detail
              label="Due date"
              value={new Date(t.dueAt).toLocaleString()}
            />
            <MaintenanceBadge task={t} />
            {Date.parse(t.dueAt) < now &&
              !["Completed", "Cancelled"].includes(t.state) && (
                <Badge label="Overdue" tone="danger" />
              )}
          </Card>
        </Pressable>
      ))}
      {!items.length && <Notice>No tasks match this view.</Notice>}
      {allowed(account,'technical') && <Button
        label="Technical Verification Queue"
        variant="secondary"
        onPress={() => go("technical-queue")}
      />}
      {allowed(account,'clinical') && <Button
        label="Clinical Verification Queue"
        variant="secondary"
        onPress={() => go("clinical-queue")}
      />}
    </Screen>
  );
}
