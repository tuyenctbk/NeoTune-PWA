import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Moon,
  Bell,
  BatteryCharging,
  Zap,
  Shield,
  Activity,
  Palette,
  Star,
  Share2,
  Info,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Laptop,
  Smartphone,
  Tv,
  Sparkles,
  ExternalLink,
  Heart,
  Coffee,
  Copy,
  Check,
  Keyboard,
  Globe,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Volume2,
  Gauge,
  SunMoon,
  Play,
  Pause,
  Eye,
  Layers
} from 'lucide-react';
import { ThemeType, FilterConfig, UserProfile, VisualizerSkin, RadioStation, GestureConfig, VisualizerCustomColors, GestureAction } from '../types';
import { storageService } from '../services/storageService';
import { indexedDBService } from '../services/indexedDBService';
import { audioEngine } from '../services/audioEngine';
import { apiService } from '../services/apiService';
import { firebaseService } from '../services/firebaseService';
import { DevicePlatform } from '../hooks/usePWAInstall';
import { useTranslation } from '../services/i18n';
import { triggerHaptic } from '../utils/haptics';
import { Cloud, User as UserIcon, LogIn, LogOut, Radio } from 'lucide-react';
import { UserProfileSection } from '../components/UserProfileSection';
import { CSSAudioVisualizer } from '../components/CSSAudioVisualizer';
import { ListeningHabitsSection } from '../components/ListeningHabitsSection';

