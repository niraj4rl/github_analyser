import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        card: '#161b22',
        'card-soft': '#1c2128',
        border: '#30363d',
        muted: '#8b949e',
        primary: '#1f6feb',
        'primary-hover': '#388bfd',
        accent: '#3fb950',
        danger: '#f85149',
        warning: '#d29922',
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
