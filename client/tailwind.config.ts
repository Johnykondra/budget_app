import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#778197",
        accent: "#6d5ce8"
      },
      boxShadow: {
        soft: "0 12px 40px rgba(27, 38, 68, 0.07)"
      }
    }
  },
  plugins: []
} satisfies Config;
