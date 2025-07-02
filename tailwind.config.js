/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Barlow Semi Condensed"', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
      },
      colors: {
        'primary-black': '#000000',
        'primary-white': '#ffffff',
        'primary-blue': '#8cc9ff',
        'primary-yellow': '#f0ff8c',
        'primary-mint': '#d8fdf0',
        'primary-peach': '#fdc0a8',
        'primary-lavender': '#cfceff',
        'primary-green': '#81f08c',
      },
      aspectRatio: {
        'vertical': '9 / 16',
      },
      lineClamp: {
        7: '7',
        8: '8',
      },
    },
  },
  plugins: [],
}
