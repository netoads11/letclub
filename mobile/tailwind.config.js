/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#BFDB1E",
          foreground: "#1A1A1A",
        },
        secondary: {
          DEFAULT: "#B07664",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#EFEFEF",
          foreground: "#888888",
        },
        card: {
          DEFAULT: "#FCFCFC",
          foreground: "#1A1A1A",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        border: "#ECECEC",
        input: "#ECECEC",
        ring: "#BFDB1E",
        background: "#F8F8F8",
        foreground: "#1A1A1A",
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
