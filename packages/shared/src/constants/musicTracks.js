/**
 * Background tracks. Place matching files under `public/music/` or swap `src`
 * for hosted URLs. "Off" disables playback.
 */
export const MUSIC_TRACKS = [
  { id: 'off', label: 'Off', src: null },
  {
    id: 'quiz',
    label: 'Quiz energy',
    src: '/music/quiz.mp3',
  },
  {
    id: 'upbeat',
    label: 'Upbeat',
    src: '/music/upbeat.mp3',
  },
  {
    id: 'relaxed',
    label: 'Relaxed',
    src: '/music/relaxed.mp3',
  },
  {
    id: 'focus',
    label: 'Focus',
    src: '/music/focus.mp3',
  },
  {
    id: 'ambient',
    label: 'Ambient',
    src: '/music/ambient.mp3',
  },
];

export const DEFAULT_MUSIC_TRACK_ID = 'off';
export const DEFAULT_MUSIC_VOLUME = 0.35;
