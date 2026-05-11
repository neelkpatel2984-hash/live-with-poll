import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import GlassCard from './GlassCard';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl dark:border-slate-700/30 dark:bg-slate-950/30 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link
          to="/"
          className="font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Live Poll <span className="text-cyan-600 dark:text-cyan-400">&</span>{' '}
          Forms
        </Link>
        <div className="flex items-center gap-2">
          <GlassCard
            as={Link}
            to="/"
            className="!p-2 text-sm font-medium text-slate-800 no-underline hover:bg-white/15 dark:text-slate-100 dark:hover:bg-slate-800/40"
          >
            Home
          </GlassCard>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
