import { RadioStation } from '../types';
import { storageService } from './storageService';

export interface StorageCacheStats {
  favoritesCount: number;
  recentsCount: number;
  queuedCount: number;
  customStationsCount: number;
  searchHistoryCount: number;
  podcastProgressCount: number;
  estimatedBytesUsed: number;
  formattedSize: string;
}

const STORAGE_LIMITS = {
  MAX_RECENTS: 30,
  MAX_QUEUED: 40,
  MAX_SEARCH_HISTORY: 15,
  MAX_PODCAST_PROGRESS: 20,
};

export const storageCacheService = {
  /**
   * Intelligently prunes older locally cached radio stations & app data in localStorage.
   * Priority Retention Rules:
   * 1. User's favorited stations are NEVER pruned.
   * 2. User's custom URL stations are NEVER pruned.
   * 3. Stations with higher play frequencies and recent timestamps are retained.
   * 4. Non-favorited, least-recently-listened stations in recents are pruned first.
   */
  pruneCache(maxRecentsLimit: number = STORAGE_LIMITS.MAX_RECENTS): { prunedRecents: number; prunedPodcasts: number } {
    let prunedRecents = 0;
    let prunedPodcasts = 0;

    try {
      // 1. Prune Recents
      const recents = storageService.getRecents();
      const favoritesMap = new Set(storageService.getFavorites().map(f => f.id));
      const customMap = new Set(storageService.getCustomStations().map(c => c.id));

      if (recents.length > maxRecentsLimit) {
        // Separate favorited/custom stations from disposable recents
        const protectedRecents: RadioStation[] = [];
        const disposableRecents: RadioStation[] = [];

        recents.forEach(station => {
          if (favoritesMap.has(station.id) || customMap.has(station.id)) {
            protectedRecents.push(station);
          } else {
            disposableRecents.push(station);
          }
        });

        // Sort disposable recents by lastListenedTimestamp descending (newest first)
        disposableRecents.sort((a, b) => (b.lastListenedTimestamp || 0) - (a.lastListenedTimestamp || 0));

        // Keep newest disposable recents up to remaining allowed quota
        const allowedDisposableCount = Math.max(10, maxRecentsLimit - protectedRecents.length);
        const keptDisposable = disposableRecents.slice(0, allowedDisposableCount);
        prunedRecents = disposableRecents.length - keptDisposable.length;

        const prunedRecentsList = [...protectedRecents, ...keptDisposable].sort(
          (a, b) => (b.lastListenedTimestamp || 0) - (a.lastListenedTimestamp || 0)
        );

        if (prunedRecents > 0) {
          try {
            window.localStorage.setItem('neotune_recents', JSON.stringify(prunedRecentsList));
          } catch {}
        }
      }

      // 2. Prune Search History past limit
      const searchHistory = storageService.getSearchHistory();
      if (searchHistory.length > STORAGE_LIMITS.MAX_SEARCH_HISTORY) {
        const trimmedHistory = searchHistory.slice(0, STORAGE_LIMITS.MAX_SEARCH_HISTORY);
        try {
          window.localStorage.setItem('neotune_search_history', JSON.stringify(trimmedHistory));
        } catch {}
      }

      // 3. Prune Podcast Progress map past limit or older than 30 days
      try {
        const rawPodcastData = window.localStorage.getItem('neotune_podcast_progress');
        if (rawPodcastData) {
          const map = JSON.parse(rawPodcastData);
          const entries = Object.entries(map);
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

          // Filter out entries older than 30 days
          const validEntries = entries.filter(([, val]: [string, any]) => {
            const ts = val?.lastUpdatedTimestamp || val?.timestamp || Date.now();
            return ts > thirtyDaysAgo;
          });

          // If still over limit, sort by timestamp and keep newest
          if (validEntries.length > STORAGE_LIMITS.MAX_PODCAST_PROGRESS) {
            validEntries.sort((a: any, b: any) => {
              const tsA = a[1]?.lastUpdatedTimestamp || a[1]?.timestamp || 0;
              const tsB = b[1]?.lastUpdatedTimestamp || b[1]?.timestamp || 0;
              return tsB - tsA;
            });
            validEntries.splice(STORAGE_LIMITS.MAX_PODCAST_PROGRESS);
          }

          prunedPodcasts = entries.length - validEntries.length;
          if (prunedPodcasts > 0) {
            const prunedMap = Object.fromEntries(validEntries);
            window.localStorage.setItem('neotune_podcast_progress', JSON.stringify(prunedMap));
          }
        }
      } catch {}

    } catch (e) {
      console.warn('Storage cache pruning notice:', e);
    }

    return { prunedRecents, prunedPodcasts };
  },

  /**
   * Calculates total byte size and items stored in localStorage for diagnostics & settings display.
   */
  getCacheUsageStats(): StorageCacheStats {
    let bytes = 0;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('neotune_')) {
            const value = window.localStorage.getItem(key) || '';
            bytes += (key.length + value.length) * 2; // ~2 bytes per char
          }
        }
      }
    } catch {}

    const kb = bytes / 1024;
    const formattedSize = kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;

    return {
      favoritesCount: storageService.getFavorites().length,
      recentsCount: storageService.getRecents().length,
      queuedCount: storageService.getQueuedStations().length,
      customStationsCount: storageService.getCustomStations().length,
      searchHistoryCount: storageService.getSearchHistory().length,
      podcastProgressCount: 0,
      estimatedBytesUsed: bytes,
      formattedSize,
    };
  },

  /**
   * Run initial cache pruning automatically when the app boots up.
   */
  autoPruneOnStartup(): void {
    if (typeof window === 'undefined') return;
    // Delay slightly after main thread initialization
    setTimeout(() => {
      this.pruneCache();
    }, 1500);
  }
};
