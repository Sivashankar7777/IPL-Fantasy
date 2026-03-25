import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121212",
        ivory: "#f6f0df",
        ember: "#df5a2f",
        teal: "#0d6f73",
        gold: "#cfaa47",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["'Trebuchet MS'", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
