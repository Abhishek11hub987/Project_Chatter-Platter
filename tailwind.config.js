/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFC107',
          dark: '#F5A623',
        },
        secondary: '#1A1A1A',
        background: '#FFFDF5',
        surface: '#FFFFFF',
        accent: '#6F4E37',
        success: '#22C55E',
        warning: '#F97316',
        danger: '#EF4444',
        muted: '#9CA3AF',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
