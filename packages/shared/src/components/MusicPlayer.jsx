import { useEffect, useRef } from 'react';
import { MUSIC_TRACKS } from '../constants/musicTracks';

/**
 * Syncs background music from room meta (`musicTrackId`, `musicVolume`).
 * Host writes meta; all clients reflect playback (optional “Off”).
 */
export default function MusicPlayer({ musicTrackId, musicVolume }) {
  const audioRef = useRef(null);
  const lastSrcRef = useRef('');

  useEffect(() => {
    const track = MUSIC_TRACKS.find((t) => t.id === musicTrackId) || MUSIC_TRACKS[0];
    if (!track?.src) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      lastSrcRef.current = '';
      return undefined;
    }

    let cancelled = false;
    const el = audioRef.current || new Audio();
    audioRef.current = el;
    el.loop = true;
    el.volume = Math.min(1, Math.max(0, Number(musicVolume) ?? 0.35));

    if (lastSrcRef.current !== track.src) {
      lastSrcRef.current = track.src;
      el.src = track.src;
      el.load();
      el.play().catch(() => {
        /* missing file or autoplay policy */
      });
    }

    const onErr = () => {
      if (!cancelled) el.pause();
    };
    el.addEventListener('error', onErr);

    return () => {
      cancelled = true;
      el.removeEventListener('error', onErr);
    };
  }, [musicTrackId]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !lastSrcRef.current) return undefined;
    el.volume = Math.min(1, Math.max(0, Number(musicVolume) ?? 0.35));
    if (el.paused) {
      el.play().catch(() => {});
    }
    return undefined;
  }, [musicVolume]);

  return null;
}
