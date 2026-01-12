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
          DEFAULT: '#002060',
          light: '#0060F0',
          lighter: '#20B0F0',
          accent: '#0080F0',
        },
        darkbg: {
          DEFAULT: '#002060',
          700: '#002060',
          600: '#0060F0',
          500: '#20B0F0',
          accent: '#0080F0',
        },
        lightbg: {
          DEFAULT: '#002060',
          700: '#002060',
          600: '#4a6aa0',
          500: '#7ea0d1',
        },
        // Metálico (estilo robot)
        metallic: {
          light: '#e6e8ea',
          medium: '#bfc3c7',
          dark: '#7a7d80',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(90deg, #0060F0 0%, #20B0F0 100%)',
        'gradient-light': 'linear-gradient(90deg, #002060 0%, #4a6aa0 100%)',
        'gradient-metallic': 'linear-gradient(90deg, #e6e8ea 0%, #bfc3c7 50%, #7a7d80 100%)',
      },
    },
  },
  plugins: [],
};
