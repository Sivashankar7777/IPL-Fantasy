import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ipl: {
          navy: "#16243f",
          dark: "#13203a",
          blue: "#19398a",
          lightBlue: "#3b82f6",
          gold: "#e2b45a",
          brightGold: "#fbd160",
          silver: "#e2e8f0",
          red: "#ef4444"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'ipl-gradient': 'linear-gradient(to right, #0a192f, #19398a)',
        'gold-gradient': 'linear-gradient(to right, #e2b45a, #fbd160)',
      },
      boxShadow: {
        'glow-gold': '0 0 20px rgba(226, 180, 90, 0.4)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4)',
      }
    },
  },
  plugins: [],
} satisfies Config;
