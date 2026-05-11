import { Link } from 'react-router-dom';
import ThemeToggle from '@shared/components/ThemeToggle.jsx';
import GlassCard from '@shared/components/GlassCard.jsx';

const PARTICIPANT_APP =
  (import.meta.env.VITE_PARTICIPANT_APP_URL || '').replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');

export default function HostNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link
          to="/"
          className="font-semibold tracking-tight text-neutral-50 hover:text-red-200"
        >
          Live with Poll <span className="text-red-400">Host</span>
        </Link>
        <div className="flex items-center gap-2">
          <GlassCard
            as="a"
            href={`${PARTICIPANT_APP}/`}
            className="!p-2 text-sm font-medium text-neutral-100 no-underline hover:bg-white/10"
          >
            Participant site
          </GlassCard>
          <GlassCard as={Link} to="/" className="!p-2 text-sm font-medium text-neutral-100 no-underline hover:bg-white/10">
            Host home
          </GlassCard>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
