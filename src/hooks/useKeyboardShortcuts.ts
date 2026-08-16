import { useEffect, useState } from 'react';
import { audioEngine } from '../services/audioEngine';
import { storageService } from '../services/storageService';
import { RadioStation } from '../types';

interface KeyboardShortcutHandlers {
  onOpenShortcuts?: () => void;
  onOpenEQ?: () => void;
  onOpenSleepTimer?: () => void;
  onOpenCarMode?: () => void;
  onOpenSearch?: () => void;
  stations?: RadioStation[];
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers = {}) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let toastTimeout: any = null;

    const showToast = (msg: string) => {
      setToastMessage(msg);
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => setToastMessage(null), 1800);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Global Ctrl+K / Cmd+K search shortcut
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (handlers.onOpenSearch) {
          e.preventDefault();
          handlers.onOpenSearch();
          return;
        }
      }

      // Ignore if typing inside form inputs or editable fields
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.code) {
        case 'Space': {
          e.preventDefault();
          audioEngine.togglePlay();
          break;
        }

        case 'ArrowUp': {
          e.preventDefault();
          const state = audioEngine.getState();
          const newVol = Math.min(1, Math.round((state.volume + 0.05) * 100) / 100);
          audioEngine.setVolume(newVol);
          showToast(`🔊 Volume: ${Math.round(newVol * 100)}%`);
          break;
        }

        case 'ArrowDown': {
          e.preventDefault();
          const state = audioEngine.getState();
          const newVol = Math.max(0, Math.round((state.volume - 0.05) * 100) / 100);
          audioEngine.setVolume(newVol);
          showToast(`🔉 Volume: ${Math.round(newVol * 100)}%`);
          break;
        }

        case 'ArrowRight': {
          // Next station in list or recents
          e.preventDefault();
          const list = (handlers.stations && handlers.stations.length > 0)
            ? handlers.stations
            : storageService.getRecents();
          const state = audioEngine.getState();
          if (list.length > 0) {
            const currentIdx = list.findIndex(s => s.id === state.currentStation?.id);
            const nextIdx = (currentIdx + 1) % list.length;
            const nextStation = list[nextIdx];
            if (nextStation) {
              audioEngine.playStation(nextStation);
              showToast(`📻 Station: ${nextStation.name}`);
            }
          }
          break;
        }

        case 'ArrowLeft': {
          // Previous station
          e.preventDefault();
          const list = (handlers.stations && handlers.stations.length > 0)
            ? handlers.stations
            : storageService.getRecents();
          const state = audioEngine.getState();
          if (list.length > 0) {
            const currentIdx = list.findIndex(s => s.id === state.currentStation?.id);
            const prevIdx = (currentIdx - 1 + list.length) % list.length;
            const prevStation = list[prevIdx];
            if (prevStation) {
              audioEngine.playStation(prevStation);
              showToast(`📻 Station: ${prevStation.name}`);
            }
          }
          break;
        }

        case 'KeyM': {
          e.preventDefault();
          const state = audioEngine.getState();
          audioEngine.toggleMute();
          showToast(state.isMuted ? '🔊 Audio Unmuted' : '🔇 Audio Muted');
          break;
        }

        case 'KeyF': {
          // Toggle Full-screen mode
          e.preventDefault();
          if (typeof document !== 'undefined') {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen?.().then(() => {
                showToast('🖥️ Fullscreen Mode: Active');
              }).catch(() => {
                showToast('🖥️ Fullscreen unavailable in current frame');
              });
            } else {
              document.exitFullscreen?.().then(() => {
                showToast('🖥️ Exited Fullscreen');
              }).catch(() => {});
            }
          }
          break;
        }

        case 'KeyL': {
          // Favorite toggle hotkey
          e.preventDefault();
          const state = audioEngine.getState();
          if (state.currentStation) {
            const isFav = storageService.toggleFavorite(state.currentStation);
            showToast(isFav ? '❤️ Saved to Favorites' : '🤍 Removed from Favorites');
          }
          break;
        }

        case 'KeyK': {
          // Alternative Play/Pause key (YouTube/Media standard)
          e.preventDefault();
          audioEngine.togglePlay();
          break;
        }

        case 'KeyJ': {
          // Seek back 10s for podcast
          e.preventDefault();
          const state = audioEngine.getState();
          if (state.currentEpisode && state.duration > 0) {
            const targetTime = Math.max(0, state.currentTime - 10);
            audioEngine.seek(targetTime);
            showToast('⏪ Rewind 10s');
          }
          break;
        }

        case 'KeyE': {
          if (handlers.onOpenEQ) {
            e.preventDefault();
            handlers.onOpenEQ();
          }
          break;
        }

        case 'KeyS': {
          if (handlers.onOpenSleepTimer) {
            e.preventDefault();
            handlers.onOpenSleepTimer();
          }
          break;
        }

        case 'KeyC': {
          if (handlers.onOpenCarMode) {
            e.preventDefault();
            handlers.onOpenCarMode();
          }
          break;
        }

        case 'Slash': {
          if (e.shiftKey && handlers.onOpenShortcuts) {
            e.preventDefault();
            handlers.onOpenShortcuts();
          }
          break;
        }

        case 'KeyH': {
          if (handlers.onOpenShortcuts) {
            e.preventDefault();
            handlers.onOpenShortcuts();
          }
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (toastTimeout) clearTimeout(toastTimeout);
    };
  }, [handlers]);

  return { toastMessage };
}
