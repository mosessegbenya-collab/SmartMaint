/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#0866E8",
        navy: "#10254D",
        ice: "#F2F8FF",
        line: "#DCE8F4",
      },
    },
  },
  plugins: [],
};
