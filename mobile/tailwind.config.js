/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'mm-blue': '#005BAA',
        'mm-green': '#009E49', // sage
        'mm-amber': '#D97706',
        'mm-rail': '#009E49', // bigc-green
      }
    },
  },
  plugins: [],
}
