import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Sora'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        proxi: {
          green: "#008B68",
          greenHover: "#007456",
          darkGreen: "#00563F",
          mint: "#E7F6F0",
          mintLight: "#F2FAF6",
          ink: "#0F172A",
          muted: "#64748B",
          subtle: "#94A3B8",
          surface: "#FFFFFF",
          bg: "#F8FAFC",
          line: "#E2E8F0",
          lineSubtle: "#F1F5F9",
          error: "#DC2626",
          warning: "#D97706",
          success: "#059669",
        },
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        cardHover: "0 10px 25px -4px rgba(0, 139, 104, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)",
        glow: "0 0 20px -3px rgba(0, 139, 104, 0.25)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
