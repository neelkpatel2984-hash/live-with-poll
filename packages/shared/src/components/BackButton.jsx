import { useNavigate } from 'react-router-dom';

export default function BackButton({
  to,
  children = 'Back',
  className = '',
  replace = false,
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (to ? navigate(to, { replace }) : navigate(-1))}
      className={`glass-input inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-neutral-100 transition hover:bg-white/10 ${className}`}
    >
      <span aria-hidden>←</span>
      {children}
    </button>
  );
}
