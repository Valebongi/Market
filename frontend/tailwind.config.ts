import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Primary
        "midnight-blue": "#0A2540",
        "electric-blue": "#2563EB",
        "deep-emerald": "#059669",
        // Secondary
        "soft-indigo": "#4F46E5",
        "warm-amber": "#D97706",
        "soft-coral": "#DC2626",
        // Grays
        "snow-gray": "#F9FAFB",
        "fog-gray": "#E5E7EB",
        "slate-gray": "#6B7280",
        "carbon-gray": "#1F2937",
        // Aliases for Tailwind
        brand: {
          primary: "#0A2540",
          interactive: "#2563EB",
          success: "#059669",
          secondary: "#4F46E5",
          warning: "#D97706",
          error: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-poppins)", "var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        "display": ["60px", { lineHeight: "1.1", fontWeight: "700" }],
        "h1": ["48px", { lineHeight: "1.2", fontWeight: "700" }],
        "h2": ["36px", { lineHeight: "1.3", fontWeight: "600" }],
        "h3": ["28px", { lineHeight: "1.4", fontWeight: "600" }],
        "h4": ["20px", { lineHeight: "1.5", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6" }],
        "body": ["16px", { lineHeight: "1.5" }],
        "body-sm": ["14px", { lineHeight: "1.5" }],
        "caption": ["12px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      spacing: {
        "xs": "4px",
        "sm": "8px",
        "md": "16px",
        "lg": "24px",
        "xl": "32px",
        "2xl": "48px",
        "3xl": "64px",
        "4xl": "96px",
      },
      borderRadius: {
        "DEFAULT": "8px",
        "lg": "12px",
        "xl": "16px",
        "2xl": "24px",
      },
      boxShadow: {
        "subtle": "0 1px 3px rgba(0,0,0,0.05)",
        "medium": "0 4px 12px rgba(0,0,0,0.1)",
        "large": "0 20px 60px rgba(0,0,0,0.3)",
        "focus": "0 0 0 3px rgba(37,99,235,0.1)",
        "focus-error": "0 0 0 3px rgba(220,38,38,0.1)",
      },
      maxWidth: {
        "narrow": "640px",
        "standard": "896px",
        "wide": "1280px",
        "full-market": "1440px",
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(45deg, #0A2540 0%, #2563EB 100%)",
        "success-gradient": "linear-gradient(135deg, #059669 0%, #10B981 100%)",
      },
      animation: {
        "shimmer": "shimmer 1.5s linear infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "spin": "spin 1s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
