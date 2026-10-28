export const palette = {
  light: {
    background: "#F2F8FF",
    card: "rgba(255,255,255,0.88)",
    text: "#10254D",
    secondary: "#566C8D",
    border: "#DCE8F4",
    input: "#F8FCFF",
  },
  dark: {
    background: "#0C172A",
    card: "#16253B",
    text: "#F1F7FF",
    secondary: "#B4C5DB",
    border: "#344761",
    input: "#101E32",
  },
};
export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radii = { control: 12, card: 16, sheet: 24, pill: 999 } as const;
export const typography = {
  caption: { size: 12, lineHeight: 17, weight: "400" },
  label: { size: 13, lineHeight: 18, weight: "600" },
  body: { size: 14, lineHeight: 20, weight: "400" },
  section: { size: 17, lineHeight: 24, weight: "700" },
  title: { size: 26, lineHeight: 34, weight: "800" },
  metric: { size: 30, lineHeight: 38, weight: "800" },
} as const;
export const layout = { touchTarget: 48, contentWidth: 600, screenPadding: 18, screenGap: 14 } as const;
export const tokens = {
  blue: "#0866E8",
  cyan: "#15B8E6",
  danger: "#C92E40",
  success: "#13835E",
  warning: "#A86508",
  radius: 16,
  space: 16,
};
export type Tone = "info" | "success" | "warning" | "danger" | "neutral";
const semantic = {
  light: {
    info: { foreground: "#0866E8", surface: "#E8F3FF", border: "#0866E8", icon: "information-circle" },
    success: { foreground: "#106F50", surface: "#EAF9F2", border: "#13835E", icon: "checkmark-circle" },
    warning: { foreground: "#885006", surface: "#FFF8E7", border: "#A86508", icon: "warning" },
    danger: { foreground: "#B42336", surface: "#FFF0F2", border: "#C92E40", icon: "alert-circle" },
    neutral: { foreground: "#4D6281", surface: "#EEF3F9", border: "#70849E", icon: "ellipse-outline" },
  },
  dark: {
    info: { foreground: "#79B7FF", surface: "#152D49", border: "#79B7FF", icon: "information-circle" },
    success: { foreground: "#70D6AF", surface: "#15392F", border: "#70D6AF", icon: "checkmark-circle" },
    warning: { foreground: "#F3C36B", surface: "#392F1C", border: "#F3C36B", icon: "warning" },
    danger: { foreground: "#FF91A0", surface: "#3C2230", border: "#FF91A0", icon: "alert-circle" },
    neutral: { foreground: "#B4C5DB", surface: "#24354B", border: "#B4C5DB", icon: "ellipse-outline" },
  },
} as const;
export function semanticStyle(tone: Tone, dark: boolean) {
  return semantic[dark ? "dark" : "light"][tone];
}
export function readableSemanticColor(color: string | undefined, dark: boolean) {
  if (!dark || !color) return color;
  const semantic: Record<string, string> = { "#0866E8": "#79B7FF", "#C92E40": "#FF91A0", "#13835E": "#70D6AF", "#A86508": "#F3C36B", "#566C8D": "#B4C5DB" };
  return semantic[color] ?? color;
}
