import { RadioStation, PodcastShow, PodcastEpisode, CountryInfo, RemoteConfig } from '../types';

const API_CACHE_PREFIX = 'neotune_api_cache_';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCachedItem<T>(key: string, maxAgeMs: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(API_CACHE_PREFIX + key);
    if (!item) return null;
    const entry: CacheEntry<T> = JSON.parse(item);
    if (Date.now() - entry.timestamp < maxAgeMs) {
      return entry.data;
    }
  } catch {}
  return null;
}

function setCachedItem<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(API_CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {}
}

export const apiService = {
  // 1. Search Radio Stations
  async searchRadioStations(params: {
    query?: string;
    tag?: string;
    country?: string;
    countrycode?: string;
    limit?: number;
    offset?: number;
    order?: 'clickcount' | 'votes' | 'changetimestamp' | 'name' | string;
    reverse?: boolean | string;
  }, forceFresh: boolean = false): Promise<{ count: number; stations: RadioStation[] }> {
    const cacheKey = `stations_${JSON.stringify(params)}`;
    if (!forceFresh) {
      const cached = getCachedItem<{ count: number; stations: RadioStation[] }>(cacheKey, 10 * 60 * 1000); // 10 min cache
      if (cached) {
        // Trigger background update to keep it fresh (Stale-While-Revalidate pattern)
        apiService.fetchAndCacheStations(params, cacheKey).catch(() => {});
        return cached;
      }
    }

    return apiService.fetchAndCacheStations(params, cacheKey);
  },

  async fetchAndCacheStations(params: any, cacheKey: string) {
    try {
      const urlParams = new URLSearchParams();
      if (params.query) urlParams.set('name', params.query);
      if (params.tag) urlParams.set('tag', params.tag);
      if (params.country) urlParams.set('country', params.country);
      if (params.countrycode) urlParams.set('countrycode', params.countrycode);
      if (params.order) urlParams.set('order', params.order);
      if (params.reverse !== undefined) urlParams.set('reverse', String(params.reverse));
      urlParams.set('limit', String(params.limit || 40));
      urlParams.set('offset', String(params.offset || 0));

      const res = await fetch(`/api/radio/search?${urlParams.toString()}`);
      if (!res.ok) throw new Error('API search failed');
      const data = await res.json();
      const result = { count: data.count || (data.stations ? data.stations.length : 0), stations: data.stations || [] };
      setCachedItem(cacheKey, result);
      return result;
    } catch (e) {
      console.warn('Radio search network error, returning curated fallback', e);
      return { count: 0, stations: [] };
    }
  },

  // 1.5 Fetch Station by ID / Deep-Link UUID
  async getStationById(stationId: string): Promise<RadioStation | null> {
    if (!stationId) return null;
    const cacheKey = `station_${stationId}`;
    const cached = getCachedItem<RadioStation>(cacheKey, 30 * 60 * 1000); // 30 min cache
    if (cached) return cached;

    try {
      const res = await fetch(`/api/radio/byid?id=${encodeURIComponent(stationId)}`);
      if (res.ok) {
        const data = await res.json();
        const station = data.station || null;
        if (station) {
          setCachedItem(cacheKey, station);
        }
        return station;
      }
    } catch (e) {
      console.warn('Failed to fetch station by id:', e);
    }
    return null;
  },

  // 1.8 Fetch Global Trending Stations (Highest Listenership Growth)
  async getTrendingStations(limit: number = 20, forceFresh: boolean = false): Promise<RadioStation[]> {
    const cacheKey = `trending_stations_${limit}`;
    if (!forceFresh) {
      const cached = getCachedItem<RadioStation[]>(cacheKey, 5 * 60 * 1000); // 5 min cache
      if (cached) {
        apiService.fetchAndCacheTrending(limit, cacheKey).catch(() => {});
        return cached;
      }
    }
    return apiService.fetchAndCacheTrending(limit, cacheKey);
  },

  async fetchAndCacheTrending(limit: number, cacheKey: string): Promise<RadioStation[]> {
    try {
      const res = await fetch(`/api/radio/trending?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch trending');
      const data = await res.json();
      const stations: RadioStation[] = data.stations || [];
      if (stations.length > 0) {
        setCachedItem(cacheKey, stations);
      }
      return stations;
    } catch (err) {
      console.warn('Trending stations fetch error:', err);
      return [];
    }
  },

  // 2. Fetch Countries list
  async getCountries(): Promise<CountryInfo[]> {
    const cacheKey = 'countries_list';
    const cached = getCachedItem<CountryInfo[]>(cacheKey, 24 * 60 * 60 * 1000); // 24 hours cache
    if (cached) {
      return cached;
    }

    try {
      const res = await fetch('/api/radio/countries');
      if (!res.ok) throw new Error('Failed to fetch countries');
      const data = await res.json();
      const countries = data.countries || [];
      setCachedItem(cacheKey, countries);
      return countries;
    } catch {
      return [
        { name: 'United States', code: 'US', flag: '🇺🇸', stationCount: 4820 },
        { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', stationCount: 3150 },
        { name: 'Germany', code: 'DE', flag: '🇩🇪', stationCount: 2900 },
        { name: 'France', code: 'FR', flag: '🇫🇷', stationCount: 2100 },
        { name: 'Canada', code: 'CA', flag: '🇨🇦', stationCount: 1850 },
        { name: 'Japan', code: 'JP', flag: '🇯🇵', stationCount: 1420 },
        { name: 'Spain', code: 'ES', flag: '🇪🇸', stationCount: 1380 },
        { name: 'Italy', code: 'IT', flag: '🇮🇹', stationCount: 1250 },
        { name: 'Australia', code: 'AU', flag: '🇦🇺', stationCount: 990 },
        { name: 'Brazil', code: 'BR', flag: '🇧🇷', stationCount: 880 },
        { name: 'Vietnam', code: 'VN', flag: '🇻🇳', stationCount: 420 },
      ];
    }
  },

  // 3. Search Podcasts via Apple iTunes Search
  async searchPodcasts(term: string = 'technology', country: string = 'US'): Promise<PodcastShow[]> {
    const cacheKey = `podcasts_${term}_${country}`;
    const cached = getCachedItem<PodcastShow[]>(cacheKey, 30 * 60 * 1000); // 30 mins cache
    if (cached) {
      apiService.fetchAndCachePodcasts(term, country, cacheKey).catch(() => {});
      return cached;
    }

    return apiService.fetchAndCachePodcasts(term, country, cacheKey);
  },

  async fetchAndCachePodcasts(term: string, country: string, cacheKey: string) {
    try {
      const res = await fetch(`/api/podcast/search?term=${encodeURIComponent(term)}&country=${country}&limit=30`);
      if (!res.ok) throw new Error('Podcast search failed');
      const data = await res.json();
      const podcasts = data.podcasts || [];
      setCachedItem(cacheKey, podcasts);
      return podcasts;
    } catch (e) {
      console.warn('Podcast search error:', e);
      return [];
    }
  },

  // 4. Fetch Podcast RSS Episodes
  async getPodcastEpisodes(feedUrl: string, showId: string): Promise<PodcastEpisode[]> {
    const cacheKey = `episodes_${showId}`;
    const cached = getCachedItem<PodcastEpisode[]>(cacheKey, 60 * 60 * 1000); // 1 hour cache
    if (cached) {
      apiService.fetchAndCacheEpisodes(feedUrl, showId, cacheKey).catch(() => {});
      return cached;
    }

    return apiService.fetchAndCacheEpisodes(feedUrl, showId, cacheKey);
  },

  async fetchAndCacheEpisodes(feedUrl: string, showId: string, cacheKey: string) {
    try {
      const res = await fetch(`/api/podcast/rss?url=${encodeURIComponent(feedUrl)}&showId=${encodeURIComponent(showId)}`);
      if (!res.ok) throw new Error('Failed to parse podcast RSS');
      const data = await res.json();
      const episodes = data.episodes || [];
      setCachedItem(cacheKey, episodes);
      return episodes;
    } catch (e) {
      console.error('Failed to get podcast episodes:', e);
      return [];
    }
  },

  // 5. Stream resolver & auto-healing
  async resolveStreamUrl(rawUrl: string): Promise<{ streamUrl: string; fallbackUrl?: string }> {
    try {
      const res = await fetch(`/api/stream/resolve?url=${encodeURIComponent(rawUrl)}`);
      if (res.ok) {
        const data = await res.json();
        return {
          streamUrl: data.resolvedUrl || rawUrl,
          fallbackUrl: data.fallbackUrl
        };
      }
    } catch {}
    return { streamUrl: rawUrl };
  },

  // 6. Remote config
  async getRemoteConfig(): Promise<RemoteConfig> {
    try {
      const res = await fetch('/api/remote-config');
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return {
      ads_enabled: false,
      auto_quality_adaptive: true,
      min_buffer_ms_cellular: 20000,
      max_buffer_ms_cellular: 60000,
      show_network_quality_badge: true,
      latest_version_name: '3.1.0',
      update_notes: 'Real-time 8-band audio visualizer, 5-band EQ presets & Car Mode!'
    };
  },

  // Cache Management Methods
  getCacheDetails(): { key: string; name: string; sizeBytes: number; type: 'station' | 'podcast' | 'episodes' | 'countries' | 'unknown' }[] {
    if (typeof window === 'undefined') return [];
    const cacheItems: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(API_CACHE_PREFIX)) {
          const rawKey = fullKey.substring(API_CACHE_PREFIX.length);
          const item = localStorage.getItem(fullKey);
          if (!item) continue;
          
          let friendlyName = rawKey;
          let type: 'station' | 'podcast' | 'episodes' | 'countries' | 'unknown' = 'unknown';

          if (rawKey.startsWith('stations_')) {
            const paramsStr = rawKey.substring('stations_'.length);
            try {
              const params = JSON.parse(paramsStr);
              friendlyName = `Stations Search: "${params.query || params.tag || 'all'}"`;
            } catch {
              friendlyName = 'Stations Search Query';
            }
            type = 'station';
          } else if (rawKey.startsWith('station_')) {
            friendlyName = `Station Meta Info (ID: ${rawKey.replace('station_', '')})`;
            type = 'station';
          } else if (rawKey.startsWith('podcasts_')) {
            friendlyName = `Podcasts Search list`;
            type = 'podcast';
          } else if (rawKey.startsWith('episodes_')) {
            friendlyName = `Podcast RSS Episodes Feed`;
            type = 'episodes';
          } else if (rawKey === 'countries_list') {
            friendlyName = 'List of Countries';
            type = 'countries';
          }

          cacheItems.push({
            key: rawKey,
            name: friendlyName,
            sizeBytes: item.length * 2, // UTF-16 characters byte size approximation
            type
          });
        }
      }
    } catch {}
    return cacheItems;
  },

  clearCacheItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(API_CACHE_PREFIX + key);
  },

  clearAllCache(): void {
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(API_CACHE_PREFIX)) {
          keysToRemove.push(fullKey);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
};
