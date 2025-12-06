/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B35',
        secondary: '#F72C25',
        background: '#0D0D0D',
        surface: '#1A1A2E',
        text: '#FFFFFF',
        'text-muted': '#9CA3AF',
        success: '#10B981',
        warning: '#F59E0B',
      },
    },
  },
  plugins: [],
};
