import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#05070d',
        foreground: '#f4f6fb',
        card: '#0f1420',
        'card-soft': '#151b2a',
        border: '#273043',
        muted: '#93a1b8',
        primary: '#7f8cff',
        'primary-hover': '#a09cff',
        accent: '#7ce6d4',
        danger: '#ff748a',
        warning: '#f4b860',
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
