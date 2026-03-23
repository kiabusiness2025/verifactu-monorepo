/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        holded: {
          coral: '#ff5460',
          coralDark: '#ef4654',
        },
      },
    },
  },
  plugins: [],
};
