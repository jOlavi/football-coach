/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef3ff',
          100: '#dce7fe',
          500: '#4f8ef7',
          600: '#4f8ef7',
          700: '#3b7de8',
        },
        slate: {
          900: '#0f1929',
          950: '#0d1117',
        },
        border: {
          card: '#1e3a5f',
          divider: '#334155',
        },
      },
    },
  },
  plugins: [],
}
