/**
 * Theme color presets for Yuamli
 * Each preset defines: accent, accent-hover, accent-light (bg), accent-text, accent-50, accent-border
 */

export interface ThemePreset {
  name: string
  color: string        // main accent (e.g. #F8BBD9)
  hover: string        // darker hover
  light: string        // light background
  text: string         // text on light bg
  bg50: string         // very light bg
  border: string       // light border
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "樱花粉",
    color: "#ec4899",
    hover: "#db2777",
    light: "#fce7f3",
    text: "#be185d",
    bg50: "#fdf2f8",
    border: "#f9a8d4",
  },
  {
    name: "抹茶绿",
    color: "#16a34a",
    hover: "#15803d",
    light: "#dcfce7",
    text: "#166534",
    bg50: "#f0fdf4",
    border: "#86efac",
  },
  {
    name: "青瓷蓝",
    color: "#3b82f6",
    hover: "#2563eb",
    light: "#dbeafe",
    text: "#1d4ed8",
    bg50: "#eff6ff",
    border: "#93c5fd",
  },
  {
    name: "琥珀黄",
    color: "#f59e0b",
    hover: "#d97706",
    light: "#fef3c7",
    text: "#b45309",
    bg50: "#fffbeb",
    border: "#fcd34d",
  },
  {
    name: "藕荷紫",
    color: "#a855f7",
    hover: "#9333ea",
    light: "#f3e8ff",
    text: "#7e22ce",
    bg50: "#faf5ff",
    border: "#c084fc",
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