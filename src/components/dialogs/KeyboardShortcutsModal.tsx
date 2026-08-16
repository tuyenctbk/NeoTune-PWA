import React from 'react';
import { X, Keyboard, Play, Volume2, SkipForward, Heart, Sliders, Moon, Car, HelpCircle, Maximize, RotateCcw } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space or K', desc: 'Play / Pause audio stream', icon: <Play className="w-4 h-4" /> },
    { key: 'M', desc: 'Mute / Unmute audio', icon: <Volume2 className="w-4 h-4" /> },
    { key: 'F', desc: 'Toggle Full-Screen Mode', icon: <Maximize className="w-4 h-4" /> },
    { key: '↑ / ↓', desc: 'Volume up / down (±5%)', icon: <Volume2 className="w-4 h-4" /> },
    { key: '← / →', desc: 'Previous / Next radio station', icon: <SkipForward className="w-4 h-4" /> },
    { key: 'L', desc: 'Toggle Favorite for current station', icon: <Heart className="w-4 h-4" /> },
    { key: 'J', desc: 'Rewind podcast 10 seconds', icon: <RotateCcw className="w-4 h-4" /> },
    { key: 'E', desc: 'Open Equalizer & Audio Booster', icon: <Sliders className="w-4 h-4" /> },
    { key: 'S', desc: 'Open Sleep Timer dialog', icon: <Moon className="w-4 h-4" /> },
    { key: 'C', desc: 'Toggle Car Driving Mode', icon: <Car className="w-4 h-4" /> },
    { key: '? or H', desc: 'Show this keyboard shortcuts guide', icon: <HelpCircle className="w-4 h-4" /> }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative my-auto w-full max-w-lg h-auto max-h-[85vh] sm:max-h-[88vh] rounded-3xl bg-[#12121a] border border-white/20 p-4 sm:p-6 shadow-2xl shadow-black/95 flex flex-col">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shrink-0">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Keyboard Shortcuts</h3>
              <p className="text-xs text-[var(--text-muted)]">Hotkeys for playback control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 ml-auto"
            aria-label="Close Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2 overflow-y-auto flex-1 pr-1 overscroll-contain">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-[var(--accent-primary)]">{sc.icon}</div>
                <span className="text-xs text-[var(--text-primary)] font-medium">{sc.desc}</span>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/15 text-xs font-mono font-semibold text-[var(--accent-primary)] shadow-inner">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] text-black font-bold text-xs hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
