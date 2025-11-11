const {nextui} = require("@nextui-org/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./layout/**/*.{js,ts,jsx,tsx,mdx}",
    "../../node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1D4ED8",
        secondary: "#38BDF8",
        backgroundDark: "#0F172A",
        textLight: "#F8FAFC",
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1D4ED8 0%, #38BDF8 100%)',
      }
    },
  },
  darkMode: "class",
  plugins: [
    nextui(),
    require('@tailwindcss/forms'),
  ],
};
