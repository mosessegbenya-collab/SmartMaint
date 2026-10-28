import React, { useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname, useLocalSearchParams } from "expo-router";
import { tabItems } from '@/navigation/tabs';
import { useApp } from "@/state/app-state";
import { palette, tokens, readableSemanticColor, layout, radii, spacing, typography, semanticStyle, type Tone } from "@/design/tokens";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export const brandAssets = {
  ventilator: require("@/assets/brand/ventilator.png"),
  pump: require("@/assets/brand/pump.png"),
  monitor: require("@/assets/brand/monitor.png"),
  hero: require("@/assets/brand/hero.png"),
  authHero: require("@/assets/brand/auth-hero.png"),
  registrationHero: require("@/assets/brand/registration-hero.png"),
  logo: require("@/assets/brand/approved-logo.png"),
};
export function usePalette() {
  const { dark, preferences } = useApp();
  const p = palette[dark ? "dark" : "light"];
  return preferences.contrast
    ? {
        ...p,
        text: dark ? "#FFFFFF" : "#07172E",
        secondary: dark ? "#F1F7FF" : "#293D56",
        border: dark ? "#B4C5DB" : "#70849E",
      }
    : p;
}
export function Txt({
  children,
  size,
  weight,
  variant = "body",
  muted = false,
  color,
  style,
  lineHeight,
  accessibilityRole,
  accessibilityLiveRegion,
}: {
  children: React.ReactNode;
  size?: number;
  variant?: keyof typeof typography;
  weight?: "400" | "500" | "600" | "700" | "800";
  muted?: boolean;
  color?: string;
  lineHeight?: number;
  accessibilityRole?: TextProps["accessibilityRole"];
  accessibilityLiveRegion?: TextProps["accessibilityLiveRegion"];
  style?: React.ComponentProps<typeof Text>["style"];
}) {
  const p = usePalette();
  const { preferences, dark } = useApp();
  const textStyle = typography[variant];
  const fontSize = size ?? textStyle.size;
  const fontWeight = weight ?? textStyle.weight;
  return (
    <Text
      accessibilityRole={accessibilityRole}
      accessibilityLiveRegion={accessibilityLiveRegion}
      style={[
        {
          fontFamily: preferences.bold || Number(fontWeight) >= 800 ? "InterExtraBold" : Number(fontWeight) >= 700 ? "InterBold" : Number(fontWeight) >= 600 ? "InterSemiBold" : "InterRegular",
          fontSize: fontSize * (preferences.largeText ? 1.18 : 1),
          lineHeight: (lineHeight ?? (size === undefined ? textStyle.lineHeight : size * 1.38)) * (preferences.largeText ? 1.18 : 1),
          fontWeight: preferences.bold ? "700" : fontWeight,
          color: readableSemanticColor(color, dark) ?? (muted ? p.secondary : p.text),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Icon({
  name,
  size = 22,
  color = tokens.blue,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { dark } = useApp();
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Ionicons name={name} size={size} color={readableSemanticColor(color, dark)} accessible={false} /></View>;
}
export function IconButton({
  name,
  label,
  onPress,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.iconButton}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Brand({ back = false }: { back?: boolean }) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{ minHeight: 56 }}
    >
      {back ? (
        <IconButton
          name="chevron-back"
          label="Go back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        />
      ) : (
        <View style={{ width: 36 }} />
      )}
      <View className="flex-row items-center" style={{ gap: 5 }}>
        <Image
          source={brandAssets.logo}
          style={{ width: 32, height: 32, borderRadius: 8 }}
          accessibilityLabel="SmartMaint gear and heartbeat logo"
        />
        <Txt size={20} weight="800">
          Smart
          <Txt size={20} weight="800" color={tokens.blue}>
            Maint
          </Txt>
        </Txt>
      </View>
      <IconButton
        name="information-circle-outline"
        label="About SmartMaint"
        onPress={() => router.push("/flow/help")}
      />
    </View>
  );
}
export function Screen({
  children,
  title,
  subtitle,
  back = true,
  footer,
  scroll = true,
  header,
  padding,
  safeBottom = back,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  footer?: React.ReactNode;
  scroll?: boolean;
  header?: React.ReactNode;
  padding?: number;
  safeBottom?: boolean;
}) {
  const p = usePalette();
  const { account, mode } = useApp();
  const pathname = usePathname();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const flowNavigation = mode === 'live' && account && pathname.startsWith('/flow/') && !!view && ['settings', 'notification-settings', 'appearance', 'text-contrast', 'privacy', 'account-security', 'help', 'equipment-detail', 'live-equipment', 'holds', 'hold-detail', 'status-timeline', 'equipment-history', 'task-detail', 'live-task', 'progress', 'parts', 'completion', 'rework', 'maintenance-history', 'technical-queue', 'clinical-queue', 'technical-result', 'clinical-result', 'analytics', 'live-analytics', 'export', 'live-export', 'audit', 'staff-audit', 'role', 'staff-role', 'suspend', 'sync', 'queue', 'upload-failed', 'report-detail', 'triage'].includes(view);
  const content = (
    <View style={[styles.content, padding !== undefined && { padding }]}>
      {!!title && (
        <View style={{ gap: 4, marginBottom: 8 }}>
          <Txt variant="title" accessibilityRole="header">
            {title}
          </Txt>
          {!!subtitle && <Txt muted>{subtitle}</Txt>}
        </View>
      )}
      {children}
    </View>
  );
  return (
    <SafeAreaView
      edges={safeBottom ? ['top','left','right','bottom'] : ['top','left','right']}
      style={{ flex: 1, backgroundColor: p.background }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.frame}>
          {header ?? <Brand back={back} />}
          {account && mode === "preview" && (
            <View style={{ paddingHorizontal: 18, paddingBottom: 5 }}>
              <Txt size={10} color={tokens.warning}>
                DEVELOPMENT PREVIEW · Synthetic data · Memory only
              </Txt>
            </View>
          )}
          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1 }}
            >
              {content}
            </ScrollView>
          ) : (
            content
          )}
          {!!footer && (
            <SafeAreaView
              edges={safeBottom ? [] : ['bottom']}
              style={{
                padding: 16,
                borderTopWidth: 1,
                borderColor: p.border,
                backgroundColor: p.card,
              }}
            >
              {footer}
            </SafeAreaView>
          )}
          {!footer && flowNavigation && <FlowNavigation view={view} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function FlowNavigation({ view }: { view: string }) {
  const { account } = useApp(); const p = usePalette();
  if (!account) return null;
  const selected = ['settings', 'notification-settings', 'appearance', 'text-contrast', 'privacy', 'account-security', 'help', 'sync', 'queue', 'upload-failed', 'conflict'].includes(view) ? 'profile' : ['audit', 'staff-audit', 'role', 'staff-role', 'suspend'].includes(view) ? 'accounts' : ['report-detail', 'triage', 'analytics', 'live-analytics', 'export', 'live-export'].includes(view) ? 'reports' : ['equipment-detail', 'live-equipment', 'holds', 'hold-detail', 'status-timeline', 'equipment-history'].includes(view) ? 'equipment' : 'tasks';
  return <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: p.border, backgroundColor: p.card, paddingTop: 7, paddingBottom: 5 }}>{tabItems(account).map((tab) => <Pressable key={tab.name} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: selected === tab.name }} onPress={() => router.replace(`/workspace/${tab.name}`)} style={{ flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 4 }}><Icon name={tab.icon} size={25} color={selected === tab.name ? tokens.blue : p.secondary} /><Txt size={10} color={selected === tab.name ? tokens.blue : p.secondary} weight={selected === tab.name ? '700' : '400'}>{tab.label}</Txt></Pressable>)}</View>;
}
export function DialogSurface({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const p = usePalette();
  return <SafeAreaProvider style={{ flex: 1 }}>
    <SafeAreaView accessibilityViewIsModal style={{ flex: 1, backgroundColor: "#07172E99" }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: spacing.lg }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" bounces={false}>
        <Card style={{ width: "100%", maxWidth: layout.contentWidth, alignSelf: "center", flexShrink: 0, gap: spacing.lg, backgroundColor: p.dialog, ...style }}>{children}</Card>
      </ScrollView>
    </SafeAreaView>
  </SafeAreaProvider>;
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const p = usePalette();
  return (
    <View
      style={[
        {
          backgroundColor: p.card,
          borderRadius: radii.card,
          borderWidth: 1,
          padding: spacing.lg,
          borderColor: p.border,
          boxShadow: "0 5px 20px rgba(35,103,163,0.045)",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View className="flex-row items-center" style={[{ gap: 10 }, style]}>
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
}) {
  const p = usePalette();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        minHeight: layout.touchTarget,
        borderRadius: radii.control,
        paddingHorizontal: 14,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: disabled || loading ? 0.55 : pressed ? 0.72 : 1,
        backgroundColor:
          variant === "secondary"
            ? p.card
            : variant === "danger"
              ? tokens.danger
              : tokens.blue,
        borderColor: variant === "secondary" ? p.border : "transparent",
        borderWidth: 1,
      }}
    >
      {icon && (
        <Icon
          name={icon}
          size={18}
          color={variant === "secondary" ? tokens.blue : "#fff"}
        />
      )}
      <Txt weight="600" color={variant === "secondary" ? tokens.blue : "#fff"} style={{ flexShrink: 1, textAlign: "center" }}>
        {loading ? "Please wait…" : label}
      </Txt>
    </Pressable>
  );
}
export function Field({
  label,
  error,
  icon,
  insetLabel = false,
  ...props
}: TextInputProps & { label: string; error?: string; icon?: IconName; insetLabel?: boolean }) {
  const p = usePalette();
  const { preferences, dark } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {!insetLabel && <Txt size={13} weight="600">
        {label}
      </Txt>}
      <View style={{ minHeight: insetLabel ? 56 : layout.touchTarget, paddingVertical: insetLabel ? 6 : 0, flexDirection: 'row', alignItems: props.multiline ? 'flex-start' : 'center', borderWidth: 1, borderColor: error ? semanticStyle('danger', dark).border : focused ? semanticStyle('info', dark).border : p.border, backgroundColor: p.input, borderRadius: radii.control }}>
      {icon && <View style={{ paddingLeft: 14, paddingTop: props.multiline ? 14 : 0 }}><Icon name={icon} size={23} color={p.secondary} /></View>}
      <View style={{ flex: 1, minWidth: 0 }}>
      {insetLabel && <Txt size={11} muted style={{ paddingHorizontal: 12 }}>{label}</Txt>}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={p.secondary}
        {...props}
        accessibilityHint={[props.accessibilityHint, error].filter(Boolean).join('. ') || undefined}
        onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        style={[
          {
            minHeight: insetLabel ? 26 : 48,
            paddingHorizontal: 12,
            paddingVertical: insetLabel ? 0 : 12,
            borderRadius: 10,
            flex: 1,
            minWidth: 0,
            color: p.text,
            backgroundColor: p.input,
            fontFamily: "InterRegular",
            fontSize: (insetLabel ? 16 : typography.body.size) * (preferences.largeText ? 1.18 : 1),
            fontWeight: preferences.bold ? '700' : '400',
            textAlignVertical: props.multiline ? "top" : "center",
          },
          props.style,
        ]}
      />
      </View>
      </View>
      {!!error && (
        <Txt size={12} color={tokens.danger} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Txt>
      )}
    </View>
  );
}
export function Select<T extends string>({
  label,
  values,
  value,
  onChange,
  insetLabel = false,
  icon,
  disabled = false,
}: {
  label: string;
  values: readonly T[];
  value: string;
  onChange: (value: T) => void;
  insetLabel?: boolean;
  icon?: IconName;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const p = usePalette();
  return (
    <View style={{ gap: 6 }}>
      {!insetLabel && <Txt size={13} weight="600">
        {label}
      </Txt>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || "Select an option"}`}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => { Keyboard.dismiss(); setOpen(true); }}
        style={{
          minHeight: insetLabel ? 56 : layout.touchTarget,
          borderRadius: radii.control,
          paddingHorizontal: 12,
          paddingVertical: insetLabel ? 8 : 12,
          backgroundColor: p.input,
          borderWidth: 1,
          borderColor: p.border,
        }}
      >
        <Row style={{ justifyContent: "space-between" }}>
          {icon && <Icon name={icon} size={23} color={p.secondary} />}
          <View style={{ flex: 1, gap: 2 }}>{insetLabel && <Txt size={11} muted>{label}</Txt>}<Txt size={insetLabel ? 16 : 14}>{value || 'Select an option'}</Txt></View>
          <Icon name="chevron-down" size={16} />
        </Row>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <DialogSurface>
            <Txt size={18} weight="700" accessibilityRole="header">
              {label}
            </Txt>
            <View>
              {values.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === option }}
                  onPress={() => {
                    if (!disabled) onChange(option);
                    setOpen(false);
                  }}
                  style={{
                    minHeight: 48,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderColor: p.border,
                  }}
                >
                  <Row>
                    <Icon
                      name={
                        value === option
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={20}
                    />
                    <Txt style={{ flex: 1 }}>{option}</Txt>
                  </Row>
                </Pressable>
              ))}
            </View>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => setOpen(false)}
            />
        </DialogSurface>
      </Modal>
    </View>
  );
}
export function Choices<T extends string>({
  label,
  values,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  values: readonly T[];
  value: string;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const p = usePalette();
  return (
    <View style={{ gap: 7 }}>
      <Txt size={13} weight="600">
        {label}
      </Txt>
      <View className="flex-row flex-wrap" style={{ gap: 6 }}>
        {values.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === v, disabled }}
            disabled={disabled}
            onPress={() => onChange(v)}
            style={{
              minHeight: layout.touchTarget,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: radii.control,
              borderWidth: 1,
              borderColor: value === v ? tokens.blue : p.border,
              backgroundColor: value === v ? tokens.blue : p.input,
            }}
          >
            <Txt size={12} color={value === v ? "#fff" : p.text}>
              {v}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const { dark } = useApp();
  const appearance = semanticStyle(tone, dark);
  return (
    <View
      style={{
        borderRadius: radii.control,
        padding: spacing.md,
        gap: 10,
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: appearance.surface,
        borderColor: appearance.border,
        borderWidth: 1,
      }}
    >
      <Icon
        name={appearance.icon}
        size={20}
        color={appearance.foreground}
      />
      <View style={{ flex: 1 }}>
        <Txt variant="caption" color={appearance.foreground}>
          {children}
        </Txt>
      </View>
    </View>
  );
}
export function Badge({
  label,
  tone = "info",
}: {
  label: string;
  tone?: Tone;
}) {
  const { dark } = useApp();
  const appearance = semanticStyle(tone, dark);
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: radii.pill,
        paddingHorizontal: 9,
        paddingVertical: 4,
        backgroundColor: appearance.surface,
      }}
    >
      <Txt variant="caption" weight="600" color={appearance.foreground}>
        {label}
      </Txt>
    </View>
  );
}
export function LinkRow({
  title,
  detail,
  icon = "chevron-forward",
  onPress,
  tail,
}: {
  title: string;
  detail?: string;
  icon?: IconName;
  onPress: () => void;
  tail?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card>
        <Row>
          <Icon name={icon} />
          <View style={{ flex: 1, gap: 3 }}>
            <Txt weight="600">{title}</Txt>
            {!!detail && (
              <Txt size={12} muted>
                {detail}
              </Txt>
            )}
          </View>
          {tail}
          <Icon name="chevron-forward" size={17} />
        </Row>
      </Card>
    </Pressable>
  );
}
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Txt variant="section" accessibilityRole="header">
        {title}
      </Txt>
      {children}
    </View>
  );
}
export function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
      <Txt size={12} muted style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt size={12} weight="500" style={{ flex: 1.3 }}>
        {value}
      </Txt>
    </Row>
  );
}
const styles = StyleSheet.create({
  frame: { flex: 1, width: "100%", maxWidth: layout.contentWidth, alignSelf: "center" },
  content: { padding: layout.screenPadding, gap: layout.screenGap, paddingBottom: 28 },
  iconButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
});
