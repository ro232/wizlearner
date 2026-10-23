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
        sans: ["var(--font-nunito)", "Nunito", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      // "Caiet de școală": blue = navy ink, orange = red correction pen, slate = warm paper greys.
      boxShadow: {
        sm: "0 0 0 1.5px #E6DECD",
        DEFAULT: "0 0 0 1.5px #E6DECD",
        md: "0 0 0 2px #1F2A44, 3px 3px 0 #1F2A44",
        lg: "0 0 0 2px #1F2A44, 5px 5px 0 #1F2A44",
        xl: "0 0 0 2px #1F2A44, 7px 7px 0 #1F2A44",
        "2xl": "0 0 0 2px #1F2A44, 10px 10px 0 #1F2A44",
        none: "none",
      },
      colors: {
        ink: "#1F2A44",
        paper: "#FBF7EE",
        pen: "#C8102E",
        pencil: "#F2B632",
        rule: "#DCE6F2",
        blue: { 50: "#EEF2F8", 100: "#DCE4F0", 200: "#B9C7DA", 300: "#8FA3BF", 400: "#6179A0", 500: "#3A5280", 600: "#2A3D63", 700: "#1F2A44", 800: "#172034", 900: "#101726" },
        orange: { 50: "#FDF0F1", 100: "#FADADD", 200: "#F3B3BA", 300: "#E97F8B", 400: "#DC4C5D", 500: "#C8102E", 600: "#A80D26", 700: "#870A1F", 800: "#650818", 900: "#450511" },
        indigo: { 50: "#EEF2F8", 100: "#DCE4F0", 200: "#B9C7DA", 300: "#8FA3BF", 400: "#6179A0", 500: "#3A5280", 600: "#2A3D63", 700: "#1F2A44", 800: "#172034", 900: "#101726" },
        slate: { 50: "#FBF7EE", 100: "#F4EEE1", 200: "#E6DECD", 300: "#D3C8B3", 400: "#8C8474", 500: "#6B6455", 600: "#56504A", 700: "#3F3B35", 800: "#2A2724", 900: "#1F2A44" },
        gray: { 50: "#FBF7EE", 100: "#F4EEE1", 200: "#E6DECD", 300: "#D3C8B3", 400: "#8C8474", 500: "#6B6455", 600: "#56504A", 700: "#3F3B35", 800: "#2A2724", 900: "#1F2A44" },
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
      borderRadius: {
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
        "glow-pulse": { "0%, 100%": { boxShadow: "0 0 20px rgba(232,145,58,0.3)" }, "50%": { boxShadow: "0 0 40px rgba(232,145,58,0.5)" } },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
        "fade-in": "fade-in 0.5s ease-out both",
        "scale-in": "scale-in 0.5s ease-out both",
        shimmer: "shimmer 2.5s infinite",
        float: "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
