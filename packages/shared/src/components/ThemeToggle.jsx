import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="glass-input inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-neutral-100 transition hover:bg-white/10"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={`Theme: ${theme}`}
    >
      <span className="text-base" aria-hidden>
        {isDark ? '☀️' : '🌙'}
      </span>
      <span className="hidden sm:inline">
        {isDark ? 'Light' : 'Dark'}
      </span>
    </button>
  );
}
