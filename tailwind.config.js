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
          DEFAULT: '#f15a29', // Vibrant Red for CTA
          light: '#d63f18',
          dark: '#bd3518',
        },
        secondary: {
          DEFAULT: '#F5F5DC', // Cream/Beige for background
          dark: '#EADDCA',
        },
        accent: {
          DEFAULT: '#1D3557', // Deep Navy/Charcoal for text/contrast
          light: '#457B9D',
        }
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      }
    },
  },
  plugins: [],
}