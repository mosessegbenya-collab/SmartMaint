import { ActivityIndicator, View } from "react-native";
import { Card, Icon, Row, Txt, usePalette, type IconName } from "./ui";
import { semanticStyle, type Tone } from "@/design/tokens";
import { useApp } from "@/state/app-state";
import { maintenanceStatus, type WorkflowTask } from "@/domain/maintenance-workflow";
import { Badge, Button } from "./ui";

export function EmptyState({ title, detail, icon = "file-tray-outline", action }: { title: string; detail: string; icon?: IconName; action?: { label: string; onPress: () => void } }) {
  const p = usePalette();
  return <Card style={{ gap: 12, alignItems: "center", paddingVertical: 24 }}><Icon name={icon} size={36} color={p.secondary} /><Txt variant="section" accessibilityRole="header" style={{ textAlign: "center" }}>{title}</Txt><Txt muted style={{ textAlign: "center" }}>{detail}</Txt>{action && <Button label={action.label} variant="secondary" onPress={action.onPress} />}</Card>;
}

export function LoadingState({ label = "Loading authorized records…" }: { label?: string }) {
  const { dark } = useApp();
  return <Row style={{ paddingVertical: 16, justifyContent: "center", flexWrap: "wrap" }}><ActivityIndicator color={semanticStyle("info", dark).foreground} /><Txt accessibilityLiveRegion="polite">{label}</Txt></Row>;
}

export function MaintenanceBadge({ task }: { task: WorkflowTask }) {
  const status = maintenanceStatus(task);
  return <Badge label={status.label} tone={status.tone} />;
}
export function StatusPanel({ title, detail, icon, tone = "info" }: { title: string; detail: string; icon: IconName; tone?: Tone }) {
  const p = usePalette();
  const { dark } = useApp();
  const color = semanticStyle(tone, dark).foreground;
  return <Card style={{ gap: 12, borderColor: color }}><Row style={{ alignItems: "flex-start", gap: 14 }}><View style={{ padding: 10, borderRadius: 30, backgroundColor: p.input }}><Icon name={icon} size={30} color={color} /></View><View style={{ flex: 1, gap: 6 }}><Txt size={22} weight="800" color={color}>{title}</Txt><Txt size={14}>{detail}</Txt></View></Row></Card>;
}
export function StatGrid({ items }: { items: { label: string; value: number | string; detail: string; icon: IconName; tone?: Tone }[] }) {
  const { dark } = useApp();
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>{items.map((item) => <View key={item.label} style={{ flexBasis: "46%", flexGrow: 1, minWidth: 130 }}><Card style={{ gap: 9, flexGrow: 1, minHeight: 150 }}><Icon name={item.icon} size={28} color={semanticStyle(item.tone ?? "info", dark).foreground} /><Txt variant="label">{item.label}</Txt><Txt variant="metric">{item.value}</Txt><Txt variant="caption" muted>{item.detail}</Txt></Card></View>)}</View>;
}
export function TimelineItem({ title, detail, at, icon, tone = "info", last = false }: { title: string; detail: string; at: number; icon: IconName; tone?: Tone; last?: boolean }) {
  const p = usePalette();
  const { dark } = useApp();
  const color = semanticStyle(tone, dark).foreground;
  return <Row style={{ alignItems: "stretch", gap: 10 }}><View style={{ width: 26, alignItems: "center" }}><View style={{ width: 16, height: 16, borderRadius: 8, marginTop: 22, backgroundColor: color }} />{!last && <View style={{ width: 2, flex: 1, backgroundColor: p.border, minHeight: 40 }} />}</View><View style={{ flex: 1, paddingBottom: last ? 0 : 12 }}><Card style={{ gap: 9 }}><Row style={{ alignItems: "flex-start" }}><Icon name={icon} size={24} color={color} /><Txt size={16} weight="700" style={{ flex: 1 }}>{title}</Txt></Row><Txt size={13}>{detail}</Txt><Txt variant="caption" muted>{new Date(at).toLocaleString()}</Txt></Card></View></Row>;
}
