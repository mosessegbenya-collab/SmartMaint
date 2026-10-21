import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Button, Card, Notice, Row, Txt, usePalette } from "@/components/smart/ui";
import { authErrorMessage } from "@/features/access/auth-policy";

export function MultiChoice<T extends string>({ label, values, selected, onChange }: { label: string; values: readonly T[]; selected: T[]; onChange: (value: T[]) => void }) {
  const palette = usePalette();
  return <View style={{ gap: 6 }}>
    <Txt weight="600">{label}</Txt>
    {values.map((value) => <Pressable key={value} accessibilityRole="checkbox" accessibilityLabel={value} accessibilityState={{ checked: selected.includes(value) }}
      onPress={() => onChange(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value])}
      style={{ minHeight: 48, justifyContent: "center", borderWidth: 1, borderColor: selected.includes(value) ? "#0866E8" : palette.border, backgroundColor: palette.input, borderRadius: 10, padding: 12 }}>
      <Txt color={selected.includes(value) ? "#0866E8" : palette.text}>{selected.includes(value) ? "✓ " : "○ "}{value}</Txt>
    </Pressable>)}
  </View>;
}
export function ConfirmAction({ label, title, detail, onConfirm, disabled = false, danger = false }: {
  label: string; title: string; detail: string; onConfirm: () => Promise<unknown>; disabled?: boolean; danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirm = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try { await onConfirm(); setOpen(false); } catch (e) { setError(authErrorMessage(e)); }
    finally { setBusy(false); }
  };
  return <>
    <Button label={label} variant={danger ? "danger" : "primary"} disabled={disabled} onPress={() => { setError(""); setOpen(true); }} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => { if (!busy) setOpen(false); }}>
      <View accessibilityViewIsModal style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#07172E99" }}>
        <Card style={{ gap: 16 }}>
          <Txt size={22} weight="800">{title}</Txt><Txt>{detail}</Txt>
          {error && <Notice tone="warning">{error}</Notice>}
          <Row><View style={{ flex: 1 }}><Button label="Cancel" variant="secondary" disabled={busy} onPress={() => setOpen(false)} /></View>
            <View style={{ flex: 1 }}><Button label="Confirm" variant={danger ? "danger" : "primary"} loading={busy} onPress={() => void confirm()} /></View></Row>
        </Card>
      </View>
    </Modal>
  </>;
}
