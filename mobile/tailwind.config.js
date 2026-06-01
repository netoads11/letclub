/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7C3AED",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1E1B4B",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        border: "#E2E8F0",
        background: "#F8FAFC",
        foreground: "#0F172A",
      },
      fontFamily: {
        display: ["Intelo-Bold"],
        "display-medium": ["Intelo-Medium"],
        "display-semibold": ["Intelo-SemiBold"],
        "display-extrabold": ["Intelo-ExtraBold"],
        body: ["Intelo-Regular"],
      },
    },
  },
  plugins: [],
};
