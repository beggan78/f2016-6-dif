/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      animation: {
        'glow-and-fade': 'glow-and-fade 5s ease-in-out forwards',
      },
      keyframes: {
        'glow-and-fade': {
          '0%, 30%, 60%': { 
            boxShadow: '0 0 8px rgba(56, 189, 248, 0.5), 0 0 12px rgba(56, 189, 248, 0.4)',
            transform: 'scale(1.0)'
          },
          '15%, 45%': { 
            boxShadow: '0 0 16px rgba(56, 189, 248, 0.8), 0 0 24px rgba(56, 189, 248, 0.6)',
            transform: 'scale(1.02)'
          },
          '100%': { 
            boxShadow: '0 0 0px rgba(56, 189, 248, 0), 0 0 0px rgba(56, 189, 248, 0)',
            transform: 'scale(1.0)'
          },
        }
      }
    },
  },
  plugins: [],
}