/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080b10',
        surface: '#0d1117',
        surface2: '#141b24',
        surface3: '#1a2332',
        border: '#1e2d3d',
        accent: '#00d4ff',
        accent2: '#7c3aed',
        accent3: '#10b981',
        accent4: '#f59e0b',
        accent5: '#ef4444',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Syne"', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
