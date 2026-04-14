import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 主色调：靛蓝
        primary: {
          DEFAULT: '#6366F1',
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        // 侧边栏背景
        sidebar: {
          bg:     '#0F0F0F',
          hover:  '#1A1A1A',
          active: '#1F1F2E',
          border: '#2A2A2A',
          text:   '#A1A1AA',
          'text-active': '#FFFFFF',
        },
        // 内容区
        surface: {
          DEFAULT: '#FAFAFA',
          card:    '#FFFFFF',
          border:  '#E4E4E7',
          muted:   '#F4F4F5',
        },
      },
      borderRadius: {
        card:   '12px',
        button: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10)',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
