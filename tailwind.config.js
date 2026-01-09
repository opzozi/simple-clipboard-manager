/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/popup/index.html"
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#3f4753',
        },
      },
    },
  },
  plugins: [],
}