interface SettingsViewProps {
  currentTheme: ThemeType;
  onSelectTheme: (theme: ThemeType) => void;
  onOpenEQ: () => void;
  onOpenSleepTimer: () => void;
  onOpenAlarm: () => void;
  onOpenFilterManager: () => void;
  onOpenNetworkConfig: () => void;
  onOpenRate: () => void;
  onOpenShare: () => void;
  onOpenAbout: () => void;
  onOpenInstallModal?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenShortcuts?: () => void;
  isInstalled?: boolean;
  platform?: DevicePlatform;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentTheme,
  onSelectTheme,
  onOpenEQ,
  onOpenSleepTimer,
  onOpenAlarm,
  onOpenFilterManager,
  onOpenNetworkConfig,
  onOpenRate,
  onOpenShare,
  onOpenAbout,
  onOpenInstallModal,
  onOpenDiagnostics,
  onOpenShortcuts,
  isInstalled = false,
  platform = 'pc',
  currentUser = null,
  onOpenAuth,
}) => {
  const { t, language, setLanguage, languages } = useTranslation();
  const [visualizerSkin, setVisualizerSkin] = useState<VisualizerSkin>(() => storageService.getVisualizerSkin());
  const [visualizerCycleInterval, setVisualizerCycleInterval] = useState<number>(() => storageService.getVisualizerCycleInterval());
  const [visualizerSensitivity, setVisualizerSensitivityState] = useState<number>(() => audioEngine.getVisualizerSensitivity());
  const [visualizerIntensity, setVisualizerIntensityState] = useState<number>(() => audioEngine.getVisualizerIntensity());
  const [batterySaver, setBatterySaver] = useState<boolean>(() => storageService.getBatterySaver());
  const [autoPlay, setAutoPlay] = useState<boolean>(() => storageService.getAutoPlay());
  const [normalizeAudio, setNormalizeAudio] = useState<boolean>(() => storageService.getNormalizeAudio());
  const [targetNormalizeLevel, setTargetNormalizeLevel] = useState<number>(() => storageService.getTargetNormalizeLevel());
  const [crossfadeDurationMs, setCrossfadeDurationMs] = useState<number>(() => storageService.getCrossfadeDurationMs());
  const [autoDetectTheme, setAutoDetectTheme] = useState<boolean>(() => storageService.getAutoDetectTheme());
  const [timeBasedTheme, setTimeBasedThemeState] = useState<boolean>(() => storageService.getTimeBasedTheme());
  const [gestureConfig, setGestureConfig] = useState<GestureConfig>(() => storageService.getGestureConfig());
  const [customColors, setCustomColors] = useState<VisualizerCustomColors>(() => storageService.getVisualizerCustomColors());
  const [visualizerColorScheme, setVisualizerColorScheme] = useState<string>(() => storageService.getVisualizerColorScheme());
  const [nightMode, setNightMode] = useState<boolean>(() => audioEngine.getNightMode());
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => storageService.getHapticsEnabled());
  const [copiedStatus, setCopiedStatus] = useState('');

  const handleToggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    storageService.setHapticsEnabled(next);
    if (next) {
      triggerHaptic('selection');
    }
    setCopiedStatus(next ? 'Haptic Feedback Activated (Device Vibration)' : 'Haptic Feedback Disabled');
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  const handleUpdateGesture = (direction: keyof GestureConfig, action: GestureAction) => {
    triggerHaptic('selection');
    const updated = { ...gestureConfig, [direction]: action };
    setGestureConfig(updated);
    storageService.saveGestureConfig(updated);
  };

  const handleUpdateCustomColor = (key: keyof VisualizerCustomColors, color: string) => {
    const updated = { ...customColors, [key]: color };
    setCustomColors(updated);
    storageService.saveVisualizerCustomColors(updated);
    firebaseService.saveUserThemeToCloud(currentTheme, updated).catch(() => {});
  };

  const handleToggleNightMode = (enabled: boolean) => {
    triggerHaptic('selection');
    setNightMode(enabled);
    audioEngine.setNightMode(enabled);
  };

  const handleExportCSV = () => {
    triggerHaptic('medium');
    storageService.exportListenHistoryCSV();
    setCopiedStatus('Listen History exported as CSV file.');
    setTimeout(() => setCopiedStatus(''), 2500);
  };
  const [copiedPaypal, setCopiedPaypal] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<ThemeType>(currentTheme);
  const [previewPlaying, setPreviewPlaying] = useState(true);

  // Sync preview theme if currentTheme changes externally
  useEffect(() => {
    setPreviewTheme(currentTheme);
  }, [currentTheme]);

  // Cache Management Dashboard states & methods
  const [cacheItems, setCacheItems] = useState<{ key: string; name: string; sizeBytes: number; type: 'station' | 'podcast' | 'episodes' | 'countries' | 'unknown' }[]>([]);
  const [totalCacheSize, setTotalCacheSize] = useState(0);
  const [offlineIndexedDBStations, setOfflineIndexedDBStations] = useState<RadioStation[]>([]);

  const loadCacheInfo = () => {
    const items = apiService.getCacheDetails();
    setCacheItems(items);
    const size = items.reduce((sum, item) => sum + item.sizeBytes, 0);
    setTotalCacheSize(size);
  };

  const loadOfflineStations = () => {
    indexedDBService.getOfflineStations().then(setOfflineIndexedDBStations);
  };

  useEffect(() => {
    loadCacheInfo();
    loadOfflineStations();
  }, []);

  const handleClearIndexedDB = () => {
    if (window.confirm('Clear IndexedDB offline cached stations?')) {
      indexedDBService.clearOfflineCache().then(() => {
        loadOfflineStations();
        setCopiedStatus('IndexedDB offline station cache cleared.');
        setTimeout(() => setCopiedStatus(''), 2500);
      });
    }
  };

  const handleClearCacheItem = (key: string) => {
    apiService.clearCacheItem(key);
    loadCacheInfo();
    setCopiedStatus('Cached item cleared successfully.');
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  const handleClearAllCache = () => {
    if (window.confirm('Clear all radio station and podcast search cache? (This frees up space but subsequent lookups might load slightly slower)')) {
      apiService.clearAllCache();
      loadCacheInfo();
      setCopiedStatus('All API and RSS feed cache cleared.');
      setTimeout(() => setCopiedStatus(''), 2500);
    }
  };

  // Data Usage Tracker State
  const [dataUsageBitrate, setDataUsageBitrate] = useState<number>(128);
  const [usageData, setUsageData] = useState(() => storageService.getEstimatedDataUsage(128));

  const handleBitrateChange = (bitrate: number) => {
    setDataUsageBitrate(bitrate);
    setUsageData(storageService.getEstimatedDataUsage(bitrate));
  };

  const handleResetDataStats = () => {
    if (window.confirm('Reset estimated data consumption and listening time counter?')) {
      storageService.resetListeningStats();
      setUsageData(storageService.getEstimatedDataUsage(dataUsageBitrate));
      setCopiedStatus('Data usage and listening counter reset to 0.');
      setTimeout(() => setCopiedStatus(''), 2500);
    }
  };

  const PAYPAL_URL = 'https://paypal.me/tuyenphamvn';

  const handleSelectVisualizerSkin = (skin: VisualizerSkin) => {
    setVisualizerSkin(skin);
    storageService.saveVisualizerSkin(skin);
    setCopiedStatus(`Visualizer skin set to ${skin.toUpperCase()}`);
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  const handleCycleIntervalChange = (sec: number) => {
    setVisualizerCycleInterval(sec);
    storageService.saveVisualizerCycleInterval(sec);
    setCopiedStatus(`Dynamic Visualizer interval set to ${sec} seconds`);
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  const handleSensitivityChange = (val: number) => {
    setVisualizerSensitivityState(val);
    audioEngine.setVisualizerSensitivity(val);
    setCopiedStatus(`Visualizer sensitivity set to ${Math.round(val * 100)}%`);
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  const handleIntensityChange = (val: number) => {
    setVisualizerIntensityState(val);
    audioEngine.setVisualizerIntensity(val);
    setCopiedStatus(`Visualizer animation speed set to ${Math.round(val * 100)}%`);
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  const handleClearRecentHistory = () => {
    if (window.confirm('Clear your recently played radio stations history from local storage?')) {
      storageService.clearRecents();
      triggerHaptic('success');
      setCopiedStatus('Recently played stations history cleared.');
      setTimeout(() => setCopiedStatus(''), 2500);
    }
  };

  const handleCopyPaypal = () => {
    try {
      navigator.clipboard.writeText(PAYPAL_URL);
      setCopiedPaypal(true);
      setTimeout(() => setCopiedPaypal(false), 2500);
    } catch {}
  };

  const handleOpenPaypal = (amount?: number) => {
    const url = amount ? `https://paypal.me/tuyenphamvn/${amount}USD` : PAYPAL_URL;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const VISUALIZER_SKINS: { id: VisualizerSkin; name: string; desc: string }[] = [
    {
      id: 'dynamic',
      name: 'Dynamic Auto-Cycle',
      desc: 'Smoothly cycles through all presets at a configurable interval during playback'
    },
    {
      id: 'bars',
      name: 'Neon Bars',
      desc: 'Classic high-energy 8-band vertical equalizer bars with frequency peak memory dynamics'
    },
    {
      id: 'circular',
      name: 'Pulse Circles',
      desc: 'Concentric pulsating acoustic radar rings with center audio orb glow'
    },
    {
      id: 'waveform',
      name: 'Retro Wave',
      desc: 'Smooth undulating retro synthwave-styled oscilloscope soundwave curves'
    },
    {
      id: 'dots',
      name: 'Rhythm Matrix',
      desc: 'Multi-tiered bouncing neon-lit matrix dots with tactile elevation'
    },
    {
      id: 'auto',
      name: 'Adaptive Genre Match',
      desc: 'Automatically switches the visualizer theme based on the current station\'s genre (e.g., Neon Bars for Rock, Pulse Circles for Electronic)'
    }
  ];

  interface ThemeSpec {
    id: ThemeType;
    name: string;
    tagline: string;
    desc: string;
    previewColor: string;
    bgHex: string;
    surfaceHex: string;
    accentPrimaryHex: string;
    accentSecondaryHex: string;
    accentTertiaryHex: string;
    textPrimaryHex: string;
    textMutedHex: string;
    borderHex: string;
  }

  const THEMES: ThemeSpec[] = [
    {
      id: 'frosted-glass',
      name: 'Frosted Glass (Default)',
      tagline: 'Translucent Obsidian & Amethyst Neon Glow',
      desc: 'Translucent obsidian #0A050E with frosted amethyst glow and soft glass borders',
      previewColor: 'bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400',
      bgHex: '#0A050E',
      surfaceHex: 'rgba(24, 15, 34, 0.75)',
      accentPrimaryHex: '#A78BFA',
      accentSecondaryHex: '#C084FC',
      accentTertiaryHex: '#38BDF8',
      textPrimaryHex: '#F8FAFC',
      textMutedHex: '#94A3B8',
      borderHex: 'rgba(255, 255, 255, 0.12)'
    },
    {
      id: 'cyberpunk',
      name: 'Cyberpunk Neon',
      tagline: 'Obsidian #0D0D12 with Electric Cyan & Vivid Purple',
      desc: 'Obsidian #0D0D12 with Electric Cyan & Vivid Purple accents',
      previewColor: 'bg-gradient-to-r from-cyan-400 to-purple-500',
      bgHex: '#0D0D12',
      surfaceHex: 'rgba(22, 22, 31, 0.88)',
      accentPrimaryHex: '#00F0FF',
      accentSecondaryHex: '#A855F7',
      accentTertiaryHex: '#EC4899',
      textPrimaryHex: '#F8FAFC',
      textMutedHex: '#94A3B8',
      borderHex: 'rgba(0, 240, 255, 0.22)'
    },
    {
      id: 'jazz',
      name: 'Warm Vintage Jazz',
      tagline: 'Deep Espresso #1C1B1F with Brass Gold & Cream Amber',
      desc: 'Deep Espresso #1C1B1F with Brass Gold & Cream Amber tones',
      previewColor: 'bg-gradient-to-r from-amber-400 to-amber-200',
      bgHex: '#121214',
      surfaceHex: 'rgba(28, 27, 31, 0.88)',
      accentPrimaryHex: '#E5A93C',
      accentSecondaryHex: '#F5E6CA',
      accentTertiaryHex: '#D97706',
      textPrimaryHex: '#F5F0E8',
      textMutedHex: '#A8A29E',
      borderHex: 'rgba(229, 169, 60, 0.22)'
    },
    {
      id: 'rock',
      name: 'Electric Rock',
      tagline: 'Zinc Dark #18181B with High-Voltage Crimson & Flame',
      desc: 'Zinc Dark #18181B with High-Voltage Crimson & Flame Orange',
      previewColor: 'bg-gradient-to-r from-rose-500 to-orange-400',
      bgHex: '#050505',
      surfaceHex: 'rgba(24, 24, 27, 0.88)',
      accentPrimaryHex: '#FF1E56',
      accentSecondaryHex: '#FFAC1C',
      accentTertiaryHex: '#EF4444',
      textPrimaryHex: '#FAFAFA',
      textMutedHex: '#A1A1AA',
      borderHex: 'rgba(255, 30, 86, 0.25)'
    },
    {
      id: 'oled',
      name: 'Pure Dark (OLED Optimized)',
      tagline: 'True Black #000000 with Zero Battery Drain',
      desc: 'True Black #000000 with minimum battery drain on OLED screens',
      previewColor: 'bg-gradient-to-r from-zinc-800 to-white',
      bgHex: '#000000',
      surfaceHex: 'rgba(18, 18, 18, 0.95)',
      accentPrimaryHex: '#00F0FF',
      accentSecondaryHex: '#FFFFFF',
      accentTertiaryHex: '#38BDF8',
      textPrimaryHex: '#FFFFFF',
      textMutedHex: '#71717A',
      borderHex: 'rgba(255, 255, 255, 0.12)'
    }
  ];

  const currentPreviewIndex = THEMES.findIndex((t) => t.id === previewTheme);
  const activePreview = THEMES[currentPreviewIndex >= 0 ? currentPreviewIndex : 0];

  const handlePrevTheme = () => {
    triggerHaptic('selection');
    const newIdx = (currentPreviewIndex - 1 + THEMES.length) % THEMES.length;
    setPreviewTheme(THEMES[newIdx].id);
  };

  const handleNextTheme = () => {
    triggerHaptic('selection');
    const newIdx = (currentPreviewIndex + 1) % THEMES.length;
    setPreviewTheme(THEMES[newIdx].id);
  };

  const handleApplyPreviewTheme = () => {
    triggerHaptic('success');
    onSelectTheme(activePreview.id);
    setCopiedStatus(`Theme applied: ${activePreview.name}`);
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  const handleToggleBatterySaver = () => {
    const next = !batterySaver;
    setBatterySaver(next);
    storageService.setBatterySaver(next);
    triggerHaptic('light');
    setCopiedStatus(next ? 'Battery Saver activated: Visualizer throttled for prolonged playback' : 'Battery Saver disabled: Full visualizer 60 FPS restored');
    setTimeout(() => setCopiedStatus(''), 3000);
  };

  const handleToggleAutoPlay = () => {
    const next = !autoPlay;
    setAutoPlay(next);
    storageService.setAutoPlay(next);
    triggerHaptic('light');
  };

  const handleToggleNormalizeAudio = () => {
    const next = !normalizeAudio;
    setNormalizeAudio(next);
    audioEngine.setNormalizeAudio(next);
    setCopiedStatus(next ? 'Audio Normalization (Loudness Equalizer) Activated' : 'Audio Normalization Bypassed');
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  const handleTargetLevelChange = (level: number) => {
    setTargetNormalizeLevel(level);
    audioEngine.setTargetNormalizeLevel(level);
    setCopiedStatus(`Target Normalization Level set to ${Math.round(level * 100)}%`);
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  const handleCrossfadeChange = (durationMs: number) => {
    setCrossfadeDurationMs(durationMs);
    audioEngine.setCrossfadeDurationMs(durationMs);
    setCopiedStatus(`Station Cross-fade Duration set to ${durationMs}ms`);
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  const handleToggleAutoDetectTheme = () => {
    const next = !autoDetectTheme;
    setAutoDetectTheme(next);
    storageService.setAutoDetectTheme(next);
    if (next) {
      setTimeBasedThemeState(false);
      storageService.setTimeBasedTheme(false);
      if (typeof window !== 'undefined' && window.matchMedia) {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        onSelectTheme(isDark ? 'oled' : 'frosted-glass');
        setCopiedStatus(`Auto-Detect System Theme Enabled (${isDark ? 'OLED Dark' : 'Frosted Glass'})`);
      }
    } else {
      setCopiedStatus('Auto-Detect System Theme Disabled');
    }
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  const handleToggleTimeBasedTheme = () => {
    const next = !timeBasedTheme;
    setTimeBasedThemeState(next);
    storageService.setTimeBasedTheme(next);
    triggerHaptic('light');
    if (next) {
      setAutoDetectTheme(false);
      storageService.setAutoDetectTheme(false);
      const hours = new Date().getHours();
      const isDaylight = hours >= 6 && hours < 18;
      const targetTheme: ThemeType = isDaylight ? 'cyberpunk' : 'oled';
      onSelectTheme(targetTheme);
      setCopiedStatus(`Time-Based Theme Enabled (${isDaylight ? 'Cyberpunk' : 'OLED Dark'})`);
    } else {
      setCopiedStatus('Time-Based Theme Disabled');
    }
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  const filteredLanguages = languages.filter(
    l =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const handleExportFavorites = () => {
    triggerHaptic('success');
    const result = storageService.downloadBackupJSON('neotune_config_backup');
    if (result.success) {
      setCopiedStatus(`Exported complete NeoTune backup (${result.favoritesCount} favorites, station settings & audio EQ) to ${result.filename}!`);
    } else {
      setCopiedStatus('Exported complete data backup successfully!');
    }
    setTimeout(() => setCopiedStatus(''), 3500);
  };

  const handleImportFavorites = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const rawContent = evt.target?.result as string;
        const result = storageService.importUserData(rawContent);
        if (result.success) {
          triggerHaptic('success');
          setCopiedStatus(`Imported ${result.count.favorites} favorites, ${result.count.queued} queued stations, audio EQ and station settings!`);
          setTimeout(() => setCopiedStatus(''), 3500);
        } else {
          triggerHaptic('error');
          setCopiedStatus(`Import failed: ${result.error || 'Invalid backup data'}`);
        }
      } catch {
        triggerHaptic('error');
        setCopiedStatus('Failed to parse backup JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-28">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Preferences & System Settings</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Audio engine DSP, custom themes, stream safety and alarms
        </p>
      </div>

      {copiedStatus && (
        <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{copiedStatus}</span>
        </div>
      )}

      {/* 0.0 Firebase Cloud User Profile & Multi-Device Sync */}
      <UserProfileSection currentUser={currentUser} onOpenAuth={onOpenAuth} />

      {/* 0. PWA & Standalone Installation Card */}
      <div className="p-5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-tr from-purple-500/20 to-sky-500/20 text-[var(--accent-primary)] border border-white/10">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">App Installation & PWA</h3>
                {isInstalled ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Standalone Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Ready to Install
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Install as a standalone app on PC, Mac, Android, iPhone, or Smart TV
              </p>
            </div>
          </div>

          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-black font-bold text-xs hover:opacity-90 transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isInstalled ? 'View App Guide' : 'Install App / Guide'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Laptop className="w-3.5 h-3.5 text-sky-400" />
              <span>PC / Mac / Linux</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Dedicated window, taskbar shortcut, and physical media keys sync.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mobile (iOS / Android)</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              High-priority background playback, lock screen widget & zero browser address bar.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              <span>Smart TV / Living Room</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              D-Pad 10-foot remote navigation, full-screen audio visuals & sleep timers.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Theme Palette Selector & Mini-Theme Live Previewer */}
      <div className="p-5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{t('theme_selection')}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                  Live Previewer
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Cycle themes with live UI audio rendering before applying</p>
            </div>
          </div>

          {/* Theme Carousel Cycle Controls */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={handlePrevTheme}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Previous Theme"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 px-1">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => {
                    triggerHaptic('selection');
                    setPreviewTheme(th.id);
                  }}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    th.id === previewTheme
                      ? 'w-5 sm:w-6 bg-[var(--accent-primary)] shadow-sm'
                      : 'w-2 sm:w-2.5 bg-white/30 hover:bg-white/50'
                  }`}
                  title={`Preview ${th.name}`}
                />
              ))}
            </div>
            <button
              onClick={handleNextTheme}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Next Theme"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* --- LIVE THEME PREVIEW CARD --- */}
        <div
          className="rounded-2xl p-4 sm:p-5 border transition-all duration-300 relative overflow-hidden shadow-2xl"
          style={{
            backgroundColor: activePreview.bgHex,
            borderColor: activePreview.borderHex,
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ backgroundColor: activePreview.accentPrimaryHex }}
          />

          <div className="relative z-10 space-y-4">
            {/* Preview Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b" style={{ borderColor: activePreview.borderHex }}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: activePreview.accentPrimaryHex }}
                  />
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: activePreview.accentSecondaryHex }}
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold tracking-tight truncate" style={{ color: activePreview.textPrimaryHex }}>
                    {activePreview.name}
                  </h4>
                  <p className="text-[11px] truncate" style={{ color: activePreview.textMutedHex }}>
                    {activePreview.tagline}
                  </p>
                </div>
              </div>

              {/* Action: Apply or Currently Active status */}
              {currentTheme === activePreview.id ? (
                <div
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 w-full sm:w-auto"
                  style={{
                    backgroundColor: `${activePreview.accentPrimaryHex}20`,
                    borderColor: `${activePreview.accentPrimaryHex}50`,
                    color: activePreview.accentPrimaryHex,
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Currently Applied</span>
                </div>
              ) : (
                <button
                  onClick={handleApplyPreviewTheme}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer hover:opacity-90 shrink-0 w-full sm:w-auto min-h-[36px] sm:min-h-0"
                  style={{
                    backgroundColor: activePreview.accentPrimaryHex,
                    color: '#000000',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply This Theme</span>
                </button>
              )}
            </div>

            {/* Live Interactive Player Mock */}
            <div
              className="p-3.5 sm:p-4 rounded-xl border backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
              style={{
                backgroundColor: activePreview.surfaceHex,
                borderColor: activePreview.borderHex,
              }}
            >
              {/* Left: Station artwork + info */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-base shadow-md shrink-0 relative overflow-hidden"
                  style={{
                    backgroundColor: `${activePreview.accentPrimaryHex}25`,
                    color: activePreview.accentPrimaryHex,
                    borderColor: `${activePreview.accentPrimaryHex}40`,
                    borderWidth: '1px'
                  }}
                >
                  <Radio className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider shrink-0"
                      style={{
                        backgroundColor: `${activePreview.accentPrimaryHex}30`,
                        color: activePreview.accentPrimaryHex,
                      }}
                    >
                      LIVE 320K
                    </span>
                    <span className="text-xs font-bold truncate" style={{ color: activePreview.textPrimaryHex }}>
                      NeoTune Studio Broadcast
                    </span>
                  </div>
                  <p className="text-[11px] truncate" style={{ color: activePreview.textMutedHex }}>
                    Atmospheric Cyber & Ambient Chillout Relay
                  </p>
                </div>
              </div>

              {/* Bottom Row on Mobile: Visualizer + Controls */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5">
                {/* Visualizer */}
                <div className="flex items-end gap-1 h-7 px-3 py-1 rounded-lg bg-black/30 border border-white/5">
                  {[45, 80, 60, 95, 70, 85, 40, 75].map((height, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full transition-all duration-300"
                      style={{
                        height: previewPlaying ? `${height}%` : '20%',
                        backgroundColor: i % 2 === 0 ? activePreview.accentPrimaryHex : activePreview.accentSecondaryHex,
                        animation: previewPlaying ? `pulse ${0.6 + (i * 0.15)}s ease-in-out infinite alternate` : 'none',
                      }}
                    />
                  ))}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setPreviewPlaying(!previewPlaying);
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-all cursor-pointer"
                    style={{
                      backgroundColor: activePreview.accentPrimaryHex,
                      color: '#000000',
                    }}
                    title={previewPlaying ? 'Pause Visualizer Animation' : 'Play Visualizer Animation'}
                  >
                    {previewPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                  <div
                    className="p-2 rounded-lg border cursor-pointer"
                    style={{
                      borderColor: activePreview.borderHex,
                      color: activePreview.accentSecondaryHex,
                    }}
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </div>
            </div>

            {/* Color Swatch Tokens Strip */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: activePreview.textMutedHex }}>
                Color Tokens:
              </span>
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono border"
                style={{ backgroundColor: activePreview.bgHex, borderColor: activePreview.borderHex, color: activePreview.textPrimaryHex }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activePreview.bgHex }} />
                <span>BG: {activePreview.bgHex}</span>
              </div>
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono border"
                style={{ backgroundColor: activePreview.bgHex, borderColor: activePreview.borderHex, color: activePreview.accentPrimaryHex }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activePreview.accentPrimaryHex }} />
                <span>Primary: {activePreview.accentPrimaryHex}</span>
              </div>
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono border"
                style={{ backgroundColor: activePreview.bgHex, borderColor: activePreview.borderHex, color: activePreview.accentSecondaryHex }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activePreview.accentSecondaryHex }} />
                <span>Secondary: {activePreview.accentSecondaryHex}</span>
              </div>
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono border"
                style={{ backgroundColor: activePreview.bgHex, borderColor: activePreview.borderHex, color: activePreview.accentTertiaryHex }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activePreview.accentTertiaryHex }} />
                <span>Accent: {activePreview.accentTertiaryHex}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Grid Palette Theme Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {THEMES.map((theme) => {
            const isSelected = currentTheme === theme.id;
            const isPreviewing = previewTheme === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => {
                  triggerHaptic('light');
                  setPreviewTheme(theme.id);
                  onSelectTheme(theme.id);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] shadow-sm'
                    : isPreviewing
                    ? 'bg-white/10 border-white/20'
                    : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${theme.previewColor}`} />
                    <span className="text-sm font-bold text-[var(--text-primary)]">{theme.name}</span>
                    {isPreviewing && !isSelected && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-white/10 text-white/80">
                        Previewing
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{theme.desc}</p>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]' : 'border-white/30'
                  }`}
                >
                  {isSelected && <span className="w-2 h-2 rounded-full bg-black" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Auto-Detect Theme Toggle */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4 mt-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <SunMoon className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                Auto-Detect System Theme
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                OS Sync
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Listens for browser <code className="text-[10px] font-mono px-1 py-0.5 bg-black/40 rounded text-cyan-300">prefers-color-scheme: dark</code> media query and automatically sets theme to OLED or Frosted Glass.
            </p>
          </div>
          <button
            onClick={handleToggleAutoDetectTheme}
            className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              autoDetectTheme ? 'bg-[var(--accent-primary)]' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-black transition-transform ${
                autoDetectTheme ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Time-Based Theme Toggle */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4 mt-3 animate-fadeIn">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <SunMoon className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                Time-Based Theme (Day/Night)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                Cyberpunk / OLED
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Automatically switch to <strong className="text-pink-400">Cyberpunk</strong> during daylight (6:00 AM - 6:00 PM) and <strong className="text-purple-400">OLED</strong> at night.
            </p>
          </div>
          <button
            onClick={handleToggleTimeBasedTheme}
            className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              timeBasedTheme ? 'bg-[var(--accent-primary)]' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-black transition-transform ${
                timeBasedTheme ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 1.5 Audio Visualizer Skin Selector */}
      <div className="p-5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Visualizer Theme Selector</h3>
              <p className="text-xs text-[var(--text-muted)]">Select custom 8-band audio visualizer presets to match your interface theme</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30 text-xs font-bold capitalize">
            Skin: {visualizerSkin}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {VISUALIZER_SKINS.map((skin) => {
            const isSelected = visualizerSkin === skin.id;
            return (
              <div
                key={skin.id}
                onClick={() => handleSelectVisualizerSkin(skin.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[var(--accent-secondary)]/15 border-[var(--accent-secondary)] shadow-sm'
                    : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{skin.name}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{skin.desc}</p>
                </div>

                {/* Live Animation Preview Box */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-12 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center p-1">
                    <CSSAudioVisualizer isPlaying={true} skin={skin.id} size="md" />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-[var(--accent-secondary)] bg-[var(--accent-secondary)]' : 'border-white/30'
                    }`}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-black" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Configurable Dynamic Visualizer Cycle Interval */}
        {visualizerSkin === 'dynamic' && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-500/10 via-[var(--surface-main)] to-cyan-500/10 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 animate-spin" style={{ animationDuration: '8s' }} />
                <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  Dynamic Skin Cycle Interval
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Duration each visualizer skin remains active before auto-cycling
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[5, 10, 15, 30].map((intervalSec) => (
                <button
                  key={intervalSec}
                  onClick={() => handleCycleIntervalChange(intervalSec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    visualizerCycleInterval === intervalSec
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-white/10'
                  }`}
                >
                  {intervalSec}s
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Visualizer Intensity & Sensitivity Slider */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[var(--accent-secondary)]/10 via-[var(--surface-main)] to-[var(--accent-primary)]/10 border border-[var(--accent-secondary)]/20 space-y-4 mt-3">
          {/* Sensitivity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--accent-secondary)] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                    Visualizer Frequency Sensitivity
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Adjust response gain sensitivity for audio visualizer animations
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30 text-xs font-mono font-bold">
                {Math.round(visualizerSensitivity * 100)}% Gain
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={visualizerSensitivity}
                onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--accent-secondary)]"
              />
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
                <span>20% (Subtle)</span>
                <span>100% (Standard)</span>
                <span>250% (High Energy)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {[
                { label: '50% Low', val: 0.5 },
                { label: '100% Normal', val: 1.0 },
                { label: '150% Boosted', val: 1.5 },
                { label: '200% Max', val: 2.0 }
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handleSensitivityChange(preset.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    Math.abs(visualizerSensitivity - preset.val) < 0.05
                      ? 'bg-[var(--accent-secondary)] text-black shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 my-2" />

          {/* Intensity / Speed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                    Visualizer Animation Intensity (Speed)
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Amplify or dim the animation speed and overall height multiplier
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 text-xs font-mono font-bold">
                {Math.round(visualizerIntensity * 100)}% Speed
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={visualizerIntensity}
                onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
              />
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
                <span>20% (Calm)</span>
                <span>100% (Balanced)</span>
                <span>250% (Intense Hyper)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {[
                { label: '50% Slow', val: 0.5 },
                { label: '100% Normal', val: 1.0 },
                { label: '150% Dynamic', val: 1.5 },
                { label: '200% Hyper', val: 2.0 }
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handleIntensityChange(preset.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    Math.abs(visualizerIntensity - preset.val) < 0.05
                      ? 'bg-[var(--accent-primary)] text-black shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visualizer Theme-Based Color Palette Selector */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[var(--accent-primary)]/10 via-[var(--surface-main)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/20 space-y-3 mt-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  Visualizer Theme Sync & Color Palette
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Sync visualizer bands with active theme or lock to a specific color preset
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { label: 'Sync to App Theme', val: 'sync' },
              { label: 'Neon Cyberpunk', val: 'neon' },
              { label: 'Warm Jazz Gold', val: 'gold' },
              { label: 'Crimson Rock', val: 'crimson' },
              { label: 'OLED Monochromatic', val: 'mono' }
            ].map(palette => (
              <button
                key={palette.val}
                onClick={() => {
                  storageService.saveVisualizerColorScheme(palette.val);
                  setVisualizerColorScheme(palette.val);
                  triggerHaptic('selection');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  visualizerColorScheme === palette.val
                    ? 'bg-[var(--accent-primary)] text-black border-[var(--accent-primary)] shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border-white/10'
                }`}
              >
                {palette.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Visualizer Accent Skin Color Builder */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-[var(--surface-main)] to-amber-500/10 border border-purple-500/20 space-y-3 mt-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  Custom Visualizer Skin Builder
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                  Firebase Cloud Sync
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Define custom primary and secondary accent colors for audio visualizer rendering
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: customColors.primaryColor }} />
                <span className="text-xs font-bold text-white">Primary Accent</span>
              </div>
              <input
                type="color"
                value={customColors.primaryColor}
                onChange={(e) => handleUpdateCustomColor('primaryColor', e.target.value)}
                className="w-8 h-8 rounded bg-transparent cursor-pointer border-0"
              />
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: customColors.secondaryColor }} />
                <span className="text-xs font-bold text-white">Secondary Accent</span>
              </div>
              <input
                type="color"
                value={customColors.secondaryColor}
                onChange={(e) => handleUpdateCustomColor('secondaryColor', e.target.value)}
                className="w-8 h-8 rounded bg-transparent cursor-pointer border-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Language & Internationalization (50 Languages) Dropdown */}
      <div className="p-5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{t('language_selection')}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                  50 Languages
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Localize interface navigation, controls, and audio parameters
              </p>
            </div>
          </div>

          {/* Current Active Language Pill */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Active:</span>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <span>{languages.find(l => l.code === language)?.nativeName || language}</span>
              <span className="text-[10px] text-emerald-200/70 font-mono">({language})</span>
            </span>
          </div>
        </div>

        {/* Dropdown Selector Component */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Direct Native HTML Select for Quick Mobile / Fast Access */}
            <div className="relative flex-1">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-emerald-400 cursor-pointer pr-10"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code} className="bg-zinc-900 text-white">
                    {l.nativeName} ({l.name}) — [{l.code}]
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Search Filter input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter 50 languages..."
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Quick Select Grid for Filtered / Popular languages */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 pt-1">
            {filteredLanguages.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold shadow-sm'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base leading-none shrink-0">{lang.flag || '🌐'}</span>
                    <div className="min-w-0">
                      <div className="text-xs truncate">{lang.nativeName}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{lang.name}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. PC & Desktop Hotkeys & Diagnostics */}
      <div className="p-5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-3.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
          Diagnostics & Desktop Controls
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]">
                    Keyboard Shortcuts
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">Space, Arrows, Mute & Fast Navigation</div>
                </div>
              </div>
              <span className="text-xs text-[var(--accent-primary)] font-semibold">View →</span>
            </button>
          )}

          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-400 hover:bg-cyan-500/10 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-cyan-300">
                    Stream Diagnostics & Logs
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">Latency, buffer stalls & silent audio logs</div>
                </div>
              </div>
              <span className="text-xs text-cyan-400 font-semibold">Inspect →</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Audio Subsystems (EQ, Sleep Timer, Alarm) */}
      <div className="p-5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-3.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
          Audio DSP & Alarm Engines
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={onOpenEQ}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 text-left transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]">
                  Equalizer DSP
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">5-Band +6dB Booster</div>
              </div>
            </div>
          </button>

          <button
            onClick={onOpenSleepTimer}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-400 hover:bg-indigo-500/10 text-left transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-indigo-300">
                  Sleep Timer
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">Fade-out volume timer</div>
              </div>
            </div>
          </button>

          <button
            onClick={onOpenAlarm}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-amber-400 hover:bg-amber-500/10 text-left transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-amber-300">
                  Radio Alarm
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">Wake up to live stream</div>
              </div>
            </div>
          </button>
        </div>

        {/* Night Mode Volume Dynamics Compression Toggle */}
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between gap-4 mt-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <SunMoon className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                Night Mode Volume Dynamics
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                DSP Dynamics Compressor
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Compresses dynamic range at night (-36dB threshold) to soften unexpected loud audio spikes without raising background noise.
            </p>
          </div>
          <button
            onClick={() => handleToggleNightMode(!nightMode)}
            className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              nightMode ? 'bg-indigo-500' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-black transition-transform ${
                nightMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Gesture Customization Menu Card */}
      <div className="p-5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">FullPlayer Swipe Gestures</h3>
              <p className="text-xs text-[var(--text-muted)]">Map touch swipe actions on FullPlayer to station or player controls</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            Touch & Drag
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'swipeLeft' as const, label: 'Swipe Left', icon: '←' },
            { key: 'swipeRight' as const, label: 'Swipe Right', icon: '→' },
            { key: 'swipeUp' as const, label: 'Swipe Up', icon: '↑' },
            { key: 'swipeDown' as const, label: 'Swipe Down', icon: '↓' }
          ].map(gesture => (
            <div key={gesture.key} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-white/10 text-white font-mono text-xs flex items-center justify-center font-bold">
                  {gesture.icon}
                </span>
                <span className="text-xs font-bold text-[var(--text-primary)]">{gesture.label}</span>
              </div>

              <select
                value={gestureConfig[gesture.key]}
                onChange={(e) => handleUpdateGesture(gesture.key, e.target.value as GestureAction)}
                className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs font-semibold text-[var(--accent-primary)] focus:outline-none cursor-pointer"
              >
                <option value="next_station">Next Station</option>
                <option value="prev_station">Previous Station</option>
                <option value="toggle_favorite">Toggle Favorite</option>
                <option value="toggle_play">Play / Pause</option>
                <option value="close_player">Close Player</option>
                <option value="none">Disabled</option>
              </select>
            </div>
          ))}
        </div>

        {/* Haptic Feedback Toggle Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-[var(--surface-main)] to-pink-500/10 border border-purple-500/20 flex items-center justify-between gap-4 mt-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                Haptic Feedback (Device Vibration API)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                Tactile Vibration
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Triggers tactile physical vibration pulses on supported mobile and PWA devices during button taps, playback controls, station switching, and favoriting.
            </p>
          </div>
          <button
            onClick={handleToggleHaptics}
            className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              hapticsEnabled ? 'bg-purple-500' : 'bg-white/20'
            }`}
            title={hapticsEnabled ? 'Disable Haptic Feedback' : 'Enable Haptic Feedback'}
          >
            <div
              className={`w-5 h-5 rounded-full bg-black transition-transform ${
                hapticsEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2.5 Listening Habits & 30-Day Activity Heatmap (Recharts) */}
      <ListeningHabitsSection />

      {/* 2.6 Estimated Data Usage Tracker */}
      <div className="p-5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Estimated Data Usage Tracker</h3>
              <p className="text-xs text-[var(--text-muted)]">Calculated based on stream bitrate and cumulative listening duration</p>
            </div>
          </div>

          <button
            onClick={handleResetDataStats}
            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Counter</span>
          </button>
        </div>

        {/* Data Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Total Consumed Data</div>
            <div className="text-xl font-black text-emerald-400 font-mono">{usageData.formatted}</div>
            <div className="text-[10px] text-[var(--text-muted)]">Estimated network bandwidth</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Total Listening Time</div>
            <div className="text-xl font-black text-sky-400 font-mono">
              {Math.floor(usageData.totalSec / 3600)}h {Math.floor((usageData.totalSec % 3600) / 60)}m
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">{usageData.totalSec} total seconds recorded</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Consumption Rate</div>
            <div className="text-xl font-black text-amber-400 font-mono">
              {((dataUsageBitrate * 1000 / 8 * 3600) / (1024 * 1024)).toFixed(1)} MB/hr
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">At {dataUsageBitrate} kbps quality</div>
          </div>
        </div>

        {/* Bitrate Simulator Selector */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold text-[var(--text-muted)]">Stream Quality & Bitrate Calculation Presets:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { kbps: 64, label: '64 kbps', desc: 'Data Saver' },
              { kbps: 128, label: '128 kbps', desc: 'Standard HQ' },
              { kbps: 192, label: '192 kbps', desc: 'High Quality' },
              { kbps: 320, label: '320 kbps', desc: 'Lossless' }
            ].map((preset) => (
              <button
                key={preset.kbps}
                onClick={() => handleBitrateChange(preset.kbps)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  dataUsageBitrate === preset.kbps
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold shadow-md shadow-emerald-500/10'
                    : 'bg-white/5 border-white/5 text-[var(--text-primary)] hover:bg-white/10'
                }`}
              >
                <div className="text-xs font-bold font-mono">{preset.label}</div>
                <div className="text-[10px] text-[var(--text-muted)]">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Performance & Content Moderation */}
      <div className="p-5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
          Performance & Safety
        </div>

        {/* Normalize Audio Volume (Web Audio Leveler) */}
        <div className="rounded-xl bg-white/5 border border-white/5 overflow-hidden transition-colors">
          <div
            onClick={handleToggleNormalizeAudio}
            className="flex items-center justify-between p-3.5 hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  Normalize Audio Level
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                    DSP Leveler
                  </span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Dynamic Gain & Compressor to balance loudness variances between different live radio stations
                </div>
              </div>
            </div>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                normalizeAudio ? 'bg-indigo-500 text-white font-bold' : 'bg-white/10 text-transparent'
              }`}
            >
              ✓
            </div>
          </div>

          {normalizeAudio && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-white/5 bg-black/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
                <span>Target Normalization Level</span>
                <span className="text-indigo-400 font-bold">{Math.round(targetNormalizeLevel * 100)}%</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { level: 0.70, label: 'Soft (70%)' },
                  { level: 0.85, label: 'Standard (85%)' },
                  { level: 1.00, label: 'Boosted (100%)' }
                ].map(opt => (
                  <button
                    key={opt.level}
                    type="button"
                    onClick={() => handleTargetLevelChange(opt.level)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      Math.abs(targetNormalizeLevel - opt.level) < 0.05
                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30 font-semibold'
                        : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Smooth Station Cross-Fade Duration */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 transition-colors space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  Station Cross-Fade
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                    Seamless
                  </span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Smooth volume transition when switching between radio channels
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-cyan-400 px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20">
              {crossfadeDurationMs === 0 ? 'Off' : `${crossfadeDurationMs}ms`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { ms: 0, label: 'Off' },
              { ms: 300, label: '300ms' },
              { ms: 500, label: '500ms' },
              { ms: 1000, label: '1000ms' }
            ].map(opt => (
              <button
                key={opt.ms}
                type="button"
                onClick={() => handleCrossfadeChange(opt.ms)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  crossfadeDurationMs === opt.ms
                    ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30'
                    : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Battery Saver Mode */}
        <div
          onClick={handleToggleBatterySaver}
          className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <BatteryCharging className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Battery Saver Mode</div>
              <div className="text-xs text-[var(--text-muted)]">Throttles visualizer FPS to save CPU & GPU battery</div>
            </div>
          </div>
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              batterySaver ? 'bg-emerald-400 text-black font-bold' : 'bg-white/10 text-transparent'
            }`}
          >
            ✓
          </div>
        </div>

        {/* Auto Play on Startup */}
        <div
          onClick={handleToggleAutoPlay}
          className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Auto-Resume Stream on Launch</div>
              <div className="text-xs text-[var(--text-muted)]">Automatically resumes the last played radio station</div>
            </div>
          </div>
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              autoPlay ? 'bg-[var(--accent-primary)] text-black font-bold' : 'bg-white/10 text-transparent'
            }`}
          >
            ✓
          </div>
        </div>

        {/* Content Moderation Link */}
        <div
          onClick={onOpenFilterManager}
          className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Content Moderation & Demotion</div>
              <div className="text-xs text-[var(--text-muted)]">Adult filter, politics demotion & custom blocked keywords</div>
            </div>
          </div>
          <span className="text-xs text-[var(--accent-primary)] font-semibold">Manage →</span>
        </div>

        {/* Network Quality Telemetry */}
        <div
          onClick={onOpenNetworkConfig}
          className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Network & Remote Telemetry</div>
              <div className="text-xs text-[var(--text-muted)]">Inspect active buffer sizes, DNS mirrors & server version</div>
            </div>
          </div>
          <span className="text-xs text-[var(--accent-primary)] font-semibold">Inspect →</span>
        </div>
      </div>

      {/* 3.5 Cache & Storage Management Dashboard */}
      <div className="p-5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Cache & Offline Storage Dashboard</h3>
              <p className="text-xs text-[var(--text-muted)]">View and delete cached API station searches, history and podcast feeds</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleClearRecentHistory}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Clear recently played stations list from local storage"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Recently Played History</span>
            </button>
            <span className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
              {(totalCacheSize / 1024).toFixed(1)} KB Used
            </span>
            {cacheItems.length > 0 && (
              <button
                onClick={handleClearAllCache}
                className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 text-rose-400 border border-rose-600/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {cacheItems.length === 0 ? (
          <div className="p-6 rounded-xl bg-white/5 border border-white/5 text-center flex flex-col items-center justify-center gap-2">
            <div className="text-zinc-500 font-bold text-xs uppercase tracking-wider">Storage Clean</div>
            <p className="text-xs text-zinc-400 max-w-xs">Your browser storage cache is currently clean. 0 KB utilized.</p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto rounded-xl border border-white/5 bg-black/40 divide-y divide-white/5 pr-1">
            {cacheItems.map((item) => {
              const sizeStr = item.sizeBytes < 1024 ? `${item.sizeBytes} B` : `${(item.sizeBytes / 1024).toFixed(1)} KB`;
              
              let typeColor = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
              if (item.type === 'station') typeColor = 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
              if (item.type === 'podcast') typeColor = 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
              if (item.type === 'episodes') typeColor = 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30';

              return (
                <div key={item.key} className="p-3 flex items-center justify-between gap-4 group">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate block">{item.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono shrink-0 uppercase ${typeColor}`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono truncate">{item.key}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono font-semibold text-zinc-400">{sizeStr}</span>
                    <button
                      onClick={() => handleClearCacheItem(item.key)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-700 hover:border-rose-900/50 transition-colors cursor-pointer"
                      title="Delete cached item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* IndexedDB Offline Cache Subsystem */}
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-3 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                IndexedDB Offline Cache (Last 10 Listened Stations)
              </h4>
            </div>
            {offlineIndexedDBStations.length > 0 && (
              <button
                onClick={handleClearIndexedDB}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all cursor-pointer"
              >
                Clear IndexedDB
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Automatically stores up to 10 recently listened stations in browser IndexedDB for offline playback recovery when network is lost.
          </p>

          {offlineIndexedDBStations.length === 0 ? (
            <div className="p-3 rounded-lg bg-black/30 text-[11px] text-zinc-400 italic">
              No stations cached in IndexedDB yet. Listen to any radio station to automatically cache it offline.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {offlineIndexedDBStations.map((st) => (
                <div
                  key={st.id}
                  onClick={() => {
                    triggerHaptic('play');
                    audioEngine.playStation(st);
                  }}
                  className="p-2.5 rounded-lg bg-black/40 border border-white/10 hover:border-cyan-400/50 flex items-center gap-2.5 cursor-pointer transition-all group"
                >
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-black/60 shrink-0 border border-white/10">
                    <img
                      src={st.imageUrl}
                      alt={st.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate group-hover:text-cyan-300">{st.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">{st.genre || 'Radio Station'}</div>
                  </div>
                  <Play className="w-3.5 h-3.5 text-cyan-400 shrink-0 opacity-80 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Support Developer & Server Hosting (Donation) */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/10 via-[var(--surface-main)]/90 to-[var(--accent-secondary)]/10 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                Support NeoTune & Server Hosting
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 text-[10px] font-semibold">
                  PayPal
                </span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                Keep 50,000+ radio streams fast, ad-uninterrupted and free
              </div>
            </div>
          </div>
          <Heart className="w-5 h-5 text-rose-400 fill-rose-500/20 shrink-0" />
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          NeoTune is built with passion without intrusive audio ads. If you enjoy the seamless global radio streams, parametric EQ, and podcast hub, consider buying a coffee to support server relays and continuous updates!
        </p>

        {/* Quick Amount Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => handleOpenPaypal(3)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-[var(--accent-primary)]/15 border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 text-center transition-all group cursor-pointer"
          >
            <div className="text-xs font-bold text-[var(--accent-primary)] group-hover:scale-105 transition-transform">$3.00</div>
            <div className="text-[10px] text-[var(--text-muted)]">☕ Espresso</div>
          </button>

          <button
            onClick={() => handleOpenPaypal(5)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-[var(--accent-primary)]/15 border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 text-center transition-all group cursor-pointer"
          >
            <div className="text-xs font-bold text-[var(--accent-primary)] group-hover:scale-105 transition-transform">$5.00</div>
            <div className="text-[10px] text-[var(--text-muted)]">🥐 Coffee & Treat</div>
          </button>

          <button
            onClick={() => handleOpenPaypal(10)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-[var(--accent-primary)]/15 border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 text-center transition-all group cursor-pointer"
          >
            <div className="text-xs font-bold text-[var(--accent-primary)] group-hover:scale-105 transition-transform">$10.00</div>
            <div className="text-[10px] text-[var(--text-muted)]">🚀 Server Supporter</div>
          </button>

          <button
            onClick={() => handleOpenPaypal()}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-[var(--accent-primary)]/15 border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 text-center transition-all group cursor-pointer"
          >
            <div className="text-xs font-bold text-[var(--accent-primary)] group-hover:scale-105 transition-transform">Custom</div>
            <div className="text-[10px] text-[var(--text-muted)]">💙 Any amount</div>
          </button>
        </div>

        {/* PayPal Action Bar */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1">
          <button
            onClick={() => handleOpenPaypal()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] hover:opacity-90 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-black/30 transition-all cursor-pointer"
          >
            <span>Donate via PayPal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyPaypal}
            className="py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
            title="Copy PayPal link"
          >
            {copiedPaypal ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPaypal ? 'Copied Link!' : 'paypal.me/tuyenphamvn'}</span>
          </button>
        </div>
      </div>

      {/* 5. Backup & Configuration Management */}
      <div className="p-5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Configuration Backup & Restore</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Export locally cached favorites, station settings & EQ presets to a standalone JSON file
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold">
            JSON Backup
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleExportFavorites}
            className="p-3.5 rounded-xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 text-left transition-all flex items-center gap-3 cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-300 group-hover:scale-110 transition-transform shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-purple-300 transition-colors">
                Export NeoTune Configuration
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Downloads all cached favorites, station settings and alarms
              </div>
            </div>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-3.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-left transition-all flex items-center gap-3 cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:scale-110 transition-transform shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-300 transition-colors">
                Download Listen History (CSV)
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Exports last 50 listened-to stations as CSV file
              </div>
            </div>
          </button>

          <label className="p-3.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/30 text-left transition-all flex items-center gap-3 cursor-pointer group">
            <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-300 group-hover:scale-110 transition-transform shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-300 transition-colors">
                Import Configuration File
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Restore favorites, queued stations and equalizer setup
              </div>
            </div>
            <input type="file" accept=".json" onChange={handleImportFavorites} className="hidden" />
          </label>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenRate}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>{platform === 'ios' || platform === 'android' ? 'Rate App' : 'Feedback & Review'}</span>
            </button>

            <button
              onClick={onOpenAbout}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>About</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

