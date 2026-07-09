/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          50: '#eef5ef',
          100: '#dbe6db',
          200: '#b7cdbe',
          300: '#9aa89f',
          400: '#5c6b62',
          500: '#3a4a41',
          600: '#148143',
          700: '#0c3a22',
          800: '#072716',
          900: '#03120a',
        },
        gold: {
          400: '#ffdb58',
          500: '#ffcf33',
          600: '#e6b800',
        }
      }
    },
  },
  plugins: [],
}
