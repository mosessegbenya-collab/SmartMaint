import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { Badge, Button, Card, Choices, Field, Notice, Row, Screen, Section, Select, Txt } from "@/components/smart/ui";
import { EmptyState, LoadingState, MaintenanceBadge, StatGrid } from "@/components/smart/status-ui";
import { SettingToggle } from "@/components/smart/settings-ui";
import { useApp } from "@/state/app-state";
import { spacing, typography, type Tone } from "@/design/tokens";
import type { WorkflowTask } from "@/domain/maintenance-workflow";

const examples: WorkflowTask[] = [
  { state: "Unassigned" }, { state: "Assigned" },
  { state: "Assigned", workflowPhase: "accepted" },
  { state: "In progress", workflowPhase: "accepted" },
  { state: "In progress", workflowPhase: "awaiting_parts" },
  { state: "Completed", workflowPhase: "awaiting_verification" },
  { state: "Completed", workflowPhase: "closed" }, { state: "Cancelled" },
];

export function DesignSystemCatalog() {
  const app = useApp();
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("Routine");
  const [message, setMessage] = useState("");
  return <Screen title="SmartMaint design system" subtitle="Interactive component examples using fictional data.">
    <Notice>Development reference. Sample actions update this screen only.</Notice>
    <Button label="Preview management analytics" variant="secondary" icon="stats-chart-outline" onPress={() => router.push("/design-system?example=management")} />
    <Button label="Preview report recovery" variant="secondary" icon="documents-outline" onPress={() => router.push("/design-system?example=recovery")} />
    <Button label="Preview work revision review" variant="secondary" icon="construct-outline" onPress={() => router.push("/design-system?example=work")} />
    <Button label="Preview confirmations" variant="secondary" icon="checkmark-circle-outline" onPress={() => router.push("/design-system?example=confirmation")} />
    <Button label="Preview private queue loading" variant="secondary" icon="cloud-outline" onPress={() => router.push("/design-system?example=queue-loading")} />
    <Button label="Preview recorded event times" variant="secondary" icon="time-outline" onPress={() => router.push("/design-system?example=chronology")} />
    <Button label="Preview schedule activity" variant="secondary" icon="calendar-outline" onPress={() => router.push("/design-system?example=preventive")} />
    <Section title="Appearance and accessibility">
      <Choices label="Theme" values={["system", "light", "dark"]} value={app.preferences.theme} onChange={(theme) => app.setPreferences((prior) => ({ ...prior, theme }))} />
      <SettingToggle title="Larger text" detail="Inspect wrapping and control heights" icon="text-outline" value={app.preferences.largeText} onChange={(largeText) => app.setPreferences((prior) => ({ ...prior, largeText }))} />
      <SettingToggle title="Higher contrast" detail="Strengthen text and control boundaries" icon="contrast-outline" value={app.preferences.contrast} onChange={(contrast) => app.setPreferences((prior) => ({ ...prior, contrast }))} />
    </Section>
    <Section title="Typography"><Card style={{ gap: spacing.md }}>{(Object.keys(typography) as (keyof typeof typography)[]).map((variant) => <Txt key={variant} variant={variant}>{variant} · Equipment maintenance</Txt>)}</Card></Section>
    <Section title="Status language">{(["info", "success", "warning", "danger", "neutral"] as Tone[]).map((tone) => <View key={tone} style={{ gap: spacing.sm }}><Badge label={tone} tone={tone} /><Notice tone={tone}>{tone === "success" ? "Report receipt confirmed. Equipment status is assessed separately." : tone === "warning" ? "Independent verification is pending." : tone === "danger" ? "Active safety hold. Check the equipment record." : tone === "neutral" ? "No maintenance assignment yet." : "Review the equipment identity before reporting."}</Notice></View>)}</Section>
    <Section title="Maintenance lifecycle"><Card style={{ gap: spacing.md }}>{examples.map((task, index) => <MaintenanceBadge key={index} task={task} />)}</Card></Section>
    <Section title="Loading and empty states"><LoadingState label="Loading sample records…" /><EmptyState title="No tasks in this selection" detail="Choose another status or department to browse its maintenance tasks." action={{ label: "Reset sample filters", onPress: () => setMessage("Sample filters reset.") }} /></Section>
    <Section title="Forms"><Card style={{ gap: spacing.lg }}>
      <Field label="Equipment identifier" placeholder="TRAINING-001" value={text} onChangeText={setText} />
      <Field label="Required justification" value="" editable={false} error="Enter a reason before saving." />
      <Select label="Fault priority" values={["Routine", "High", "Urgent"]} value={priority} onChange={setPriority} />
      <Button label="Save sample" icon="checkmark" onPress={() => setMessage("Sample saved on this screen.")} />
      <Button label="Secondary action" variant="secondary" onPress={() => setMessage("Secondary action selected.")} />
      <Button label="Destructive action sample" variant="danger" onPress={() => setMessage("Destructive action preview selected. No record was changed.")} />
      <Button label="Disabled action" disabled onPress={() => {}} />
      <Button label="Saving sample" loading onPress={() => {}} />
      {!!message && <Txt accessibilityLiveRegion="polite">{message}</Txt>}
    </Card></Section>
    <Section title="Metrics"><StatGrid items={[{ label: "Open repairs", value: 12, detail: "Fictional training metric", icon: "construct-outline" }, { label: "Awaiting verification", value: 3, detail: "Repair completion does not release equipment", icon: "shield-outline", tone: "warning" }]} /></Section>
    <Section title="Spacing"><Card style={{ gap: spacing.sm }}>{Object.entries(spacing).map(([label, value]) => <Row key={label}><Txt style={{ width: 80 }}>{label} · {value}</Txt><View style={{ height: 8, width: value, backgroundColor: app.dark ? "#79B7FF" : "#0866E8" }} /></Row>)}</Card></Section>
  </Screen>;
}
