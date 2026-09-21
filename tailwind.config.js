/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        batesville: {
          50: '#f6f5f3',
          100: '#ede8e1',
          200: '#ded4c6',
          300: '#c7b79f',
          400: '#ab9577',
          500: '#8c7657',
          600: '#725e43',
          700: '#5a4935',
          800: '#473a2b',
          900: '#3a3024',
          950: '#1f1912',
        },
        navy: {
          800: '#131e2e',
          900: '#0c1421',
          950: '#070c14',
        },
        burgundy: {
          700: '#691223',
          800: '#520d1a',
          900: '#3f0712',
        }
      },
      screens: {
        'print': {'raw': 'print'},
      }
    },
  },
  plugins: [],
}
