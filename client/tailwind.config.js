/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: '#0e1621',
          card: '#17212b',
          accent: '#2b5278',
          green: '#3ba55c',
          red: '#e53935',
          gold: '#f5a623',
          text: '#ffffff',
          muted: '#8b9aab',
        },
      },
    },
  },
  plugins: [],
};
