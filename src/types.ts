export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  country: string;
  countryCode?: string;
  streamUrl: string;
  imageUrl: string;
  bitrate: string;
  codec: string;
  isFavorite: boolean;
  isCustom?: boolean;
  clickcount?: number;
  votes?: number;
  homepage?: string;
  lastListenedTimestamp?: number;
  customTags?: string[];
  dateAdded?: number;
}

export interface PodcastEpisode {
  id: string;
  showId: string;
  title: string;
  description: string;
  audioUrl: string;
  pubDate: string;
  durationMs: number;
  artworkUrl?: string;
}

export interface PodcastShow {
  id: string;
  name: string;
  genre: string;
  country: string;
  countryCode?: string;
  streamUrl: string;
  imageUrl: string;
  bitrate: string;
  codec: string;
  isFavorite: boolean;
  artistName: string;
  trackCount: number;
  feedUrl: string;
  releaseDate?: string;
}

export interface PodcastProgress {
  stationIdOrUrl: string;
  positionMs: number;
  durationMs: number;
  episodeTitle: string;
  lastPlayedTimestamp: number;
}

export interface EQPreset {
  name: string;
  band60Hz: number;   // dB
  band230Hz: number;  // dB
  band910Hz: number;  // dB
  band3600Hz: number; // dB
  band14000Hz: number;// dB
  preampGain: number; // dB
  isBooster?: boolean;
}

export interface AlarmConfig {
  isEnabled: boolean;
  hour: number;      // 0-23
  minute: number;    // 0-59
  stationId: string;
  stationName: string;
  stationUrl: string;
  stationGenre?: string;
  stationImageUrl?: string;
  days?: number[];   // 0 = Sun, 1 = Mon, ..., 6 = Sat
  fcmEnabled?: boolean;
  volume?: number;   // 0.1 - 1.0
  label?: string;
  announceWeather?: boolean;
  weatherCity?: string;
  temperatureUnit?: 'celsius' | 'fahrenheit';
  snoozeMinutes?: number;
  voiceMemoDataUrl?: string;
  voiceMemoDurationSec?: number;
  weatherRampEnabled?: boolean;
  weatherRampCondition?: 'clear' | 'rainy' | 'snowy' | 'cloudy' | 'any';
  useSystemChime?: boolean;
}

export type SyncState = 'synced' | 'syncing' | 'offline' | 'local' | 'error';

export interface SyncStatusInfo {
  state: SyncState;
  lastSyncTime: number;
  message: string;
  isRealtime: boolean;
  pendingCount?: number;
}

export interface DailyActivityStat {
  date: string;       // YYYY-MM-DD
  displayDate: string;// e.g. "Aug 14"
  dayOfWeek: string;  // e.g. "Fri"
  minutes: number;
  stationCount: number;
  level: number;      // 0 = none, 1 = low, 2 = medium, 3 = high, 4 = intense
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  syncedAt?: number;
}

export interface FilterConfig {
  filterAdultContent: boolean;
  filterPoliticsContent: boolean;
  filterReligiousContent: boolean;
  filterBrokenStreams: boolean;
  customBlockedKeywords: string[];
  blockedStationIds: string[];
}

export interface CountryInfo {
  name: string;
  code: string;
  flag: string;
  stationCount: number;
}

export interface RemoteConfig {
  ads_enabled: boolean;
  auto_quality_adaptive: boolean;
  min_buffer_ms_cellular: number;
  max_buffer_ms_cellular: number;
  show_network_quality_badge: boolean;
  latest_version_name: string;
  update_notes: string;
}

export type ThemeType = 'frosted-glass' | 'cyberpunk' | 'jazz' | 'rock' | 'oled' | 'daylight';

export type AppView = 'radio' | 'podcasts' | 'favorites' | 'settings';

export type DisplayMode = 'standard' | 'car' | 'screensaver' | 'tv';

export type VisualizerSkin = 'bars' | 'circular' | 'waveform' | 'dots' | 'dynamic' | 'auto' | 'cyberpunk' | 'vumeter' | 'cassette';

export interface QueuedStation extends RadioStation {
  queuedAt: number;
  syncStatus?: 'local' | 'synced';
}

export interface UserStats {
  sessionCount: number;
  totalListeningTimeSec: number;
  favoritesAddedCount: number;
  firstLaunchTimestamp: number;
  hasRated: boolean;
}

export interface ActivePlaybackSession {
  deviceId: string;
  deviceName: string;
  station: RadioStation;
  isPlaying: boolean;
  updatedAt: number;
}

export type GestureAction = 'next_station' | 'prev_station' | 'toggle_favorite' | 'toggle_play' | 'close_player' | 'none';

export interface GestureConfig {
  swipeLeft: GestureAction;
  swipeRight: GestureAction;
  swipeUp: GestureAction;
  swipeDown: GestureAction;
}

export interface VisualizerCustomColors {
  primaryColor: string;
  secondaryColor: string;
}

export interface StationChatMessage {
  id: string;
  stationId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: number;
}

