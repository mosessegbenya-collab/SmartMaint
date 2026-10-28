import { useRef, useState } from "react";
import { Keyboard, Modal, Pressable, View } from "react-native";
import { Button, DialogSurface, Notice, Row, Txt, usePalette } from "@/components/smart/ui";
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
  const pending = useRef(false);
  const confirm = async () => {
    if (pending.current || disabled) return;
    pending.current = true;
    setBusy(true); setError("");
    try { await onConfirm(); setOpen(false); } catch (e) { setError(authErrorMessage(e)); }
    finally { pending.current = false; setBusy(false); }
  };
  return <>
    <Button label={label} variant={danger ? "danger" : "primary"} disabled={disabled} onPress={() => { Keyboard.dismiss(); setError(""); setOpen(true); }} />
    <Modal visible={open} transparent animationType="none" onRequestClose={() => { if (!pending.current) setOpen(false); }}>
      <DialogSurface>
          <Txt size={22} weight="800" accessibilityRole="header">{title}</Txt><Txt>{detail}</Txt>
          {!!error && <View accessibilityLiveRegion="polite"><Notice tone="warning">{error}</Notice></View>}
          <Row style={{ flexWrap: "wrap" }}><View style={{ flexGrow: 1, flexBasis: 140 }}><Button label="Cancel" variant="secondary" disabled={busy} onPress={() => { if (!pending.current) setOpen(false); }} /></View>
            <View style={{ flexGrow: 1, flexBasis: 140 }}><Button label="Confirm" variant={danger ? "danger" : "primary"} disabled={disabled} loading={busy} onPress={() => void confirm()} /></View></Row>
      </DialogSurface>
    </Modal>
  </>;
}
