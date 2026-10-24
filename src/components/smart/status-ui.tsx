import { View } from "react-native";
import { Card, Icon, Row, Txt, usePalette, type IconName } from "./ui";
import { tokens } from "@/design/tokens";

type Tone = "info" | "success" | "warning" | "danger";
const colors = { info: tokens.blue, success: tokens.success, warning: tokens.warning, danger: tokens.danger };
export function StatusPanel({ title, detail, icon, tone = "info" }: { title: string; detail: string; icon: IconName; tone?: Tone }) {
  const p = usePalette();
  const color = colors[tone];
  return <Card style={{ gap: 12, borderColor: color }}><Row style={{ alignItems: "flex-start", gap: 14 }}><View style={{ padding: 10, borderRadius: 30, backgroundColor: p.input }}><Icon name={icon} size={30} color={color} /></View><View style={{ flex: 1, gap: 6 }}><Txt size={22} weight="800" color={color}>{title}</Txt><Txt size={14}>{detail}</Txt></View></Row></Card>;
}
export function StatGrid({ items }: { items: { label: string; value: number | string; detail: string; icon: IconName; tone?: Tone }[] }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>{items.map((item) => <View key={item.label} style={{ flexBasis: "46%", flexGrow: 1, minWidth: 130 }}><Card style={{ gap: 9, height: "100%", minHeight: 150 }}><Icon name={item.icon} size={28} color={colors[item.tone ?? "info"]} /><Txt size={14} weight="600">{item.label}</Txt><Txt size={30} weight="800">{item.value}</Txt><Txt size={12} muted>{item.detail}</Txt></Card></View>)}</View>;
}
export function TimelineItem({ title, detail, at, icon, tone = "info", last = false }: { title: string; detail: string; at: number; icon: IconName; tone?: Tone; last?: boolean }) {
  const p = usePalette();
  return <Row style={{ alignItems: "stretch", gap: 10 }}><View style={{ width: 26, alignItems: "center" }}><View style={{ width: 16, height: 16, borderRadius: 8, marginTop: 22, backgroundColor: colors[tone] }} />{!last && <View style={{ width: 2, flex: 1, backgroundColor: p.border, minHeight: 40 }} />}</View><View style={{ flex: 1, paddingBottom: last ? 0 : 12 }}><Card style={{ gap: 9 }}><Row style={{ alignItems: "flex-start" }}><Icon name={icon} size={24} color={colors[tone]} /><Txt size={16} weight="700" style={{ flex: 1 }}>{title}</Txt></Row><Txt size={13}>{detail}</Txt><Txt size={11} muted>{new Date(at).toLocaleString()}</Txt></Card></View></Row>;
}
