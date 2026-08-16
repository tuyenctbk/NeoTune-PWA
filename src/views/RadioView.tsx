import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  Globe,
  RefreshCw,
  Radio,
  Sparkles,
  Filter,
  X,
  ChevronRight,
  Zap,
  Cloud,
  History,
  Trash2,
  Bookmark,
  BookmarkCheck,
  WifiOff,
  Sliders,
  Share2,
  Flame,
  TrendingUp,
  Clock,
  ArrowDownAZ,
  ArrowUpDown,
  PlusCircle,
  Plus,
  Music,
  Newspaper,
  Guitar,
  Headphones,
  Gauge,
  HelpCircle
} from 'lucide-react';
import { RadioStation, CountryInfo, FilterConfig, UserProfile, QueuedStation } from '../types';
import { apiService } from '../services/apiService';
import { audioEngine } from '../services/audioEngine';
import { storageService } from '../services/storageService';
import { firebaseService } from '../services/firebaseService';
import { voiceControlService } from '../services/voiceControlService';
import { StationCard } from '../components/StationCard';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { NowPlayingStudioFragment } from '../components/NowPlayingStudioFragment';
import { AddStationModal } from '../components/dialogs/AddStationModal';
import { CategoryNavigation } from '../components/CategoryNavigation';
import { useTranslation } from '../services/i18n';

import { triggerHaptic } from '../utils/haptics';

export type SortOption = 'popular' | 'latest' | 'alphabetical';

interface RadioViewProps {
  onOpenCountryPicker: () => void;
  selectedCountryName: string;
  selectedCountryCode: string;
  onSetAlarm: (station: RadioStation) => void;
  onShareStation: (station: RadioStation) => void;
  filterConfig: FilterConfig;
  onBlockStation: (station: RadioStation) => void;
  onOpenEqualizer?: () => void;
  onOpenSleepTimer?: () => void;
  onOpenCarMode?: () => void;
  onOpenScreensaver?: () => void;
  onOpenFullPlayer?: () => void;
  onOpenAddStation?: () => void;
}

const DEFAULT_GENRE_TAGS = [
  'All Genres',
  'Custom Streams',
  'Jazz',
  'News',
  'Classical',
  'Ambient',
  'Chill',
  'Lofi',
  'Electronic',
  'Synthwave',
  'Rock',
  'Indie',
  'Pop',
  'House',
  'Lounge',
  'Hip Hop',
  'Reggae',
  'Metal',
  'Blues',
  'Country',
  'Talk'
];

