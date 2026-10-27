import { RadioStation, PodcastProgress, PodcastEpisode, AlarmConfig, FilterConfig, ThemeType, UserStats, QueuedStation, VisualizerSkin, DailyActivityStat, GestureConfig, VisualizerCustomColors, SleepTimerConfig, ShareHistoryEntry, ListenLaterItem, PodcastShow } from '../types';
import { indexedDBService } from './indexedDBService';

const STORAGE_KEYS = {
  FAVORITES: 'neotune_favorites',
  LISTEN_LATER: 'neotune_listen_later',
  RECENTS: 'neotune_recents',
  QUEUED_STATIONS: 'neotune_queued_stations',
  SEARCH_HISTORY: 'neotune_search_history',
  CUSTOM_STATIONS: 'neotune_custom_stations',
  PODCAST_PROGRESS: 'neotune_podcast_progress',
  ALARM: 'neotune_alarm',
  FILTERS: 'neotune_filters',
  THEME: 'neotune_theme',
  USER_STATS: 'neotune_user_stats',
  EQ_PRESET: 'neotune_eq_preset',
  VISUALIZER_SKIN: 'neotune_visualizer_skin',
  BATTERY_SAVER: 'neotune_battery_saver',
  AUTO_PLAY: 'neotune_auto_play',
  LAST_VOLUME: 'neotune_volume',
  NORMALIZE_AUDIO: 'neotune_normalize_audio',
  TARGET_NORMALIZE_LEVEL: 'neotune_target_normalize_level',
  CROSSFADE_DURATION_MS: 'neotune_crossfade_duration_ms',
  DATA_SAVER_BITRATE: 'neotune_data_saver_bitrate',
  DAILY_LISTENING: 'neotune_daily_listening_v1',
  AUTO_DETECT_THEME: 'neotune_auto_detect_theme',
  VISUALIZER_CYCLE_INTERVAL: 'neotune_visualizer_cycle_interval',
  VISUALIZER_SENSITIVITY: 'neotune_visualizer_sensitivity',
  VISUALIZER_INTENSITY: 'neotune_visualizer_intensity',
  AUTO_PRUNE_DEAD_STATIONS: 'neotune_auto_prune_dead_stations',
  AUTO_EQ_ENABLED: 'neotune_auto_eq_enabled',
  STATION_FAILED_ATTEMPTS: 'neotune_station_failed_attempts',
  STATION_NOTES: 'neotune_station_notes',
  STATION_LOUDNESS_OVERRIDES: 'neotune_station_loudness_overrides',
  GESTURE_CONFIG: 'neotune_gesture_config',
  VISUALIZER_CUSTOM_COLORS: 'neotune_vis_custom_colors',
  NIGHT_MODE: 'neotune_night_mode',
  HAPTICS_ENABLED: 'neotune_haptics_enabled',
  PREFERRED_QUALITY: 'neotune_preferred_quality',
  RECENT_SEARCH_QUERIES: 'neotune_recent_search_queries',
  RECENT_EPISODES: 'neotune_recent_episodes',
  VISUALIZER_COLOR_SCHEME: 'neotune_visualizer_color_scheme',
  TIME_BASED_THEME: 'neotune_time_based_theme',
  SHOW_RADIO_TABS: 'neotune_show_radio_tabs',
  LANGUAGE: 'neotune_language',
  CATEGORY_VOLUMES: 'neotune_category_volumes',
  SLEEP_TIMER_DURATION: 'neotune_sleep_timer_duration',
  SLEEP_FADE_OUT_ENABLED: 'neotune_sleep_fade_out_enabled',
  SLEEP_FADE_CURVE: 'neotune_sleep_fade_curve',
  RECENT_SLEEP_DURATIONS: 'neotune_recent_sleep_durations',
  SLEEP_HISTORY: 'neotune_sleep_history',
  TOTAL_SLEEP_FADE_OUT_MINUTES: 'neotune_total_sleep_fade_out_minutes',
  TOTAL_SLEEP_TIMER_SESSIONS: 'neotune_total_sleep_timer_sessions',
  MOOD_EQ_PRESETS: 'neotune_mood_eq_presets',
  SHARE_HISTORY: 'neotune_share_history',
  SLEEP_SOUNDSCAPE_TYPE: 'neotune_sleep_soundscape_type',
  SLEEP_SOUNDSCAPE_VOLUME: 'neotune_sleep_soundscape_volume',
  VOLUME_SAFETY_LOCK_ENABLED: 'neotune_volume_safety_lock_enabled',
  VOLUME_SAFETY_LOCK_THRESHOLD: 'neotune_volume_safety_lock_threshold',
  SLEEP_QUICK_PRESETS: 'neotune_sleep_quick_presets',
  SLEEP_WEEKLY_USAGE: 'neotune_sleep_weekly_usage',
  SLEEP_INTELLIGENT_AUTO_FADE: 'neotune_sleep_intelligent_auto_fade',
  AUTO_CROSSFADE_ENABLED: 'neotune_auto_crossfade_enabled',
  CUSTOM_WAKE_SOUND: 'neotune_custom_wake_sound',
  UNSTABLE_STATIONS: 'neotune_unstable_stations',
  LAYOUT_PREFERENCE: 'neotune_layout_preference',
  SECTION_EXPANDED_STATES: 'neotune_section_expanded_states',
  ACTIVE_ACCORDION_SECTION: 'neotune_active_accordion_section',
  DONATION_IS_SUPPORTER: 'neotune_donation_is_supporter',
  DONATION_OPS_COUNT: 'neotune_donation_ops_count',
  DONATION_BANNER_DISMISSED_AT: 'neotune_donation_banner_dismissed_at',
  DONATION_AUTO_PROMPT_SHOWN_AT: 'neotune_donation_auto_prompt_shown_at',
  FIRST_INSTALL_TIMESTAMP: 'neotune_first_install_timestamp'
};

// Check if localStorage is fully accessible inside standard and sandboxed (iframe) environments
const isLocalStorageAvailable = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__test_localstorage_neotune__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const storageCache = new Map<string, string>();
const hasStorage = isLocalStorageAvailable();

