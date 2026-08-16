import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

interface TVFocusManagerProps {
  enabled: boolean;
  onAutoScreensaver: () => void;
}

export const TVFocusManager: React.FC<TVFocusManagerProps> = ({ enabled, onAutoScreensaver }) => {
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      lastActivityRef.current = Date.now();

      const focusableSelectors = 'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"]), .tv-focusable';
      const focusables = Array.from(document.querySelectorAll(focusableSelectors)) as HTMLElement[];
      const activeEl = document.activeElement as HTMLElement;

      const currentIndex = focusables.indexOf(activeEl);

      if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const nextIndex = currentIndex < focusables.length - 1 ? currentIndex + 1 : 0;
        focusables[nextIndex]?.focus();
      } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusables.length - 1;
        focusables[prevIndex]?.focus();
      } else if (e.key === ' ' && activeEl?.tagName !== 'INPUT') {
        e.preventDefault();
        audioEngine.togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Check inactivity every 5 seconds; if >15s and playing, launch screensaver
    timerRef.current = setInterval(() => {
      const state = audioEngine.getState();
      if (state.isPlaying && Date.now() - lastActivityRef.current > 15000) {
        onAutoScreensaver();
      }
    }, 5000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, onAutoScreensaver]);

  return null;
};
