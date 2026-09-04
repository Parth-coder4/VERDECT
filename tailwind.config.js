/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Core VERDECT Brand Colors
        verdect: {
          navy: '#0A192F',
          dark: '#070D19',
          deep: '#0F172A',
          cyan: '#0284C7',
          teal: '#00A3C4',
          sky: '#38BDF8',
          accent: '#0EA5E9',
          surface: '#F8FAFC',
          border: '#E2E8F0',
          darkCard: '#111C2E',
          darkBorder: '#1E2F4D',
        },
        // Material & semantic tokens
        "primary": "#0A192F",
        "on-primary": "#ffffff",
        "primary-container": "#0F243E",
        "on-primary-container": "#93C5FD",
        "primary-fixed": "#DAE2FD",
        "primary-fixed-dim": "#BEC6E0",
        "on-primary-fixed": "#131B2E",
        "on-primary-fixed-variant": "#3F465C",
        "inverse-primary": "#BEC6E0",
        
        "secondary": "#0284C7",
        "on-secondary": "#ffffff",
        "secondary-container": "#38BDF8",
        "on-secondary-container": "#0369A1",
        "secondary-fixed": "#CCE5FF",
        "secondary-fixed-dim": "#93CCFF",
        "on-secondary-fixed": "#001D31",
        "on-secondary-fixed-variant": "#004B73",
        
        "tertiary": "#0D9488",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#042F2E",
        "on-tertiary-container": "#2DD4BF",
        "tertiary-fixed": "#6FFBBE",
        "tertiary-fixed-dim": "#4EDEA3",
        "on-tertiary-fixed": "#002113",
        "on-tertiary-fixed-variant": "#005236",
        
        "surface": "#F8FAFC",
        "on-surface": "#0F172A",
        "surface-dim": "#D8DADC",
        "surface-bright": "#F8FAFC",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#F1F5F9",
        "surface-container": "#E2E8F0",
        "surface-container-high": "#CBD5E1",
        "surface-container-highest": "#94A3B8",
        "on-surface-variant": "#475569",
        "surface-variant": "#E2E8F0",
        "surface-tint": "#0284C7",
        "inverse-surface": "#1E293B",
        "inverse-on-surface": "#F8FAFC",
        
        "background": "#F8FAFC",
        "on-background": "#0F172A",
        
        "outline": "#64748B",
        "outline-variant": "#CBD5E1",
        
        "error": "#DC2626",
        "on-error": "#ffffff",
        "error-container": "#FEE2E2",
        "on-error-container": "#991B1B",

        // Status Indicators
        "pass": "#10B981",
        "pass-bg": "#ECFDF5",
        "pass-border": "#A7F3D0",
        "pass-dark-bg": "#064E3B",
        "pass-dark-border": "#047857",

        "fail": "#EF4444",
        "fail-bg": "#FEF2F2",
        "fail-border": "#FECACA",
        "fail-dark-bg": "#7F1D1D",
        "fail-dark-border": "#B91C1C",

        "review": "#F59E0B",
        "review-bg": "#FFFBEB",
        "review-border": "#FDE68A",
        "review-dark-bg": "#78350F",
        "review-dark-border": "#D97706",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px"
      },
      spacing: {
        "container-max": "1440px",
        "gutter": "20px",
        "base": "4px",
        "xs": "8px",
        "sm": "16px",
        "md": "24px",
        "lg": "32px",
        "xl": "48px"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        "headline-lg": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "display-lg": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
        "data-mono": ["JetBrains Mono", "ui-monospace", "monospace"]
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(14, 165, 233, 0.35)',
        'glow-teal': '0 0 25px -4px rgba(2, 132, 199, 0.4)',
        'dark-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    }
  },
  plugins: []
};
