/** @type {import('tailwindcss').Config} */
export default {
  corePlugins: {
    preflight: false, // Disables Tailwind’s base styles and reset
  },
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
