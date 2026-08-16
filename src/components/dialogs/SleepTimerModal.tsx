import React, { useState, useEffect } from 'react';
import { X, Moon, Clock, Volume2, Sparkles, AlertCircle, Play, Check } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';
import { triggerHaptic } from '../../utils/haptics';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIMER_OPTIONS = [15, 30, 45, 60, 90, 120];
const FADE_OPTIONS = [
  { value: 0, label: 'No Fade (Instant)' },
  { value: 1, label: '1 min Fade (60s)' },
  { value: 5, label: '5 min Fade' },
  { value: 10, label: '10 min Fade' },
  { value: 15, label: '15 min Fade' },
  { value: 20, label: '20 min Fade' }
];

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ isOpen, onClose }) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [recentDurations, setRecentDurations] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('neotune_recent_sleep_durations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((v): v is number => typeof v === 'number').slice(0, 3);
        }
      } catch (e) {}
    }
    return [];
  });

  const [isFadeOutEnabled, setIsFadeOutEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('neotune_sleep_fade_out_enabled');
    return stored !== 'false';
  });
  const [fadeCurve, setFadeCurve] = useState<'linear' | 'exponential' | 'logarithmic'>(() => {
    if (typeof window === 'undefined') return 'linear';
    const stored = localStorage.getItem('neotune_sleep_fade_curve');
    return (stored as any) || 'linear';
  });
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [fadeSec, setFadeSec] = useState<number | null>(null);
  const [totalSec, setTotalSec] = useState<number | null>(null);
  const [currentVolume, setCurrentVolume] = useState<number>(0.85);

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setRemainingSec(state.sleepTimerRemainingSec);
      setFadeSec(state.sleepTimerFadeSec);
      setTotalSec(state.sleepTimerTotalSec);
      setCurrentVolume(state.volume);
    });
    return unsub;
  }, []);

  const handleStartTimer = (mins = selectedDuration) => {
    const effectiveFade = isFadeOutEnabled ? Math.min(5, mins) : 0;
    audioEngine.startSleepTimer(mins, effectiveFade, fadeCurve);

    // Save mins to recents
    const nextRecents = [mins, ...recentDurations.filter(d => d !== mins)].slice(0, 3);
    setRecentDurations(nextRecents);
    localStorage.setItem('neotune_recent_sleep_durations', JSON.stringify(nextRecents));

    onClose();
  };

  const handleCancelTimer = () => {
    audioEngine.clearSleepTimer();
  };

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isTimerActive = remainingSec !== null && remainingSec > 0;
  const isFadingActive = isTimerActive && fadeSec !== null && fadeSec > 0 && remainingSec <= fadeSec;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative my-auto w-full max-w-md h-auto max-h-[85vh] sm:max-h-[90vh] rounded-3xl bg-[#12121a] border border-white/20 p-4 sm:p-6 shadow-2xl shadow-black/95 flex flex-col">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Sleep Timer</h3>
              <p className="text-xs text-[var(--text-muted)]">Gradual volume fade-out before stopping</p>
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

        <div className="overflow-y-auto flex-1 pr-1 overscroll-contain mt-3 sm:mt-4 space-y-5">
        {/* Active Timer Countdown Box */}
        {isTimerActive ? (
          <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 animate-pulse">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
                    <span>Timer Running</span>
                    {isFadingActive && (
                      <span className="px-1.5 py-0.2 text-[10px] rounded bg-amber-500/20 text-amber-300 font-bold animate-pulse">
                        FADING VOLUME
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                    {formatCountdown(remainingSec)}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCancelTimer}
                className="px-3.5 py-1.5 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 text-xs font-semibold transition-colors min-h-[40px]"
              >
                Cancel Timer
              </button>
            </div>

            {/* Fade Status Pill */}
            {fadeSec && fadeSec > 0 ? (
              <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between text-xs text-indigo-200">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-300" />
                  Fade window: {Math.round(fadeSec / 60)} min
                </span>
                <span>
                  {isFadingActive
                    ? `Volume fading down (${Math.round((remainingSec / fadeSec) * 100)}%)`
                    : `Fade begins in ${formatCountdown(remainingSec - fadeSec)}`}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 1-Tap Quick Select Presets */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-[var(--surface-main)] to-purple-500/10 border border-indigo-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Quick-Select 1-Tap Timers
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Instant Start</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[15, 30, 60, 90].map((mins) => (
              <button
                key={`quick_${mins}`}
                onClick={() => handleStartTimer(mins)}
                className="py-2 px-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/30 text-indigo-200 hover:text-white text-xs font-bold transition-all shadow-sm flex flex-col items-center justify-center min-h-[44px] cursor-pointer"
              >
                <span className="text-sm font-black">{mins}m</span>
                <span className="text-[9px] opacity-75">Start Now</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Durations Quick Set */}
        {recentDurations.length > 0 && (
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Quick Set (Recents)
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Recent selections</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {recentDurations.map((mins) => (
                <button
                  key={`recent_${mins}`}
                  onClick={() => handleStartTimer(mins)}
                  className="py-2 px-1.5 rounded-xl bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 text-indigo-100 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[38px] cursor-pointer"
                >
                  <Moon className="w-3 h-3 text-indigo-400" />
                  <span>{mins} mins</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1. Timer Duration Selection */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5 flex items-center justify-between">
            <span>1. Select Sleep Duration</span>
            <span className="text-[var(--accent-primary)] font-bold">{selectedDuration} min</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TIMER_OPTIONS.map((mins) => {
              const isSelected = selectedDuration === mins;
              return (
                <button
                  key={mins}
                  onClick={() => setSelectedDuration(mins)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all min-h-[52px] ${
                    isSelected
                      ? 'bg-[var(--accent-primary)] text-black border-[var(--accent-primary)] shadow-md font-bold'
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-[var(--text-primary)] hover:bg-white/10'
                  }`}
                >
                  <span className="text-base font-bold">{mins}</span>
                  <span className="text-[10px] opacity-80">minutes</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Optional Fade Out Effect */}
        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
              Optional 'Fade Out' Effect
            </span>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Automatically dims screen brightness and gradually reduces volume to zero over the final 5 minutes.
            </p>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              const next = !isFadeOutEnabled;
              setIsFadeOutEnabled(next);
              localStorage.setItem('neotune_sleep_fade_out_enabled', String(next));
            }}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer shrink-0 ${
              isFadeOutEnabled ? 'bg-indigo-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                isFadeOutEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Custom Fade Curve Selector */}
        {isFadeOutEnabled && (
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
              <span>Select Custom Volume Fade Curve</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'linear', label: 'Linear', desc: 'Constant rate' },
                { id: 'exponential', label: 'Exponential', desc: 'Steep drop' },
                { id: 'logarithmic', label: 'Logarithmic', desc: 'Smooth drop' }
              ].map((curve) => {
                const isSelected = fadeCurve === curve.id;
                return (
                  <button
                    key={curve.id}
                    onClick={() => {
                      triggerHaptic('selection');
                      setFadeCurve(curve.id as any);
                      localStorage.setItem('neotune_sleep_fade_curve', curve.id);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer min-h-[58px] ${
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 font-bold'
                        : 'bg-white/5 border-white/10 hover:border-white/20 text-[var(--text-primary)] hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xs font-bold">{curve.label}</span>
                    <span className="text-[9px] opacity-75 text-[var(--text-muted)] text-center leading-tight">{curve.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>

        {/* Modal Action Buttons */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-medium text-xs hover:bg-white/20 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={() => handleStartTimer()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-black font-bold text-xs shadow-lg hover:opacity-95 transition-opacity min-h-[44px]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Sleep Timer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

