/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        aics: {
          navy: '#0B1F4D',
          navyMid: '#132E6B',
          royal: '#1E469B',
          royalLight: '#2557BE',
          azure: '#4E92DF',
          sky: '#7CB8F7',
          periwinkle: '#CFD9F2',
          ice: '#E4ECFC',
          silver: '#F4F7FC',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
