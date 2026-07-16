import type { Config } from 'tailwindcss'

/**
 * Token 来源：DESIGN.md（特藏调阅台）。
 *
 * colors / fontSize / borderRadius / spacing 由
 *   npx -p @google/design.md designmd export DESIGN.md --format json-tailwind
 * 生成。导出器有两处不覆盖，下面手写补上，改 DESIGN.md 后需同步：
 *   1. fontSize 的 lineHeight 会被导出器丢弃
 *   2. motion / elevation / measure 是自定义组，导出器不认
 *
 * DESIGN.md 的 `primary` 不在此处登记：它的值与 graphite 相同，存在的意义是
 * 防止 agent 在缺主色时自行编一个蓝色。代码里一律写 graphite。
 */
export default {
  // 本系统无暗色模式（DESIGN.md）。锁在 class 上且从不挂 .dark，
  // 以免 prefers-color-scheme 把 dark: 变体激活。
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ↓↓↓ 特藏调阅台 —— DESIGN.md ↓↓↓
        paper: '#FCFCFC',
        desk: {
          DEFAULT: '#F1F1F3',
          hover: '#E8E8EC',
          sunken: '#DEDEE3',
        },
        graphite: {
          DEFAULT: '#1C1C1E',
          70: '#5B5B61',
          45: '#6C6C73',
          25: '#B8B8BE',
        },
        rule: {
          DEFAULT: '#E4E4E7',
          strong: '#D6D6DA',
        },
        seal: {
          DEFAULT: '#B03227',
          pale: '#F7E4E1',
        },
        accent: {
          blue: '#1F5FA9',
          violet: '#6B3D9E',
          green: '#3F6B4C',
          amber: '#7A5718',
        },
        alert: {
          fill: '#FBE9E6',
          ink: '#7A2A20',
        },
        focus: '#1C1C1E',

        // ↓↓↓ 旧系统 —— 待迁移，勿在新代码中使用 ↓↓↓
        // 仍被 search / dashboard / document / admin 四条线引用。
        // 每迁完一页删一部分，全部迁完后整块移除。
        primary: {
          DEFAULT: '#6366F1',
          50: '#EEF2FF',
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
        sidebar: {
          bg: '#0F0F0F',
          hover: '#1A1A1A',
          active: '#1F1F2E',
          border: '#2A2A2A',
          text: '#A1A1AA',
          'text-active': '#FFFFFF',
        },
        surface: {
          DEFAULT: '#FAFAFA',
          card: '#FFFFFF',
          border: '#E4E4E7',
          muted: '#F4F4F5',
        },
      },

      fontFamily: {
        sans: ['IBM Plex Sans', 'IBM Plex Sans SC', 'sans-serif'],
        // 索书号：文档 ID、chunk ID、相似度、名次、耗时
        callnum: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },

      // [字号, { 行高, 字重, 字距 }] —— 行高为导出器丢弃后手工补回
      fontSize: {
        display: ['28px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '400' }],
        'title-lg': ['18px', { lineHeight: '1.4', fontWeight: '500' }],
        title: ['15px', { lineHeight: '1.4', fontWeight: '500' }],
        body: ['14px', { lineHeight: '1.65', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '1.6', fontWeight: '400' }],
        label: ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        meta: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        callnum: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        'callnum-sm': ['11px', { lineHeight: '1.4', fontWeight: '400' }],
      },

      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        full: '9999px',
        // 旧系统，待迁移
        card: '12px',
        button: '8px',
      },

      spacing: {
        xxs: '2px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        xxl: '32px',
      },

      // elevation —— 手写。纸平放在桌上，只有浮层离开桌面
      boxShadow: {
        overlay: '0 4px 16px rgba(0,0,0,0.08)',
        // 旧系统，待迁移
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10)',
      },

      // measure —— 手写
      maxWidth: {
        prose: '640px',
      },

      // motion —— 手写。纸和铅笔不弹跳
      transitionDuration: {
        hover: '120ms',
        standard: '180ms',
        overlay: '220ms',
        progress: '1400ms',
      },
      transitionTimingFunction: {
        settle: 'cubic-bezier(0.2, 0, 0, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
      },

      // 持续性动效唯一的合法用途：表示某件事真的正在进行。
      // 不受 220ms 约束——它不是过渡，是读数。位移为零，只有明度在动。
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        breathe: 'breathe 1400ms cubic-bezier(0.2, 0, 0, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
