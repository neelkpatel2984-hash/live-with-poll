/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        glass: {
          light: 'rgba(255, 255, 255, 0.08)',
          dark: 'rgba(15, 23, 42, 0.45)',
          border: 'rgba(255, 255, 255, 0.12)',
          'border-dark': 'rgba(148, 163, 184, 0.15)',
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.12)',
        'glass-lg': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.glass': {
          '@apply bg-white/10 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-500/20 shadow-glass':
            {},
        },
        '.glass-strong': {
          '@apply bg-white/15 dark:bg-slate-900/55 backdrop-blur-2xl border border-white/25 dark:border-slate-400/25 shadow-glass-lg':
            {},
        },
        '.glass-input': {
          '@apply bg-white/5 dark:bg-slate-950/30 backdrop-blur-md border border-white/15 dark:border-slate-600/30 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400/50':
            {},
        },
      });
    },
  ],
};
