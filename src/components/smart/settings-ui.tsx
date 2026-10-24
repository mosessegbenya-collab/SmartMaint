import { Pressable, Switch, View } from "react-native";
import { Card, Icon, Row, Txt, usePalette, type IconName } from "./ui";
import { tokens } from "@/design/tokens";

function SettingIcon({ name }: { name: IconName }) {
  const p = usePalette();
  return <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: p.input, alignItems: "center", justifyContent: "center" }}><Icon name={name} size={27} /></View>;
}
export function SettingLink({ title, detail, icon, onPress }: { title: string; detail: string; icon: IconName; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${detail}`} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
    <Card style={{ minHeight: 90, justifyContent: "center" }}><Row style={{ gap: 14 }}><SettingIcon name={icon} /><View style={{ flex: 1, gap: 4 }}><Txt size={17} weight="700">{title}</Txt><Txt size={13} muted>{detail}</Txt></View><Icon name="chevron-forward" size={20} /></Row></Card>
  </Pressable>;
}
export function SettingToggle({ title, detail, icon, value, disabled = false, onChange }: { title: string; detail: string; icon: IconName; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  const p = usePalette();
  return <Card style={{ minHeight: 108, justifyContent: "center" }}><Row style={{ gap: 12, alignItems: "flex-start" }}>
    <SettingIcon name={icon} /><View style={{ flex: 1, gap: 5 }}><Txt size={16} weight="700">{title}</Txt><Txt size={13} muted>{detail}</Txt></View>
    <View style={{ alignItems: "center", gap: 4 }}><Switch accessibilityLabel={title} accessibilityHint={detail} disabled={disabled} value={value} onValueChange={onChange} trackColor={{ false: p.border, true: tokens.blue }} ios_backgroundColor={p.border} /><Txt size={11} muted>{disabled ? "Unavailable" : value ? "On" : "Off"}</Txt></View>
  </Row></Card>;
}
export function ProfileIdentity({ name, role, staffId, department, email }: { name: string; role: string; staffId: string; department: string; email?: string }) {
  const p = usePalette();
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return <Card style={{ paddingVertical: 22 }}><Row style={{ gap: 16, flexWrap: "wrap" }}>
    <View style={{ width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", backgroundColor: p.input }}><Txt size={29} weight="800" color={tokens.blue}>{initials || "SM"}</Txt></View>
    <View style={{ flex: 1, minWidth: 170, gap: 5 }}><Txt size={21} weight="800">{name}</Txt><Txt size={13} muted>Staff ID: {staffId}</Txt><Txt size={13} muted>Role: {role}</Txt><Txt size={13} muted>{department}</Txt>{!!email && <Txt size={12} muted>{email}</Txt>}</View>
  </Row></Card>;
}
