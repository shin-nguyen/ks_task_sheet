/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        bg: '#F4F6F5',
        panel: '#FFFFFF',
        ink: '#17252A',
        ink2: '#5A6B70',
        line: '#E2E8E6',
        primary: '#0E7C66',
        'primary-soft': '#E1F2EC',
        be: '#2563EB',
        'be-soft': '#E4EDFF',
        ui: '#D97706',
        'ui-soft': '#FDF0DC',
        done: '#16A34A',
        prog: '#2563EB',
        todo: '#94A3A8',
        gap: '#B9C2C4',
        wknd: '#EFF2F1',
        sidebar: '#0F1B19',
        'sidebar-hover': '#1B2B28',
        'sidebar-active': '#173B32',
      },
      borderRadius: {
        DEFAULT: '10px',
      },
    },
  },
  plugins: [],
};
