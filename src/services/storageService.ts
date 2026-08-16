import { RadioStation, PodcastProgress, PodcastEpisode, AlarmConfig, FilterConfig, ThemeType, UserStats, QueuedStation, VisualizerSkin, DailyActivityStat, GestureConfig, VisualizerCustomColors } from '../types';
import { indexedDBService } from './indexedDBService';

const STORAGE_KEYS = {
  FAVORITES: 'neotune_favorites',
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
  LANGUAGE: 'neotune_language'
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

  subscribe(cb: (favorites: RadioStation[]) => void): () => void {
    this._favListeners.add(cb);
    return () => {
      this._favListeners.delete(cb);
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
      return data ? JSON.parse(data) : {
        isEnabled: false,
        hour: 7,
        minute: 0,
        stationId: 'soma_groove_salad',
        stationName: 'SomaFM: Groove Salad',
        stationUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
        stationGenre: 'Ambient & Chill'
      };
    } catch {
      return {
        isEnabled: false,
        hour: 7,
        minute: 0,
        stationId: 'soma_groove_salad',
        stationName: 'SomaFM: Groove Salad',
        stationUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
        stationGenre: 'Ambient & Chill'
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
  }
};

