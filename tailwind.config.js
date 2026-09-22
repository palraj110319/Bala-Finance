/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1B2A3D',
          light: '#26394F',
          text: '#24303D',
        },
        paper: {
          DEFAULT: '#E8EAE3',
          card: '#F2F3EE',
        },
        brass: {
          DEFAULT: '#B08D57',
          light: '#C6A574',
        },
        status: {
          paid: '#3F7A54',
          'paid-bg': '#E4EEE6',
          outstanding: '#A83A32',
          'outstanding-bg': '#F5E5E3',
          renewal: '#C17817',
          'renewal-bg': '#F7EBDA',
          info: '#35618C',
          'info-bg': '#E4EBF1',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
