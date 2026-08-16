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

// Public Radio-Browser DNS Mirrors for client-side direct fallback
const RADIO_BROWSER_MIRRORS = [
  'https://de1.api.radio-browser.info/json',
  'https://nl1.api.radio-browser.info/json',
  'https://at1.api.radio-browser.info/json',
  'https://all.api.radio-browser.info/json',
];

// Pre-curated high-fidelity fallback stations (offline / zero-network fail-safe)
const CURATED_FALLBACK_STATIONS: RadioStation[] = [
  {
    id: 'soma_groove_salad',
    name: 'SomaFM: Groove Salad',
    genre: 'Ambient & Chill',
    country: 'United States',
    countryCode: 'US',
    streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    imageUrl: 'https://somafm.com/img/groovesalad120.png',
    bitrate: '128 kbps',
    codec: 'MP3',
    isFavorite: false,
    isCustom: false,
    clickcount: 99500,
    votes: 4200,
    homepage: 'https://somafm.com'
  },
  {
    id: 'soma_drone_zone',
    name: 'SomaFM: Drone Zone',
    genre: 'Ambient & Space',
    country: 'United States',
    countryCode: 'US',
    streamUrl: 'https://ice1.somafm.com/dronezone-128-mp3',
    imageUrl: 'https://somafm.com/img/dronezone120.png',
    bitrate: '128 kbps',
    codec: 'MP3',
    isFavorite: false,
    isCustom: false,
    clickcount: 88400,
    votes: 3900,
    homepage: 'https://somafm.com'
  },
  {
    id: 'bbc_radio_1',
    name: 'BBC Radio 1',
    genre: 'Pop & Top 40',
    country: 'United Kingdom',
    countryCode: 'GB',
    streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/BBC_Radio_1_2021.svg/300px-BBC_Radio_1_2021.svg.png',
    bitrate: '128 kbps',
    codec: 'AAC',
    isFavorite: false,
    isCustom: false,
    clickcount: 145000,
    votes: 8900,
    homepage: 'https://www.bbc.co.uk/radio1'
  },
  {
    id: 'kexp_seattle',
    name: 'KEXP 90.3 FM Seattle',
    genre: 'Eclectic & Indie Rock',
    country: 'United States',
    countryCode: 'US',
    streamUrl: 'https://kexp.streamguys1.com/kexp160.aac',
    imageUrl: 'https://kexp.org/static/assets/img/kexp-logo-square.png',
    bitrate: '160 kbps',
    codec: 'AAC',
    isFavorite: false,
    isCustom: false,
    clickcount: 132000,
    votes: 7500,
    homepage: 'https://kexp.org'
  },
  {
    id: 'ibiza_global_radio',
    name: 'Ibiza Global Radio',
    genre: 'Deep House & Tech',
    country: 'Spain',
    countryCode: 'ES',
    streamUrl: 'https://ibizaglobalradio.streaming-pro.com:8024/stream',
    imageUrl: 'https://ibizaglobalradio.com/wp-content/uploads/2021/04/igr-logo-white-back.png',
    bitrate: '128 kbps',
    codec: 'MP3',
    isFavorite: false,
    isCustom: false,
    clickcount: 94000,
    votes: 4900,
    homepage: 'https://ibizaglobalradio.com'
  },
  {
    id: 'jazz24_seattle',
    name: 'Jazz24 (KNKX)',
    genre: 'Smooth & Classic Jazz',
    country: 'United States',
    countryCode: 'US',
    streamUrl: 'https://knkx.streamguys1.com/jazz24-aac-128',
    imageUrl: 'https://www.jazz24.org/wp-content/uploads/2020/03/jazz24-logo-dark.png',
    bitrate: '128 kbps',
    codec: 'AAC',
    isFavorite: false,
    isCustom: false,
    clickcount: 87000,
    votes: 4300,
    homepage: 'https://www.jazz24.org'
  },
  {
    id: 'vov1_vietnam',
    name: 'VOV1 - Thời sự',
    genre: 'News & Talk',
    country: 'Vietnam',
    countryCode: 'VN',
    streamUrl: 'https://audio-lss.vov.vn/live/vov1.m3u8',
    imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=80',
    bitrate: '128 kbps',
    codec: 'AAC',
    isFavorite: false,
    isCustom: false,
    clickcount: 45000,
    votes: 1200,
    homepage: 'https://vov.gov.vn'
  },
  {
    id: 'vov3_vietnam',
    name: 'VOV3 - Âm nhạc Giải trí',
    genre: 'Music & Hits',
    country: 'Vietnam',
    countryCode: 'VN',
    streamUrl: 'https://audio-lss.vov.vn/live/vov3.m3u8',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=80',
    bitrate: '128 kbps',
    codec: 'AAC',
    isFavorite: false,
    isCustom: false,
    clickcount: 55000,
    votes: 1800,
    homepage: 'https://vov.gov.vn'
  }
];

