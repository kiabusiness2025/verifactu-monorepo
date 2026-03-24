/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        isaak: {
          blue: '#2361d8',
          blueDark: '#1f55c0',
          navy: '#011c67',
        },
      },
    },
  },
  plugins: [],
};