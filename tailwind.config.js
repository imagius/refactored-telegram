/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'factorio': {
          'bg': '#1a1a2e',
          'panel': '#16213e',
          'border': '#2a2a4a',
          'accent': '#e94560',
          'text': '#c4c4c4',
          'text-bright': '#ffffff',
          'green': '#4ade80',
          'yellow': '#facc15',
          'red': '#f87171',
        }
      }
    }
  },
  plugins: [],
}