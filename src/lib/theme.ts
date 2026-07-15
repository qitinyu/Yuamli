/**
 * Theme color presets for Yuamli
 * Each preset defines: accent, accent-hover, accent-light (bg), accent-text, accent-50, accent-border
 */

export interface ThemePreset {
  name: string
  color: string
  hover: string
  light: string
  text: string
  bg50: string
  border: string
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "樱花粉",
    color: "#DF9193",
    hover: "#C47A7C",
    light: "#F5D5D6",
    text: "#A56A6C",
    bg50: "#FDF2F2",
    border: "#E8B8B9",
  },
  {
    name: "抹茶绿",
    color: "#7BAE7E",
    hover: "#629A65",
    light: "#D4EAD5",
    text: "#4A7F4D",
    bg50: "#F0F8F0",
    border: "#A8D4A9",
  },
  {
    name: "青瓷蓝",
    color: "#6B8FA3",
    hover: "#577D91",
    light: "#CDDDE5",
    text: "#3D6578",
    bg50: "#EEF4F7",
    border: "#9DBCCB",
  },
  {
    name: "琥珀黄",
    color: "#C9A05A",
    hover: "#B08B45",
    light: "#F0DFC0",
    text: "#8A6B30",
    bg50: "#FDF8EE",
    border: "#DCC48E",
  },
  {
    name: "藕荷紫",
    color: "#A085B5",
    hover: "#8B6FA2",
    light: "#DDD2E5",
    text: "#6B5280",
    bg50: "#F5F0F8",
    border: "#C2B0D1",
  },
]

/** Convert a ThemePreset to CSS custom properties object for inline style */
export function themeToStyle(t: ThemePreset): Record<string, string> {
  return {
    "--theme-accent": t.color,
    "--theme-accent-hover": t.hover,
    "--theme-accent-light": t.light,
    "--theme-accent-text": t.text,
    "--theme-accent-50": t.bg50,
    "--theme-accent-border": t.border,
  }
}