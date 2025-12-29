/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta corporativa principal
        primary: {
          DEFAULT: '#003170',
          light: '#3f99e0',
          lighter: '#b7ecff',
          accent: '#126b4',
        },
        darkbg: {
          DEFAULT: '#003170',
          700: '#003170',
          600: '#3f99e0',
          500: '#b7ecff',
          accent: '#126b4',
        },
        lightbg: {
          DEFAULT: '#00275b',
          700: '#00275b',
          600: '#3c6190',
          500: '#80a3c8',
        },
        // Metálico (estilo robot)
        metallic: {
          light: '#e6e8ea',
          medium: '#bfc3c7',
          dark: '#7a7d80',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(90deg, #003170 0%, #3f99e0 100%)',
        'gradient-light': 'linear-gradient(90deg, #00275b 0%, #3c6190 100%)',
        'gradient-metallic': 'linear-gradient(90deg, #e6e8ea 0%, #bfc3c7 50%, #7a7d80 100%)',
      },
    },
  },
  plugins: [],
};
