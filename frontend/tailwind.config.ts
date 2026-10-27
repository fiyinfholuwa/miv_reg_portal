import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#071d36',
        navy: '#062443',
        cream: '#f6f2e9',
        coral: '#cf4437',
        sky: '#dbe9f8',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Arial', 'sans-serif'],
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 70px rgba(7, 29, 54, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
