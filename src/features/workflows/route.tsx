import { Redirect, useLocalSearchParams, router } from "expo-router";
import { Button, Notice, Screen } from "@/components/smart/ui";
import { useApp } from "@/state/app-state";
import { allowed } from "@/domain/policy";
import {
  CaptureScreen,
  FaultDetails,
  Identification,
  ReviewReport,
  SubmissionResult,
} from "./reporting";
import { EquipmentWorkflow } from "./equipment";
import { MaintenanceWorkflow } from "./maintenance";
import { VerificationWorkflow } from "./verification";
import {
  AdminWorkflow,
  adminCapabilities,
  MoreScreen,
  ReportWorkflow,
  SettingsWorkflow,
  SyncWorkflow,
} from "./support";
import { EmergencyWorkflow } from "./emergency";
import { LiveFlow } from "@/features/staff/workspace";
const publicScreens = [
  "help",
  "emergency",
  "emergency-verify",
  "emergency-form",
  "emergency-review",
  "emergency-result",
];
export function FlowRoute() {
  const params = useLocalSearchParams<{ view: string; id?: string }>();
  const { account } = useApp();
  return (
    <FlowScreen
      key={`${account?.id ?? "public"}-${params.view}-${params.id ?? ""}`}
      screen={params.view}
      id={params.id}
    />
  );
}
function FlowScreen({ screen, id }: { screen: string; id?: string }) {
  const { account, previewEnabled, mode } = useApp();
  if (mode === "live" && !["help", "settings"].includes(screen)) return <LiveFlow screen={screen} id={id} />;
  if (!publicScreens.includes(screen) && !account)
    return <Redirect href="/access/sign-in" />;
  if (
    ["emergency-form", "emergency-review", "emergency-result"].includes(
      screen,
    ) &&
    !previewEnabled
  )
    return (
      <Screen title="Submission unavailable">
        <Notice>
          Emergency submission requires configured backend services.
        </Notice>
      </Screen>
    );
  if (
    [
      "fault-details",
      "camera",
      "attachments",
      "review",
      "submitted",
      "provisional",
    ].includes(screen) &&
    !allowed(account, "report")
  )
    return (
      <Screen title="Reporting restricted">
        <Notice>Fault-reporting permission is required.</Notice>
      </Screen>
    );
  if (["scan", "camera", "attachments"].includes(screen))
    return <CaptureScreen scan={screen === "scan"} />;
  if (["manual", "unmatched", "provisional"].includes(screen))
    return <Identification screen={screen} />;
  if (["fault-details", "emergency-form"].includes(screen))
    return <FaultDetails emergency={screen === "emergency-form"} />;
  if (["review", "emergency-review"].includes(screen))
    return <ReviewReport emergency={screen === "emergency-review"} />;
  if (["submitted", "emergency-result"].includes(screen))
    return (
      <SubmissionResult id={id} emergency={screen === "emergency-result"} />
    );
  if (["emergency", "emergency-verify"].includes(screen))
    return <EmergencyWorkflow screen={screen} />;
  if (
    [
      "equipment-detail",
      "equipment-history",
      "availability",
      "release",
      "holds",
      "hold-detail",
      "status-timeline",
    ].includes(screen)
  )
    return <EquipmentWorkflow screen={screen} id={id ?? "DEMO-VENT-014"} />;
  if (
    [
      "task-detail",
      "assignment",
      "due-date",
      "cancellation",
      "progress",
      "diagnosis",
      "parts",
      "completion",
      "rework",
      "maintenance-history",
    ].includes(screen)
  )
    return <MaintenanceWorkflow screen={screen} id={id} />;
  if (/^(technical|clinical)-(queue|checklist|result|history)$/.test(screen))
    return <VerificationWorkflow screen={screen} id={id} />;
  if (["sync", "queue", "upload-failed", "conflict"].includes(screen))
    return <SyncWorkflow screen={screen} />;
  if (["settings", "notification-settings", "help"].includes(screen))
    return <SettingsWorkflow screen={screen} />;
  if (["report-detail", "triage", "filters"].includes(screen))
    return <ReportWorkflow screen={screen} id={id} />;
  if (screen in adminCapabilities)
    return <AdminWorkflow screen={screen} id={id} />;
  if (screen === "more") return <MoreScreen />;
  return (
    <Screen title="Page unavailable">
      <Notice>This route is not supported.</Notice>
      <Button label="Return to welcome" onPress={() => router.replace("/")} />
    </Screen>
  );
}
