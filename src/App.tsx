/**
 * NeoTune Cross-Platform Audio Hub
 * Global Live Radio & Podcast Streamer
 * @license Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi, X, AlertTriangle, Database, ExternalLink } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayerModal } from './components/FullPlayerModal';
import { CarModeView } from './components/CarModeView';
import { ScreensaverView } from './components/ScreensaverView';
import { TVFocusManager } from './components/TVFocusManager';
import { PodcastEpisodeDrawer } from './components/PodcastEpisodeDrawer';

// Dialogs
import { EqualizerModal } from './components/dialogs/EqualizerModal';
import { SleepTimerModal } from './components/dialogs/SleepTimerModal';
import { AlarmModal } from './components/dialogs/AlarmModal';
import { CountryPickerModal } from './components/dialogs/CountryPickerModal';
import { AddStationModal } from './components/dialogs/AddStationModal';
import { FilterManagerModal } from './components/dialogs/FilterManagerModal';
import { NetworkConfigModal } from './components/dialogs/NetworkConfigModal';
import { ShareAndRateModal } from './components/dialogs/ShareAndRateModal';
import { AboutModal } from './components/dialogs/AboutModal';
import { PWAInstallModal } from './components/dialogs/PWAInstallModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { KeyboardShortcutsModal } from './components/dialogs/KeyboardShortcutsModal';
import { DiagnosticsModal } from './components/dialogs/DiagnosticsModal';
import { AuthModal } from './components/dialogs/AuthModal';
import { GlobalQuickSearchModal } from './components/dialogs/GlobalQuickSearchModal';

// Views
import { RadioView } from './views/RadioView';
import { PodcastsView } from './views/PodcastsView';
import { FavoritesView } from './views/FavoritesView';
import { SettingsView } from './views/SettingsView';

import { ResumeDeviceBanner } from './components/ResumeDeviceBanner';

// Services & Types
import { AppView, ThemeType, RadioStation, PodcastShow, CountryInfo, FilterConfig, UserProfile, ActivePlaybackSession } from './types';
import { storageService } from './services/storageService';
import { updateMetaThemeColor, getStationColor } from './utils/themeColor';
import { storageCacheService } from './services/storageCacheService';
import { audioEngine } from './services/audioEngine';
import { apiService } from './services/apiService';
import { firebaseService, getDeviceId } from './services/firebaseService';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  // PWA Install Engine
  const {
    canPromptDirectly,
    isInstalled,
    isDismissed,
    platform,
    promptInstall,
    dismissInstall
  } = usePWAInstall();

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => firebaseService.getCurrentUser());
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Navigation & Display Modes
  const [currentView, setCurrentView] = useState<AppView>('radio');
  const [theme, setTheme] = useState<ThemeType>(() => storageService.getTheme());
  const [isCarMode, setIsCarMode] = useState(false);
  const [isScreensaver, setIsScreensaver] = useState(false);
  const [isTVMode, setIsTVMode] = useState(false);

  // Active Station & Countries
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [selectedCountryName, setSelectedCountryName] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [filterConfig, setFilterConfig] = useState<FilterConfig>(() => storageService.getFilterConfig());
  const [availableStations, setAvailableStations] = useState<RadioStation[]>([]);
  const [isAudioEngineReady, setIsAudioEngineReady] = useState(false);

  // Modals & Drawers State
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isEQOpen, setIsEQOpen] = useState(false);
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number | null>(null);
  const [sleepFadeSec, setSleepFadeSec] = useState<number | null>(null);
  const [isAlarmOpen, setIsAlarmOpen] = useState(false);
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [isAddStationOpen, setIsAddStationOpen] = useState(false);
  const [isFilterManagerOpen, setIsFilterManagerOpen] = useState(false);
  const [isNetworkConfigOpen, setIsNetworkConfigOpen] = useState(false);
  const [isRateOpen, setIsRateOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPWAInstallOpen, setIsPWAInstallOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isGlobalQuickSearchOpen, setIsGlobalQuickSearchOpen] = useState(false);

  // Global PC & PWA Keyboard Shortcuts listener
  const { toastMessage } = useKeyboardShortcuts({
    onOpenShortcuts: () => setIsShortcutsOpen(true),
    onOpenEQ: () => setIsEQOpen(true),
    onOpenSleepTimer: () => setIsSleepTimerOpen(true),
    onOpenCarMode: () => setIsCarMode(true),
    onOpenSearch: () => setIsGlobalQuickSearchOpen(true),
    stations: availableStations
  });

  // Targeted Station for Share or Alarm
  const [targetStation, setTargetStation] = useState<RadioStation | null>(null);

  // Selected Podcast Show for Episode Drawer
  const [selectedPodcastShow, setSelectedPodcastShow] = useState<PodcastShow | null>(null);

  // Active playback session on another device (for 'Resume from Device' banner)
  const [remoteSession, setRemoteSession] = useState<ActivePlaybackSession | null>(null);
  const [dismissedRemoteSessionId, setDismissedRemoteSessionId] = useState<string | null>(null);

  // Alarm Execution Trackers to avoid duplicate trigger
  const lastAlarmTriggerRef = useRef<string>('');

  // Offline Network Toast Tracker
  const [isOffline, setIsOffline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  const [showOfflineToast, setShowOfflineToast] = useState<boolean>(false);
  const [networkStatusText, setNetworkStatusText] = useState<string>('');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(() => firebaseService.isQuotaExceeded);

  // Screen Configuration state for dynamic ultrawide detection and centering
  const [screenConfig, setScreenConfig] = useState<{
    orientation: 'landscape' | 'portrait';
    isUltrawide: boolean;
    width: number;
  }>(() => {
    if (typeof window === 'undefined') {
      return { orientation: 'landscape', isUltrawide: false, width: 1200 };
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientation = width > height ? 'landscape' : 'portrait';
    const isUltrawide = width >= 1920 || (width / height) > 2.0;
    return { orientation, isUltrawide, width };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const orientation = width > height ? 'landscape' : 'portrait';
      const isUltrawide = width >= 1920 || (width / height) > 2.0;
      setScreenConfig({ orientation, isUltrawide, width });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute layout classes based on screen configuration
  const mainLayoutClasses = React.useMemo(() => {
    const base = "flex-1 w-full mx-auto pt-3 sm:pt-6 pb-40 sm:pb-28 transition-all duration-300";
    if (screenConfig.isUltrawide && screenConfig.orientation === 'landscape') {
      return `${base} max-w-[1360px] px-8 xl:px-14 shadow-2xl shadow-black/30 rounded-3xl bg-[var(--surface-main)]/10 backdrop-blur-sm border border-white/5 my-4`;
    }
    return `${base} max-w-7xl px-4 sm:px-6 md:pl-8 md:pr-6`;
  }, [screenConfig]);

  // 1. Initialize App Theme, Stats, Countries & Auto-Play
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    storageService.saveTheme(theme);
  }, [theme]);

  // 1.0 Auto-Prune LocalStorage Cache on Startup & Update Dynamic PWA Meta Theme-Color
  useEffect(() => {
    storageCacheService.autoPruneOnStartup();

    const unsubAudio = audioEngine.subscribe((state) => {
      if (state.currentStation) {
        const stationColor = getStationColor(state.currentStation.genre);
        updateMetaThemeColor(stationColor);
      } else {
        updateMetaThemeColor('#0A050E');
      }
      setSleepRemainingSec(state.sleepTimerRemainingSec);
      setSleepFadeSec(state.sleepTimerFadeSec);
    });

    return () => {
      unsubAudio();
    };
  }, []);

  // 1.1 Auto-Detect Theme Preference Listener (prefers-color-scheme: dark)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyAutoTheme = (isDark: boolean) => {
      if (storageService.getAutoDetectTheme()) {
        const targetTheme: ThemeType = isDark ? 'oled' : 'frosted-glass';
        setTheme(targetTheme);
      }
    };

    if (storageService.getAutoDetectTheme()) {
      applyAutoTheme(mediaQuery.matches);
    }

    const handleChange = (e: MediaQueryListEvent) => {
      if (storageService.getAutoDetectTheme()) {
        applyAutoTheme(e.matches);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // 1.1b Time-Based Theme Listener (cyberpunk during daylight, oled at night)
  useEffect(() => {
    const checkTimeBasedTheme = () => {
      if (storageService.getTimeBasedTheme()) {
        const hours = new Date().getHours();
        const isDaylight = hours >= 6 && hours < 18;
        const targetTheme: ThemeType = isDaylight ? 'cyberpunk' : 'oled';
        if (theme !== targetTheme) {
          setTheme(targetTheme);
        }
      }
    };

    checkTimeBasedTheme();
    const interval = setInterval(checkTimeBasedTheme, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, [theme]);

  // 1.2 Monitor Network Online/Offline Status for Toast Alert
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOffline = () => {
      setIsOffline(true);
      setShowOfflineToast(true);
      setNetworkStatusText('You have switched to offline mode. Limited to locally cached content.');
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowOfflineToast(true);
      setNetworkStatusText('Back online! Cloud sync & live network streams restored.');
      setTimeout(() => {
        setShowOfflineToast(false);
      }, 4500);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (!navigator.onLine) {
      setIsOffline(true);
      setShowOfflineToast(true);
      setNetworkStatusText('You are currently offline. Limited to locally cached content.');
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // 1.3 Monitor Firebase Sync Status for Quota Errors
  useEffect(() => {
    const unsub = firebaseService.subscribeSyncStatus((status) => {
      setIsQuotaExceeded(firebaseService.isQuotaExceeded);
    });
    return unsub;
  }, []);

  // 1.3 Handle Direct URL Parameter Deep-Linking (?stationId=XYZ)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const stationId = urlParams.get('stationId');

    if (stationId) {
      const favs = storageService.getFavorites();
      const recents = storageService.getRecents();
      const match = [...favs, ...recents].find(s => s.id === stationId);

      if (match) {
        audioEngine.playStation(match);
        setTargetStation(match);
        setIsFullPlayerOpen(true);
      } else {
        apiService.getStationById(stationId).then((station) => {
          if (station) {
            audioEngine.playStation(station);
            setTargetStation(station);
            setIsFullPlayerOpen(true);
          }
        });
      }
    }
  }, []);

  // 2. Firebase Auth Listener & Cloud Sync
  useEffect(() => {
    let unsubAlarm: (() => void) | null = null;
    let unsubFavs: (() => void) | null = null;
    let unsubRecents: (() => void) | null = null;
    let unsubLocalFavs: (() => void) | null = null;

    const unsubAuth = firebaseService.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user && !isQuotaExceeded) {
        // Sync cloud favorites
        const cloudFavs = await firebaseService.fetchFavoritesFromCloud();
        if (cloudFavs && cloudFavs.length > 0) {
          const localFavs = storageService.getFavorites();
          const map = new Map<string, RadioStation>();
          localFavs.forEach(s => map.set(s.id, s));
          cloudFavs.forEach(s => map.set(s.id, s));
          const merged = Array.from(map.values());
          try {
            localStorage.setItem('neotune_favorites_v1', JSON.stringify(merged));
          } catch (e) {
            console.warn('Storage sync failed:', e);
          }
        }

        // Sync cloud alarm
        const cloudAlarm = await firebaseService.getCloudAlarm();
        if (cloudAlarm) {
          storageService.saveAlarmConfig(cloudAlarm);
        }

        // Sync cloud settings
        const cloudSettings = await firebaseService.fetchSettingsFromCloud();
        if (cloudSettings) {
          if (cloudSettings.theme && cloudSettings.theme !== theme) {
            setTheme(cloudSettings.theme);
          }
        }

        // Live subscriptions for cross-device real-time sync
        if (unsubAlarm) unsubAlarm();
        unsubAlarm = firebaseService.subscribeUserAlarm((alarm) => {
          if (alarm) {
            storageService.saveAlarmConfig(alarm);
          }
        });

        if (unsubFavs) unsubFavs();
        unsubFavs = firebaseService.subscribeFavorites((favs) => {
          if (favs) {
            if (!firebaseService.isSyncingFavorites) {
              storageService.saveFavorites(favs);
            }
          }
        });

        if (unsubLocalFavs) unsubLocalFavs();
        unsubLocalFavs = storageService.subscribe((favs) => {
          if (!firebaseService.isSyncingFavorites) {
            firebaseService.syncFavoritesToCloud(favs);
          }
        });

        if (unsubRecents) unsubRecents();
        unsubRecents = firebaseService.subscribeRecentStations((recents) => {
          if (recents && recents.length > 0) {
            try {
              localStorage.setItem('neotune_recents_v1', JSON.stringify(recents.slice(0, 10)));
            } catch (e) {
              console.warn('Storage recents sync failed:', e);
            }
          }
        });
      }
    });

    return () => {
      unsubAuth();
      if (unsubAlarm) unsubAlarm();
      if (unsubFavs) unsubFavs();
      if (unsubLocalFavs) unsubLocalFavs();
      if (unsubRecents) unsubRecents();
    };
  }, [theme, isQuotaExceeded]);

  // 2.1 Push Local Active Playback State to Firestore when user is authenticated
  useEffect(() => {
    let lastStationId: string | null = null;
    let lastIsPlaying: boolean | null = null;
    let debounceTimeout: any = null;
    let lastWriteTime = 0;
    const WRITE_COOLDOWN_MS = 8000; // 8 seconds minimum between writes

    const unsubAudio = audioEngine.subscribe((state) => {
      if (currentUser && !firebaseService.isQuotaExceeded) {
        const currentId = state.currentStation?.id || null;
        const currentIsPlaying = state.isPlaying;
        if (currentId !== lastStationId || currentIsPlaying !== lastIsPlaying) {
          lastStationId = currentId;
          lastIsPlaying = currentIsPlaying;

          if (debounceTimeout) {
            clearTimeout(debounceTimeout);
          }

          debounceTimeout = setTimeout(() => {
            const now = Date.now();
            const timeSinceLastWrite = now - lastWriteTime;
            if (timeSinceLastWrite >= WRITE_COOLDOWN_MS) {
              lastWriteTime = now;
              firebaseService.updateActivePlaybackSession(state.currentStation, state.isPlaying);
            } else {
              // If within cooldown, queue the write at the end of the cooldown
              const delayNeeded = WRITE_COOLDOWN_MS - timeSinceLastWrite;
              debounceTimeout = setTimeout(() => {
                lastWriteTime = Date.now();
                firebaseService.updateActivePlaybackSession(state.currentStation, state.isPlaying);
              }, delayNeeded);
            }
          }, 1000); // 1-second debounce to let state settle
        }
      }
    });

    return () => {
      unsubAudio();
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [currentUser]);

  // 2.2 Subscribe to Realtime Active Playback Session from other devices
  useEffect(() => {
    if (!currentUser || isQuotaExceeded) {
      setRemoteSession(null);
      return;
    }

    const unsubSession = firebaseService.subscribeActivePlaybackSession((session) => {
      if (
        session &&
        session.isPlaying &&
        session.deviceId !== getDeviceId() &&
        Date.now() - session.updatedAt < 10 * 60 * 1000 &&
        session.station
      ) {
        setRemoteSession(session);
      } else {
        setRemoteSession(null);
      }
    });

    return () => {
      unsubSession();
    };
  }, [currentUser, isQuotaExceeded]);

  // 3. Recurring Radio Alarm Scheduler
  useEffect(() => {
    const checkAlarm = () => {
      const alarm = storageService.getAlarmConfig();
      if (!alarm || !alarm.isEnabled) return;

      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sun, 1 = Mon ...
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Check if scheduled for today
      const days = alarm.days && alarm.days.length > 0 ? alarm.days : [0, 1, 2, 3, 4, 5, 6];
      if (!days.includes(currentDay)) return;

      if (currentHour === alarm.hour && currentMinute === alarm.minute) {
        const triggerKey = `${now.toDateString()}_${currentHour}_${currentMinute}`;
        if (lastAlarmTriggerRef.current === triggerKey) return;
        lastAlarmTriggerRef.current = triggerKey;

        // Trigger alarm station with volume ramp
        if (alarm.stationUrl) {
          audioEngine.playStation({
            id: alarm.stationId,
            name: alarm.stationName,
            genre: alarm.stationGenre || 'Alarm Radio',
            country: 'Global',
            streamUrl: alarm.stationUrl,
            imageUrl: alarm.stationImageUrl || '',
            bitrate: '128k',
            codec: 'MP3',
            isFavorite: false
          });
          audioEngine.setVolume(alarm.volume || 0.85);
        }

        // Trigger push notification / FCM alert
        firebaseService.scheduleAlarmNotification(alarm);
      }
    };

    const interval = setInterval(checkAlarm, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Increment session counter
    storageService.incrementSessionCount();

    // Fetch list of countries & auto-detect default device country area
    apiService.getCountries().then((fetchedCountries) => {
      setCountries(fetchedCountries);
      
      // Auto-detect country/area if none selected yet
      if (!selectedCountryName && typeof window !== 'undefined') {
        const locale = navigator.language || (navigator.languages && navigator.languages[0]) || '';
        const parts = locale.split(/[-_]/);
        const detectedCode = parts.length > 1 ? parts[1].toUpperCase() : '';
        if (detectedCode) {
          const match = fetchedCountries.find(c => c.code.toUpperCase() === detectedCode);
          if (match) {
            setSelectedCountryCode(match.code);
            setSelectedCountryName(match.name);
          }
        }
      }
    });

    // Fetch initial default radio stations
    const urlParams = new URLSearchParams(window.location.search);
    const sharedStationId = urlParams.get('stationId');
    const importStationData = urlParams.get('import_station');

    if (importStationData) {
      try {
        const decoded = JSON.parse(importStationData);
        if (decoded && decoded.streamUrl && decoded.name) {
          const newStation: RadioStation = {
            id: `custom_${Date.now()}`,
            name: decoded.name,
            genre: decoded.genre || 'Imported Stream',
            country: decoded.country || 'Global',
            streamUrl: decoded.streamUrl,
            imageUrl: decoded.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
            bitrate: decoded.bitrate || '128 kbps',
            codec: decoded.codec || 'MP3',
            isFavorite: true,
            isCustom: true,
            customTags: decoded.customTags || [],
            lastListenedTimestamp: Date.now()
          };
          storageService.addCustomStation(newStation);
          storageService.toggleFavorite(newStation);
          
          // Clear query params
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Play and add
          setTimeout(() => {
            handleStationAdded(newStation);
            alert(`Imported and playing: ${decoded.name}!`);
          }, 600);
        }
      } catch (e) {
        console.error('Failed to import station from URL:', e);
      }
    }

    apiService.searchRadioStations({ limit: 40 }).then(async (res) => {
      setAvailableStations(res.stations || []);

      let initialStation: RadioStation | null = null;
      let shouldAutoPlay = false;

      if (sharedStationId) {
        const customs = storageService.getCustomStations();
        const customMatch = customs.find(c => c.id === sharedStationId);
        if (customMatch) {
          initialStation = customMatch;
          shouldAutoPlay = true;
        } else {
          try {
            const fetched = await apiService.getStationById(sharedStationId);
            if (fetched) {
              initialStation = fetched;
              shouldAutoPlay = true;
            }
          } catch (e) {
            console.error('Failed to load shared station:', e);
          }
        }
      }

      if (!initialStation) {
        const recents = storageService.getRecents();
        initialStation = recents.length > 0 ? recents[0] : (res.stations && res.stations.length > 0 ? res.stations[0] : null);
      }
      
      if (initialStation) {
        if (shouldAutoPlay) {
          audioEngine.playStation(initialStation);
          // Clean up the URL query param without refreshing the page
          try {
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: newUrl }, '', newUrl);
          } catch {}
        } else {
          audioEngine.setStation(initialStation);
        }
      }
      setIsAudioEngineReady(true);
    });

    // Check smart engagement sentiment
    const stats = storageService.getUserStats();
    if (!stats.hasRated && stats.sessionCount >= 3 && stats.totalListeningTimeSec >= 120) {
      setTimeout(() => {
        setIsRateOpen(true);
      }, 5000);
    }
  }, []);

  const handleSelectTheme = (newTheme: ThemeType) => {
    setTheme(newTheme);
  };

  const handleStationAdded = (newStation: RadioStation) => {
    setAvailableStations((prev) => [newStation, ...prev]);
    audioEngine.playStation(newStation);
  };

  const handleOpenAlarmWithStation = (station?: RadioStation) => {
    if (station) setTargetStation(station);
    setIsAlarmOpen(true);
  };

  const handleOpenShareWithStation = (station?: RadioStation) => {
    if (station) setTargetStation(station);
    setIsShareOpen(true);
  };

  const handleBlockStation = (station: RadioStation) => {
    const updated: FilterConfig = {
      ...filterConfig,
      blockedStationIds: [...filterConfig.blockedStationIds, station.id]
    };
    setFilterConfig(updated);
    storageService.saveFilterConfig(updated);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors duration-300 relative flex flex-col md:flex-row selection:bg-[var(--accent-primary)] selection:text-black overflow-x-hidden">
      {/* Ambient Frosted Glass Background Illumination Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-600/15 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-cyan-600/10 blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-40 left-1/4 w-[30rem] h-[30rem] rounded-full bg-fuchsia-600/10 blur-[140px] pointer-events-none" />
      </div>

      {/* TV D-Pad Focus & Inactivity Manager */}
      <TVFocusManager
        enabled={isTVMode}
        onAutoScreensaver={() => setIsScreensaver(true)}
      />

      {/* Floating Toast Notification for Network / Offline Status */}
      {showOfflineToast && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] p-3.5 rounded-2xl backdrop-blur-xl border text-black shadow-2xl shadow-black/60 flex items-center justify-between gap-3 transition-all animate-fadeIn ${
            isOffline
              ? 'bg-gradient-to-r from-amber-500/95 to-orange-600/95 border-amber-300/40 text-black'
              : 'bg-gradient-to-r from-emerald-500/95 to-teal-600/95 border-emerald-300/40 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-xl shrink-0 ${isOffline ? 'bg-black/20 text-black' : 'bg-white/20 text-white'}`}>
              {isOffline ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider truncate">
                {isOffline ? 'Offline Mode Active' : 'Online Connection Restored'}
              </h4>
              <p className="text-[11px] font-medium leading-tight opacity-95">
                {networkStatusText}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowOfflineToast(false)}
            className={`p-1 rounded-lg cursor-pointer shrink-0 ${
              isOffline ? 'hover:bg-black/10 text-black' : 'hover:bg-white/10 text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Navbar or Left Sidebar */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        currentTheme={theme}
        onSelectTheme={handleSelectTheme}
        onOpenAddStation={() => setIsAddStationOpen(true)}
        onOpenEQ={() => setIsEQOpen(true)}
        onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
        onOpenCarMode={() => setIsCarMode(true)}
        onOpenScreensaver={() => setIsScreensaver(true)}
        isTVMode={isTVMode}
        onToggleTVMode={() => setIsTVMode(!isTVMode)}
        onOpenInstallModal={() => setIsPWAInstallOpen(true)}
        isInstalled={isInstalled}
        platform={platform}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSearch={() => setIsGlobalQuickSearchOpen(true)}
      />

      {/* Main Layout Area on the right of the sidebar on desktop */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        
        {/* Dynamic Screen Orientation & Ultrawide Centering Optimal Indicator Badge */}
        {screenConfig.isUltrawide && screenConfig.orientation === 'landscape' && (
          <div id="ultrawide-centered-badge" className="absolute top-3 right-4 z-40 hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/35 text-indigo-300 text-[10px] font-bold shadow-xl backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>Optimal Ultrawide Mode Active</span>
          </div>
        )}

        {/* Main Content Container with Dynamic Layout Wrapper classes */}
        <main className={mainLayoutClasses}>
        {/* Firebase Firestore Quota Exceeded Banner */}
        {isQuotaExceeded && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200 shadow-xl shadow-rose-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex gap-3 items-start">
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0 mt-0.5 md:mt-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-300 flex items-center gap-2">
                  <Database className="w-4 h-4 text-rose-400" />
                  Cloud Database Quota Limit Reached
                </h4>
                <p className="text-xs text-rose-300/80 leading-relaxed mt-1">
                  NeoTune has safely transitioned to <strong className="text-rose-300 font-bold">Offline/Local Mode</strong>. All of your custom stations, favorite channels, sleep alarms, and stream configurations continue to be saved securely on this device. You will experience zero loss of functionality.
                </p>
                <p className="text-[11px] text-rose-400/75 mt-1.5 font-medium">
                  If you are the database owner, you can manage write quotas or upgrade your Spark plan on the{' '}
                  <a
                    href="https://console.firebase.google.com/project/delta-compass-281111/firestore/databases/ai-studio-neotunecrossplat-ea5eda2e-1a7d-4846-9502-677bb08345d0/data?openUpgradeDialog=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-rose-300 inline-flex items-center gap-1 font-bold"
                  >
                    Firebase Console <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsQuotaExceeded(false)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs shrink-0 cursor-pointer transition-all self-end md:self-center"
            >
              Acknowledge
            </button>
          </div>
        )}

        {/* Active Cross-Device Playback Resume Banner */}
        {remoteSession && dismissedRemoteSessionId !== remoteSession.station?.id && (
          <ResumeDeviceBanner
            session={remoteSession}
            onResume={() => {
              audioEngine.playStation(remoteSession.station);
              setRemoteSession(null);
            }}
            onDismiss={() => {
              if (remoteSession?.station?.id) {
                setDismissedRemoteSessionId(remoteSession.station.id);
              }
            }}
          />
        )}

        {currentView === 'radio' && (
          <RadioView
            onOpenCountryPicker={() => setIsCountryPickerOpen(true)}
            selectedCountryName={selectedCountryName}
            selectedCountryCode={selectedCountryCode}
            onSetAlarm={handleOpenAlarmWithStation}
            onShareStation={handleOpenShareWithStation}
            onOpenAddStation={() => setIsAddStationOpen(true)}
            filterConfig={filterConfig}
            onBlockStation={handleBlockStation}
            onOpenEqualizer={() => setIsEQOpen(true)}
            onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
            onOpenCarMode={() => setIsCarMode(true)}
            onOpenScreensaver={() => setIsScreensaver(true)}
            onOpenFullPlayer={() => setIsFullPlayerOpen(true)}
          />
        )}

        {currentView === 'podcasts' && (
          <PodcastsView
            onSelectPodcast={(show) => setSelectedPodcastShow(show)}
            onOpenEqualizer={() => setIsEQOpen(true)}
            onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
            onOpenCarMode={() => setIsCarMode(true)}
            onOpenScreensaver={() => setIsScreensaver(true)}
            onOpenFullPlayer={() => setIsFullPlayerOpen(true)}
          />
        )}

        {currentView === 'favorites' && (
          <FavoritesView
            onOpenAddStation={() => setIsAddStationOpen(true)}
            onSetAlarm={handleOpenAlarmWithStation}
            onShareStation={handleOpenShareWithStation}
            onNavigateRadio={() => setCurrentView('radio')}
            onOpenEqualizer={() => setIsEQOpen(true)}
            onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
            onOpenCarMode={() => setIsCarMode(true)}
            onOpenScreensaver={() => setIsScreensaver(true)}
            onOpenFullPlayer={() => setIsFullPlayerOpen(true)}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            currentTheme={theme}
            onSelectTheme={handleSelectTheme}
            onOpenEQ={() => setIsEQOpen(true)}
            onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
            onOpenAlarm={() => setIsAlarmOpen(true)}
            onOpenFilterManager={() => setIsFilterManagerOpen(true)}
            onOpenNetworkConfig={() => setIsNetworkConfigOpen(true)}
            onOpenRate={() => setIsRateOpen(true)}
            onOpenShare={() => setIsShareOpen(true)}
            onOpenAbout={() => setIsAboutOpen(true)}
            onOpenInstallModal={() => setIsPWAInstallOpen(true)}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            isInstalled={isInstalled}
            platform={platform}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>
    </div>

      {/* Floating Keyboard Shortcut Notification Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/15 text-white text-xs font-semibold shadow-2xl shadow-black/80 animate-bounce flex items-center gap-2 pointer-events-none">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Contextual PWA Install Prompt Banner */}
      {!isInstalled && !isDismissed && (
        <PWAInstallBanner
          platform={platform}
          canPromptDirectly={canPromptDirectly}
          onOpenModal={() => setIsPWAInstallOpen(true)}
          onDismiss={() => dismissInstall(14)}
          onDirectInstall={async () => {
            const res = await promptInstall();
            if (res === 'manual_needed') {
              setIsPWAInstallOpen(true);
            }
          }}
        />
      )}

      {/* Floating Bottom MiniPlayer */}
      <MiniPlayer
        onExpandPlayer={() => setIsFullPlayerOpen(true)}
        onOpenCarMode={() => setIsCarMode(true)}
        onOpenScreensaver={() => setIsScreensaver(true)}
        onOpenEQ={() => setIsEQOpen(true)}
        onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
        onOpenShare={handleOpenShareWithStation}
      />

      {/* Full Screen Audiophile Player Modal */}
      <FullPlayerModal
        isOpen={isFullPlayerOpen}
        onClose={() => setIsFullPlayerOpen(false)}
        onOpenEQ={() => setIsEQOpen(true)}
        onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
        onOpenCarMode={() => setIsCarMode(true)}
        onOpenScreensaver={() => setIsScreensaver(true)}
        onOpenShare={handleOpenShareWithStation}
        onOpenAlarm={handleOpenAlarmWithStation}
      />

      {/* Podcast Episode Drawer */}
      <PodcastEpisodeDrawer
        show={selectedPodcastShow}
        isOpen={!!selectedPodcastShow}
        onClose={() => setSelectedPodcastShow(null)}
      />

      {/* Car Mode View */}
      {isCarMode && (
        <CarModeView
          onClose={() => setIsCarMode(false)}
          stations={availableStations}
        />
      )}

      {/* OLED Screensaver View */}
      {isScreensaver && (
        <ScreensaverView
          onClose={() => setIsScreensaver(false)}
        />
      )}

      {/* Dialog Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />

      <EqualizerModal
        isOpen={isEQOpen}
        onClose={() => setIsEQOpen(false)}
      />

      <SleepTimerModal
        isOpen={isSleepTimerOpen}
        onClose={() => setIsSleepTimerOpen(false)}
      />

      <AlarmModal
        isOpen={isAlarmOpen}
        onClose={() => {
          setIsAlarmOpen(false);
          setTargetStation(null);
        }}
        stations={availableStations}
      />

      <CountryPickerModal
        isOpen={isCountryPickerOpen}
        onClose={() => setIsCountryPickerOpen(false)}
        countries={countries}
        selectedCountry={selectedCountryName}
        onSelectCountry={(name, code) => {
          setSelectedCountryName(name);
          setSelectedCountryCode(code);
        }}
      />

      <AddStationModal
        isOpen={isAddStationOpen}
        onClose={() => setIsAddStationOpen(false)}
        onStationAdded={handleStationAdded}
      />

      <FilterManagerModal
        isOpen={isFilterManagerOpen}
        onClose={() => setIsFilterManagerOpen(false)}
        onFilterChange={setFilterConfig}
      />

      <NetworkConfigModal
        isOpen={isNetworkConfigOpen}
        onClose={() => setIsNetworkConfigOpen(false)}
      />

      <ShareAndRateModal
        isOpen={isRateOpen}
        onClose={() => setIsRateOpen(false)}
        mode="rate"
      />

      <ShareAndRateModal
        isOpen={isShareOpen}
        onClose={() => {
          setIsShareOpen(false);
          setTargetStation(null);
        }}
        station={targetStation}
        mode="share"
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <PWAInstallModal
        isOpen={isPWAInstallOpen}
        onClose={() => setIsPWAInstallOpen(false)}
        platform={platform}
        canPromptDirectly={canPromptDirectly}
        onPromptInstall={promptInstall}
        isInstalled={isInstalled}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

      <GlobalQuickSearchModal
        isOpen={isGlobalQuickSearchOpen}
        onClose={() => setIsGlobalQuickSearchOpen(false)}
        onPlayPodcastEpisode={(show, ep) => {
          setSelectedPodcastShow(show);
          audioEngine.playPodcastEpisode(show, ep);
        }}
      />

      {/* Screen Dimming Fullscreen Overlay for Sleep Timer Fade-Out */}
      {sleepRemainingSec !== null && sleepRemainingSec > 0 && sleepFadeSec !== null && sleepFadeSec > 0 && sleepRemainingSec <= sleepFadeSec && (
        <div
          id="sleep-timer-screen-dimmer"
          className="fixed inset-0 bg-black pointer-events-none transition-opacity duration-1000"
          style={{
            zIndex: 9999,
            opacity: Math.max(0, Math.min(0.85, (1 - (sleepRemainingSec / sleepFadeSec)) * 0.9))
          }}
        />
      )}
    </div>
  );
}
