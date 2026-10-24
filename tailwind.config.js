/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef1ff",
          100: "#dfe4ff",
          200: "#c2caff",
          300: "#9aa6ff",
          400: "#7280f7",
          500: "#5560ee",
          600: "#4147d6",
          700: "#3438ae",
          800: "#2c3189",
          900: "#262a6b",
        },
        accent: {
          success: "#2e8b57",
          warning: "#d9822b",
          danger: "#b3261e",
        },
      },
      borderRadius: {
        xl: "0.875rem",
      },
      boxShadow: {
        card: "0 2px 10px rgba(16, 42, 67, 0.06)",
        glass: "0 8px 32px rgba(49, 46, 129, 0.14)",
      },
      keyframes: {
        "float-up": {
          "0%, 100%": { transform: "translateY(0) rotate(var(--rot, 0deg))" },
          "50%": { transform: "translateY(-16px) rotate(var(--rot, 0deg))" },
        },
        "float-down": {
          "0%, 100%": { transform: "translateY(0) rotate(var(--rot, 0deg))" },
          "50%": { transform: "translateY(14px) rotate(var(--rot, 0deg))" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: 0.35 },
          "50%": { opacity: 0.6 },
        },
      },
      animation: {
        "float-up": "float-up 6s ease-in-out infinite",
        "float-down": "float-down 7s ease-in-out infinite",
        "spin-slow": "spin-slow 18s linear infinite",
        "pulse-soft": "pulse-soft 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
