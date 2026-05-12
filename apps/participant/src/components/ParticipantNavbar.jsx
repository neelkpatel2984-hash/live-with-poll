import { Link } from 'react-router-dom';
import ThemeToggle from '@shared/components/ThemeToggle.jsx';
import GlassCard from '@shared/components/GlassCard.jsx';

const HOST_APP_URL = (import.meta.env.VITE_HOST_APP_URL || '').replace(/\/$/, '');

export default function ParticipantNavbar() {
  return (
    <header className="app-header sticky top-0 z-50 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link
          to="/"
          className="font-semibold tracking-tight text-neutral-50 hover:text-red-200"
        >
          Live with Poll
        </Link>
        <div className="flex items-center gap-2">
          <GlassCard
            as={Link}
            to="/"
            className="!p-2 text-sm font-medium text-neutral-100 no-underline hover:bg-white/10"
          >
            Join
          </GlassCard>
          {HOST_APP_URL ? (
            <GlassCard
              as="a"
              href={HOST_APP_URL}
              className="!p-2 text-sm font-medium text-neutral-100 no-underline hover:bg-white/10"
            >
              Host console
            </GlassCard>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
