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
export const tokens = {
  blue: "#0866E8",
  cyan: "#15B8E6",
  danger: "#C92E40",
  success: "#13835E",
  warning: "#A86508",
  radius: 16,
  space: 16,
};
export function readableSemanticColor(color: string | undefined, dark: boolean) {
  if (!dark || !color) return color;
  const semantic: Record<string, string> = { "#0866E8": "#79B7FF", "#C92E40": "#FF91A0", "#13835E": "#70D6AF", "#A86508": "#F3C36B", "#566C8D": "#B4C5DB" };
  return semantic[color] ?? color;
}
