/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'industrial-bg': '#0f172a',
        'industrial-primary': '#3b82f6',
      }
    },
  },
  plugins: [],
}