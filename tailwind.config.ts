import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './server/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0f1e35',
          80: '#1a2f4a',
          60: '#243f61',
        },
        brand: {
          blue: '#1d6fca',
          'blue-lt': '#3d8de0',
          'blue-pale': '#e8f2fd',
          teal: '#0e9e72',
          'teal-lt': '#12b884',
          'teal-pale': '#e0f5ee',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      borderRadius: {
        lg: '10px',
        xl: '14px',
        '2xl': '20px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(15,30,53,.08), 0 1px 2px rgba(15,30,53,.04)',
        md: '0 4px 16px rgba(15,30,53,.10), 0 1px 4px rgba(15,30,53,.06)',
        lg: '0 8px 32px rgba(15,30,53,.14), 0 2px 8px rgba(15,30,53,.08)',
      },
    },
  },
  plugins: [],
}

export default config
