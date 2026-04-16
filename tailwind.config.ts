import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        foreground: '#f3f4f6',
        card: '#080a0f',
        'card-soft': '#0d1118',
        border: '#202633',
        muted: '#98a0ad',
        primary: '#d9dee8',
        'primary-hover': '#f3f4f6',
        accent: '#c7ceda',
        danger: '#b8c0cd',
        warning: '#aeb7c5',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 16px 40px rgba(1, 4, 9, 0.45)',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
export default config
