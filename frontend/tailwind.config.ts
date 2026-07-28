import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        surfaceLight: "var(--surface-light)",
        accent: "var(--accent)",
        accentHover: "var(--accent-hover)",
        text: "var(--text)",
        textMuted: "var(--text-muted)",
        danger: "var(--danger)",
        dangerBg: "var(--danger-bg)",
      },
    },
  },
  plugins: [],
} satisfies Config;