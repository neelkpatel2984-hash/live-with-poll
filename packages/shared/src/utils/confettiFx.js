let confettiLoader;

async function getConfetti() {
  if (!confettiLoader) {
    confettiLoader = import('canvas-confetti').then((m) => m.default);
  }
  return confettiLoader;
}

export async function burstConfetti(strength = 1) {
  const confetti = await getConfetti();
  const count = Math.min(220, Math.round(80 * strength));
  const defaults = { spread: 72, ticks: 120, gravity: 0.9, decay: 0.94 };
  confetti({ ...defaults, particleCount: count, origin: { x: 0.25, y: 0.7 } });
  confetti({
    ...defaults,
    particleCount: Math.round(count * 0.6),
    origin: { x: 0.75, y: 0.65 },
  });
}

export async function leaderboardConfetti() {
  const confetti = await getConfetti();
  const duration = 2200;
  const end = Date.now() + duration;
  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors: ['#f87171', '#fbbf24', '#34d399'],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors: ['#a78bfa', '#22d3ee', '#fb7185'],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