export const RadioView: React.FC<RadioViewProps> = ({
  onOpenCountryPicker,
  selectedCountryName,
  selectedCountryCode,
  onSetAlarm,
  onShareStation,
  filterConfig,
  onBlockStation,
  onOpenEqualizer,
  onOpenSleepTimer,
  onOpenCarMode,
  onOpenScreensaver,
  onOpenFullPlayer,
  onOpenAddStation,
}) => {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [trendingStations, setTrendingStations] = useState<RadioStation[]>([]);
  const [topSharedStations, setTopSharedStations] = useState<RadioStation[]>([]);
  const [genreTags, setGenreTags] = useState<string[]>(DEFAULT_GENRE_TAGS);
  const [isRemoteTags, setIsRemoteTags] = useState<boolean>(false);
  const [remoteBanner, setRemoteBanner] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All Genres');
  const [currentStationId, setCurrentStationId] = useState<string | null>(null);
  const [activePlayingStation, setActivePlayingStation] = useState<RadioStation | null>(() => audioEngine.getState().currentStation);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recents, setRecents] = useState<RadioStation[]>([]);
  const [queuedStations, setQueuedStations] = useState<QueuedStation[]>(() => storageService.getQueuedStations());
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => firebaseService.getCurrentUser());
  const { t } = useTranslation();

  // AI Recommendation State
  const [recommendedStations, setRecommendedStations] = useState<RadioStation[]>([]);
  const [userFavoriteGenres, setUserFavoriteGenres] = useState<string[]>([]);
  const [recReason, setRecReason] = useState<string>('Personalized mix');
  const [recLoading, setRecLoading] = useState(false);
  const [showRecHint, setShowRecHint] = useState(false);

  // Global Trending Now State (Radio Browser API Live Growth / Surge)
  const [trendingNowStations, setTrendingNowStations] = useState<RadioStation[]>([]);
  const [trendingNowLoading, setTrendingNowLoading] = useState(false);
  const [showTrendingHint, setShowTrendingHint] = useState(false);

  // View Navigation & Firebase Popular / Trending Tab State
  const [activeMainTab, setActiveMainTab] = useState<'all' | 'popular' | 'recommended'>('all');
  const [popularStations, setPopularStations] = useState<RadioStation[]>([]);
  const [popularLoading, setPopularLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Sorting & Custom Station & Quality Filter States
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [preferredQuality, setPreferredQuality] = useState<'all' | 'high_quality'>(() => storageService.getPreferredQuality());
  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = useState(false);
  const [customStations, setCustomStations] = useState<RadioStation[]>(() => storageService.getCustomStations());
  const [recentlyAddedStations, setRecentlyAddedStations] = useState<RadioStation[]>(() => storageService.getRecentlyAddedStations(5));
  const [stationLimit, setStationLimit] = useState<number>(96);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const [favorites, setFavorites] = useState<RadioStation[]>(() => storageService.getFavorites());
  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  // Fetch Global Trending Now from API
  const fetchTrendingNow = useCallback(async () => {
    setTrendingNowLoading(true);
    try {
      const list = await apiService.getTrendingStations(16);
      if (list && list.length > 0) {
        setTrendingNowStations(list);
      }
    } catch (e) {
      console.warn('Failed to fetch trending now stations', e);
    } finally {
      setTrendingNowLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendingNow();
  }, [fetchTrendingNow]);

  // Silent Background Cache Refetch for 'Trending Now' and active Station list
  const triggerBackgroundCacheRefresh = useCallback(async () => {
    // Only execute if the app/tab is in the foreground and device is online
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    try {
      // 1. Silent refetch of Global Trending Now (force fresh API bypass of stale cache)
      const freshTrending = await apiService.getTrendingStations(16, true);
      if (freshTrending && freshTrending.length > 0) {
        setTrendingNowStations(freshTrending);
      }

      // 2. Silent refetch of active radio station list
      if (activeTag === 'Custom Streams') {
        const customs = storageService.getCustomStations();
        setCustomStations(customs);
      } else {
        const tagParam = activeTag !== 'All Genres' ? activeTag.toLowerCase() : '';
        const orderParam = sortBy === 'popular' ? 'clickcount' : sortBy === 'latest' ? 'changetimestamp' : 'name';
        const reverseParam = sortBy !== 'alphabetical';

        const freshRes = await apiService.searchRadioStations({
          query: searchQuery.trim(),
          tag: tagParam,
          country: selectedCountryName,
          countrycode: selectedCountryCode,
          order: orderParam,
          reverse: reverseParam,
          limit: stationLimit
        }, true);

        if (freshRes && freshRes.stations && freshRes.stations.length > 0) {
          const fetched = freshRes.stations;
          if (searchQuery.trim()) {
            const matchingCustoms = storageService.getCustomStations().filter(
              c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.genre.toLowerCase().includes(searchQuery.toLowerCase())
            );
            const map = new Map<string, RadioStation>();
            matchingCustoms.forEach(c => map.set(c.id, c));
            fetched.forEach(s => {
              if (!map.has(s.id)) map.set(s.id, s);
            });
            setStations(Array.from(map.values()));
          } else {
            setStations(fetched);
          }
        }
      }
    } catch (e) {
      console.warn('[RadioView] Silent background cache refresh exception:', e);
    }
  }, [activeTag, searchQuery, selectedCountryName, selectedCountryCode, sortBy]);

  // Periodic Foreground Refresh Timer (every 3 minutes) & Visibility Change Trigger
  useEffect(() => {
    const intervalId = setInterval(() => {
      triggerBackgroundCacheRefresh();
    }, 180000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerBackgroundCacheRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [triggerBackgroundCacheRefresh]);

  useEffect(() => {
    if (activeMainTab === 'popular') {
      setPopularLoading(true);
      firebaseService.getPopularOrTrendingStations(24).then((results) => {
        setPopularStations(results || []);
        setPopularLoading(false);
      });
    }
  }, [activeMainTab]);

  // Register Hands-Free Voice Control Handlers
  useEffect(() => {
    voiceControlService.registerHandlers({
      onStationChange: (action) => {
        const currentList = stations.length > 0 ? stations : recommendedStations;
        if (currentList.length === 0) return;
        const currentIndex = currentList.findIndex((s) => s.id === currentStationId);
        if (action === 'next') {
          const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % currentList.length : 0;
          handlePlayStation(currentList[nextIndex]);
        } else {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentList.length - 1;
          handlePlayStation(currentList[prevIndex]);
        }
      },
      onSearch: (query) => {
        setSearchQuery(query);
        setActiveMainTab('all');
      },
      onToggleFavorite: () => {
        if (currentStationId) {
          const target = stations.find((s) => s.id === currentStationId) ||
            recommendedStations.find((s) => s.id === currentStationId) ||
            trendingNowStations.find((s) => s.id === currentStationId) ||
            recents.find((s) => s.id === currentStationId);
          if (target) {
            handleToggleFavorite(target);
          }
        }
      }
    });
  }, [stations, recommendedStations, trendingNowStations, recents, currentStationId]);

  // Set of queued station IDs for fast lookup
  const queuedIds = useMemo(() => new Set(queuedStations.map(q => q.station.id)), [queuedStations]);

  // Subscribe to Audio Engine, Firebase Remote Config, Firestore Recent Stations & Queue
  useEffect(() => {
    const unsubAudio = audioEngine.subscribe((state) => {
      setCurrentStationId(state.currentStation?.id || null);
      setActivePlayingStation(state.currentStation);
      setIsPlaying(state.isPlaying);
    });

    const unsubFavs = storageService.subscribe(setFavorites);

    const localRecents = storageService.getRecents().slice(0, 10);
    setRecents(localRecents);
    setSearchHistory(storageService.getSearchHistory());
    setQueuedStations(storageService.getQueuedStations());

    let unsubRecentsListener: (() => void) | null = null;
    let unsubQueueListener: (() => void) | null = null;

    const unsubAuth = firebaseService.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        // Sync & reconcile offline queue
        await firebaseService.syncOfflineQueueOnReconnection();
        setQueuedStations(storageService.getQueuedStations());

        // Fetch Cloud recents and merge
        const cloudRecents = await firebaseService.getCloudRecentStations();
        if (cloudRecents && cloudRecents.length > 0) {
          const map = new Map<string, RadioStation>();
          cloudRecents.forEach(s => map.set(s.id, s));
          storageService.getRecents().forEach(s => {
            if (!map.has(s.id)) map.set(s.id, s);
          });
          const merged = Array.from(map.values()).slice(0, 10);
          setRecents(merged);
        }

        // Subscribe to live Firestore updates across devices
        if (unsubRecentsListener) unsubRecentsListener();
        unsubRecentsListener = firebaseService.subscribeRecentStations((cloudList) => {
          if (cloudList && cloudList.length > 0) {
            setRecents(cloudList.slice(0, 10));
          }
        });

        if (unsubQueueListener) unsubQueueListener();
        unsubQueueListener = firebaseService.subscribeQueuedStations((cloudQueue) => {
          if (cloudQueue) {
            setQueuedStations(cloudQueue);
          }
        });
      }
    });

    // Subscribe to dynamic Remote Config from Firebase
    const unsubRemote = firebaseService.subscribeRemoteConfig((config) => {
      if (config.trendingStations && config.trendingStations.length > 0) {
        setTrendingStations(config.trendingStations);
      }
      if (config.announcementBanner) {
        setRemoteBanner(config.announcementBanner);
      }
      if (config.genreTags && config.genreTags.length > 0) {
        const uniqueTags = Array.from(new Set(['All Genres', ...config.genreTags]));
        setGenreTags(uniqueTags);
        setIsRemoteTags(true);
      }
    });

    // Fetch Top Shared Stations Analytics
    firebaseService.fetchTopSharedStations(6).then((topShared) => {
      if (topShared && topShared.length > 0) {
        setTopSharedStations(topShared);
      }
    });

    // Listen for online events to sync queue
    const handleOnline = () => {
      firebaseService.syncOfflineQueueOnReconnection().then(() => {
        setQueuedStations(storageService.getQueuedStations());
      });
    };
    window.addEventListener('online', handleOnline);

    return () => {
      unsubAudio();
      unsubAuth();
      unsubRemote();
      unsubFavs();
      window.removeEventListener('online', handleOnline);
      if (unsubRecentsListener) unsubRecentsListener();
      if (unsubQueueListener) unsubQueueListener();
    };
  }, []);

  // Reset pagination limit when search filters change
  useEffect(() => {
    setStationLimit(96);
  }, [searchQuery, activeTag, selectedCountryName, selectedCountryCode, sortBy]);

  // Fetch stations with debounced query & tag / country filters & sorting
  useEffect(() => {
    let active = true;
    setLoading(true);

    const timer = setTimeout(() => {
      if (activeTag === 'Custom Streams') {
        const customs = storageService.getCustomStations();
        setCustomStations(customs);
        const filtered = searchQuery.trim()
          ? customs.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.genre.toLowerCase().includes(searchQuery.toLowerCase()))
          : customs;
        if (active) {
          setStations(filtered);
          setLoading(false);
        }
        return;
      }

      const tagParam = activeTag !== 'All Genres' ? activeTag.toLowerCase() : '';
      const orderParam = sortBy === 'popular' ? 'clickcount' : sortBy === 'latest' ? 'changetimestamp' : 'name';
      const reverseParam = sortBy !== 'alphabetical';

      apiService.searchRadioStations({
        query: searchQuery.trim(),
        tag: tagParam,
        country: selectedCountryName,
        countrycode: selectedCountryCode,
        order: orderParam,
        reverse: reverseParam,
        limit: stationLimit
      }).then((res) => {
        if (!active) return;
        const fetched = res.stations || [];
        // If searching with a query and we have matching custom stations, prepend them
        if (searchQuery.trim()) {
          const matchingCustoms = storageService.getCustomStations().filter(
            c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.genre.toLowerCase().includes(searchQuery.toLowerCase())
          );
          const map = new Map<string, RadioStation>();
          matchingCustoms.forEach(c => map.set(c.id, c));
          fetched.forEach(s => {
            if (!map.has(s.id)) map.set(s.id, s);
          });
          setStations(Array.from(map.values()));
        } else {
          setStations(fetched);
        }
        setLoading(false);
        setIsLoadingMore(false);

        if (searchQuery.trim()) {
          storageService.addSearchHistory(searchQuery.trim());
          storageService.saveSearchQuery(searchQuery.trim());
          setSearchHistory(storageService.getSearchHistory());
        }
      });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, activeTag, selectedCountryName, selectedCountryCode, sortBy, stationLimit]);

  const handleLoadMore = () => {
    triggerHaptic('light');
    setIsLoadingMore(true);
    setStationLimit(prev => prev + 48);
  };

  // AI-Driven Recommendation Engine:
  // Analyzes user's favorite genres and listening history to suggest personalized live streams
  const fetchRecommendations = useCallback(async () => {
    setRecLoading(true);
    try {
      const recentList = storageService.getRecents();
      const favList = storageService.getFavorites();
      const combinedStations = [...favList, ...recentList];

      // Count and weight genre and keyword frequencies from listening history & favorites
      const tagFrequency: Record<string, number> = {};
      combinedStations.forEach((st) => {
        const text = `${st.genre || ''} ${st.name || ''}`.toLowerCase();
        const words = text.split(/[\s,/-]+/);
        const isFav = storageService.isFavorite(st.id);
        const weight = isFav ? 3 : 1;

        words.forEach((w) => {
          const clean = w.replace(/[^a-z0-9]/g, '');
          if (clean.length > 2 && !['radio', 'music', 'live', 'station', 'stream', 'audio', 'news', 'the', 'top', 'hits', 'fm', 'online', 'web'].includes(clean)) {
            tagFrequency[clean] = (tagFrequency[clean] || 0) + weight;
          }
        });
      });

      const sortedTags = Object.entries(tagFrequency).sort((a, b) => b[1] - a[1]);
      const topGenres = sortedTags.slice(0, 4).map(([t]) => t.charAt(0).toUpperCase() + t.slice(1));
      setUserFavoriteGenres(topGenres);

      let targetTag = sortedTags.length > 0 ? sortedTags[0][0] : 'chill';

      // Map common synonyms to standard broadcast tags
      if (targetTag.includes('jazz')) targetTag = 'jazz';
      else if (targetTag.includes('electro') || targetTag.includes('synth') || targetTag.includes('techno')) targetTag = 'electronic';
      else if (targetTag.includes('ambient') || targetTag.includes('relax')) targetTag = 'ambient';
      else if (targetTag.includes('rock') || targetTag.includes('metal')) targetTag = 'rock';
      else if (targetTag.includes('pop') || targetTag.includes('hits')) targetTag = 'pop';
      else if (targetTag.includes('lounge') || targetTag.includes('lofi') || targetTag.includes('chill')) targetTag = 'chill';

      if (topGenres.length > 0) {
        setRecReason(`Curated for you based on your favorite genres (${topGenres.join(', ')}) & previous listening history`);
      } else {
        setRecReason('Curated Audiophile Essentials & Trending Radio Stations');
      }

      const res = await apiService.searchRadioStations({
        tag: targetTag,
        limit: 12
      });

      // Filter out stations already in recents for genuine freshness
      const recentIds = new Set(recentList.map(r => r.id));
      const freshRecs = (res.stations || []).filter(s => !recentIds.has(s.id)).slice(0, 8);

      if (freshRecs.length > 0) {
        setRecommendedStations(freshRecs);
      } else if (res.stations && res.stations.length > 0) {
        setRecommendedStations(res.stations.slice(0, 8));
      }
    } catch (e) {
      console.warn('Recommendation fetch failed:', e);
    } finally {
      setRecLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations, recents.length]);

  // Apply Client-Side Moderation & Filters
  const filteredStations = useMemo(() => {
    const blockedIds = new Set(filterConfig.blockedStationIds);
    const blockedKws = filterConfig.customBlockedKeywords.map(k => k.toLowerCase());

    return stations.filter((st) => {
      // 1. Manually Blocked Station IDs
      if (blockedIds.has(st.id)) return false;

      // 2. Adult Filter
      if (filterConfig.filterAdultContent) {
        const text = `${st.name} ${st.genre}`.toLowerCase();
        if (/adult|nsfw|18\+|erotic|xxx|porn|explicit/.test(text)) return false;
      }

      // 3. Politics Filter
      if (filterConfig.filterPoliticsContent) {
        const text = `${st.name} ${st.genre}`.toLowerCase();
        if (/politics|political|election|democrat|republican/.test(text)) return false;
      }

      // 4. Religious Filter
      if (filterConfig.filterReligiousContent) {
        const text = `${st.name} ${st.genre}`.toLowerCase();
        if (/religion|religious|church|gospel|christian|islam|quran|sermon/.test(text)) return false;
      }

      // 5. Custom Blocked Keywords
      if (blockedKws.length > 0) {
        const text = `${st.name} ${st.genre}`.toLowerCase();
        for (const kw of blockedKws) {
          if (text.includes(kw)) return false;
        }
      }

      // 6. Preferred Quality Filter (>= 128kbps)
      if (preferredQuality === 'high_quality') {
        const numericBitrate = parseInt(st.bitrate || '0', 10);
        if (isNaN(numericBitrate) || numericBitrate < 128) return false;
      }

      return true;
    });
  }, [stations, filterConfig, preferredQuality]);

  // Apply Deterministic Multi-Option Sorting (Popular, Latest Added, Alphabetical)
  const sortedStations = useMemo(() => {
    const list = [...filteredStations];
    if (sortBy === 'popular') {
      return list.sort((a, b) => {
        const scoreA = (a.clickcount || 0) + (a.votes || 0) * 10;
        const scoreB = (b.clickcount || 0) + (b.votes || 0) * 10;
        return scoreB - scoreA;
      });
    } else if (sortBy === 'latest') {
      return list.sort((a, b) => {
        const timeA = a.lastListenedTimestamp || (a.isCustom ? 9999999999999 : 0);
        const timeB = b.lastListenedTimestamp || (b.isCustom ? 9999999999999 : 0);
        return timeB - timeA;
      });
    } else if (sortBy === 'alphabetical') {
      return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
    return list;
  }, [filteredStations, sortBy]);

  const handleCustomStationAdded = (newStation: RadioStation) => {
    const updatedCustoms = storageService.getCustomStations();
    setCustomStations(updatedCustoms);
    setRecentlyAddedStations(storageService.getRecentlyAddedStations(5));
    setFavorites(storageService.getFavorites());
    audioEngine.playStation(newStation);
    setRecents(storageService.getRecents());
  };

  const handlePlayStation = (station: RadioStation) => {
    if (currentStationId === station.id) {
      audioEngine.togglePlay();
    } else {
      audioEngine.playStation(station);
      setRecents(storageService.getRecents());
    }
  };

  const handleToggleFavorite = async (station: RadioStation) => {
    storageService.toggleFavorite(station);
    setRecents(storageService.getRecents());
    try {
      await firebaseService.syncFavoritesToCloud(storageService.getFavorites());
    } catch (e) {
      console.warn('[RadioView] Cloud sync of favorites failed:', e);
    }
  };

  // Toggle Queued for Later
  const handleToggleQueue = async (station: RadioStation) => {
    if (storageService.isQueued(station.id)) {
      storageService.removeFromQueue(station.id);
      await firebaseService.removeQueuedStationFromCloud(station.id);
    } else {
      storageService.addToQueue(station);
      await firebaseService.addQueuedStationToCloud(station);
    }
    setQueuedStations(storageService.getQueuedStations());
  };

  const handleClearQueue = async () => {
    for (const q of queuedStations) {
      await firebaseService.removeQueuedStationFromCloud(q.station.id);
    }
    storageService.clearQueue();
    setQueuedStations([]);
  };

  return (
    <div id="neotune-fragment-layout" className="lg:grid lg:grid-cols-12 lg:gap-6 xl:gap-8 items-start">
      {/* Master Catalog Fragment (Full width on Mobile; Left 7-8 cols on Tablet & Desktop) */}
      <div
        id="master-catalog-fragment"
        className="lg:col-span-7 xl:col-span-8 space-y-6 pb-28 min-w-0"
      >
        {/* Primary Section Switcher Tabs: All Stations, Popular/Trending (Firebase), Recommended */}
        {storageService.getShowRadioTabs() && (
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--surface-main)]/80 backdrop-blur-xl border border-[var(--border-color)] overflow-x-auto no-scrollbar shadow-lg shadow-black/20">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveMainTab('all');
            }}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-2 sm:px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'all'
                ? 'bg-[var(--accent-primary)] text-black shadow-md shadow-[var(--accent-primary)]/20 font-black'
                : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">{t('all_stations', 'All Radio Stations')}</span>
              <span className="sm:hidden">{t('nav_radio', 'All Stations')}</span>
            </span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveMainTab('popular');
            }}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-2 sm:px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'popular'
                ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-black shadow-md shadow-amber-500/20 font-black'
                : 'text-[var(--text-muted)] hover:text-amber-300 hover:bg-amber-500/10'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0 fill-current text-amber-500" />
            <span className="truncate">
              <span className="hidden sm:inline">{t('popular_stations', 'Popular & Trending')}</span>
              <span className="sm:hidden">{t('trending', 'Trending')}</span>
            </span>
            <span className="hidden md:inline-block px-1.5 py-0.2 rounded-full bg-black/20 text-[9px] font-bold uppercase border border-black/10 shrink-0">
              Firebase
            </span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveMainTab('recommended');
            }}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-2 sm:px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'recommended'
                ? 'bg-gradient-to-r from-indigo-400 to-purple-400 text-black shadow-md shadow-indigo-500/20 font-black'
                : 'text-[var(--text-muted)] hover:text-indigo-300 hover:bg-indigo-500/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 fill-current text-indigo-400" />
            <span className="truncate">
              <span className="hidden sm:inline">{t('recommended', 'AI Recommended')}</span>
              <span className="sm:hidden">{t('recommended', 'AI Recs')}</span>
            </span>
          </button>
        </div>
        )}

      {/* Search & Country Bar */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-3">
        {/* Global Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            id="radio-search-input"
            type="text"
            placeholder={t('search_placeholder', 'Search 50,000+ stations by name, genre or city...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
            className="w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] shadow-md shadow-black/10 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Recent Search Queries Suggestion Dropdown */}
          {isSearchFocused && storageService.getRecentSearchQueries().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn max-h-72 overflow-y-auto">
              <div className="p-3.5 border-b border-white/5 flex items-center justify-between text-[11px] text-[var(--text-muted)] font-semibold">
                <span className="uppercase tracking-wider">{t('recent_searches', 'Recent Searches')}</span>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevents input blur
                    storageService.clearRecentSearchQueries();
                    setIsSearchFocused(false);
                  }}
                  className="hover:text-rose-400 font-bold transition-colors cursor-pointer"
                >
                  {t('clear_all', 'Clear All')}
                </button>
              </div>
              <ul className="py-1">
                {storageService.getRecentSearchQueries().map((q, idx) => (
                  <li
                    key={`${q}_${idx}`}
                    onMouseDown={() => {
                      setSearchQuery(q);
                    }}
                    className="px-4 py-3 sm:py-2.5 hover:bg-white/10 cursor-pointer flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 text-xs text-[var(--text-primary)] font-medium">
                      <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>{q}</span>
                    </div>
                    <button
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault(); // Prevents input blur
                        storageService.deleteRecentSearchQuery(q);
                        // Trigger re-render by briefly toggling/refreshing focus or letting state resolve
                        setTimeout(() => {}, 0);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Country Selector Chip */}
        <button
          onClick={onOpenCountryPicker}
          className="flex items-center justify-between gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] hover:border-[var(--accent-primary)] text-xs sm:text-sm text-[var(--text-primary)] shadow-md shadow-black/10 transition-all shrink-0 cursor-pointer min-h-[42px] sm:min-h-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
            <span className="font-semibold truncate">
              {selectedCountryName || 'Global Feed'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        </button>
      </div>

      {/* POPULAR / TRENDING TAB VIEW */}
      {activeMainTab === 'popular' ? (
        <div className="space-y-4 pt-1">
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-[var(--surface-main)]/80 to-rose-500/10 backdrop-blur-xl border border-amber-500/20 shadow-xl shadow-black/20 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Flame className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Most-Listened & Popular Radio Stations
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Curated list retrieved via Firebase user activity monitoring & cloud analytics
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
                <span>Firebase Monitored</span>
              </span>
            </div>
          </div>

          {popularLoading ? (
            <div className="py-24 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
              <p className="font-medium text-sm text-[var(--text-primary)]">Retrieving popular stations from Firebase...</p>
            </div>
          ) : popularStations.length === 0 ? (
            <div className="text-center py-16 bg-[var(--surface-main)] rounded-2xl border border-[var(--border-color)] p-8">
              <Flame className="w-10 h-10 mx-auto text-amber-400 opacity-50 mb-2" />
              <p className="text-sm font-bold text-[var(--text-primary)]">No activity data available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {popularStations.map((station) => (
                <StationCard
                  key={`popular_tab_${station.id}`}
                  station={{ ...station, isFavorite: favoriteIds.has(station.id) }}
                  isPlaying={isPlaying}
                  isCurrent={currentStationId === station.id}
                  isQueued={queuedIds.has(station.id)}
                  onPlay={handlePlayStation}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleQueue={handleToggleQueue}
                  onSetAlarm={onSetAlarm}
                  onShare={onShareStation}
                  onBlockStation={onBlockStation}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeMainTab === 'recommended' ? (
        /* AI RECOMMENDED TAB VIEW */
        <div className="space-y-4 pt-1">
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-[var(--surface-main)]/80 to-purple-500/10 backdrop-blur-xl border border-indigo-500/20 shadow-xl shadow-black/20 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Personalized AI Recommended Stations
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{recReason}</p>
                  {userFavoriteGenres.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Analyzed Genres:</span>
                      {userFavoriteGenres.map((genre) => (
                        <span
                          key={genre}
                          className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={fetchRecommendations}
                disabled={recLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recLoading ? 'animate-spin' : ''}`} />
                <span>Re-analyze Profile</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {recommendedStations.map((station) => (
              <StationCard
                key={`rec_tab_${station.id}`}
                station={{ ...station, isFavorite: favoriteIds.has(station.id) }}
                isPlaying={isPlaying}
                isCurrent={currentStationId === station.id}
                isQueued={queuedIds.has(station.id)}
                onPlay={handlePlayStation}
                onToggleFavorite={handleToggleFavorite}
                onToggleQueue={handleToggleQueue}
                onSetAlarm={onSetAlarm}
                onShare={onShareStation}
                onBlockStation={onBlockStation}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ALL STATIONS MAIN DIRECTORY VIEW */
        <>

      {/* Search History Chips (visible only when search bar is idle) */}
      {searchHistory.length > 0 && !searchQuery && (activeTag === 'All' || activeTag === 'All Genres') && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[var(--text-muted)] shrink-0 font-medium">Recent:</span>
          {searchHistory.slice(0, 6).map((q) => (
            <button
              key={q}
              onClick={() => setSearchQuery(q)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-white/5 transition-colors shrink-0 cursor-pointer"
            >
              {q}
            </button>
          ))}
          <button
            onClick={() => {
              storageService.clearSearchHistory();
              setSearchHistory([]);
            }}
            className="text-[10px] text-[var(--text-muted)] hover:text-rose-400 shrink-0 ml-1 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Unified Category & Genre Navigation Chip List Component */}
      <CategoryNavigation
        tags={genreTags}
        activeTag={activeTag}
        onSelectTag={setActiveTag}
        isRemoteTags={isRemoteTags}
      />

      {/* Firebase Remote Config Announcement Banner (collapses when filtering) */}
      {remoteBanner && !searchQuery && (activeTag === 'All' || activeTag === 'All Genres') && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-sky-500/20 border border-white/15 backdrop-blur-xl flex items-center justify-between gap-3 text-xs shadow-lg shadow-black/20">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-white/10 text-[var(--accent-primary)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-semibold text-white">{remoteBanner}</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-[var(--text-muted)] border border-white/10 shrink-0">
            Cloud Notice
          </span>
        </div>
      )}

      {/* 1. AI-Driven 'Recommended for You' Section (collapses when filtering for compact mobile view) */}
      {!searchQuery && (activeTag === 'All' || activeTag === 'All Genres') && !selectedCountryName && recommendedStations.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-[var(--surface-main)]/80 to-purple-500/10 backdrop-blur-xl border border-indigo-500/20 shadow-xl shadow-black/20 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Recommended
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                  AI
                </span>
                <button
                  onClick={() => {
                    triggerHaptic('selection');
                    setShowRecHint(!showRecHint);
                  }}
                  className={`p-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                    showRecHint ? 'bg-indigo-500/30 text-indigo-200' : 'bg-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10'
                  }`}
                  title="View AI Curation Details"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible AI Details Hint Box */}
          {showRecHint && (
            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-2 animate-fadeIn">
              <p className="text-[var(--text-primary)]">{recReason}</p>
              {userFavoriteGenres.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Your Top Favorite Genres:</span>
                  {userFavoriteGenres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => setActiveTag(genre)}
                      className="px-2 py-0.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recommendedStations.map((station) => (
              <StationCard
                key={`rec_${station.id}`}
                station={{ ...station, isFavorite: favoriteIds.has(station.id) }}
                isPlaying={isPlaying}
                isCurrent={currentStationId === station.id}
                isQueued={queuedIds.has(station.id)}
                onPlay={handlePlayStation}
                onToggleFavorite={handleToggleFavorite}
                onToggleQueue={handleToggleQueue}
                onSetAlarm={onSetAlarm}
                onShare={onShareStation}
                onBlockStation={onBlockStation}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. 'Queued for Later' Station List (Offline Stored + Firestore Synced) */}
      {!searchQuery && queuedStations.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--surface-main)]/70 backdrop-blur-xl border border-amber-500/20 shadow-xl shadow-black/20 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Queued for Later ({queuedStations.length})
                  </h3>
                  {currentUser ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      <Cloud className="w-3 h-3" />
                      Auto Cloud Sync
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                      <WifiOff className="w-3 h-3" />
                      Offline Cached
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)]">Saved offline, auto-syncs when online</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearQueue}
                className="text-[11px] text-[var(--text-muted)] hover:text-rose-400 flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                title="Clear All Queued Stations"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Queue</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {queuedStations.map((item) => (
              <StationCard
                key={`queue_${item.station.id}`}
                station={{ ...item.station, isFavorite: favoriteIds.has(item.station.id) }}
                isPlaying={isPlaying}
                isCurrent={currentStationId === item.station.id}
                isQueued={true}
                onPlay={handlePlayStation}
                onToggleFavorite={handleToggleFavorite}
                onToggleQueue={handleToggleQueue}
                onSetAlarm={onSetAlarm}
                onShare={onShareStation}
                onBlockStation={onBlockStation}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2.2 'Recently Added Stations' Section (Last 5 custom or imported stations) */}
      {!searchQuery && recentlyAddedStations.length > 0 && (activeTag === 'All' || activeTag === 'All Genres') && !selectedCountryName && (
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--surface-main)]/70 backdrop-blur-xl border border-emerald-500/20 shadow-xl shadow-black/20 space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Recently Added Stations ({recentlyAddedStations.length})
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    Custom / Imported
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">Your latest manually added live audio streams</p>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic('selection');
                if (onOpenAddStation) onOpenAddStation();
                else setIsAddCustomModalOpen(true);
              }}
              className="text-[11px] text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Station</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {recentlyAddedStations.map((station) => (
              <StationCard
                key={`recent_added_${station.id}`}
                station={{ ...station, isFavorite: favoriteIds.has(station.id) }}
                isPlaying={isPlaying}
                isCurrent={currentStationId === station.id}
                isQueued={queuedIds.has(station.id)}
                onPlay={handlePlayStation}
                onToggleFavorite={handleToggleFavorite}
                onToggleQueue={handleToggleQueue}
                onSetAlarm={onSetAlarm}
                onShare={onShareStation}
                onBlockStation={onBlockStation}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2.5 API-Driven 'Trending Now' (Highest Global Listenership Growth - hidden when searching or filtering) */}
      {!searchQuery && trendingNowStations.length > 0 && (activeTag === 'All' || activeTag === 'All Genres') && !selectedCountryName && (
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--surface-main)]/80 backdrop-blur-xl border border-amber-500/30 shadow-2xl shadow-amber-500/10 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500/25 to-rose-500/25 text-amber-400 border border-amber-500/30 shadow-inner">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                  Trending
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                  <TrendingUp className="w-3 h-3" />
                  Surge
                </span>
                <button
                  onClick={() => {
                    triggerHaptic('selection');
                    setShowTrendingHint(!showTrendingHint);
                  }}
                  className={`p-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                    showTrendingHint ? 'bg-amber-500/30 text-amber-200' : 'bg-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10'
                  }`}
                  title="View Surge Details"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Trending Hint Box */}
          {showTrendingHint && (
            <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-[var(--text-primary)] animate-fadeIn">
              Stations currently experiencing the fastest listenership surge worldwide
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {trendingNowStations.slice(0, 8).map((station) => (
              <StationCard
                key={`trend_now_${station.id}`}
                station={{ ...station, isFavorite: favoriteIds.has(station.id) }}
                isPlaying={isPlaying}
                isCurrent={currentStationId === station.id}
                isQueued={queuedIds.has(station.id)}
                onPlay={handlePlayStation}
                onToggleFavorite={handleToggleFavorite}
                onToggleQueue={handleToggleQueue}
                onSetAlarm={onSetAlarm}
                onShare={onShareStation}
                onBlockStation={onBlockStation}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. Cloud Curated Trending Stations (Firebase Remote Config) */}
      {trendingStations.length > 0 && !searchQuery && activeTag === 'All Genres' && !selectedCountryName && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-400 border border-amber-500/30">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Trending Worldwide (Firebase Remote Config)
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
              Dynamic Cloud Curation
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {trendingStations.map((station) => (
              <StationCard
                key={`trending_${station.id}`}
                station={{ ...station, isFavorite: favoriteIds.has(station.id) }}
                isPlaying={isPlaying}
                isCurrent={currentStationId === station.id}
                isQueued={queuedIds.has(station.id)}
                onPlay={handlePlayStation}
                onToggleFavorite={handleToggleFavorite}
                onToggleQueue={handleToggleQueue}
                onSetAlarm={onSetAlarm}
                onShare={onShareStation}
                onBlockStation={onBlockStation}
              />
            ))}
          </div>
        </div>
      )}

      {/* Top Shared Stations Widget (Firebase Analytics Monitored) */}
      {topSharedStations.length > 0 && !searchQuery && activeTag === 'All Genres' && !selectedCountryName && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-gradient-to-r from-rose-500/20 to-orange-500/20 text-rose-400 border border-rose-500/30">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Top Shared Stations
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
              Firebase Analytics
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {topSharedStations.map((station) => (
              <StationCard
                key={`topshared_${station.id}`}
                station={{ ...station, isFavorite: favoriteIds.has(station.id) }}
                isPlaying={isPlaying}
                isCurrent={currentStationId === station.id}
                isQueued={queuedIds.has(station.id)}
                onPlay={handlePlayStation}
                onToggleFavorite={handleToggleFavorite}
                onToggleQueue={handleToggleQueue}
                onSetAlarm={onSetAlarm}
                onShare={onShareStation}
                onBlockStation={onBlockStation}
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. Recently Played Section (Last 10 Stations with Firestore Cloud Sync) */}
      {recents.length > 0 && !searchQuery && activeTag === 'All Genres' && !selectedCountryName && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <History className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Recent Stations ({recents.length})
              </h3>
              {currentUser ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  <Cloud className="w-3 h-3" />
                  Firestore Synced
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[var(--text-muted)] border border-white/10 text-[10px]">
                  Local Cache
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  storageService.clearRecents();
                  await firebaseService.clearCloudRecentStations();
                  setRecents([]);
                }}
                className="text-[11px] text-[var(--text-muted)] hover:text-rose-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                title="Clear Recent Stations History"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear History</span>
              </button>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar snap-x sm:grid sm:grid-cols-3 lg:grid-cols-5">
            {recents.slice(0, 10).map((station) => (
              <div key={`recent_${station.id}`} className="snap-start shrink-0 w-[210px] sm:w-auto">
                <StationCard
                  station={{ ...station, isFavorite: favoriteIds.has(station.id) }}
                  isPlaying={isPlaying}
                  isCurrent={currentStationId === station.id}
                  isQueued={queuedIds.has(station.id)}
                  onPlay={handlePlayStation}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleQueue={handleToggleQueue}
                  onSetAlarm={onSetAlarm}
                  onShare={onShareStation}
                  onBlockStation={onBlockStation}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Live Broadcast Stations Grid */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[var(--accent-primary)]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {activeTag !== 'All Genres' ? `${activeTag} Stations` : 'Live Radio Broadcasts'}
            </h3>
            <span className="text-xs text-[var(--text-muted)] font-mono ml-1">
              ({sortedStations.length})
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Multi-Option Sorting Controls */}
            <div className="flex items-center justify-between sm:justify-start gap-1 bg-[var(--surface-main)]/90 backdrop-blur-md p-1 rounded-xl border border-[var(--border-color)] text-xs shadow-inner">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] px-1.5 hidden md:inline">Sort:</span>
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setSortBy('popular');
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg font-semibold transition-all cursor-pointer min-h-[34px] sm:min-h-0 ${
                  sortBy === 'popular'
                    ? 'bg-[var(--accent-primary)] text-black shadow-sm font-bold'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
                title="Sort by Most Popular (Global listenership and votes)"
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>Popular</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setSortBy('latest');
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg font-semibold transition-all cursor-pointer min-h-[34px] sm:min-h-0 ${
                  sortBy === 'latest'
                    ? 'bg-[var(--accent-primary)] text-black shadow-sm font-bold'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
                title="Sort by Latest Added streams"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Latest</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setSortBy('alphabetical');
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg font-semibold transition-all cursor-pointer min-h-[34px] sm:min-h-0 ${
                  sortBy === 'alphabetical'
                    ? 'bg-[var(--accent-primary)] text-black shadow-sm font-bold'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
                title="Sort Alphabetically (A to Z)"
              >
                <ArrowDownAZ className="w-3.5 h-3.5 shrink-0" />
                <span>A-Z</span>
              </button>
            </div>

            {/* Preferred Stream Quality Toggle Pill */}
            <div className="flex items-center justify-between sm:justify-start gap-1 bg-[var(--surface-main)]/90 backdrop-blur-md p-1 rounded-xl border border-[var(--border-color)] text-xs shadow-inner">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] px-1.5 hidden md:inline">Bitrate:</span>
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setPreferredQuality('all');
                  storageService.setPreferredQuality('all');
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg font-semibold transition-all cursor-pointer min-h-[34px] sm:min-h-0 ${
                  preferredQuality === 'all'
                    ? 'bg-white/20 text-white shadow-sm font-bold'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
                title="Show all stations (All Bitrates)"
              >
                <span>All</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setPreferredQuality('high_quality');
                  storageService.setPreferredQuality('high_quality');
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg font-semibold transition-all cursor-pointer min-h-[34px] sm:min-h-0 ${
                  preferredQuality === 'high_quality'
                    ? 'bg-emerald-400 text-black shadow-sm font-bold'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
                title="Only show high quality streams (≥ 128kbps)"
              >
                <Gauge className="w-3.5 h-3.5 shrink-0" />
                <span>≥128k HD</span>
              </button>
            </div>

            {/* Add Custom Station Action Button */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                if (onOpenAddStation) {
                  onOpenAddStation();
                } else {
                  setIsAddCustomModalOpen(true);
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-black text-xs font-bold shadow-md shadow-[var(--accent-primary)]/20 hover:opacity-90 transition-all cursor-pointer shrink-0 min-h-[36px] sm:min-h-0 w-full sm:w-auto"
              title="Add Custom Direct Streaming URL"
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Add Custom Station</span>
            </button>
          </div>
        </div>

        {/* Custom Stations Quick Shelf (if user added custom streams) */}
        {customStations.length > 0 && !searchQuery && activeTag === 'All Genres' && !selectedCountryName && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--surface-main)]/70 backdrop-blur-xl border border-[var(--accent-primary)]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
                  <PlusCircle className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Your Custom Added Stations ({customStations.length})
                </h4>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTag('Custom Streams');
                }}
                className="text-[11px] text-[var(--accent-primary)] hover:underline font-semibold"
              >
                View All Custom
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {customStations.slice(0, 4).map((station) => (
                <StationCard
                  key={`custom_shelf_${station.id}`}
                  station={{ ...station, isFavorite: favoriteIds.has(station.id) }}
                  isPlaying={isPlaying}
                  isCurrent={currentStationId === station.id}
                  isQueued={queuedIds.has(station.id)}
                  onPlay={handlePlayStation}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleQueue={handleToggleQueue}
                  onSetAlarm={onSetAlarm}
                  onShare={onShareStation}
                  onBlockStation={onBlockStation}
                />
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
            <p className="font-medium text-sm text-[var(--text-primary)]">Scanning global radio mirrors...</p>
            <p className="text-xs text-[var(--text-muted)]">Connecting to 50,000+ Icecast & SHOUTcast relays</p>
          </div>
        ) : sortedStations.length === 0 ? (
          <div className="text-center py-20 bg-[var(--surface-main)] rounded-2xl border border-[var(--border-color)] p-8">
            <Radio className="w-12 h-12 mx-auto text-[var(--text-muted)] opacity-40 mb-3" />
            <h4 className="text-base font-bold text-[var(--text-primary)]">No live stations found</h4>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
              Try adjusting your search terms or clearing the country/genre filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveTag('All Genres');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-black text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3.5 [column-fill:_balance] w-full">
              {sortedStations.map((station) => (
                <div key={station.id} className="break-inside-avoid mb-3.5 inline-block w-full">
                  <StationCard
                    station={{ ...station, isFavorite: favoriteIds.has(station.id) }}
                    isPlaying={isPlaying}
                    isCurrent={currentStationId === station.id}
                    isQueued={queuedIds.has(station.id)}
                    onPlay={handlePlayStation}
                    onToggleFavorite={handleToggleFavorite}
                    onToggleQueue={handleToggleQueue}
                    onSetAlarm={onSetAlarm}
                    onShare={onShareStation}
                    onBlockStation={onBlockStation}
                  />
                </div>
              ))}
            </div>

            {/* Infinite Expansion / Load More Button */}
            {activeTag !== 'Custom Streams' && sortedStations.length >= 40 && (
              <div className="pt-3 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-3 rounded-2xl bg-[var(--surface-main)] hover:bg-white/10 border border-[var(--border-color)] hover:border-[var(--accent-primary)] text-xs sm:text-sm font-bold text-[var(--text-primary)] shadow-lg hover:shadow-[var(--accent-primary)]/20 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 text-[var(--accent-primary)] ${isLoadingMore ? 'animate-spin' : ''}`} />
                  <span>{isLoadingMore ? 'Fetching More Stations...' : `Load More Stations (${sortedStations.length} shown)`}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </>
      )}

      {/* Floating Scroll to Top Navigation */}
      <ScrollToTopButton />

      {/* Add Custom Station Modal */}
      <AddStationModal
        isOpen={isAddCustomModalOpen}
        onClose={() => setIsAddCustomModalOpen(false)}
        onStationAdded={handleCustomStationAdded}
      />
      </div>

      {/* Detail Fragment: Live Now Playing Audiophile Studio (Sticky right column on Tablet & Desktop) */}
      <div id="detail-studio-fragment" className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20 h-[calc(100vh-6.5rem)] min-h-[580px]">
        <NowPlayingStudioFragment
          station={activePlayingStation}
          isPlaying={isPlaying}
          onPlay={handlePlayStation}
          onToggleFavorite={handleToggleFavorite}
          onShare={onShareStation}
          onSetAlarm={onSetAlarm}
          onOpenEqualizer={onOpenEqualizer || (() => {})}
          onOpenSleepTimer={onOpenSleepTimer || (() => {})}
          onOpenCarMode={onOpenCarMode || (() => {})}
          onOpenScreensaver={onOpenScreensaver || (() => {})}
          onOpenFullPlayer={onOpenFullPlayer || (() => {})}
          suggestedStations={recommendedStations.length > 0 ? recommendedStations : trendingStations}
        />
      </div>
    </div>
  );
};
