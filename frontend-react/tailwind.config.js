/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Force class-based dark mode (Fixes Vercel caching issue)
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
