/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        astro: {
          dark: "var(--bg-color, #0B0E14)",
          text: "var(--text-color, #F8FAFC)",
          accent: "var(--accent-color, #38BDF8)",
          alert: "var(--alert-color, #F87171)",
          red: "#FF0000",
          darkred: "#7F0000",
          dimred: "#330000",
        },
      },
    },
  },
  plugins: [],
};
