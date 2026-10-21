import { Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Card,
  Icon,
  LinkRow,
  Row,
  Screen,
  Section,
  Txt,
  type IconName,
} from "@/components/smart/ui";
import { allowed } from "@/domain/policy";
import { useApp } from "@/state/app-state";
import { visibleReports } from "@/services/development";
import { go } from "@/navigation/go";
export function Dashboard() {
  const { account, state, online } = useApp();
  if (!account) return null;
  const clinician = account.role === "Clinician";
  const technician = account.role === "Biomedical Technician";
  const reports = visibleReports(state, account);
  const actions: {
    title: string;
    detail: string;
    icon: IconName;
    onPress: () => void;
  }[] = clinician
    ? [
        {
          title: "Scan\nEquipment QR",
          detail: "Identify equipment instantly",
          icon: "qr-code-outline",
          onPress: () => go("scan"),
        },
        {
          title: "Report a Fault",
          detail: "Report an issue with equipment",
          icon: "warning-outline",
          onPress: () => go("manual"),
        },
        {
          title: "My Reports",
          detail: "View the status of your reports",
          icon: "document-text-outline",
          onPress: () => router.push("/workspace/reports"),
        },
        {
          title: "View Equipment",
          detail: "Search and view equipment details",
          icon: "cube-outline",
          onPress: () => router.push("/workspace/equipment"),
        },
      ]
    : technician
      ? [
          {
            title: "My Tasks",
            detail: `${state.tasks.filter((t) => t.assigneeId === account.id && t.state !== "Completed").length} assigned`,
            icon: "clipboard-outline",
            onPress: () => router.push("/workspace/tasks"),
          },
          {
            title: "Overdue",
            detail: "Review due maintenance",
            icon: "alert-circle-outline",
            onPress: () => router.push("/workspace/tasks"),
          },
          {
            title: "Equipment",
            detail: "View equipment records",
            icon: "desktop-outline",
            onPress: () => router.push("/workspace/equipment"),
          },
          {
            title: "Scan QR",
            detail: "Identify equipment",
            icon: "qr-code-outline",
            onPress: () => go("scan"),
          },
        ]
      : [
          ...(allowed(account, "accounts")
            ? [
                {
                  title: "Signup Approvals",
                  detail: `${state.applications.filter((a) => a.state === "Pending").length} pending applications`,
                  icon: "people-outline" as IconName,
                  onPress: () => router.push("/workspace/accounts"),
                },
              ]
            : []),
          ...(allowed(account, "assign")
            ? [
                {
                  title: "Open Tasks",
                  detail: "Assign and review maintenance",
                  icon: "clipboard-outline" as IconName,
                  onPress: () => router.push("/workspace/tasks"),
                },
              ]
            : []),
          ...(allowed(account, "roles")
            ? [
                {
                  title: "Roles",
                  detail: "Manage synthetic assignments",
                  icon: "shield-checkmark-outline" as IconName,
                  onPress: () => go("role", "APP-001"),
                },
              ]
            : []),
          ...(allowed(account, "analytics")
            ? [
                {
                  title: "Equipment Overview",
                  detail: "Demonstration data quality",
                  icon: "bar-chart-outline" as IconName,
                  onPress: () => go("analytics"),
                },
              ]
            : []),
          ...(allowed(account, "audit")
            ? [
                {
                  title: "Audit History",
                  detail: "Review synthetic activity",
                  icon: "document-text-outline" as IconName,
                  onPress: () => go("audit"),
                },
              ]
            : []),
          ...(allowed(account, "hold")
            ? [
                {
                  title: "Safety Holds",
                  detail: "Review equipment restrictions",
                  icon: "shield-outline" as IconName,
                  onPress: () => go("holds"),
                },
              ]
            : []),
          ...(allowed(account, "export")
            ? [
                {
                  title: "Exports",
                  detail: "Scoped demonstration reports",
                  icon: "download-outline" as IconName,
                  onPress: () => go("export"),
                },
              ]
            : []),
        ];
  return (
    <Screen back={false}>
      <View style={{ paddingVertical: 12, gap: 4 }}>
        <Txt size={15} muted>
          Hello,
        </Txt>
        <Txt size={28} weight="800">
          {account.name}
        </Txt>
        <Txt muted>
          {clinician
            ? "Keep equipment safe and available\nfor reliable care."
            : technician
              ? "Biomedical maintenance and verification."
              : "Manage authorized operations and equipment safety."}
        </Txt>
        {!clinician && <Badge label={account.role} />}
      </View>
      <View className="flex-row flex-wrap" style={{ gap: 10 }}>
        {actions.map((action) => (
          <Pressable
            accessibilityRole="button"
            key={action.title}
            onPress={action.onPress}
            style={{ width: "48%", flexGrow: 1 }}
          >
            <Card
              style={{
                minHeight: clinician ? 150 : 124,
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Icon name={action.icon} size={clinician ? 36 : 27} />
              <Row>
                <View style={{ flex: 1, gap: 5 }}>
                  <Txt size={16} weight="700">
                    {action.title}
                  </Txt>
                  <Txt size={12} muted>
                    {action.detail}
                  </Txt>
                </View>
                <Icon name="chevron-forward" size={20} />
              </Row>
            </Card>
          </Pressable>
        ))}
      </View>
      <Section title={technician ? "Today's Tasks" : "Recent Activity"}>
        {reports.slice(0, 2).map((report) => (
          <LinkRow
            key={report.id}
            title={report.id}
            detail={`${report.symptoms}\n${report.equipmentId}`}
            icon={
              report.sync === "Simulated acknowledgment"
                ? "construct-outline"
                : "alert-circle-outline"
            }
            tail={
              <Badge
                label={
                  report.sync === "Simulated acknowledgment"
                    ? "Simulated activity"
                    : "Pending upload"
                }
                tone="warning"
              />
            }
            onPress={() => go("report-detail", report.id)}
          />
        ))}
        {!reports.length && (
          <Txt muted>No synthetic activity for this account yet.</Txt>
        )}
      </Section>
      {allowed(account, "clinical") && (
        <LinkRow
          title="Clinical Verification"
          icon="shield-checkmark-outline"
          detail="Review equipment ready for clinical checks"
          onPress={() => go("clinical-queue")}
        />
      )}
      <LinkRow
        title="More"
        icon="grid-outline"
        detail="Verification, sync, settings and help"
        onPress={() => go("more")}
      />
      <LinkRow
        title={
          online
            ? "Connected · Demonstration mode"
            : "Offline · Changes remain in memory"
        }
        icon={online ? "wifi-outline" : "cloud-offline-outline"}
        onPress={() => go("sync")}
      />
    </Screen>
  );
}
