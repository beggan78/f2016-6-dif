/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      animation: {
        glow: 'glow 1.5s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(56, 189, 248, 0.4), 0 0 10px rgba(56, 189, 248, 0.3), 0 0 15px rgba(56, 189, 248, 0.2)',
            transform: 'scale(1.01)'
          },
          '50%': { 
            boxShadow: '0 0 15px rgba(56, 189, 248, 0.7), 0 0 25px rgba(56, 189, 248, 0.5), 0 0 40px rgba(56, 189, 248, 0.3)',
            transform: 'scale(1.03)'
          },
        }
      }
    },
  },
  plugins: [],
}