function transformRawRBStation(item: any): RadioStation {
  const rawUrl = item.url_resolved || item.url || '';
  const cleanName = item.name?.trim() || 'Live Radio';
  return {
    id: item.stationuuid || `rb_${item.changeuuid || Math.random().toString(36).substring(2, 9)}`,
    name: cleanName,
    genre: item.tags ? item.tags.split(',').slice(0, 3).map((t: string) => t.trim()).filter(Boolean).join(', ') : 'Live Radio',
    country: item.country || 'Global',
    countryCode: item.countrycode || '',
    streamUrl: rawUrl,
    imageUrl: item.favicon || `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80`,
    bitrate: item.bitrate ? `${item.bitrate} kbps` : '128 kbps',
    codec: item.codec || 'MP3',
    isFavorite: false,
    isCustom: false,
    clickcount: item.clickcount || 0,
    votes: item.votes || 0,
    homepage: item.homepage || ''
  };
}

async function fetchFromRadioBrowserMirrors(pathWithQuery: string): Promise<any> {
  for (const mirror of RADIO_BROWSER_MIRRORS) {
    try {
      const url = `${mirror}/${pathWithQuery}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json) return json;
      }
    } catch {}
  }
  return null;
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
      const cached = getCachedItem<{ count: number; stations: RadioStation[] }>(cacheKey, 10 * 60 * 1000);
      if (cached) {
        apiService.fetchAndCacheStations(params, cacheKey).catch(() => {});
        return cached;
      }
    }

    return apiService.fetchAndCacheStations(params, cacheKey);
  },

  async fetchAndCacheStations(params: any, cacheKey: string) {
    const urlParams = new URLSearchParams();
    if (params.query) urlParams.set('name', params.query);
    if (params.tag) urlParams.set('tag', params.tag);
    if (params.country) urlParams.set('country', params.country);
    if (params.countrycode) urlParams.set('countrycode', params.countrycode);
    if (params.order) urlParams.set('order', params.order);
    if (params.reverse !== undefined) urlParams.set('reverse', String(params.reverse));
    urlParams.set('limit', String(params.limit || 40));
    urlParams.set('offset', String(params.offset || 0));

    // Tier 1: Local server endpoint
    try {
      const res = await fetch(`/api/radio/search?${urlParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.stations) && data.stations.length > 0) {
          const result = { count: data.count || data.stations.length, stations: data.stations };
          setCachedItem(cacheKey, result);
          return result;
        }
      }
    } catch (e) {
      console.warn('Local API /api/radio/search unavailable, falling back to direct mirrors', e);
    }

    // Tier 2: Direct query to Radio Browser DNS Mirrors
    try {
      urlParams.set('hidebroken', 'true');
      const rawData = await fetchFromRadioBrowserMirrors(`stations/search?${urlParams.toString()}`);
      if (Array.isArray(rawData) && rawData.length > 0) {
        const mapped = rawData.map(transformRawRBStation);
        const result = { count: mapped.length, stations: mapped };
        setCachedItem(cacheKey, result);
        return result;
      }
    } catch (e) {
      console.warn('Direct Radio-Browser mirrors error:', e);
    }

    // Tier 3: Curated Local Fallback Stations
    let filtered = [...CURATED_FALLBACK_STATIONS];
    if (params.query) {
      const q = params.query.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.genre.toLowerCase().includes(q));
    }
    if (params.tag && params.tag !== 'all genres') {
      const t = params.tag.toLowerCase();
      filtered = filtered.filter(s => s.genre.toLowerCase().includes(t));
    }
    const fallbackResult = { count: filtered.length, stations: filtered };
    setCachedItem(cacheKey, fallbackResult);
    return fallbackResult;
  },

  // 1.5 Fetch Station by ID
  async getStationById(stationId: string): Promise<RadioStation | null> {
    if (!stationId) return null;
    const cacheKey = `station_${stationId}`;
    const cached = getCachedItem<RadioStation>(cacheKey, 30 * 60 * 1000);
    if (cached) return cached;

    // Tier 1: Local server endpoint
    try {
      const res = await fetch(`/api/radio/byid?id=${encodeURIComponent(stationId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.station) {
          setCachedItem(cacheKey, data.station);
          return data.station;
        }
      }
    } catch {}

    // Tier 2: Direct mirror
    try {
      const rawData = await fetchFromRadioBrowserMirrors(`stations/byid?id=${encodeURIComponent(stationId)}`);
      if (Array.isArray(rawData) && rawData.length > 0) {
        const station = transformRawRBStation(rawData[0]);
        setCachedItem(cacheKey, station);
        return station;
      }
    } catch {}

    // Tier 3: Curated fallback
    const found = CURATED_FALLBACK_STATIONS.find(s => s.id === stationId);
    return found || null;
  },

  // 1.8 Fetch Global Trending Stations
  async getTrendingStations(limit: number = 20, forceFresh: boolean = false): Promise<RadioStation[]> {
    const cacheKey = `trending_stations_${limit}`;
    if (!forceFresh) {
      const cached = getCachedItem<RadioStation[]>(cacheKey, 5 * 60 * 1000);
      if (cached) {
        apiService.fetchAndCacheTrending(limit, cacheKey).catch(() => {});
        return cached;
      }
    }
    return apiService.fetchAndCacheTrending(limit, cacheKey);
  },

  async fetchAndCacheTrending(limit: number, cacheKey: string): Promise<RadioStation[]> {
    // Tier 1: Local server endpoint
    try {
      const res = await fetch(`/api/radio/trending?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.stations) && data.stations.length > 0) {
          setCachedItem(cacheKey, data.stations);
          return data.stations;
        }
      }
    } catch {}

    // Tier 2: Direct mirror
    try {
      const rawData = await fetchFromRadioBrowserMirrors(`stations/topclick?limit=${limit}&hidebroken=true`);
      if (Array.isArray(rawData) && rawData.length > 0) {
        const mapped = rawData.map(transformRawRBStation);
        setCachedItem(cacheKey, mapped);
        return mapped;
      }
    } catch {}

    // Tier 3: Fallback list
    const fallback = CURATED_FALLBACK_STATIONS.slice(0, limit);
    setCachedItem(cacheKey, fallback);
    return fallback;
  },

  // 2. Fetch Countries list
  async getCountries(): Promise<CountryInfo[]> {
    const cacheKey = 'countries_list';
    const cached = getCachedItem<CountryInfo[]>(cacheKey, 24 * 60 * 60 * 1000);
    if (cached) return cached;

    // Tier 1: Local server endpoint
    try {
      const res = await fetch('/api/radio/countries');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.countries) && data.countries.length > 0) {
          setCachedItem(cacheKey, data.countries);
          return data.countries;
        }
      }
    } catch {}

    // Tier 2: Direct mirror
    try {
      const rawData = await fetchFromRadioBrowserMirrors('countries');
      if (Array.isArray(rawData) && rawData.length > 0) {
        const countries: CountryInfo[] = rawData
          .filter((c: any) => c.name && c.stationcount > 10)
          .map((c: any) => ({
            name: c.name,
            code: c.iso_3166_1 || '',
            flag: c.iso_3166_1 ? getFlagEmoji(c.iso_3166_1) : '🌐',
            stationCount: c.stationcount || 0
          }))
          .sort((a, b) => b.stationCount - a.stationCount);
        setCachedItem(cacheKey, countries);
        return countries;
      }
    } catch {}

    // Tier 3: Fallback country list
    const fallbackCountries: CountryInfo[] = [
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
    setCachedItem(cacheKey, fallbackCountries);
    return fallbackCountries;
  },

  // 3. Search Podcasts
  async searchPodcasts(term: string = 'technology', country: string = 'US'): Promise<PodcastShow[]> {
    const cacheKey = `podcasts_${term}_${country}`;
    const cached = getCachedItem<PodcastShow[]>(cacheKey, 30 * 60 * 1000);
    if (cached) {
      apiService.fetchAndCachePodcasts(term, country, cacheKey).catch(() => {});
      return cached;
    }

    return apiService.fetchAndCachePodcasts(term, country, cacheKey);
  },

  async fetchAndCachePodcasts(term: string, country: string, cacheKey: string): Promise<PodcastShow[]> {
    // Tier 1: Local server endpoint
    try {
      const res = await fetch(`/api/podcast/search?term=${encodeURIComponent(term)}&country=${country}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.podcasts) && data.podcasts.length > 0) {
          setCachedItem(cacheKey, data.podcasts);
          return data.podcasts;
        }
      }
    } catch {}

    // Tier 2: Direct query to Apple iTunes Search API (no API key needed!)
    try {
      const url = `https://itunes.apple.com/search?media=podcast&term=${encodeURIComponent(term)}&country=${country}&limit=30`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results)) {
          const podcasts: PodcastShow[] = data.results.map((item: any) => ({
            id: String(item.collectionId || Math.random()),
            title: item.collectionName || item.trackName || 'Podcast',
            artist: item.artistName || 'Unknown Host',
            coverUrl: item.artworkUrl600 || item.artworkUrl100 || '',
            feedUrl: item.feedUrl || '',
            genre: item.primaryGenreName || 'General',
            description: item.collectionName || 'Popular Podcast Show',
            episodeCount: item.trackCount || 10
          }));
          setCachedItem(cacheKey, podcasts);
          return podcasts;
        }
      }
    } catch (e) {
      console.warn('Direct iTunes search error:', e);
    }

    return [];
  },

  // 4. Fetch Podcast RSS Episodes
  async getPodcastEpisodes(feedUrl: string, showId: string): Promise<PodcastEpisode[]> {
    const cacheKey = `episodes_${showId}`;
    const cached = getCachedItem<PodcastEpisode[]>(cacheKey, 60 * 60 * 1000);
    if (cached) {
      apiService.fetchAndCacheEpisodes(feedUrl, showId, cacheKey).catch(() => {});
      return cached;
    }

    return apiService.fetchAndCacheEpisodes(feedUrl, showId, cacheKey);
  },

  async fetchAndCacheEpisodes(feedUrl: string, showId: string, cacheKey: string): Promise<PodcastEpisode[]> {
    // Tier 1: Local server endpoint
    try {
      const res = await fetch(`/api/podcast/rss?url=${encodeURIComponent(feedUrl)}&showId=${encodeURIComponent(showId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.episodes) && data.episodes.length > 0) {
          setCachedItem(cacheKey, data.episodes);
          return data.episodes;
        }
      }
    } catch {}

    // Tier 2: Direct public RSS-to-JSON fallback proxy
    try {
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items)) {
          const episodes: PodcastEpisode[] = data.items.map((item: any, idx: number) => ({
            id: item.guid || `${showId}_ep_${idx}`,
            showId,
            title: item.title || 'Episode',
            description: item.description?.replace(/<[^>]*>?/gm, '').slice(0, 300) || '',
            publishedAt: item.pubDate ? new Date(item.pubDate).toLocaleDateString() : 'Recently',
            duration: '30:00',
            audioUrl: item.enclosure?.link || item.link || '',
            fileSize: '35 MB'
          })).filter((e: PodcastEpisode) => !!e.audioUrl);

          setCachedItem(cacheKey, episodes);
          return episodes;
        }
      }
    } catch (e) {
      console.warn('RSS to JSON fallback parsing error:', e);
    }

    return [];
  },

  // 5. Stream resolver
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
      update_notes: 'Real-time audio visualizer, 5-band EQ presets & Car Mode!'
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
            sizeBytes: item.length * 2,
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

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
