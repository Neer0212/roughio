import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        elevated: "var(--elevated)",
        border: "var(--border)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        accent: {
          DEFAULT: "var(--accent)",
          muted: "rgba(53, 208, 127, 0.15)",
          hover: "var(--accent-dark)",
        },
        success: {
          DEFAULT: "var(--success)",
          muted: "rgba(53, 208, 127, 0.15)",
        },
        error: {
          DEFAULT: "var(--error)",
          muted: "rgba(239, 83, 80, 0.15)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          muted: "rgba(245, 158, 11, 0.15)",
        },
        info: {
          DEFAULT: "var(--info)",
          muted: "rgba(96, 165, 250, 0.15)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        "display-xl": ["4.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "display-lg": ["3.5rem", { lineHeight: "1.08", letterSpacing: "-0.025em" }],
        "display-md": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-sm": ["2rem", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(185, 160, 255, 0)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(185, 160, 255, 0.3)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "grid-pattern":
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;