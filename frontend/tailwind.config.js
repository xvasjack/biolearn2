/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#1e1e1e',
          text: '#d4d4d4',
          green: '#4ec9b0',
          yellow: '#dcdcaa',
          blue: '#569cd6',
          red: '#f44747'
        }
      }
    }
  },
  plugins: []
};
