import React, { useState, useEffect } from 'react';
import { X, Moon, Clock, Volume2, Sparkles, AlertCircle, Play, Check, BarChart2, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { audioEngine } from '../../services/audioEngine';
import { storageService } from '../../services/storageService';
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
  const [selectedDuration, setSelectedDuration] = useState<number>(() => {
    return storageService.getSleepTimerConfig().duration;
  });
  const [quickPresets, setQuickPresets] = useState<number[]>(() => {
    return storageService.getSleepQuickPresets();
  });
  const [weeklyUsageData, setWeeklyUsageData] = useState<any[]>(() => {
    return storageService.getWeeklySleepTimerUsage();
  });
  const [recentDurations, setRecentDurations] = useState<number[]>(() => {
    return storageService.getSleepTimerConfig().recentDurations || [];
  });
  const [sleepHistory, setSleepHistory] = useState<any[]>(() => {
    return storageService.getSleepTimerConfig().sleepHistory || [];
  });
  const [totalFadeOutMins, setTotalFadeOutMins] = useState<number>(() => {
    return storageService.getSleepTimerConfig().totalSleepFadeOutMinutes || 180;
  });
  const [totalSessions, setTotalSessions] = useState<number>(() => {
    return storageService.getSleepTimerConfig().totalSleepTimerSessions || 6;
  });
  const [isFadeOutEnabled, setIsFadeOutEnabled] = useState<boolean>(() => {
    return storageService.getSleepTimerConfig().fadeOutEnabled;
  });
  const [fadeCurve, setFadeCurve] = useState<'linear' | 'exponential' | 'logarithmic'>(() => {
    return storageService.getSleepTimerConfig().fadeCurve;
  });
  const [selectedSoundscape, setSelectedSoundscape] = useState<string>(() => {
    return storageService.getSleepTimerConfig().soundscapeType || 'none';
  });
  const [soundscapeVolume, setSoundscapeVolume] = useState<number>(() => {
    return storageService.getSleepTimerConfig().soundscapeVolume ?? 0.5;
  });
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [fadeSec, setFadeSec] = useState<number | null>(null);
  const [totalSec, setTotalSec] = useState<number | null>(null);
  const [currentVolume, setCurrentVolume] = useState<number>(0.85);

  // 5-Second Accelerated Fade Preview State
  const [isPreviewingFade, setIsPreviewingFade] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewVolume, setPreviewVolume] = useState(0.85);
  const previewTimerRef = React.useRef<any>(null);
  const initialVolRef = React.useRef<number>(0.85);

  const handleToggleFadePreview = () => {
    if (isPreviewingFade) {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      audioEngine.stopFadePreview();
      setIsPreviewingFade(false);
      setPreviewProgress(0);
      return;
    }

    triggerHaptic('medium');
    const startVol = audioEngine.getState().volume || 0.85;
    initialVolRef.current = startVol;
    setIsPreviewingFade(true);
    setPreviewProgress(0);

    audioEngine.previewFadeOut(fadeCurve, 5000);

    const DURATION_MS = 5000;
    const INTERVAL_MS = 50;
    let elapsed = 0;

    if (previewTimerRef.current) clearInterval(previewTimerRef.current);

    previewTimerRef.current = setInterval(() => {
      elapsed += INTERVAL_MS;
      const ratio = Math.min(1, elapsed / DURATION_MS);
      setPreviewProgress(Math.round(ratio * 100));
      setPreviewVolume(audioEngine.getState().volume);

      if (ratio >= 1) {
        clearInterval(previewTimerRef.current!);
        setTimeout(() => {
          setIsPreviewingFade(false);
          audioEngine.stopFadePreview();
          setPreviewProgress(0);
        }, 200);
      }
    }, INTERVAL_MS);
  };

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    };
  }, []);

  // Sync state from storageService when modal opens
  useEffect(() => {
    if (isOpen) {
      const config = storageService.getSleepTimerConfig();
      setSelectedDuration(config.duration);
      setIsFadeOutEnabled(config.fadeOutEnabled);
      setFadeCurve(config.fadeCurve);
      setRecentDurations(config.recentDurations || []);
      setSleepHistory(config.sleepHistory || []);
      setTotalFadeOutMins(config.totalSleepFadeOutMinutes || 180);
      setTotalSessions(config.totalSleepTimerSessions || 6);
      setQuickPresets(storageService.getSleepQuickPresets());
      setWeeklyUsageData(storageService.getWeeklySleepTimerUsage());
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setRemainingSec(state.sleepTimerRemainingSec);
      setFadeSec(state.sleepTimerFadeSec);
      setTotalSec(state.sleepTimerTotalSec);
      setCurrentVolume(state.volume);
    });
    return unsub;
  }, []);

  const handleSelectDuration = (mins: number) => {
    triggerHaptic('selection');
    setSelectedDuration(mins);
    storageService.saveSleepTimerDuration(mins);
  };

  const handleToggleFadeOut = () => {
    triggerHaptic('light');
    const next = !isFadeOutEnabled;
    setIsFadeOutEnabled(next);
    storageService.saveSleepFadeOutEnabled(next);
  };

  const handleChangeFadeCurve = (curve: 'linear' | 'exponential' | 'logarithmic') => {
    triggerHaptic('selection');
    setFadeCurve(curve);
    storageService.saveSleepFadeCurve(curve);
  };

  const handleSelectSoundscape = (type: string) => {
    triggerHaptic('selection');
    setSelectedSoundscape(type);
    storageService.saveSleepSoundscape(type, soundscapeVolume);
    if (type === 'none') {
      audioEngine.stopAmbientSoundscape();
    } else {
      audioEngine.startAmbientSoundscape(type as any, soundscapeVolume);
    }
  };

  const handleSoundscapeVolumeChange = (vol: number) => {
    setSoundscapeVolume(vol);
    audioEngine.setAmbientSoundscapeVolume(vol);
  };

  const handleStartTimer = (mins = selectedDuration) => {
    const effectiveFade = isFadeOutEnabled ? Math.min(5, mins) : 0;
    
    // Call our newly exposed high-precision setSleepTimer method (in seconds)
    audioEngine.setSleepTimer(mins * 60, effectiveFade * 60);

    if (selectedSoundscape && selectedSoundscape !== 'none') {
      audioEngine.startAmbientSoundscape(selectedSoundscape as any, soundscapeVolume);
    }

    // Persist preferred duration and add to recents & sleep history via storageService
    storageService.saveSleepTimerDuration(mins);
    const nextRecents = storageService.addRecentSleepDuration(mins);
    const updatedHistory = storageService.addSleepHistoryEntry(mins);
    storageService.recordSleepTimerUsage(mins, isFadeOutEnabled);

    setRecentDurations(nextRecents);
    setSleepHistory(updatedHistory);

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
        {/* Active Timer Countdown & Visual Progress Bar */}
        {isTimerActive && totalSec && totalSec > 0 ? (
          <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex flex-col gap-3.5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isFadingActive ? 'bg-amber-500/20 text-amber-300 animate-pulse' : 'bg-indigo-500/20 text-indigo-300'}`}>
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
                    <span>{isFadingActive ? 'Fade-Out Active' : 'Sleep Timer Running'}</span>
                    {isFadingActive && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/25 text-amber-300 font-black tracking-wide border border-amber-500/40 animate-pulse">
                        FADING AUDIO
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
                className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold transition-colors min-h-[40px] cursor-pointer"
              >
                Cancel Timer
              </button>
            </div>

            {/* Visual Timeline & Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-200">
                <span>Start</span>
                {fadeSec && fadeSec > 0 && (
                  <span className="text-amber-300 flex items-center gap-1 font-bold">
                    <Volume2 className="w-3 h-3" />
                    Fade Threshold ({Math.round(fadeSec / 60)}m mark)
                  </span>
                )}
                <span>Stop (0:00)</span>
              </div>

              {/* Progress Track with Highlighted Fade Zone */}
              <div className="relative w-full h-4 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
                {/* Fade-out window zone background highlight on the right end */}
                {fadeSec && fadeSec > 0 && totalSec > 0 && (
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-amber-500/25 border-l-2 border-amber-400/80 z-0"
                    style={{
                      width: `${Math.min(100, (fadeSec / totalSec) * 100)}%`
                    }}
                    title={`Fade-Out Zone (${Math.round(fadeSec / 60)} min)`}
                  />
                )}

                {/* Live Progress Bar Fill */}
                <div
                  className="h-full rounded-full transition-all duration-300 z-10 relative"
                  style={{
                    width: `${Math.max(2, Math.min(100, ((totalSec - remainingSec) / totalSec) * 100))}%`,
                    background: isFadingActive
                      ? 'linear-gradient(to right, #6366f1, #f59e0b)'
                      : 'linear-gradient(to right, #06b6d4, #6366f1)'
                  }}
                />
              </div>

              {/* Status Explanation under Progress Bar */}
              <div className="flex items-center justify-between text-[10px] text-indigo-300/80 font-mono">
                <span>Elapsed: {formatCountdown(totalSec - remainingSec)}</span>
                <span>
                  {fadeSec && fadeSec > 0
                    ? isFadingActive
                      ? `Volume: ${Math.round(currentVolume * 100)}% (Fading to 0%)`
                      : `Fade starts in ${formatCountdown(remainingSec - fadeSec)}`
                    : 'Instant stop at 0:00'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Timeline Preview of Selected Duration Before Starting */
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Timeline Preview
              </span>
              <span className="font-mono text-[11px] text-white font-bold">{selectedDuration} min total</span>
            </div>

            {/* Visual Preview Bar */}
            <div className="relative w-full h-3.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
              {isFadeOutEnabled && selectedDuration > 1 && (
                <div
                  className="absolute top-0 bottom-0 right-0 bg-amber-500/30 border-l-2 border-amber-400"
                  style={{
                    width: `${(Math.min(5, selectedDuration) / selectedDuration) * 100}%`
                  }}
                />
              )}
              <div
                className="h-full bg-gradient-to-r from-indigo-500/40 to-indigo-500/80 rounded-l-full"
                style={{
                  width: `${100 - (isFadeOutEnabled && selectedDuration > 1 ? (Math.min(5, selectedDuration) / selectedDuration) * 100 : 0)}%`
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
              <span>0:00 (Full Vol)</span>
              {isFadeOutEnabled && selectedDuration > 1 && (
                <span className="text-amber-300 font-semibold">
                  Fade starts at {selectedDuration - Math.min(5, selectedDuration)}:00
                </span>
              )}
              <span>Stop ({selectedDuration}:00)</span>
            </div>
          </div>
        )}

        {/* Total Hours Saved & Bedtime Wellness Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-blue-500/15 border border-purple-500/30 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
              <Sparkles className="w-4 h-4 text-purple-300" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                <span>Bedtime Wellness Summary</span>
              </div>
              <p className="text-[11px] text-purple-200/80 leading-snug truncate">
                Saved <strong className="text-purple-200 font-extrabold">{((totalFadeOutMins || 180) / 60).toFixed(1)} hrs</strong> of continuous playback across <strong className="text-purple-200 font-extrabold">{totalSessions || 6} bedtime sessions</strong>
              </p>
            </div>
          </div>
          <span className="px-2 py-1 rounded-lg bg-purple-500/25 border border-purple-500/40 text-purple-200 font-mono text-[10px] font-bold shrink-0">
            Auto Fade Active
          </span>
        </div>

        {/* 1-Tap Quick Select Presets */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-[var(--surface-main)] to-purple-500/10 border border-indigo-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Quick-Select 1-Tap Presets
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Instant Start</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(quickPresets || [15, 30, 60, 90]).map((mins) => (
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

        {/* Weekly Sleep Usage Chart Section */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
              Weekly Sleep Usage Analytics
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Past 7 Days</span>
          </div>

          <div className="h-32 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyUsageData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} unit="m" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900/90 border border-indigo-500/30 backdrop-blur-md p-2 rounded-lg text-[11px] text-white shadow-xl">
                          <div className="font-bold text-indigo-300">{data.day}</div>
                          <div>{data.minutes} mins sleep timer</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                  {weeklyUsageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.minutes > 0 ? '#6366f1' : 'rgba(255, 255, 255, 0.1)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sleep History Section (Last 5 Sessions as Quick-Tap Chips) */}
        {sleepHistory.length > 0 && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-indigo-500/10 border border-indigo-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Sleep History (Last 5 Sessions)
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">1-Tap Re-activate</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {sleepHistory.slice(0, 5).map((item, idx) => (
                <button
                  key={item.id || `hist_${idx}`}
                  onClick={() => {
                    triggerHaptic('selection');
                    handleStartTimer(item.duration);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-100 hover:text-white border border-indigo-500/30 hover:border-indigo-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  title={`Set at ${item.timeLabel || '10:30 PM'} (${item.dateLabel || 'Today'})`}
                >
                  <Clock className="w-3 h-3 text-indigo-300" />
                  <span>{item.duration} min</span>
                  <span className="text-[9px] opacity-75 font-normal">({item.timeLabel || 'Session'})</span>
                </button>
              ))}
            </div>
          </div>
        )}
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
                  onClick={() => handleSelectDuration(mins)}
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
            onClick={handleToggleFadeOut}
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

        {/* 3. Ambient Soundscape Selector */}
        <div className="space-y-2.5 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Ambient Soundscape</span>
            </span>
            <span className="text-[10px] text-indigo-200/80 font-mono">
              {selectedSoundscape === 'none' ? 'Disabled' : 'Background Active'}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Mix calming nature audio or white noise alongside your radio stream to assist falling asleep.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { id: 'none', label: 'Off', icon: '🔇' },
              { id: 'gentle_rain', label: 'Gentle Rain', icon: '🌧️' },
              { id: 'ocean_waves', label: 'Ocean Waves', icon: '🌊' },
              { id: 'forest_night', label: 'Forest Night', icon: '🌲' },
              { id: 'white_noise', label: 'White Noise', icon: '📻' },
              { id: 'pink_noise', label: 'Pink Noise', icon: '🌸' },
            ].map((snd) => {
              const isSelected = selectedSoundscape === snd.id;
              return (
                <button
                  key={snd.id}
                  onClick={() => handleSelectSoundscape(snd.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer min-h-[58px] ${
                    isSelected
                      ? 'bg-indigo-500 text-black border-indigo-400 font-bold shadow-md scale-[1.02]'
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-[var(--text-primary)] hover:bg-white/10'
                  }`}
                >
                  <span className="text-base">{snd.icon}</span>
                  <span className="text-xs font-bold mt-0.5">{snd.label}</span>
                </button>
              );
            })}
          </div>

          {selectedSoundscape !== 'none' && (
            <div className="space-y-1.5 pt-2 border-t border-indigo-500/20">
              <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-200">
                <span>Soundscape Background Volume</span>
                <span className="font-mono text-[10px] text-indigo-300">{Math.round(soundscapeVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundscapeVolume}
                onChange={(e) => handleSoundscapeVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 h-1.5 bg-black/40 rounded-lg cursor-pointer"
              />
            </div>
          )}
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
                    onClick={() => handleChangeFadeCurve(curve.id as any)}
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

            {/* 5-Second Accelerated Fade Preview Control */}
            <div className="mt-2.5 p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-200">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>5-Second Fade Preview</span>
                </div>
                <button
                  onClick={handleToggleFadePreview}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                    isPreviewingFade
                      ? 'bg-amber-500 text-black border border-amber-400 animate-pulse'
                      : 'bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-100 border border-indigo-400/30'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isPreviewingFade ? 'Stop Preview' : 'Test 5s Fade Sample'}</span>
                </button>
              </div>

              {isPreviewingFade && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-[10px] text-indigo-200 font-mono">
                    <span>Preview Volume: {Math.round(previewVolume * 100)}%</span>
                    <span>Curve: {fadeCurve.toUpperCase()} ({previewProgress}%)</span>
                  </div>
                  <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-indigo-500/30 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-amber-400 to-red-500 rounded-full transition-all duration-75"
                      style={{ width: `${100 - previewProgress}%` }}
                    />
                  </div>
                </div>
              )}
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