// Bulletproof Safe Storage Wrapper
const safeStorage = {
  getItem(key: string): string | null {
    if (hasStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return storageCache.get(key) || null;
      }
    }
    return storageCache.get(key) || null;
  },
  setItem(key: string, value: string): void {
    storageCache.set(key, value);
    if (hasStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
  },
  removeItem(key: string): void {
    storageCache.delete(key);
    if (hasStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
  }
};

export const storageService = {
  // Listeners for real-time app-wide synchronization
  _favListeners: new Set<(favorites: RadioStation[]) => void>(),
  _listenLaterListeners: new Set<(items: ListenLaterItem[]) => void>(),

  subscribe(cb: (favorites: RadioStation[]) => void): () => void {
    this._favListeners.add(cb);
    return () => {
      this._favListeners.delete(cb);
    };
  },

  subscribeListenLater(cb: (items: ListenLaterItem[]) => void): () => void {
    this._listenLaterListeners.add(cb);
    cb(this.getListenLaterQueue());
    return () => {
      this._listenLaterListeners.delete(cb);
    };
  },

  notify(): void {
    const favs = this.getFavorites();
    this._favListeners.forEach(cb => {
      try {
        cb(favs);
      } catch (e) {
        console.error('Error notifying favorites listener:', e);
      }
    });
    this.notifyListenLater();
  },

  notifyListenLater(): void {
    const queue = this.getListenLaterQueue();
    this._listenLaterListeners.forEach(cb => {
      try {
        cb(queue);
      } catch (e) {
        console.error('Error notifying listen later listener:', e);
      }
    });
  },

  // Listen Later Queue
  getListenLaterQueue(): ListenLaterItem[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.LISTEN_LATER);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveListenLaterQueue(queue: ListenLaterItem[]): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.LISTEN_LATER, JSON.stringify(queue));
      this.notifyListenLater();
    } catch (e) {
      console.warn('Failed to save listen later queue:', e);
    }
  },

  addToListenLater(item: Omit<ListenLaterItem, 'id' | 'addedAt'>): ListenLaterItem[] {
    const current = this.getListenLaterQueue();
    const id = `${item.type}_${item.station?.id || item.episode?.id || Date.now()}`;
    const filtered = current.filter(i => i.id !== id && i.audioUrl !== item.audioUrl);
    const newItem: ListenLaterItem = {
      ...item,
      id,
      addedAt: Date.now()
    };
    const updated = [newItem, ...filtered];
    this.saveListenLaterQueue(updated);
    return updated;
  },

  removeFromListenLater(idOrUrl: string): ListenLaterItem[] {
    const current = this.getListenLaterQueue();
    const updated = current.filter(i => i.id !== idOrUrl && i.audioUrl !== idOrUrl && i.station?.id !== idOrUrl && i.episode?.id !== idOrUrl);
    this.saveListenLaterQueue(updated);
    return updated;
  },

  isInListenLater(idOrUrl: string): boolean {
    const current = this.getListenLaterQueue();
    return current.some(i => i.id === idOrUrl || i.audioUrl === idOrUrl || i.station?.id === idOrUrl || i.episode?.id === idOrUrl);
  },

  toggleListenLater(item: Omit<ListenLaterItem, 'id' | 'addedAt'>): boolean {
    const id = `${item.type}_${item.station?.id || item.episode?.id || Date.now()}`;
    if (this.isInListenLater(id) || this.isInListenLater(item.audioUrl)) {
      this.removeFromListenLater(id);
      this.removeFromListenLater(item.audioUrl);
      return false; // Removed
    } else {
      this.addToListenLater(item);
      return true; // Added
    }
  },

  clearListenLaterQueue(): void {
    this.saveListenLaterQueue([]);
  },

  // Favorites
  getFavorites(): RadioStation[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveFavorites(favorites: RadioStation[]): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
      this.notify();
    } catch (e) {
      console.error('Failed to save favorites:', e);
    }
  },

  toggleFavorite(station: RadioStation): boolean {
    const list = this.getFavorites();
    const index = list.findIndex(s => s.id === station.id || (s.streamUrl && s.streamUrl === station.streamUrl));
    let isNowFav = false;
    if (index >= 0) {
      list.splice(index, 1);
      isNowFav = false;
    } else {
      list.unshift({ ...station, isFavorite: true, lastListenedTimestamp: Date.now(), dateAdded: Date.now() });
      isNowFav = true;
      this.incrementFavoriteStat();
    }
    this.saveFavorites(list);
    return isNowFav;
  },

  isFavorite(stationId: string): boolean {
    const list = this.getFavorites();
    return list.some(s => s.id === stationId);
  },

  removeFavorite(stationId: string): void {
    const list = this.getFavorites();
    const updated = list.filter(s => s.id !== stationId);
    this.saveFavorites(updated);
  },

  // Custom Tags on Favorites
  // Custom Tags on Favorites & Stations
  getStationTagsMap(): Record<string, string[]> {
    try {
      const data = safeStorage.getItem('neotune_station_tags_map');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  getStationTags(stationId: string): string[] {
    const map = this.getStationTagsMap();
    if (map[stationId] && Array.isArray(map[stationId])) return map[stationId];
    const fav = this.getFavorites().find(s => s.id === stationId);
    return fav?.customTags || [];
  },

  setStationTags(stationId: string, tags: string[]): Record<string, string[]> {
    const map = this.getStationTagsMap();
    const clean = Array.from(new Set(tags.map(t => t.trim()).filter(Boolean)));
    map[stationId] = clean;
    safeStorage.setItem('neotune_station_tags_map', JSON.stringify(map));
    this.setFavoriteTags(stationId, clean);
    return map;
  },

  addStationTag(stationId: string, tag: string): string[] {
    const existing = this.getStationTags(stationId);
    const cleanTag = tag.trim();
    if (cleanTag && !existing.includes(cleanTag)) {
      const updated = [...existing, cleanTag];
      this.setStationTags(stationId, updated);
      return updated;
    }
    return existing;
  },

  removeStationTag(stationId: string, tag: string): string[] {
    const existing = this.getStationTags(stationId);
    const updated = existing.filter(t => t.toLowerCase() !== tag.toLowerCase().trim());
    this.setStationTags(stationId, updated);
    return updated;
  },

  getAllMoodTags(): string[] {
    const presets = ['Focus', 'Workout', 'Relax', 'Morning', 'Energy', 'Chill', 'Party', 'Sleep', 'Jazz'];
    const map = this.getStationTagsMap();
    const customSet = new Set<string>(presets);

    Object.values(map).forEach(tags => {
      if (Array.isArray(tags)) {
        tags.forEach(t => {
          if (t && t.trim()) customSet.add(t.trim());
        });
      }
    });

    this.getAllCustomTags().forEach(t => customSet.add(t));
    return Array.from(customSet);
  },

  // Mood Presets (EQ configurations linked to Mood tags, synced via Firebase)
  getMoodEqPresets(): Record<string, string> {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.MOOD_EQ_PRESETS);
      const defaults: Record<string, string> = {
        Workout: 'Bass Boost',
        Relax: 'Acoustic',
        Focus: 'Flat',
        Chill: 'Acoustic',
        Party: 'Club',
        Jazz: 'Jazz',
        Sleep: 'Soft',
        Morning: 'Vocal Boost',
        Energy: 'Electronic'
      };
      if (!data) return defaults;
      return { ...defaults, ...JSON.parse(data) };
    } catch {
      return { Workout: 'Bass Boost', Relax: 'Acoustic', Focus: 'Flat', Chill: 'Acoustic' };
    }
  },

  getMoodEqPreset(moodTag: string): string | null {
    if (!moodTag) return null;
    const map = this.getMoodEqPresets();
    const foundKey = Object.keys(map).find(k => k.toLowerCase() === moodTag.toLowerCase().trim());
    return foundKey ? map[foundKey] : null;
  },

  setMoodEqPresetsMap(map: Record<string, string>): void {
    safeStorage.setItem(STORAGE_KEYS.MOOD_EQ_PRESETS, JSON.stringify(map));
  },

  setMoodEqPreset(moodTag: string, eqPresetName: string): Record<string, string> {
    const map = this.getMoodEqPresets();
    map[moodTag] = eqPresetName;
    this.setMoodEqPresetsMap(map);
    try {
      import('./firebaseService').then(({ firebaseService }) => {
        firebaseService.syncSettingsToCloud({ moodEqPresets: map });
      }).catch(() => {});
    } catch {}
    return map;
  },

  // Share History (Last 5 stations shared)
  getShareHistory(): ShareHistoryEntry[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.SHARE_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addShareHistoryEntry(station: RadioStation): ShareHistoryEntry[] {
    try {
      const history = this.getShareHistory();
      const filtered = history.filter(h => h.stationId !== station.id);
      const newEntry: ShareHistoryEntry = {
        id: 'sh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        stationId: station.id,
        stationName: station.name,
        stationUrl: `${window.location.origin}${window.location.pathname}?stationId=${encodeURIComponent(station.id)}`,
        stationGenre: station.genre,
        imageUrl: station.imageUrl,
        sharedAt: Date.now()
      };
      const updated = [newEntry, ...filtered].slice(0, 5);
      safeStorage.setItem(STORAGE_KEYS.SHARE_HISTORY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  setFavoriteTags(stationId: string, tags: string[]): RadioStation[] {
    const list = this.getFavorites();
    const cleanTags = Array.from(new Set(tags.map(t => t.trim()).filter(Boolean)));
    const item = list.find(s => s.id === stationId);
    if (item) {
      item.customTags = cleanTags;
      this.saveFavorites(list);
    }
    return list;
  },

  addTagToFavorite(stationId: string, tag: string): RadioStation[] {
    const clean = tag.trim();
    if (!clean) return this.getFavorites();
    const list = this.getFavorites();
    const item = list.find(s => s.id === stationId);
    if (item) {
      const existing = item.customTags || [];
      if (!existing.includes(clean)) {
        item.customTags = [...existing, clean];
        this.saveFavorites(list);
      }
    }
    return list;
  },

  removeTagFromFavorite(stationId: string, tag: string): RadioStation[] {
    const list = this.getFavorites();
    const item = list.find(s => s.id === stationId);
    if (item && item.customTags) {
      item.customTags = item.customTags.filter(t => t.toLowerCase() !== tag.toLowerCase().trim());
      this.saveFavorites(list);
    }
    return list;
  },

  getAllCustomTags(): string[] {
    const list = this.getFavorites();
    const tagSet = new Set<string>();
    list.forEach(s => {
      if (Array.isArray(s.customTags)) {
        s.customTags.forEach(t => {
          if (t && t.trim()) tagSet.add(t.trim());
        });
      }
    });
    return Array.from(tagSet);
  },

  // Recents
  getRecents(): RadioStation[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.RECENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addRecent(station: RadioStation): void {
    try {
      let recents = this.getRecents();
      recents = recents.filter(s => s.id !== station.id);
      recents.unshift({ ...station, lastListenedTimestamp: Date.now() });
      // Keep max 30 recents
      if (recents.length > 30) recents = recents.slice(0, 30);
      safeStorage.setItem(STORAGE_KEYS.RECENTS, JSON.stringify(recents));

      // Save to IndexedDB for offline cache recovery (last 10 listened-to stations)
      indexedDBService.saveStation(station).catch(() => {});
    } catch (e) {
      console.error('Failed to add recent:', e);
    }
  },

  clearRecents(): void {
    try {
      safeStorage.removeItem(STORAGE_KEYS.RECENTS);
      indexedDBService.clearOfflineCache().catch(() => {});
    } catch (e) {
      console.error('Failed to clear recents:', e);
    }
  },

  // Search History
  getSearchHistory(): string[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addSearchHistory(query: string): void {
    if (!query.trim()) return;
    try {
      let history = this.getSearchHistory().filter(q => q.toLowerCase() !== query.toLowerCase().trim());
      history.unshift(query.trim());
      if (history.length > 15) history = history.slice(0, 15);
      safeStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(history));
    } catch {}
  },

  clearSearchHistory(): void {
    safeStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  },

  removeSearchHistoryEntry(query: string): string[] {
    try {
      let history = this.getSearchHistory().filter(q => q.toLowerCase() !== query.toLowerCase().trim());
      safeStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(history));
      return history.slice(0, 5);
    } catch {
      return [];
    }
  },

  // Custom Stations
  getCustomStations(): RadioStation[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.CUSTOM_STATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getRecentlyAddedStations(limit = 5): RadioStation[] {
    const list = this.getCustomStations();
    return list
      .sort((a, b) => ((b.dateAdded || b.lastListenedTimestamp || 0) - (a.dateAdded || a.lastListenedTimestamp || 0)))
      .slice(0, limit);
  },

  addCustomStation(station: RadioStation): void {
    const list = this.getCustomStations();
    const cleanId = station.id && (station.id.startsWith('custom_') || station.isCustom) ? station.id : `custom_${Date.now()}`;
    const newStation: RadioStation = {
      ...station,
      id: cleanId,
      isCustom: true,
      dateAdded: station.dateAdded || Date.now()
    };
    const filtered = list.filter(s => s.id !== newStation.id && s.streamUrl !== newStation.streamUrl);
    filtered.unshift(newStation);
    safeStorage.setItem(STORAGE_KEYS.CUSTOM_STATIONS, JSON.stringify(filtered));
    this.incrementCoreOperations();
  },

  deleteCustomStation(id: string): void {
    const list = this.getCustomStations().filter(s => s.id !== id);
    safeStorage.setItem(STORAGE_KEYS.CUSTOM_STATIONS, JSON.stringify(list));
  },

  // Podcast Progress
  getPodcastProgress(showOrEpisodeId: string): PodcastProgress | null {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.PODCAST_PROGRESS);
      if (!data) return null;
      const map: Record<string, PodcastProgress> = JSON.parse(data);
      return map[showOrEpisodeId] || null;
    } catch {
      return null;
    }
  },

  savePodcastProgress(progress: PodcastProgress): void {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.PODCAST_PROGRESS);
      const map: Record<string, PodcastProgress> = data ? JSON.parse(data) : {};
      map[progress.stationIdOrUrl] = progress;
      safeStorage.setItem(STORAGE_KEYS.PODCAST_PROGRESS, JSON.stringify(map));
    } catch {}
  },

  getRecentEpisodes(): { show: RadioStation, episode: PodcastEpisode, timestamp: number }[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.RECENT_EPISODES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addRecentEpisode(show: RadioStation, episode: PodcastEpisode): void {
    try {
      const recents = this.getRecentEpisodes();
      const filtered = recents.filter(item => item.episode.audioUrl !== episode.audioUrl);
      const updated = [
        { show, episode, timestamp: Date.now() },
        ...filtered
      ].slice(0, 5);
      safeStorage.setItem(STORAGE_KEYS.RECENT_EPISODES, JSON.stringify(updated));
    } catch {}
  },

  // Alarm Config
  getAlarmConfig(): AlarmConfig {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.ALARM);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...parsed,
          gentleWakeUpEnabled: parsed.gentleWakeUpEnabled ?? false,
          gentleWakeUpWindowMins: parsed.gentleWakeUpWindowMins ?? 3,
          minWakeVolume: parsed.minWakeVolume ?? 0.10,
          maxCeilingVolume: parsed.maxCeilingVolume ?? (parsed.volume ?? 0.85),
          backupSound: parsed.backupSound ?? 'gentle_bells',
        };
      }
      return {
        isEnabled: false,
        hour: 7,
        minute: 0,
        stationId: 'soma_groove_salad',
        stationName: 'SomaFM: Groove Salad',
        stationUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
        stationGenre: 'Ambient & Chill',
        gentleWakeUpEnabled: false,
        gentleWakeUpWindowMins: 3,
        minWakeVolume: 0.10,
        maxCeilingVolume: 0.85,
        backupSound: 'gentle_bells',
      };
    } catch {
      return {
        isEnabled: false,
        hour: 7,
        minute: 0,
        stationId: 'soma_groove_salad',
        stationName: 'SomaFM: Groove Salad',
        stationUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
        stationGenre: 'Ambient & Chill',
        gentleWakeUpEnabled: false,
        gentleWakeUpWindowMins: 3,
        minWakeVolume: 0.10,
        maxCeilingVolume: 0.85,
        backupSound: 'gentle_bells',
      };
    }
  },

  saveAlarmConfig(config: AlarmConfig): void {
    safeStorage.setItem(STORAGE_KEYS.ALARM, JSON.stringify(config));
  },

  // Filters
  getFilterConfig(): FilterConfig {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.FILTERS);
      return data ? JSON.parse(data) : {
        filterAdultContent: true,
        filterPoliticsContent: false,
        filterReligiousContent: false,
        filterBrokenStreams: true,
        customBlockedKeywords: [],
        blockedStationIds: []
      };
    } catch {
      return {
        filterAdultContent: true,
        filterPoliticsContent: false,
        filterReligiousContent: false,
        filterBrokenStreams: true,
        customBlockedKeywords: [],
        blockedStationIds: []
      };
    }
  },

  saveFilterConfig(config: FilterConfig): void {
    safeStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(config));
  },

  // Theme
  getTheme(): ThemeType {
    try {
      return (safeStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || 'frosted-glass';
    } catch {
      return 'frosted-glass';
    }
  },

  saveTheme(theme: ThemeType): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {}
  },

  getLayoutPreference(): 'compact' | 'large' {
    try {
      return (safeStorage.getItem(STORAGE_KEYS.LAYOUT_PREFERENCE) as 'compact' | 'large') || 'large';
    } catch {
      return 'large';
    }
  },

  saveLayoutPreference(pref: 'compact' | 'large'): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.LAYOUT_PREFERENCE, pref);
    } catch {}
  },

  getAutoDetectTheme(): boolean {
    try {
      return safeStorage.getItem(STORAGE_KEYS.AUTO_DETECT_THEME) === 'true';
    } catch {
      return false;
    }
  },

  setAutoDetectTheme(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.AUTO_DETECT_THEME, String(enabled));
    } catch {}
  },

  getTimeBasedTheme(): boolean {
    try {
      return safeStorage.getItem(STORAGE_KEYS.TIME_BASED_THEME) === 'true';
    } catch {
      return false;
    }
  },

  setTimeBasedTheme(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.TIME_BASED_THEME, String(enabled));
    } catch {}
  },

  getShowRadioTabs(): boolean {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.SHOW_RADIO_TABS);
      return val !== 'false'; // Default to true
    } catch {
      return true;
    }
  },

  setShowRadioTabs(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.SHOW_RADIO_TABS, String(enabled));
    } catch {}
  },

  getLanguage(): string | null {
    try {
      return safeStorage.getItem(STORAGE_KEYS.LANGUAGE) || null;
    } catch {
      return null;
    }
  },

  saveLanguage(code: string): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.LANGUAGE, code);
    } catch {}
  },

  // Battery Saver & Auto Play
  getBatterySaver(): boolean {
    try {
      return safeStorage.getItem(STORAGE_KEYS.BATTERY_SAVER) === 'true';
    } catch {
      return false;
    }
  },

  setBatterySaver(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.BATTERY_SAVER, String(enabled));
    } catch {}
  },

  getAutoPlay(): boolean {
    try {
      return safeStorage.getItem(STORAGE_KEYS.AUTO_PLAY) !== 'false';
    } catch {
      return true;
    }
  },

  setAutoPlay(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.AUTO_PLAY, String(enabled));
    } catch {}
  },

  // Haptic Feedback & Audio Quality Preferences
  getHapticsEnabled(): boolean {
    try {
      return safeStorage.getItem(STORAGE_KEYS.HAPTICS_ENABLED) !== 'false';
    } catch {
      return true;
    }
  },

  setHapticsEnabled(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.HAPTICS_ENABLED, String(enabled));
    } catch {}
  },

  getPreferredQuality(): 'all' | 'high_quality' {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.PREFERRED_QUALITY);
      return val === 'high_quality' ? 'high_quality' : 'all';
    } catch {
      return 'all';
    }
  },

  setPreferredQuality(quality: 'all' | 'high_quality'): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.PREFERRED_QUALITY, quality);
    } catch {}
  },

  getEQPreset(): string {
    try {
      return safeStorage.getItem(STORAGE_KEYS.EQ_PRESET) || 'Balanced';
    } catch {
      return 'Balanced';
    }
  },

  saveEQPreset(name: string): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.EQ_PRESET, name);
    } catch {}
  },

  getVolume(): number {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.LAST_VOLUME);
      return val ? parseFloat(val) : 0.85;
    } catch {
      return 0.85;
    }
  },

  saveVolume(vol: number): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.LAST_VOLUME, String(vol));
    } catch {}
  },

  // Per-Category Volume Preference Persistence (e.g. Rock, News/Talk, Classical, EDM, Jazz)
  normalizeCategory(genreOrCategory?: string): string {
    if (!genreOrCategory || !genreOrCategory.trim()) return 'General';
    const lower = genreOrCategory.toLowerCase().trim();

    if (lower.includes('news') || lower.includes('talk') || lower.includes('speech') || lower.includes('podcast') || lower.includes('sports') || lower.includes('information') || lower.includes('politics')) {
      return 'News & Talk';
    }
    if (lower.includes('rock') || lower.includes('metal') || lower.includes('alternative') || lower.includes('punk') || lower.includes('grunge') || lower.includes('hard rock')) {
      return 'Rock';
    }
    if (lower.includes('electronic') || lower.includes('edm') || lower.includes('dance') || lower.includes('house') || lower.includes('techno') || lower.includes('trance') || lower.includes('club') || lower.includes('electro')) {
      return 'Electronic';
    }
    if (lower.includes('classical') || lower.includes('symphony') || lower.includes('orchestra') || lower.includes('opera') || lower.includes('baroque') || lower.includes('chamber')) {
      return 'Classical';
    }
    if (lower.includes('jazz') || lower.includes('blues') || lower.includes('swing') || lower.includes('bossa') || lower.includes('bebop') || lower.includes('smooth jazz')) {
      return 'Jazz & Blues';
    }
    if (lower.includes('hiphop') || lower.includes('hip hop') || lower.includes('rap') || lower.includes('trap') || lower.includes('urban') || lower.includes('r&b') || lower.includes('rnb')) {
      return 'Hip Hop & R&B';
    }
    if (lower.includes('pop') || lower.includes('hits') || lower.includes('top 40') || lower.includes('top40') || lower.includes('chart') || lower.includes('contemporary')) {
      return 'Pop & Hits';
    }
    if (lower.includes('chill') || lower.includes('lounge') || lower.includes('ambient') || lower.includes('lofi') || lower.includes('lo-fi') || lower.includes('relaxation') || lower.includes('meditation') || lower.includes('downtempo')) {
      return 'Ambient & Chill';
    }
    if (lower.includes('country') || lower.includes('folk') || lower.includes('acoustic') || lower.includes('bluegrass') || lower.includes('americana')) {
      return 'Country & Folk';
    }
    if (lower.includes('latin') || lower.includes('salsa') || lower.includes('reggaeton') || lower.includes('bachata') || lower.includes('cumbia')) {
      return 'Latin';
    }
    if (lower.includes('reggae') || lower.includes('dub') || lower.includes('dancehall') || lower.includes('ska')) {
      return 'Reggae';
    }
    if (lower.includes('oldies') || lower.includes('80s') || lower.includes('70s') || lower.includes('60s') || lower.includes('90s') || lower.includes('retro') || lower.includes('classic')) {
      return 'Decades & Retro';
    }
    return 'Music (General)';
  },

  getAllCategoryVolumes(): Record<string, number> {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.CATEGORY_VOLUMES);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  getCategoryVolume(categoryOrGenre?: string): number | null {
    if (!categoryOrGenre) return null;
    try {
      const key = this.normalizeCategory(categoryOrGenre);
      const all = this.getAllCategoryVolumes();
      if (all[key] !== undefined && typeof all[key] === 'number') {
        return Math.max(0, Math.min(1, all[key]));
      }
      return null;
    } catch {
      return null;
    }
  },

  saveCategoryVolume(categoryOrGenre: string, volume: number): void {
    if (!categoryOrGenre) return;
    try {
      const key = this.normalizeCategory(categoryOrGenre);
      const clamped = Math.max(0, Math.min(1, volume));
      const all = this.getAllCategoryVolumes();
      all[key] = clamped;
      safeStorage.setItem(STORAGE_KEYS.CATEGORY_VOLUMES, JSON.stringify(all));
    } catch {}
  },

  // Volume Normalization & Target Loudness Level
  getNormalizeAudio(): boolean {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.NORMALIZE_AUDIO);
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  },

  setNormalizeAudio(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.NORMALIZE_AUDIO, String(enabled));
    } catch {}
  },

  getTargetNormalizeLevel(): number {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.TARGET_NORMALIZE_LEVEL);
      return val ? parseFloat(val) : 0.85;
    } catch {
      return 0.85;
    }
  },

  setTargetNormalizeLevel(level: number): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.TARGET_NORMALIZE_LEVEL, String(level));
    } catch {}
  },

  // Crossfade Duration (ms)
  getCrossfadeDurationMs(): number {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.CROSSFADE_DURATION_MS);
      return val ? parseInt(val, 10) : 500;
    } catch {
      return 500;
    }
  },

  setCrossfadeDurationMs(ms: number): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.CROSSFADE_DURATION_MS, String(ms));
    } catch {}
  },

  // Sleep Timer Configuration & Bedtime Preferences Persistence
  getSleepTimerConfig(): SleepTimerConfig {
    try {
      const storedDuration = safeStorage.getItem(STORAGE_KEYS.SLEEP_TIMER_DURATION);
      const duration = storedDuration ? parseInt(storedDuration, 10) : 30;

      const storedFadeOut = safeStorage.getItem(STORAGE_KEYS.SLEEP_FADE_OUT_ENABLED);
      const fadeOutEnabled = storedFadeOut !== 'false';

      const storedCurve = safeStorage.getItem(STORAGE_KEYS.SLEEP_FADE_CURVE);
      const fadeCurve = (storedCurve === 'exponential' || storedCurve === 'logarithmic')
        ? storedCurve
        : 'linear';

      const storedRecents = safeStorage.getItem(STORAGE_KEYS.RECENT_SLEEP_DURATIONS);
      let recentDurations: number[] = [];
      if (storedRecents) {
        try {
          const parsed = JSON.parse(storedRecents);
          if (Array.isArray(parsed)) {
            recentDurations = parsed.filter((v): v is number => typeof v === 'number' && v > 0).slice(0, 3);
          }
        } catch {}
      }

      const storedHistory = safeStorage.getItem(STORAGE_KEYS.SLEEP_HISTORY);
      let sleepHistory: any[] = [];
      if (storedHistory) {
        try {
          const parsed = JSON.parse(storedHistory);
          if (Array.isArray(parsed)) {
            sleepHistory = parsed.slice(0, 5);
          }
        } catch {}
      }

      const storedFadeOutMins = safeStorage.getItem(STORAGE_KEYS.TOTAL_SLEEP_FADE_OUT_MINUTES);
      const totalSleepFadeOutMinutes = storedFadeOutMins ? parseInt(storedFadeOutMins, 10) : 180;

      const storedSessions = safeStorage.getItem(STORAGE_KEYS.TOTAL_SLEEP_TIMER_SESSIONS);
      const totalSleepTimerSessions = storedSessions ? parseInt(storedSessions, 10) : 6;

      const storedSoundscapeType = safeStorage.getItem(STORAGE_KEYS.SLEEP_SOUNDSCAPE_TYPE) as any;
      const soundscapeType = (storedSoundscapeType || 'none');

      const storedSoundscapeVol = safeStorage.getItem(STORAGE_KEYS.SLEEP_SOUNDSCAPE_VOLUME);
      const soundscapeVolume = storedSoundscapeVol ? parseFloat(storedSoundscapeVol) : 0.5;

      const storedPresets = safeStorage.getItem(STORAGE_KEYS.SLEEP_QUICK_PRESETS);
      let quickPresets = [15, 30, 60];
      if (storedPresets) {
        try {
          const parsed = JSON.parse(storedPresets);
          if (Array.isArray(parsed) && parsed.length > 0) {
            quickPresets = parsed.filter(v => typeof v === 'number' && v > 0);
          }
        } catch {}
      }

      const storedAutoFade = safeStorage.getItem(STORAGE_KEYS.SLEEP_INTELLIGENT_AUTO_FADE);
      const intelligentAutoFade = storedAutoFade !== 'false';

      return {
        duration: isNaN(duration) || duration <= 0 ? 30 : duration,
        fadeOutEnabled,
        fadeCurve,
        recentDurations,
        sleepHistory,
        totalSleepFadeOutMinutes: isNaN(totalSleepFadeOutMinutes) ? 180 : totalSleepFadeOutMinutes,
        totalSleepTimerSessions: isNaN(totalSleepTimerSessions) ? 6 : totalSleepTimerSessions,
        soundscapeType,
        soundscapeVolume: isNaN(soundscapeVolume) ? 0.5 : soundscapeVolume,
        quickPresets,
        weeklyUsage: this.getWeeklySleepTimerUsage(),
        intelligentAutoFade
      };
    } catch {
      return {
        duration: 30,
        fadeOutEnabled: true,
        fadeCurve: 'linear',
        recentDurations: [],
        sleepHistory: [],
        totalSleepFadeOutMinutes: 180,
        totalSleepTimerSessions: 6,
        soundscapeType: 'none',
        soundscapeVolume: 0.5,
        quickPresets: [15, 30, 60],
        weeklyUsage: this.getWeeklySleepTimerUsage(),
        intelligentAutoFade: true
      };
    }
  },

  getVolumeSafetyLockEnabled(): boolean {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.VOLUME_SAFETY_LOCK_ENABLED);
      return val === 'true'; // Default disabled unless user enables it
    } catch {
      return false;
    }
  },

  setVolumeSafetyLockEnabled(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.VOLUME_SAFETY_LOCK_ENABLED, String(enabled));
    } catch {}
  },

  getVolumeSafetyLockThreshold(): number {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.VOLUME_SAFETY_LOCK_THRESHOLD);
      const parsed = val ? parseFloat(val) : 0.70;
      return isNaN(parsed) ? 0.70 : Math.max(0.30, Math.min(0.90, parsed));
    } catch {
      return 0.70;
    }
  },

  setVolumeSafetyLockThreshold(threshold: number): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.VOLUME_SAFETY_LOCK_THRESHOLD, String(threshold));
    } catch {}
  },

  getSleepQuickPresets(): number[] {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.SLEEP_QUICK_PRESETS);
      if (val) {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return [15, 30, 60];
    } catch {
      return [15, 30, 60];
    }
  },

  saveSleepQuickPresets(presets: number[]): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.SLEEP_QUICK_PRESETS, JSON.stringify(presets));
    } catch {}
  },

  getWeeklySleepTimerUsage(): { day: string; date: string; minutes: number; hours: number }[] {
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: { day: string; date: string; minutes: number; hours: number }[] = [];

    // Construct last 7 days (including today)
    const storedMapRaw = safeStorage.getItem(STORAGE_KEYS.SLEEP_WEEKLY_USAGE);
    let storedUsage: Record<string, number> = {};
    if (storedMapRaw) {
      try { storedUsage = JSON.parse(storedMapRaw); } catch {}
    }

    // Default mock baseline if empty so the chart looks rich initially
    const defaultBaseline: Record<number, number> = { 0: 45, 1: 30, 2: 60, 3: 45, 4: 90, 5: 60, 6: 75 };

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayName = daysMap[d.getDay()];
      const dayIndex = d.getDay();

      const mins = storedUsage[dateKey] !== undefined 
        ? storedUsage[dateKey] 
        : (defaultBaseline[dayIndex] || 30);

      result.push({
        day: dayName,
        date: dateKey,
        minutes: mins,
        hours: Math.round((mins / 60) * 10) / 10
      });
    }

    return result;
  },

  saveSleepSoundscape(type: string, volume: number): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.SLEEP_SOUNDSCAPE_TYPE, type);
      safeStorage.setItem(STORAGE_KEYS.SLEEP_SOUNDSCAPE_VOLUME, String(volume));
    } catch {}
  },

  addSleepHistoryEntry(mins: number): any[] {
    if (!mins || mins <= 0) return [];
    try {
      const config = this.getSleepTimerConfig();
      const currentHistory = config.sleepHistory || [];

      const now = new Date();
      const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateLabel = 'Today';

      const newEntry = {
        id: `sleep_hist_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now(),
        duration: mins,
        timeLabel,
        dateLabel
      };

      const updatedHistory = [newEntry, ...currentHistory.filter(h => h.duration !== mins || (Date.now() - h.timestamp > 60000))].slice(0, 5);
      safeStorage.setItem(STORAGE_KEYS.SLEEP_HISTORY, JSON.stringify(updatedHistory));
      return updatedHistory;
    } catch {
      return [];
    }
  },

  recordSleepTimerUsage(durationMins: number, fadeOutUsed: boolean): void {
    try {
      const config = this.getSleepTimerConfig();
      const newSessions = (config.totalSleepTimerSessions || 0) + 1;
      const newFadeMins = fadeOutUsed
        ? (config.totalSleepFadeOutMinutes || 0) + durationMins
        : (config.totalSleepFadeOutMinutes || 0);

      safeStorage.setItem(STORAGE_KEYS.TOTAL_SLEEP_TIMER_SESSIONS, String(newSessions));
      safeStorage.setItem(STORAGE_KEYS.TOTAL_SLEEP_FADE_OUT_MINUTES, String(newFadeMins));

      // Accumulate today's usage in SLEEP_WEEKLY_USAGE map
      const todayKey = new Date().toISOString().split('T')[0];
      const storedMapRaw = safeStorage.getItem(STORAGE_KEYS.SLEEP_WEEKLY_USAGE);
      let storedUsage: Record<string, number> = {};
      if (storedMapRaw) {
        try { storedUsage = JSON.parse(storedMapRaw); } catch {}
      }
      storedUsage[todayKey] = (storedUsage[todayKey] || 0) + durationMins;
      safeStorage.setItem(STORAGE_KEYS.SLEEP_WEEKLY_USAGE, JSON.stringify(storedUsage));
    } catch {}
  },

  saveSleepTimerDuration(duration: number): void {
    if (!duration || duration <= 0) return;
    try {
      safeStorage.setItem(STORAGE_KEYS.SLEEP_TIMER_DURATION, String(duration));
    } catch {}
  },

  saveSleepFadeOutEnabled(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.SLEEP_FADE_OUT_ENABLED, String(enabled));
    } catch {}
  },

  saveSleepFadeCurve(curve: 'linear' | 'exponential' | 'logarithmic'): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.SLEEP_FADE_CURVE, curve);
    } catch {}
  },

  addRecentSleepDuration(mins: number): number[] {
    if (!mins || mins <= 0) return [];
    try {
      const config = this.getSleepTimerConfig();
      const currentRecents = config.recentDurations || [];
      const updated = [mins, ...currentRecents.filter(d => d !== mins)].slice(0, 3);
      safeStorage.setItem(STORAGE_KEYS.RECENT_SLEEP_DURATIONS, JSON.stringify(updated));
      return updated;
    } catch {
      return [mins];
    }
  },

  saveSleepTimerConfig(config: Partial<SleepTimerConfig>): void {
    try {
      if (config.duration !== undefined) {
        this.saveSleepTimerDuration(config.duration);
      }
      if (config.fadeOutEnabled !== undefined) {
        this.saveSleepFadeOutEnabled(config.fadeOutEnabled);
      }
      if (config.fadeCurve !== undefined) {
        this.saveSleepFadeCurve(config.fadeCurve);
      }
      if (config.recentDurations !== undefined) {
        safeStorage.setItem(STORAGE_KEYS.RECENT_SLEEP_DURATIONS, JSON.stringify(config.recentDurations.slice(0, 3)));
      }
    } catch {}
  },

  // Queued Stations (Offline First with Reconnection Cloud Sync)
  getQueuedStations(): QueuedStation[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.QUEUED_STATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveQueuedStations(stations: QueuedStation[]): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.QUEUED_STATIONS, JSON.stringify(stations));
    } catch (e) {
      console.error('Failed to save queued stations:', e);
    }
  },

  addToQueue(station: RadioStation): QueuedStation {
    const list = this.getQueuedStations();
    const existingIndex = list.findIndex(s => s.id === station.id || (s.streamUrl && s.streamUrl === station.streamUrl));
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    const queuedItem: QueuedStation = {
      ...station,
      queuedAt: Date.now(),
      syncStatus: isOnline ? 'synced' : 'local'
    };

    if (existingIndex >= 0) {
      list[existingIndex] = queuedItem;
    } else {
      list.unshift(queuedItem);
    }

    // Keep max 50 queued stations
    const trimmed = list.slice(0, 50);
    this.saveQueuedStations(trimmed);
    return queuedItem;
  },

  removeFromQueue(stationId: string): void {
    const list = this.getQueuedStations().filter(s => s.id !== stationId);
    this.saveQueuedStations(list);
  },

  clearQueue(): void {
    try {
      safeStorage.removeItem(STORAGE_KEYS.QUEUED_STATIONS);
    } catch (e) {
      console.error('Failed to clear queue:', e);
    }
  },

  isQueued(stationId: string): boolean {
    const list = this.getQueuedStations();
    return list.some(s => s.id === stationId);
  },

  markQueuedAsSynced(stationId: string): void {
    const list = this.getQueuedStations();
    const item = list.find(s => s.id === stationId);
    if (item) {
      item.syncStatus = 'synced';
      this.saveQueuedStations(list);
    }
  },

  // Visualizer Skin
  getVisualizerSkin(): VisualizerSkin {
    try {
      return (safeStorage.getItem(STORAGE_KEYS.VISUALIZER_SKIN) as VisualizerSkin) || 'bars';
    } catch {
      return 'bars';
    }
  },

  saveVisualizerSkin(skin: VisualizerSkin): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.VISUALIZER_SKIN, skin);
    } catch {}
  },

  getVisualizerColorScheme(): string {
    try {
      return safeStorage.getItem(STORAGE_KEYS.VISUALIZER_COLOR_SCHEME) || 'sync';
    } catch {
      return 'sync';
    }
  },

  saveVisualizerColorScheme(scheme: string): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.VISUALIZER_COLOR_SCHEME, scheme);
    } catch {}
  },

  getVisualizerCycleInterval(): number {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.VISUALIZER_CYCLE_INTERVAL);
      const parsed = val ? parseInt(val, 10) : 10;
      return isNaN(parsed) || parsed < 3 ? 10 : parsed;
    } catch {
      return 10;
    }
  },

  saveVisualizerCycleInterval(seconds: number): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.VISUALIZER_CYCLE_INTERVAL, String(Math.max(3, Math.min(120, seconds))));
    } catch {}
  },

  getVisualizerSensitivity(): number {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.VISUALIZER_SENSITIVITY);
      const parsed = val ? parseFloat(val) : 1.0;
      return isNaN(parsed) ? 1.0 : Math.max(0.2, Math.min(2.5, parsed));
    } catch {
      return 1.0;
    }
  },

  saveVisualizerSensitivity(sensitivity: number): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.VISUALIZER_SENSITIVITY, String(Math.max(0.2, Math.min(2.5, sensitivity))));
    } catch {}
  },

  getVisualizerIntensity(): number {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.VISUALIZER_INTENSITY);
      const parsed = val ? parseFloat(val) : 1.0;
      return isNaN(parsed) ? 1.0 : Math.max(0.1, Math.min(3.0, parsed));
    } catch {
      return 1.0;
    }
  },

  saveVisualizerIntensity(intensity: number): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.VISUALIZER_INTENSITY, String(Math.max(0.1, Math.min(3.0, intensity))));
    } catch {}
  },

  getAutoPruneDeadStations(): boolean {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.AUTO_PRUNE_DEAD_STATIONS);
      return val === 'true'; // Default false unless enabled by user
    } catch {
      return false;
    }
  },

  setAutoPruneDeadStations(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.AUTO_PRUNE_DEAD_STATIONS, String(enabled));
    } catch {}
  },

  getAutoEQEnabled(): boolean {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.AUTO_EQ_ENABLED);
      return val !== 'false'; // Default true
    } catch {
      return true;
    }
  },

  setAutoEQEnabled(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.AUTO_EQ_ENABLED, String(enabled));
    } catch {}
  },

  incrementFailedAttempts(stationId: string): number {
    if (!stationId) return 0;
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.STATION_FAILED_ATTEMPTS);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      const current = map[stationId] || 0;
      const updated = current + 1;
      map[stationId] = updated;
      safeStorage.setItem(STORAGE_KEYS.STATION_FAILED_ATTEMPTS, JSON.stringify(map));
      return updated;
    } catch {
      return 1;
    }
  },

  resetFailedAttempts(stationId: string): void {
    if (!stationId) return;
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.STATION_FAILED_ATTEMPTS);
      if (raw) {
        const map: Record<string, number> = JSON.parse(raw);
        delete map[stationId];
        safeStorage.setItem(STORAGE_KEYS.STATION_FAILED_ATTEMPTS, JSON.stringify(map));
      }
    } catch {}
  },

  // Station Custom Text Notes
  getStationNote(stationId: string): string {
    if (!stationId) return '';
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.STATION_NOTES);
      if (!raw) return '';
      const map: Record<string, string> = JSON.parse(raw);
      return map[stationId] || '';
    } catch {
      return '';
    }
  },

  saveStationNote(stationId: string, note: string): void {
    if (!stationId) return;
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.STATION_NOTES);
      const map: Record<string, string> = raw ? JSON.parse(raw) : {};
      if (note.trim() === '') {
        delete map[stationId];
      } else {
        map[stationId] = note.trim();
      }
      safeStorage.setItem(STORAGE_KEYS.STATION_NOTES, JSON.stringify(map));
    } catch {}
  },

  // Loudness Normalization Global & Station Overrides
  getLoudnessNormalization(): boolean {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.NORMALIZE_AUDIO);
      return val === 'true'; // Default false unless turned on by user
    } catch {
      return false;
    }
  },

  setLoudnessNormalization(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.NORMALIZE_AUDIO, String(enabled));
    } catch {}
  },

  getStationLoudnessOverride(stationId: string): 'default' | 'enabled' | 'disabled' {
    if (!stationId) return 'default';
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.STATION_LOUDNESS_OVERRIDES);
      if (!raw) return 'default';
      const map: Record<string, 'default' | 'enabled' | 'disabled'> = JSON.parse(raw);
      return map[stationId] || 'default';
    } catch {
      return 'default';
    }
  },

  setStationLoudnessOverride(stationId: string, override: 'default' | 'enabled' | 'disabled'): void {
    if (!stationId) return;
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.STATION_LOUDNESS_OVERRIDES);
      const map: Record<string, 'default' | 'enabled' | 'disabled'> = raw ? JSON.parse(raw) : {};
      if (override === 'default') {
        delete map[stationId];
      } else {
        map[stationId] = override;
      }
      safeStorage.setItem(STORAGE_KEYS.STATION_LOUDNESS_OVERRIDES, JSON.stringify(map));
    } catch {}
  },

  // Backup Export & Import
  exportAllUserData(): string {
    const backupData = {
      app: 'NeoTune Radio',
      version: '3.2.0',
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      totalFavorites: this.getFavorites().length,
      favorites: this.getFavorites(),
      alarms: this.getAlarmConfig(),
      queuedStations: this.getQueuedStations(),
      recents: this.getRecents().slice(0, 30),
      customStations: this.getCustomStations(),
      stationSettings: {
        normalizeAudio: this.getNormalizeAudio(),
        targetNormalizeLevel: this.getTargetNormalizeLevel(),
        crossfadeDurationMs: this.getCrossfadeDurationMs(),
        batterySaver: this.getBatterySaver(),
        autoPlay: this.getAutoPlay(),
        dataSaverBitrate: this.getDataSaverBitrate()
      },
      audioSettings: {
        eqPreset: this.getEQPreset(),
        volume: this.getVolume()
      },
      uiPreferences: {
        theme: this.getTheme(),
        autoDetectTheme: this.getAutoDetectTheme(),
        visualizerSkin: this.getVisualizerSkin(),
        visualizerCycleInterval: this.getVisualizerCycleInterval()
      },
      filters: this.getFilterConfig(),
      userStats: this.getUserStats()
    };
    return JSON.stringify(backupData, null, 2);
  },

  downloadBackupJSON(filenamePrefix: string = 'neotune_config_backup'): { success: boolean; filename: string; favoritesCount: number } {
    try {
      const backupJson = this.exportAllUserData();
      const favorites = this.getFavorites();
      const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const filename = `${filenamePrefix}_${dateStr}.json`;
      
      const blob = new Blob([backupJson], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, filename, favoritesCount: favorites.length };
    } catch (e) {
      console.error('Failed to download backup JSON:', e);
      return { success: false, filename: '', favoritesCount: 0 };
    }
  },

  importUserData(jsonString: string): { success: boolean; count: { favorites: number; alarms: boolean; queued: number }; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON structure');
      }

      let favCount = 0;
      let queuedCount = 0;
      let hasAlarm = false;

      if (Array.isArray(data.favorites)) {
        this.saveFavorites(data.favorites);
        favCount = data.favorites.length;
      }

      if (data.alarms && typeof data.alarms === 'object') {
        this.saveAlarmConfig(data.alarms);
        hasAlarm = true;
      }

      if (Array.isArray(data.queuedStations)) {
        this.saveQueuedStations(data.queuedStations);
        queuedCount = data.queuedStations.length;
      }

      if (Array.isArray(data.customStations)) {
        safeStorage.setItem(STORAGE_KEYS.CUSTOM_STATIONS, JSON.stringify(data.customStations));
      }

      if (data.eqPreset && typeof data.eqPreset === 'string') {
        this.saveEQPreset(data.eqPreset);
      } else if (data.audioSettings?.eqPreset) {
        this.saveEQPreset(data.audioSettings.eqPreset);
      }

      if (data.visualizerSkin && typeof data.visualizerSkin === 'string') {
        this.saveVisualizerSkin(data.visualizerSkin as VisualizerSkin);
      } else if (data.uiPreferences?.visualizerSkin) {
        this.saveVisualizerSkin(data.uiPreferences.visualizerSkin as VisualizerSkin);
      }

      if (data.theme && typeof data.theme === 'string') {
        this.saveTheme(data.theme);
      } else if (data.uiPreferences?.theme) {
        this.saveTheme(data.uiPreferences.theme);
      }

      if (data.stationSettings) {
        if (typeof data.stationSettings.normalizeAudio === 'boolean') {
          this.setNormalizeAudio(data.stationSettings.normalizeAudio);
        }
        if (typeof data.stationSettings.targetNormalizeLevel === 'number') {
          this.setTargetNormalizeLevel(data.stationSettings.targetNormalizeLevel);
        }
        if (typeof data.stationSettings.crossfadeDurationMs === 'number') {
          this.setCrossfadeDurationMs(data.stationSettings.crossfadeDurationMs);
        }
        if (typeof data.stationSettings.batterySaver === 'boolean') {
          this.setBatterySaver(data.stationSettings.batterySaver);
        }
        if (typeof data.stationSettings.autoPlay === 'boolean') {
          this.setAutoPlay(data.stationSettings.autoPlay);
        }
      }

      if (data.filters && typeof data.filters === 'object') {
        this.saveFilterConfig(data.filters);
      }

      return {
        success: true,
        count: {
          favorites: favCount,
          alarms: hasAlarm,
          queued: queuedCount
        }
      };
    } catch (err: any) {
      return {
        success: false,
        count: { favorites: 0, alarms: false, queued: 0 },
        error: err?.message || 'Failed to parse backup JSON'
      };
    }
  },

  // User Stats for Smart Engagement
  getUserStats(): UserStats {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.USER_STATS);
      return data ? JSON.parse(data) : {
        sessionCount: 1,
        totalListeningTimeSec: 0,
        favoritesAddedCount: 0,
        firstLaunchTimestamp: Date.now(),
        hasRated: false
      };
    } catch {
      return {
        sessionCount: 1,
        totalListeningTimeSec: 0,
        favoritesAddedCount: 0,
        firstLaunchTimestamp: Date.now(),
        hasRated: false
      };
    }
  },

  saveUserStats(stats: UserStats): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify(stats));
    } catch {}
  },

  incrementSessionCount(): void {
    const stats = this.getUserStats();
    stats.sessionCount += 1;
    this.saveUserStats(stats);
  },

  incrementFavoriteStat(): void {
    const stats = this.getUserStats();
    stats.favoritesAddedCount += 1;
    this.saveUserStats(stats);
  },

  // Daily Listening Activity & 30-Day Calendar Heatmap Tracker
  recordDailyListening(seconds: number, stationId?: string): void {
    if (seconds <= 0) return;
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const raw = safeStorage.getItem(STORAGE_KEYS.DAILY_LISTENING);
      const data: Record<string, { seconds: number; stationIds: string[] }> = raw ? JSON.parse(raw) : {};

      if (!data[today]) {
        data[today] = { seconds: 0, stationIds: [] };
      }

      data[today].seconds += seconds;
      if (stationId && !data[today].stationIds.includes(stationId)) {
        data[today].stationIds.push(stationId);
      }

      safeStorage.setItem(STORAGE_KEYS.DAILY_LISTENING, JSON.stringify(data));
    } catch (e) {
      console.warn('Record daily listening note:', e);
    }
  },

  getDailyListeningStats(daysCount: number = 30): DailyActivityStat[] {
    const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let rawData: Record<string, { seconds: number; stationIds: string[] }> = {};
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.DAILY_LISTENING);
      if (raw) rawData = JSON.parse(raw);
    } catch {}

    const result: DailyActivityStat[] = [];
    const now = new Date();

    // Check if we need to initialize realistic seed listening history for past 30 days if empty
    const hasAnyRealData = Object.keys(rawData).length > 0;
    if (!hasAnyRealData) {
      // Seed initial simulated listening activity distributed over past 30 days
      const seeded: Record<string, { seconds: number; stationIds: string[] }> = {};
      for (let i = daysCount - 1; i >= 0; i--) {
         const d = new Date(now);
         d.setDate(d.getDate() - i);
         const dateStr = d.toISOString().split('T')[0];
         const dayOfWeek = d.getDay();
         const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
         const baseMins = isWeekend ? 35 : 20;
         const variance = ((i * 17) % 30) - 10;
         const minutes = Math.max(0, baseMins + variance + (i % 4 === 0 ? 25 : 0));
        
         if (minutes > 5) {
           seeded[dateStr] = {
             seconds: minutes * 60,
             stationIds: [`seed_station_${(i % 5) + 1}`, `seed_station_${((i + 2) % 5) + 1}`]
           };
         }
      }
      try {
        safeStorage.setItem(STORAGE_KEYS.DAILY_LISTENING, JSON.stringify(seeded));
        rawData = seeded;
      } catch {}
    }

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = rawData[dateStr];
      const totalSec = entry ? entry.seconds : 0;
      const minutes = Math.round(totalSec / 60);
      const stationCount = entry ? (entry.stationIds?.length || 1) : 0;

      // Calculate activity intensity level (0 to 4)
      let level = 0;
      if (minutes > 0 && minutes <= 15) level = 1;
      else if (minutes > 15 && minutes <= 40) level = 2;
      else if (minutes > 40 && minutes <= 80) level = 3;
      else if (minutes > 80) level = 4;

      result.push({
        date: dateStr,
        displayDate: `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`,
        dayOfWeek: DAYS_SHORT[d.getDay()],
        minutes,
        stationCount: minutes > 0 ? Math.max(1, stationCount) : 0,
        level
      });
    }

    return result;
  },

  addListeningTime(seconds: number, stationId?: string): void {
    const stats = this.getUserStats();
    stats.totalListeningTimeSec += seconds;
    this.saveUserStats(stats);
    this.recordDailyListening(seconds, stationId);
  },

  getDataSaverBitrate(): string {
    try {
      return safeStorage.getItem(STORAGE_KEYS.DATA_SAVER_BITRATE) || 'auto';
    } catch {
      return 'auto';
    }
  },

  setDataSaverBitrate(bitrate: string): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.DATA_SAVER_BITRATE, bitrate);
    } catch (e) {
      console.error('Failed to save data saver bitrate:', e);
    }
  },

  // Estimated Data Usage Tracker
  getEstimatedDataUsage(bitrateKbps: number = 128): { totalMB: number; totalGB: number; formatted: string; totalSec: number } {
    const stats = this.getUserStats();
    const totalSec = stats.totalListeningTimeSec || 0;
    const bytes = (totalSec * bitrateKbps * 1000) / 8;
    const totalMB = bytes / (1024 * 1024);
    const totalGB = totalMB / 1024;
    const formatted = totalGB >= 1.0 ? `${totalGB.toFixed(2)} GB` : `${totalMB.toFixed(1)} MB`;
    return { totalMB, totalGB, formatted, totalSec };
  },

  resetListeningStats(): void {
    const stats = this.getUserStats();
    stats.totalListeningTimeSec = 0;
    this.saveUserStats(stats);
    try {
      safeStorage.removeItem(STORAGE_KEYS.DAILY_LISTENING);
    } catch {}
  },

  // Gesture Customization Configuration
  getGestureConfig(): GestureConfig {
    const defaultConfig: GestureConfig = {
      swipeLeft: 'next_station',
      swipeRight: 'prev_station',
      swipeUp: 'toggle_favorite',
      swipeDown: 'close_player'
    };
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.GESTURE_CONFIG);
      if (data) {
        return { ...defaultConfig, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Error reading gesture config:', e);
    }
    return defaultConfig;
  },

  saveGestureConfig(config: GestureConfig): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.GESTURE_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save gesture config:', e);
    }
  },

  // Custom Visualizer Accent Colors
  getVisualizerCustomColors(): VisualizerCustomColors {
    const defaultColors: VisualizerCustomColors = {
      primaryColor: '#06b6d4',
      secondaryColor: '#a855f7'
    };
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.VISUALIZER_CUSTOM_COLORS);
      if (data) {
        return { ...defaultColors, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Error reading visualizer custom colors:', e);
    }
    return defaultColors;
  },

  saveVisualizerCustomColors(colors: VisualizerCustomColors): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.VISUALIZER_CUSTOM_COLORS, JSON.stringify(colors));
    } catch (e) {
      console.error('Failed to save visualizer custom colors:', e);
    }
  },

  // Night Mode Volume Dynamics
  getNightMode(): boolean {
    try {
      return safeStorage.getItem(STORAGE_KEYS.NIGHT_MODE) === 'true';
    } catch {
      return false;
    }
  },

  saveNightMode(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.NIGHT_MODE, enabled ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to save night mode state:', e);
    }
  },

  // Recent Search Queries Storage
  getRecentSearchQueries(): string[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.RECENT_SEARCH_QUERIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSearchQuery(query: string): void {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    try {
      const current = this.getRecentSearchQueries();
      const filtered = current.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10);
      safeStorage.setItem(STORAGE_KEYS.RECENT_SEARCH_QUERIES, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save search query:', e);
    }
  },

  deleteRecentSearchQuery(queryToDelete: string): void {
    try {
      const current = this.getRecentSearchQueries();
      const updated = current.filter(q => q.toLowerCase() !== queryToDelete.toLowerCase());
      safeStorage.setItem(STORAGE_KEYS.RECENT_SEARCH_QUERIES, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete search query:', e);
    }
  },

  clearRecentSearchQueries(): void {
    try {
      safeStorage.removeItem(STORAGE_KEYS.RECENT_SEARCH_QUERIES);
    } catch {}
  },

  // CSV Export for Last 50 Listened-To Stations
  exportListenHistoryCSV(): void {
    try {
      const recents = this.getRecents();
      const top50 = recents.slice(0, 50);

      const headers = ['Station ID', 'Station Name', 'Genre', 'Country', 'Country Code', 'Bitrate', 'Codec', 'Stream URL', 'Last Listened Timestamp'];
      const rows = top50.map(st => [
        `"${st.id.replace(/"/g, '""')}"`,
        `"${(st.name || '').replace(/"/g, '""')}"`,
        `"${(st.genre || '').replace(/"/g, '""')}"`,
        `"${(st.country || '').replace(/"/g, '""')}"`,
        `"${(st.countryCode || '').replace(/"/g, '""')}"`,
        `"${(st.bitrate || '').replace(/"/g, '""')}"`,
        `"${(st.codec || '').replace(/"/g, '""')}"`,
        `"${(st.streamUrl || '').replace(/"/g, '""')}"`,
        st.lastListenedTimestamp ? `"${new Date(st.lastListenedTimestamp).toISOString()}"` : '""'
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `neotune_listen_history_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export listen history CSV:', e);
    }
  },

  // Auto-Crossfade preference
  getAutoCrossfadeEnabled(): boolean {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.AUTO_CROSSFADE_ENABLED);
      return val !== 'false';
    } catch {
      return true;
    }
  },

  setAutoCrossfadeEnabled(enabled: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.AUTO_CROSSFADE_ENABLED, String(enabled));
    } catch {}
  },

  // Custom Wake Sound Upload File
  getCustomWakeSound(): { url: string; name: string } | null {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.CUSTOM_WAKE_SOUND);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setCustomWakeSound(sound: { url: string; name: string } | null): void {
    try {
      if (sound) {
        safeStorage.setItem(STORAGE_KEYS.CUSTOM_WAKE_SOUND, JSON.stringify(sound));
      } else {
        safeStorage.removeItem(STORAGE_KEYS.CUSTOM_WAKE_SOUND);
      }
    } catch {}
  },

  // Unstable Stations Pre-Caching Tracker
  getUnstableStations(): string[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.UNSTABLE_STATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addUnstableStation(stationId: string): void {
    try {
      const list = this.getUnstableStations();
      if (!list.includes(stationId)) {
        const updated = [...list, stationId].slice(-20);
        safeStorage.setItem(STORAGE_KEYS.UNSTABLE_STATIONS, JSON.stringify(updated));
      }
    } catch {}
  },

  // Time-Based Mood Intelligence
  getTimeBasedMoodInfo(): {
    title: string;
    tag: string;
    icon: string;
    description: string;
    keywords: string[];
    timeSlot: string;
  } {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        title: 'Energizing Morning',
        tag: 'Energizing',
        icon: '☀️',
        description: 'Uplifting rhythms, morning news, and upbeat energy to kickstart your day',
        keywords: ['pop', 'rock', 'news', 'dance', 'hits', 'upbeat', 'morning', 'top 40'],
        timeSlot: 'Morning (5 AM - 12 PM)'
      };
    } else if (hour >= 12 && hour < 18) {
      return {
        title: 'Focus & Productivity',
        tag: 'Focus',
        icon: '⚡',
        description: 'Smooth jazz, lofi beats, and classical harmony for deep work focus',
        keywords: ['jazz', 'lofi', 'focus', 'classical', 'ambient', 'chill', 'lounge', 'instrumental'],
        timeSlot: 'Afternoon (12 PM - 6 PM)'
      };
    } else if (hour >= 18 && hour < 23) {
      return {
        title: 'Relaxing Evening',
        tag: 'Relaxing',
        icon: '🌆',
        description: 'Unwind with mellow acoustic, smooth soul, chill lounge, and evening talk',
        keywords: ['chill', 'lounge', 'ambient', 'acoustic', 'soul', 'smooth', 'indie', 'talk'],
        timeSlot: 'Evening (6 PM - 11 PM)'
      };
    } else {
      return {
        title: 'Night Ambient & Sleep',
        tag: 'Sleep',
        icon: '🌙',
        description: 'Deep sleep soundscapes, nocturnal classical, and ambient drone for rest',
        keywords: ['sleep', 'ambient', 'piano', 'nature', 'rain', 'drone', 'meditation', 'soothing'],
        timeSlot: 'Late Night (11 PM - 5 AM)'
      };
    }
  },

  // Dynamic Genre Affinity Distribution Data for Recharts Donut Chart
  getGenreAffinityData(): Array<{ name: string; value: number; color: string; count: number }> {
    const recents = this.getRecents();
    const genreCounts: Record<string, number> = {
      'Pop & Hits': 0,
      'Jazz & Blues': 0,
      'Ambient & Chill': 0,
      'News & Talk': 0,
      'Classical': 0,
      'Rock & Metal': 0,
      'Electronic & EDM': 0
    };

    const colorMap: Record<string, string> = {
      'Pop & Hits': '#ec4899',
      'Jazz & Blues': '#f59e0b',
      'Ambient & Chill': '#6366f1',
      'News & Talk': '#06b6d4',
      'Classical': '#10b981',
      'Rock & Metal': '#ef4444',
      'Electronic & EDM': '#8b5cf6'
    };

    recents.forEach(st => {
      const txt = ((st.genre || '') + ' ' + (st.customTags || []).join(' ') + ' ' + (st.name || '')).toLowerCase();
      if (txt.includes('jazz') || txt.includes('blues') || txt.includes('swing')) {
        genreCounts['Jazz & Blues'] += 1;
      } else if (txt.includes('ambient') || txt.includes('chill') || txt.includes('lofi') || txt.includes('lounge') || txt.includes('relax')) {
        genreCounts['Ambient & Chill'] += 1;
      } else if (txt.includes('news') || txt.includes('talk') || txt.includes('speech') || txt.includes('podcast')) {
        genreCounts['News & Talk'] += 1;
      } else if (txt.includes('classical') || txt.includes('symphony') || txt.includes('orchestra')) {
        genreCounts['Classical'] += 1;
      } else if (txt.includes('rock') || txt.includes('metal') || txt.includes('guitar') || txt.includes('indie')) {
        genreCounts['Rock & Metal'] += 1;
      } else if (txt.includes('electronic') || txt.includes('edm') || txt.includes('dance') || txt.includes('house') || txt.includes('techno')) {
        genreCounts['Electronic & EDM'] += 1;
      } else {
        genreCounts['Pop & Hits'] += 1;
      }
    });

    const total = Object.values(genreCounts).reduce((a, b) => a + b, 0);

    // If history is small, add baseline distribution so chart is always beautiful
    if (total === 0) {
      return [
        { name: 'Ambient & Chill', value: 30, count: 12, color: '#6366f1' },
        { name: 'Jazz & Blues', value: 22, count: 9, color: '#f59e0b' },
        { name: 'Pop & Hits', value: 18, count: 7, color: '#ec4899' },
        { name: 'News & Talk', value: 15, count: 6, color: '#06b6d4' },
        { name: 'Rock & Metal', value: 15, count: 6, color: '#ef4444' }
      ];
    }

    const result = Object.entries(genreCounts)
      .filter(([, cnt]) => cnt > 0)
      .map(([name, cnt]) => ({
        name,
        count: cnt,
        value: Math.round((cnt / total) * 100),
        color: colorMap[name] || '#94a3b8'
      }))
      .sort((a, b) => b.value - a.value);

    return result;
  },

  getWeeklyHabitSummary(): {
    consecutiveDays: number;
    totalListeningHours: number;
    daysActiveCount: number;
    weeklyGoalMetPercentage: number;
  } {
    const stats30 = this.getDailyListeningStats(30);
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let rawData: Record<string, { seconds: number; stationIds: string[] }> = {};
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.DAILY_LISTENING);
      if (raw) rawData = JSON.parse(raw);
    } catch {}

    // Sort dates descending
    const datesWithListening = Object.entries(rawData)
      .filter(([, v]) => v.seconds > 10)
      .map(([date]) => date)
      .sort((a, b) => b.localeCompare(a));

    let streak = 0;
    if (datesWithListening.length > 0) {
      const mostRecentDate = datesWithListening[0];
      const isStreakActive = mostRecentDate === todayStr || mostRecentDate === yesterdayStr;
      
      if (isStreakActive) {
        streak = 1;
        const currentDate = new Date(mostRecentDate);
        while (true) {
          currentDate.setDate(currentDate.getDate() - 1);
          const prevDateStr = currentDate.toISOString().split('T')[0];
          if (datesWithListening.includes(prevDateStr)) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    const weeklyStats = stats30.slice(-7);
    const totalWeeklySeconds = weeklyStats.reduce((sum, item) => {
      const entry = rawData[item.date];
      return sum + (entry ? entry.seconds : 0);
    }, 0);

    const totalListeningHours = Number((totalWeeklySeconds / 3600).toFixed(1));
    const daysActiveCount = weeklyStats.filter(item => item.minutes > 0).length;

    const weeklyGoalHours = 5;
    const weeklyGoalMetPercentage = Math.min(100, Math.max(15, Math.round((totalListeningHours / weeklyGoalHours) * 100)));

    return {
      consecutiveDays: streak || 4, // Seed fallback
      totalListeningHours: totalListeningHours || 3.4, // Seed fallback
      daysActiveCount: daysActiveCount || 5, // Seed fallback
      weeklyGoalMetPercentage: weeklyGoalMetPercentage || 68
    };
  },

  // -------------------------------------------------------------
  // UI SECTION EXPANSION & ACCORDION PERSISTENCE
  // -------------------------------------------------------------
  getSectionExpanded(sectionId: string, defaultVal: boolean = true): boolean {
    try {
      // 1. Check direct individual key for legacy / direct access
      const individualKey = `neotune_section_${sectionId}_expanded`;
      const individualVal = safeStorage.getItem(individualKey);
      if (individualVal !== null) {
        return individualVal === 'true';
      }

      // 2. Check JSON state map
      const mapRaw = safeStorage.getItem(STORAGE_KEYS.SECTION_EXPANDED_STATES);
      if (mapRaw) {
        const parsed = JSON.parse(mapRaw);
        if (typeof parsed[sectionId] === 'boolean') {
          return parsed[sectionId];
        }
      }

      // 3. Fallback
      return defaultVal;
    } catch {
      return defaultVal;
    }
  },

  setSectionExpanded(sectionId: string, isExpanded: boolean): void {
    try {
      const individualKey = `neotune_section_${sectionId}_expanded`;
      safeStorage.setItem(individualKey, String(isExpanded));

      // Update the JSON map as well for batch queries
      let currentMap: Record<string, boolean> = {};
      const mapRaw = safeStorage.getItem(STORAGE_KEYS.SECTION_EXPANDED_STATES);
      if (mapRaw) {
        try {
          currentMap = JSON.parse(mapRaw);
        } catch {}
      }
      currentMap[sectionId] = isExpanded;
      safeStorage.setItem(STORAGE_KEYS.SECTION_EXPANDED_STATES, JSON.stringify(currentMap));
    } catch (e) {
      console.warn('Failed to save section expanded state', e);
    }
  },

  getActiveAccordionSection(defaultSection: string | null = 'recent'): string | null {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.ACTIVE_ACCORDION_SECTION);
      if (saved !== null) {
        if (saved === '__none__' || saved === '') return null;
        return saved;
      }
      // If no explicit single accordion section is saved yet, find first expanded section
      const candidates = ['queue', 'recent', 'custom', 'map'];
      for (const key of candidates) {
        const val = safeStorage.getItem(`neotune_section_${key}_expanded`);
        if (val === 'true') {
          return key;
        }
      }
      return defaultSection;
    } catch {
      return defaultSection;
    }
  },

  setActiveAccordionSection(activeSectionId: string | null): void {
    try {
      safeStorage.setItem(
        STORAGE_KEYS.ACTIVE_ACCORDION_SECTION,
        activeSectionId ? activeSectionId : '__none__'
      );

      // Sync all known sections accordingly so individual getters stay in sync
      const allSections = ['queue', 'recent', 'custom', 'map'];
      const map: Record<string, boolean> = {};
      allSections.forEach((sec) => {
        const isExpanded = activeSectionId === sec;
        map[sec] = isExpanded;
        safeStorage.setItem(`neotune_section_${sec}_expanded`, String(isExpanded));
      });
      safeStorage.setItem(STORAGE_KEYS.SECTION_EXPANDED_STATES, JSON.stringify(map));
    } catch (e) {
      console.warn('Failed to save active accordion section', e);
    }
  },

  // -------------------------------------------------------------
  // SMART DONATION & SATISFACTION ENGINE
  // -------------------------------------------------------------
  _supporterListeners: new Set<(isSupporter: boolean) => void>(),

  subscribeSupporter(cb: (isSupporter: boolean) => void): () => void {
    this._supporterListeners.add(cb);
    cb(this.getIsSupporter());
    return () => {
      this._supporterListeners.delete(cb);
    };
  },

  notifySupporter(): void {
    const supporter = this.getIsSupporter();
    this._supporterListeners.forEach(cb => {
      try { cb(supporter); } catch {}
    });
  },

  getIsSupporter(): boolean {
    try {
      return safeStorage.getItem(STORAGE_KEYS.DONATION_IS_SUPPORTER) === 'true';
    } catch {
      return false;
    }
  },

  setIsSupporter(isSupporter: boolean): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.DONATION_IS_SUPPORTER, String(isSupporter));
      this.notifySupporter();
    } catch {}
  },

  getFirstInstallTimestamp(): number {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.FIRST_INSTALL_TIMESTAMP);
      if (val) return parseInt(val, 10);
      const now = Date.now();
      safeStorage.setItem(STORAGE_KEYS.FIRST_INSTALL_TIMESTAMP, String(now));
      return now;
    } catch {
      return Date.now();
    }
  },

  getDaysSinceInstall(): number {
    const installTime = this.getFirstInstallTimestamp();
    const diffMs = Date.now() - installTime;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  },

  getCoreOperationsCount(): number {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.DONATION_OPS_COUNT);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  },

  incrementCoreOperations(): { newCount: number; milestoneHit: 10 | 25 | 50 | null } {
    const current = this.getCoreOperationsCount();
    const newCount = current + 1;
    try {
      safeStorage.setItem(STORAGE_KEYS.DONATION_OPS_COUNT, String(newCount));
    } catch {}

    let milestoneHit: 10 | 25 | 50 | null = null;
    if (newCount === 10 || newCount === 25 || newCount === 50) {
      milestoneHit = newCount as 10 | 25 | 50;
    }

    return { newCount, milestoneHit };
  },

  getBannerDismissedTimestamp(): number | null {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.DONATION_BANNER_DISMISSED_AT);
      return val ? parseInt(val, 10) : null;
    } catch {
      return null;
    }
  },

  dismissDonationBanner(): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.DONATION_BANNER_DISMISSED_AT, String(Date.now()));
    } catch {}
  },

  getAutoPromptLastShownTimestamp(): number | null {
    try {
      const val = safeStorage.getItem(STORAGE_KEYS.DONATION_AUTO_PROMPT_SHOWN_AT);
      return val ? parseInt(val, 10) : null;
    } catch {
      return null;
    }
  },

  recordAutoPromptShown(): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.DONATION_AUTO_PROMPT_SHOWN_AT, String(Date.now()));
    } catch {}
  },

  shouldShowHomeDonationBanner(): boolean {
    if (this.getIsSupporter()) return false;
    if (this.getCoreOperationsCount() < 3) return false;
    if (this.getUserStats().sessionCount < 3) return false;
    if (this.getDaysSinceInstall() < 2) return false;

    const dismissedAt = this.getBannerDismissedTimestamp();
    if (dismissedAt) {
      const FourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < FourteenDaysMs) return false;
    }
    return true;
  },

  shouldTriggerAutoPromptModal(): boolean {
    if (this.getIsSupporter()) return false;
    if (this.getCoreOperationsCount() < 7) return false;
    if (this.getDaysSinceInstall() < 2) return false;

    const lastShownAt = this.getAutoPromptLastShownTimestamp();
    if (lastShownAt) {
      const ThirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - lastShownAt < ThirtyDaysMs) return false;
    }
    return true;
  }
};

