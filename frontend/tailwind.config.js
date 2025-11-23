/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,cjs}"],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
      },
      colors: {
        slatebg: "#0b1120",
        card: "#0f172a",
        outline: "#1f2937",
        success: "#22c55e",
        warn: "#f59e0b",
        info: "#38bdf8",
        primary: "#3b82f6",
      },
      boxShadow: {
        glowGreen: "0 0 0 2px rgba(34,197,94,.2), 0 0 60px rgba(34,197,94,.15) inset",
        glowCyan: "0 0 0 2px rgba(56,189,248,.2), 0 0 60px rgba(56,189,248,.15) inset",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
