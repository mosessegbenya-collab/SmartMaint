import React, { useState } from "react";
import {
  Image,
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
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useApp } from "@/state/app-state";
import { palette, tokens } from "@/design/tokens";

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
  size = 14,
  weight = "400",
  muted = false,
  color,
  style,
  lineHeight,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: "400" | "500" | "600" | "700" | "800";
  muted?: boolean;
  color?: string;
  lineHeight?: number;
  style?: React.ComponentProps<typeof Text>["style"];
}) {
  const p = usePalette();
  const { preferences } = useApp();
  return (
    <Text
      style={[
        {
          fontSize: size * (preferences.largeText ? 1.18 : 1),
          lineHeight: (lineHeight ?? size * 1.38) * (preferences.largeText ? 1.18 : 1),
          fontWeight: preferences.bold ? "700" : weight,
          color: color ?? (muted ? p.secondary : p.text),
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
  return <Ionicons name={name} size={size} color={color} />;
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
  const content = (
    <View style={[styles.content, padding !== undefined && { padding }]}>
      {title && (
        <View style={{ gap: 4, marginBottom: 8 }}>
          <Txt size={26} weight="800">
            {title}
          </Txt>
          {subtitle && <Txt muted>{subtitle}</Txt>}
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          {footer && (
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
      className="rounded-2xl border p-4"
      style={[
        {
          backgroundColor: p.card,
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
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        minHeight: 48,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
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
      <Txt weight="600" color={variant === "secondary" ? tokens.blue : "#fff"}>
        {loading ? "Please wait…" : label}
      </Txt>
    </Pressable>
  );
}
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <Txt size={13} weight="600">
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={p.secondary}
        {...props}
        style={[
          {
            minHeight: 48,
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: error ? tokens.danger : p.border,
            color: p.text,
            backgroundColor: p.input,
            fontSize: 14,
            textAlignVertical: props.multiline ? "top" : "center",
          },
          props.style,
        ]}
      />
      {error && (
        <Txt size={12} color={tokens.danger}>
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
}: {
  label: string;
  values: readonly T[];
  value: string;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const p = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <Txt size={13} weight="600">
        {label}
      </Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || "Select an option"}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 48,
          borderRadius: 10,
          padding: 12,
          backgroundColor: p.input,
          borderWidth: 1,
          borderColor: p.border,
        }}
      >
        <Row style={{ justifyContent: "space-between" }}>
          <Txt>{value || "Select an option"}</Txt>
          <Icon name="chevron-down" size={16} />
        </Row>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(8,20,40,0.35)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Card style={{ maxHeight: "80%", gap: 12 }}>
            <Txt size={18} weight="700">
              {label}
            </Txt>
            <ScrollView>
              {values.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === option }}
                  onPress={() => {
                    onChange(option);
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
            </ScrollView>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => setOpen(false)}
            />
          </Card>
        </View>
      </Modal>
    </View>
  );
}
export function Choices<T extends string>({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: readonly T[];
  value: string;
  onChange: (v: T) => void;
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
            accessibilityState={{ checked: value === v }}
            onPress={() => onChange(v)}
            style={{
              minHeight: 48,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 10,
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
  tone?: "info" | "warning" | "danger" | "success";
}) {
  const { dark } = useApp();
  const color =
    tone === "danger"
      ? tokens.danger
      : tone === "warning"
        ? tokens.warning
        : tone === "success"
          ? tokens.success
          : tokens.blue;
  return (
    <View
      style={{
        borderRadius: 12,
        padding: 12,
        gap: 10,
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: dark
          ? "#1D3046"
          : tone === "danger"
            ? "#FFF0F2"
            : tone === "warning"
              ? "#FFF8E7"
              : tone === "success"
                ? "#EAF9F2"
                : "#E8F3FF",
        borderColor: `${color}25`,
        borderWidth: 1,
      }}
    >
      <Icon
        name={
          tone === "danger"
            ? "alert-circle"
            : tone === "warning"
              ? "warning"
              : tone === "success"
                ? "checkmark-circle"
                : "information-circle"
        }
        size={20}
        color={color}
      />
      <View style={{ flex: 1 }}>
        <Txt size={12} color={dark ? "#F1F7FF" : color}>
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
  tone?: "info" | "warning" | "danger" | "success";
}) {
  const color =
    tone === "danger"
      ? tokens.danger
      : tone === "warning"
        ? tokens.warning
        : tone === "success"
          ? tokens.success
          : tokens.blue;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 20,
        paddingHorizontal: 9,
        paddingVertical: 4,
        backgroundColor: `${color}16`,
      }}
    >
      <Txt size={10} weight="600" color={color}>
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
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card>
        <Row>
          <Icon name={icon} />
          <View style={{ flex: 1, gap: 3 }}>
            <Txt weight="600">{title}</Txt>
            {detail && (
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
      <Txt size={17} weight="700">
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
  frame: { flex: 1, width: "100%", maxWidth: 600, alignSelf: "center" },
  content: { padding: 18, gap: 14, paddingBottom: 28 },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
