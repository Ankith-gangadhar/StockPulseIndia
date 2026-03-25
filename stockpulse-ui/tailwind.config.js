/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0f14',
        surface: '#121820',
        neonGreen: '#00ff41',
        neonRed: '#ff003c',
        neonAmber: '#ffb000'
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}
