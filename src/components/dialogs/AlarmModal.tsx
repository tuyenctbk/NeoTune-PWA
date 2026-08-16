import React, { useState, useEffect, useRef } from 'react';
import { X, Bell, Clock, Radio, Check, Volume2, Calendar, ShieldCheck, AlertCircle, Play, Square, CloudSun, MapPin, Sparkles, Volume1, Mic, Trash2, VolumeX, SunMoon } from 'lucide-react';
import { storageService } from '../../services/storageService';
import { firebaseService } from '../../services/firebaseService';
import { audioEngine, getLocalWeatherInfo } from '../../services/audioEngine';
import { AlarmConfig, RadioStation } from '../../types';

interface AlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: RadioStation[];
}

const DAYS_OF_WEEK = [
  { day: 0, label: 'Sun', full: 'Sunday' },
  { day: 1, label: 'Mon', full: 'Monday' },
  { day: 2, label: 'Tue', full: 'Tuesday' },
  { day: 3, label: 'Wed', full: 'Wednesday' },
  { day: 4, label: 'Thu', full: 'Thursday' },
  { day: 5, label: 'Fri', full: 'Friday' },
  { day: 6, label: 'Sat', full: 'Saturday' },
];

export const AlarmModal: React.FC<AlarmModalProps> = ({ isOpen, onClose, stations }) => {
  const [config, setConfig] = useState<AlarmConfig>(() => {
    const saved = storageService.getAlarmConfig();
    return {
      ...saved,
      days: saved.days && saved.days.length > 0 ? saved.days : [1, 2, 3, 4, 5], // default Mon-Fri
      fcmEnabled: saved.fcmEnabled ?? true,
      volume: saved.volume ?? 0.85,
      announceWeather: saved.announceWeather ?? false,
      weatherCity: saved.weatherCity || '',
      temperatureUnit: saved.temperatureUnit || 'celsius',
      weatherRampEnabled: saved.weatherRampEnabled ?? false,
      weatherRampCondition: saved.weatherRampCondition || 'any'
    };
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [permissionState, setPermissionState] = useState<string>('default');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const isPreviewingRef = useRef(false);
  isPreviewingRef.current = isPreviewing;

  const [isTestingSpeech, setIsTestingSpeech] = useState(false);
  const [weatherPreviewText, setWeatherPreviewText] = useState<string>('');

  const stopPreviewAndRestoreVolume = () => {
    audioEngine.stopSystemChimeLoop();
    if (isPreviewingRef.current) {
      audioEngine.stop();
      setIsPreviewing(false);
      isPreviewingRef.current = false;
      // Restore user volume
      const savedVol = storageService.getVolume();
      audioEngine.setVolume(savedVol);
    }
  };

  // Voice Memo Mic Recording State
  const [isRecordingMemo, setIsRecordingMemo] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [recordTimerSec, setRecordTimerSec] = useState(0);
  const [isPlayingVoiceMemo, setIsPlayingVoiceMemo] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setConfig(prev => ({
            ...prev,
            voiceMemoDataUrl: base64data,
            voiceMemoDurationSec: 5
          }));
        };
        stream.getTracks().forEach(track => track.stop());
        setIsRecordingMemo(false);
        setRecordProgress(0);
        setRecordTimerSec(0);
        if (recordIntervalRef.current) {
          clearInterval(recordIntervalRef.current);
          recordIntervalRef.current = null;
        }
      };

      setIsRecordingMemo(true);
      setRecordProgress(0);
      setRecordTimerSec(0);
      mediaRecorder.start();

      const startTime = Date.now();
      recordIntervalRef.current = setInterval(() => {
        const elapsedMs = Date.now() - startTime;
        const progressPercent = Math.min(100, (elapsedMs / 5000) * 100);
        const seconds = Math.min(5.0, elapsedMs / 1000);
        setRecordProgress(progressPercent);
        setRecordTimerSec(seconds);

        if (elapsedMs >= 5000) {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }
      }, 50);

    } catch (err) {
      console.warn('Microphone access error:', err);
      alert('Unable to access microphone. Please ensure microphone permissions are granted in your browser settings.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const playVoiceMemoPreview = () => {
    if (!config.voiceMemoDataUrl) return;
    setIsPlayingVoiceMemo(true);
    const audio = new Audio(config.voiceMemoDataUrl);
    audio.onended = () => setIsPlayingVoiceMemo(false);
    audio.onerror = () => setIsPlayingVoiceMemo(false);
    audio.play().catch(() => setIsPlayingVoiceMemo(false));
  };

  const deleteVoiceMemo = () => {
    setConfig(prev => ({
      ...prev,
      voiceMemoDataUrl: undefined,
      voiceMemoDurationSec: undefined
    }));
  };

  useEffect(() => {
    if (isOpen) {
      const saved = storageService.getAlarmConfig();
      setConfig({
        ...saved,
        snoozeMinutes: saved.snoozeMinutes || 10,
        days: saved.days && saved.days.length > 0 ? saved.days : [1, 2, 3, 4, 5],
        fcmEnabled: saved.fcmEnabled ?? true,
        volume: saved.volume ?? 0.85,
        announceWeather: saved.announceWeather ?? false,
        weatherCity: saved.weatherCity || '',
        temperatureUnit: saved.temperatureUnit || 'celsius',
        weatherRampEnabled: saved.weatherRampEnabled ?? false,
        weatherRampCondition: saved.weatherRampCondition || 'any'
      });

      firebaseService.getCloudAlarm().then((cloudAlarm) => {
        if (cloudAlarm) {
          setConfig({
            ...cloudAlarm,
            days: cloudAlarm.days && cloudAlarm.days.length > 0 ? cloudAlarm.days : [1, 2, 3, 4, 5],
            fcmEnabled: cloudAlarm.fcmEnabled ?? true,
            volume: cloudAlarm.volume ?? 0.85,
            announceWeather: cloudAlarm.announceWeather ?? false,
            weatherCity: cloudAlarm.weatherCity || '',
            temperatureUnit: cloudAlarm.temperatureUnit || 'celsius',
            weatherRampEnabled: cloudAlarm.weatherRampEnabled ?? false,
            weatherRampCondition: cloudAlarm.weatherRampCondition || 'any'
          });
        }
      });

      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermissionState(Notification.permission);
      }
    }

    return () => {
      stopPreviewAndRestoreVolume();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
    };
  }, [isOpen]);

  const handleTestWeatherSpeech = async () => {
    setIsTestingSpeech(true);
    try {
      const weather = await getLocalWeatherInfo(config.weatherCity);
      const isFahrenheit = config.temperatureUnit === 'fahrenheit';
      const tempText = isFahrenheit ? `${weather.tempF}°F` : `${weather.tempC}°C`;
      setWeatherPreviewText(`In ${weather.cityName}: ${tempText}, ${weather.conditionText}`);
      await audioEngine.announceCurrentWeather(config);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsTestingSpeech(false);
    }
  };

  const handleDayToggle = (dayIndex: number) => {
    const currentDays = config.days || [];
    let updatedDays: number[];
    if (currentDays.includes(dayIndex)) {
      // Don't allow empty days if enabled
      if (currentDays.length === 1) {
        updatedDays = currentDays;
      } else {
        updatedDays = currentDays.filter(d => d !== dayIndex);
      }
    } else {
      updatedDays = [...currentDays, dayIndex].sort((a, b) => a - b);
    }
    setConfig({ ...config, days: updatedDays });
  };

  const handleSelectAllDays = (type: 'all' | 'weekdays' | 'weekend') => {
    if (type === 'all') setConfig({ ...config, days: [0, 1, 2, 3, 4, 5, 6] });
    if (type === 'weekdays') setConfig({ ...config, days: [1, 2, 3, 4, 5] });
    if (type === 'weekend') setConfig({ ...config, days: [0, 6] });
  };

  const handleRequestPermission = async () => {
    const granted = await firebaseService.requestNotificationPermission();
    setPermissionState(granted ? 'granted' : 'denied');
  };

  const handleSave = async () => {
    storageService.saveAlarmConfig(config);
    // Sync to Firestore Cloud if logged in
    await firebaseService.syncAlarmToCloud(config);
    
    // Request permission if enabled and default
    if (config.isEnabled && config.fcmEnabled && permissionState === 'default') {
      await handleRequestPermission();
    }

    stopPreviewAndRestoreVolume();

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleTogglePreview = () => {
    if (isPreviewing) {
      stopPreviewAndRestoreVolume();
    } else {
      const targetVol = config.volume ?? 0.85;
      audioEngine.setVolume(targetVol);

      const isChime = config.useSystemChime || !config.stationUrl;
      if (isChime) {
        audioEngine.playSystemChimeLoop(targetVol);
        setIsPreviewing(true);
      } else if (config.stationUrl) {
        audioEngine.playStation({
          id: config.stationId,
          name: config.stationName,
          genre: config.stationGenre || 'Alarm Preview',
          country: 'Global',
          streamUrl: config.stationUrl,
          imageUrl: config.stationImageUrl || '',
          bitrate: '128k',
          codec: 'MP3',
          isFavorite: false
        });
        setIsPreviewing(true);
      }
    }
  };

  const handleStationChange = (stationId: string) => {
    const selected = stations.find(s => s.id === stationId);
    if (selected) {
      setConfig({
        ...config,
        stationId: selected.id,
        stationName: selected.name,
        stationUrl: selected.streamUrl,
        stationGenre: selected.genre,
        stationImageUrl: selected.imageUrl
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative my-auto w-full max-w-lg h-auto max-h-[85vh] sm:max-h-[92vh] rounded-3xl bg-[#12121a] border border-white/20 p-4 sm:p-7 shadow-2xl shadow-black/95 flex flex-col my-0 sm:my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Recurring Radio Alarm</h3>
              <p className="text-xs text-[var(--text-muted)]">Wake up to your favorite live stream on scheduled days</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopPreviewAndRestoreVolume();
              onClose();
            }}
            className="p-2.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 ml-auto"
            aria-label="Close Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 overscroll-contain space-y-5 mt-3 sm:mt-5">
          {/* Enable Alarm Toggle */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Enable Wake-Up Alarm</div>
                <div className="text-xs text-[var(--text-muted)]">Automatic volume ramp & stream connection</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
            </label>
          </div>

        {/* Time Selector */}
        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5 block">
            Alarm Time (24-Hour)
          </label>
          <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-black/30 border border-white/10">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <input
                type="number"
                min={0}
                max={23}
                value={config.hour.toString().padStart(2, '0')}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                  setConfig({ ...config, hour: val });
                }}
                className="w-16 h-14 text-center text-3xl font-bold font-mono bg-white/10 border border-white/10 rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <span className="text-[10px] text-[var(--text-muted)] mt-1 font-semibold">HOUR</span>
            </div>

            <span className="text-3xl font-bold text-[var(--accent-primary)] mb-4">:</span>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <input
                type="number"
                min={0}
                max={59}
                value={config.minute.toString().padStart(2, '0')}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                  setConfig({ ...config, minute: val });
                }}
                className="w-16 h-14 text-center text-3xl font-bold font-mono bg-white/10 border border-white/10 rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <span className="text-[10px] text-[var(--text-muted)] mt-1 font-semibold">MINUTE</span>
            </div>
          </div>
        </div>

        {/* Configurable Snooze Duration */}
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">
            Snooze Duration
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 15, 20].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setConfig({ ...config, snoozeMinutes: mins })}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                  (config.snoozeMinutes || 10) === mins
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                    : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:text-white'
                }`}
              >
                {mins} min
              </button>
            ))}
          </div>
        </div>

        {/* Recurring Day of Week Selector */}
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Repeat Days of Week</span>
            </label>
            <div className="flex items-center gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => handleSelectAllDays('weekdays')}
                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
              >
                Weekdays
              </button>
              <button
                type="button"
                onClick={() => handleSelectAllDays('weekend')}
                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
              >
                Weekends
              </button>
              <button
                type="button"
                onClick={() => handleSelectAllDays('all')}
                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
              >
                Everyday
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {DAYS_OF_WEEK.map((item) => {
              const isSelected = config.days?.includes(item.day);
              return (
                <button
                  key={item.day}
                  type="button"
                  onClick={() => handleDayToggle(item.day)}
                  className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${
                    isSelected
                      ? 'bg-[var(--accent-primary)] text-black border-[var(--accent-primary)] shadow-sm'
                      : 'bg-white/5 text-[var(--text-muted)] border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                  title={item.full}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Station Selector & Preview */}
        <div className="mt-5 space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
            Wake-Up Radio Stream
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={config.stationId}
                disabled={!!config.useSystemChime || !config.stationUrl}
                onChange={(e) => handleStationChange(e.target.value)}
                className="w-full px-3.5 py-3 sm:py-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] appearance-none cursor-pointer pr-8 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {stations.length > 0 ? (
                  stations.map((st) => (
                    <option key={st.id} value={st.id} className="bg-zinc-950 text-white">
                      {st.name} ({st.genre})
                    </option>
                  ))
                ) : (
                  <option value="soma_groove_salad" className="bg-zinc-950 text-white">
                    SomaFM: Groove Salad (Ambient & Chill)
                  </option>
                )}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] text-xs">
                ▼
              </div>
            </div>

            <button
              type="button"
              onClick={handleTogglePreview}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isPreviewing
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/30 text-[var(--accent-primary)] border-[var(--accent-primary)]/30'
              }`}
              title={isPreviewing ? 'Stop Preview' : 'Preview Alarm'}
            >
              {isPreviewing ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPreviewing ? 'Stop Preview' : 'Preview Alarm'}</span>
            </button>
          </div>

          {/* System Chime Alarm Sound Toggle */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4 mt-2 animate-fadeIn">
            <div className="space-y-0.5 min-w-0">
              <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <SunMoon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Use System Chime Alarm Sound</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                Plays a synthesized ambient chime instead of a live radio stream.
                {!config.stationUrl && (
                  <span className="text-amber-400 font-semibold block mt-0.5">
                    (No radio station is configured, system chime is active by default)
                  </span>
                )}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={!!config.useSystemChime || !config.stationUrl}
                disabled={!config.stationUrl}
                onChange={(e) => setConfig({ ...config, useSystemChime: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400 peer-disabled:opacity-50"></div>
            </label>
          </div>
        </div>

        {/* Wake-Up Weather Conditions Speech Announcement */}
        <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30">
                <CloudSun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>Announce Local Weather</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase">
                    Open-Meteo AI Voice
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Speaks temperature and sky conditions after station starts playing
                </div>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.announceWeather}
                onChange={(e) => setConfig({ ...config, announceWeather: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-400"></div>
            </label>
          </div>

          {config.announceWeather && (
            <div className="pt-2.5 border-t border-white/5 space-y-2.5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* City Input */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3 text-sky-400" />
                    <span>City / Location</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New York, London, Tokyo..."
                    value={config.weatherCity || ''}
                    onChange={(e) => setConfig({ ...config, weatherCity: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                  <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">
                    Leave blank to auto-detect GPS location
                  </span>
                </div>

                {/* Unit Switcher & Test Button */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Temperature Unit & Preview
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/10">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, temperatureUnit: 'celsius' })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          config.temperatureUnit === 'celsius'
                            ? 'bg-sky-500 text-black shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        °C
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, temperatureUnit: 'fahrenheit' })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          config.temperatureUnit === 'fahrenheit'
                            ? 'bg-sky-500 text-black shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        °F
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isTestingSpeech}
                      onClick={handleTestWeatherSpeech}
                      className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Volume1 className="w-3.5 h-3.5" />
                      <span>{isTestingSpeech ? 'Speaking...' : 'Test Voice'}</span>
                    </button>
                  </div>

                  {weatherPreviewText && (
                    <span className="text-[10px] text-emerald-400 block mt-1 font-medium truncate">
                      ✓ {weatherPreviewText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Weather-Dependent Gradual Volume Ramp */}
        <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <CloudSun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  Weather-Dependent Volume Ramp
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Only gradually increase alarm volume if local weather meets conditions
                </div>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.weatherRampEnabled || false}
                onChange={(e) => setConfig({ ...config, weatherRampEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400"></div>
            </label>
          </div>

          {config.weatherRampEnabled && (
            <div className="pt-2.5 border-t border-white/5 space-y-2.5 animate-fadeIn">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1 mb-1.5">
                  <span>Only ramp volume if weather is:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5">
                  {(['any', 'clear', 'rainy', 'snowy', 'cloudy'] as const).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setConfig({ ...config, weatherRampCondition: cond })}
                      className={`px-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        (config.weatherRampCondition || 'any') === cond
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {cond === 'any' ? 'Any Weather' : cond}
                    </button>
                  ))}
                </div>
                <span className="text-[9px] text-[var(--text-muted)] block mt-1.5">
                  Otherwise, the alarm starts immediately at target volume without a slow increase. Uses the location set above.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Custom 5-Second Voice Greeting / Voice Memo Recorder */}
        <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>Custom Alarm Voice Greeting</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                    5s Mic Memo
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Record a custom personal voice memo to play alongside the alarm
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 space-y-2.5">
            {isRecordingMemo ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-rose-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    Recording Voice Memo...
                  </span>
                  <span className="font-mono text-white font-bold">{recordTimerSec.toFixed(1)}s / 5.0s</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-75"
                    style={{ width: `${recordProgress}%` }}
                  />
                </div>

                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="w-full py-2 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop & Keep Recording</span>
                </button>
              </div>
            ) : config.voiceMemoDataUrl ? (
              <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-purple-500/30 text-purple-300">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-purple-200 truncate">5-Sec Voice Memo Attached</div>
                    <div className="text-[10px] text-purple-300/80">Ready to play when alarm triggers</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={playVoiceMemoPreview}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 border border-purple-500/40 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isPlayingVoiceMemo ? 'Playing...' : 'Test'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={deleteVoiceMemo}
                    className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs transition-colors cursor-pointer"
                    title="Delete voice memo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={startVoiceRecording}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4 text-purple-400" />
                <span>Tap to Record 5-Sec Voice Greeting</span>
              </button>
            )}
          </div>
        </div>

        {/* Persistent Notifications / Cloud Messaging Notice */}
        <div className="mt-5 p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">
                Persistent Push Notification Alerts
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Fires even when browser tab is inactive or minimized
              </div>
            </div>
          </div>

          {permissionState === 'granted' ? (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
              Active ✓
            </span>
          ) : (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-2.5 py-1 rounded-xl bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/30 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 text-[10px] font-bold transition-colors cursor-pointer"
            >
              Enable
            </button>
          )}
        </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={() => {
              stopPreviewAndRestoreVolume();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-medium text-xs hover:bg-white/20 transition-colors cursor-pointer min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-black font-bold text-xs hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-lg shadow-black/30 cursor-pointer min-h-[44px]"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Alarm Saved & Synced!</span>
              </>
            ) : (
              'Save & Sync Alarm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
