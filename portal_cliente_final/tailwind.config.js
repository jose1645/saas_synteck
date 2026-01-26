/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ... (existing retro)
        retro: {
          950: '#1a1a1a',
          900: '#c0c0c0',
          800: '#808080',
          700: '#ffffff',
          active: '#00ff00',
        },
        // Branding Variables
        brand: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          sidebar: 'var(--bg-sidebar)',
          textPrimary: 'var(--text-primary)',
          textSecondary: 'var(--text-secondary)',
          border: 'var(--border-color)',
          accent: 'var(--accent-color)',
          accentSec: 'var(--accent-secondary)'
        }
      }
    },
  },
  plugins: [],
}