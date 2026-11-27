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
        // Inter (next/font, src/app/layout.tsx) for the whole site UI. The sheets keep their own fonts.
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      // "Minimal alb": white pages, navy text, one blue accent, thin grey borders, no offset shadows.
      boxShadow: {
        sm: "0 1px 2px rgba(20, 33, 61, 0.05)",
        DEFAULT: "0 1px 2px rgba(20, 33, 61, 0.05)",
        md: "0 1px 3px rgba(20, 33, 61, 0.06), 0 1px 2px rgba(20, 33, 61, 0.04)",
        lg: "0 10px 30px -12px rgba(20, 33, 61, 0.18)",
        xl: "0 16px 40px -16px rgba(20, 33, 61, 0.22)",
        "2xl": "0 24px 60px -20px rgba(20, 33, 61, 0.25)",
        none: "none",
      },
      colors: {
        // the accent: primary buttons, links, active states, focus
        brand: { DEFAULT: "#2448E8", hover: "#1A36B8", soft: "#EEF2FE" },
        // thin borders: cards (line) and inputs / secondary buttons (line-strong)
        line: { DEFAULT: "#E6E9EF", strong: "#D5DAE3" },
        // the older names, kept so every page follows the same palette
        ink: "#14213D",
        paper: "#F6F7FA",
        pen: "#2448E8",
        pencil: "#EEF2FE",
        rule: "#E6E9EF",
        blue: { 50: "#EEF2FE", 100: "#DCE4FC", 200: "#B9C8F8", 300: "#8CA3F2", 400: "#5A78EC", 500: "#2448E8", 600: "#2448E8", 700: "#1A36B8", 800: "#152C94", 900: "#14213D" },
        indigo: { 50: "#EEF2FE", 100: "#DCE4FC", 200: "#B9C8F8", 300: "#8CA3F2", 400: "#5A78EC", 500: "#2448E8", 600: "#2448E8", 700: "#1A36B8", 800: "#152C94", 900: "#14213D" },
        // cool greys; 500 and up pass 4.5:1 on #FFFFFF and on #F6F7FA
        slate: { 50: "#F6F7FA", 100: "#EEF1F6", 200: "#E6E9EF", 300: "#D5DAE3", 400: "#8A93A6", 500: "#5C6579", 600: "#545E73", 700: "#3D465A", 800: "#2A3245", 900: "#14213D" },
        gray: { 50: "#F6F7FA", 100: "#EEF1F6", 200: "#E6E9EF", 300: "#D5DAE3", 400: "#8A93A6", 500: "#5C6579", 600: "#545E73", 700: "#3D465A", 800: "#2A3245", 900: "#14213D" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      // buttons and inputs 10px (xl), cards 14px (2xl)
      borderRadius: {
        xl: "10px",
        "2xl": "14px",
        "3xl": "16px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(24px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "scale-in": { from: { opacity: "0", transform: "scale(0.9)" }, to: { opacity: "1", transform: "scale(1)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
        "fade-in": "fade-in 0.5s ease-out both",
        "scale-in": "scale-in 0.5s ease-out both",
        shimmer: "shimmer 2.5s infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
