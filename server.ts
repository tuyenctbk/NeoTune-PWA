import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    try {
      geminiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    } catch (e) {
      console.warn('Gemini client instantiation exception:', e);
    }
  }
  return geminiClient;
}

app.use(express.json());

// List of Radio-Browser DNS mirrors for auto-healing and rotation
const RADIO_BROWSER_MIRRORS = [
  'https://all.api.radio-browser.info/json',
  'https://de1.api.radio-browser.info/json',
  'https://nl1.api.radio-browser.info/json',
  'https://at1.api.radio-browser.info/json',
  'https://fr1.api.radio-browser.info/json',
];

let currentMirrorIndex = 0;

function getNextMirror(): string {
  const mirror = RADIO_BROWSER_MIRRORS[currentMirrorIndex];
  currentMirrorIndex = (currentMirrorIndex + 1) % RADIO_BROWSER_MIRRORS.length;
  return mirror;
}

// Pre-curated high-fidelity verified fallback stations
const CURATED_FALLBACK_STATIONS = [
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
    id: 'soma_indie_pop_rocks',
    name: 'SomaFM: Indie Pop Rocks!',
    genre: 'Indie Rock & Pop',
    country: 'United States',
    countryCode: 'US',
    streamUrl: 'https://ice1.somafm.com/indiepop-128-mp3',
    imageUrl: 'https://somafm.com/img/indiepop120.png',
    bitrate: '128 kbps',
    codec: 'MP3',
    isFavorite: false,
    isCustom: false,
    clickcount: 75200,
    votes: 2800,
    homepage: 'https://somafm.com'
  },
  {
    id: 'soma_secret_agent',
    name: 'SomaFM: Secret Agent',
    genre: 'Lounge & Spy Soundtrack',
    country: 'United States',
    countryCode: 'US',
    streamUrl: 'https://ice1.somafm.com/secretagent-128-mp3',
    imageUrl: 'https://somafm.com/img/secretagent120.png',
    bitrate: '128 kbps',
    codec: 'MP3',
    isFavorite: false,
    isCustom: false,
    clickcount: 62000,
    votes: 2100,
    homepage: 'https://somafm.com'
  },
  {
    id: 'soma_defcon',
    name: 'SomaFM: DEF CON Radio',
    genre: 'Electronic & Synthwave',
    country: 'United States',
    countryCode: 'US',
    streamUrl: 'https://ice1.somafm.com/defcon-128-mp3',
    imageUrl: 'https://somafm.com/img/defcon120.png',
    bitrate: '128 kbps',
    codec: 'MP3',
    isFavorite: false,
    isCustom: false,
    clickcount: 83000,
    votes: 3400,
    homepage: 'https://somafm.com'
  },
  {
    id: 'bbc_radio_1',
    name: 'BBC Radio 1',
    genre: 'Top 40 & Pop Hits',
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
    id: 'bbc_radio_6_music',
    name: 'BBC Radio 6 Music',
    genre: 'Alternative & Indie',
    country: 'United Kingdom',
    countryCode: 'GB',
    streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_6music',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/BBC_Radio_6_Music_2022.svg/300px-BBC_Radio_6_Music_2022.svg.png',
    bitrate: '128 kbps',
    codec: 'AAC',
    isFavorite: false,
    isCustom: false,
    clickcount: 110000,
    votes: 6200,
    homepage: 'https://www.bbc.co.uk/6music'
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
    id: 'fip_radio_paris',
    name: 'FIP Radio Paris',
    genre: 'Jazz, World & Eclectic',
    country: 'France',
    countryCode: 'FR',
    streamUrl: 'https://stream.radiofrance.fr/fip/fip.m3u8?id=radiofrance',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/fr/thumb/d/d5/FIP_logo_2021.svg/300px-FIP_logo_2021.svg.png',
    bitrate: '192 kbps',
    codec: 'AAC/HLS',
    isFavorite: false,
    isCustom: false,
    clickcount: 120000,
    votes: 5800,
    homepage: 'https://www.radiofrance.fr/fip'
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
    id: 'deutschlandfunk',
    name: 'Deutschlandfunk Kultur',
    genre: 'Culture, News & Talk',
    country: 'Germany',
    countryCode: 'DE',
    streamUrl: 'https://st02.sslstream.dlf.de/dlf/02/128/mp3/stream.mp3',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Deutschlandfunk_Kultur_Logo_2017.svg/300px-Deutschlandfunk_Kultur_Logo_2017.svg.png',
    bitrate: '128 kbps',
    codec: 'MP3',
    isFavorite: false,
    isCustom: false,
    clickcount: 76000,
    votes: 3200,
    homepage: 'https://www.deutschlandfunkkultur.de'
  },
  {
    id: 'tokyo_fm_world',
    name: 'Tokyo FM J-Pop Hits',
    genre: 'J-Pop & Anime',
    country: 'Japan',
    countryCode: 'JP',
    streamUrl: 'https://stream.zeno.fm/0r0xa792kwzuv',
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=200&auto=format&fit=crop&q=80',
    bitrate: '128 kbps',
    codec: 'MP3',
    isFavorite: false,
    isCustom: false,
    clickcount: 68000,
    votes: 3100,
    homepage: 'https://www.tfm.co.jp'
  },
  {
    id: 'classic_fm_uk',
    name: 'Classic FM UK',
    genre: 'Classical & Orchestral',
    country: 'United Kingdom',
    countryCode: 'GB',
    streamUrl: 'https://media-ssl.musicradio.com/ClassicFM',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Classic_FM_logo.svg/300px-Classic_FM_logo.svg.png',
    bitrate: '128 kbps',
    codec: 'MP3',
    isFavorite: false,
    isCustom: false,
    clickcount: 98000,
    votes: 5100,
    homepage: 'https://www.classicfm.com'
  },
  {
    id: 'smooth_chill_uk',
    name: 'Smooth Chill',
    genre: 'Chillout & Ambient',
    country: 'United Kingdom',
    countryCode: 'GB',
    streamUrl: 'https://media-ssl.musicradio.com/SmoothChill',
    imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=200&auto=format&fit=crop&q=80',
    bitrate: '128 kbps',
    codec: 'MP3',
    isFavorite: false,
    isCustom: false,
    clickcount: 73000,
    votes: 3600,
    homepage: 'https://www.smoothradio.com'
  },
  {
    id: 'vov1_vietnam',
    name: 'VOV1 - Thời sự',
    genre: 'News & Talk',
    country: 'Vietnam',
    countryCode: 'VN',
    streamUrl: 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8',
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
    id: 'vov2_vietnam',
    name: 'VOV2 - Đời sống & Văn hóa',
    genre: 'Culture & Talk',
    country: 'Vietnam',
    countryCode: 'VN',
    streamUrl: 'https://str.vov.gov.vn/vovlive/vov2.sdp_aac/playlist.m3u8',
    imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=200&auto=format&fit=crop&q=80',
    bitrate: '128 kbps',
    codec: 'AAC',
    isFavorite: false,
    isCustom: false,
    clickcount: 38000,
    votes: 980,
    homepage: 'https://vov.gov.vn'
  },
  {
    id: 'vov3_vietnam',
    name: 'VOV3 - Âm nhạc Giải trí',
    genre: 'Music & Hits',
    country: 'Vietnam',
    countryCode: 'VN',
    streamUrl: 'https://str.vov.gov.vn/vovlive/vov3.sdp_aac/playlist.m3u8',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=80',
    bitrate: '128 kbps',
    codec: 'AAC',
    isFavorite: false,
    isCustom: false,
    clickcount: 55000,
    votes: 1800,
    homepage: 'https://vov.gov.vn'
  },
  {
    id: 'xone_fm_vietnam',
    name: 'Xone FM Radio',
    genre: 'Pop Hits & DJ Mix',
    country: 'Vietnam',
    countryCode: 'VN',
    streamUrl: 'https://multi-playlist-zmp3.zmdcdn.me/Ce5_Z5JFx2c/zhls/playback-realtime/f9a40e7c3239db678228/index.m3u8',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80',
    bitrate: '128 kbps',
    codec: 'AAC',
    isFavorite: false,
    isCustom: false,
    clickcount: 65000,
    votes: 2400,
    homepage: 'https://xonefm.com'
  }
];

// Active live stream overrides for popular stations with frequently broken community links (e.g., Vietnamese VOV/Xone)
const STREAM_OVERRIDES: Record<string, string> = {
  'vov1': 'https://audio-lss.vov.vn/live/vov1.m3u8',
  'vov2': 'https://audio-lss.vov.vn/live/vov2.m3u8',
  'vov3': 'https://audio-lss.vov.vn/live/vov3.m3u8',
  'vov5': 'https://audio-lss.vov.vn/live/vov5.m3u8',
  'vov247': 'https://audio-lss.vov.vn/live/vov247.m3u8',
  'vovgiaothonghn': 'https://audio-lss.vov.vn/live/vovgt-hn.m3u8',
  'vovgiaothonghcm': 'https://audio-lss.vov.vn/live/vovgt-tphcm.m3u8',
  'xone': 'https://audio-lss.vov.vn/live/vov3.m3u8'
};

// Returns overridden high-fidelity active URL if matched, otherwise the original URL
function resolveOverriddenStreamUrl(url: string, name: string = ''): string {
  const normalizedUrl = url.toLowerCase();
  const normalizedName = name.toLowerCase();

  // Match based on stream URL keywords or station name
  if (normalizedUrl.includes('vov1') || normalizedName === 'vov1' || (normalizedName.includes('vov') && normalizedName.includes('1'))) {
    return STREAM_OVERRIDES['vov1'];
  }
  if (normalizedUrl.includes('vov2') || normalizedName === 'vov2' || (normalizedName.includes('vov') && normalizedName.includes('2'))) {
    return STREAM_OVERRIDES['vov2'];
  }
  if (normalizedUrl.includes('vov3') || normalizedName === 'vov3' || (normalizedName.includes('vov') && normalizedName.includes('3'))) {
    return STREAM_OVERRIDES['vov3'];
  }
  if (normalizedUrl.includes('vov5') || normalizedName === 'vov5' || (normalizedName.includes('vov') && normalizedName.includes('5'))) {
    return STREAM_OVERRIDES['vov5'];
  }
  if (normalizedUrl.includes('vov247') || normalizedUrl.includes('vov 24/7') || normalizedName.includes('vov 24/7') || normalizedName.includes('vov247')) {
    return STREAM_OVERRIDES['vov247'];
  }
  if (normalizedUrl.includes('giaothonghn') || normalizedUrl.includes('giao thong ha noi') || normalizedName.includes('giao thông hà nội') || normalizedName.includes('traffic hanoi')) {
    return STREAM_OVERRIDES['vovgiaothonghn'];
  }
  if (normalizedUrl.includes('giaothonghcm') || normalizedUrl.includes('giao thong ho chi minh') || normalizedName.includes('giao thông tp') || normalizedName.includes('traffic hcm')) {
    return STREAM_OVERRIDES['vovgiaothonghcm'];
  }
  if (normalizedUrl.includes('xone') || normalizedName.includes('xone fm') || normalizedName.includes('xone radio')) {
    return STREAM_OVERRIDES['xone'];
  }

  return url;
}

// Helper to convert 2-letter ISO code to Flag emoji
function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'NeoTune API Gateway', timestamp: Date.now() });
});

// 2. Radio Stations Search endpoint with Mirror Failover
app.get('/api/radio/search', async (req, res) => {
  const {
    name = '',
    tag = '',
    country = '',
    countrycode = '',
    limit = '40',
    offset = '0',
    order = 'clickcount',
    reverse = 'true'
  } = req.query;

  const queryParams = new URLSearchParams();
  if (name) queryParams.set('name', String(name));
  if (tag) queryParams.set('tag', String(tag).toLowerCase());
  if (country) queryParams.set('country', String(country));
  if (countrycode) queryParams.set('countrycode', String(countrycode).toUpperCase());
  queryParams.set('limit', String(limit));
  queryParams.set('offset', String(offset));
  queryParams.set('order', String(order));
  queryParams.set('reverse', String(reverse));
  queryParams.set('hidebroken', 'true');

  let success = false;
  let stationsData: any[] = [];
  const triedMirrors = new Set<string>();

  for (let attempt = 0; attempt < RADIO_BROWSER_MIRRORS.length; attempt++) {
    const mirror = getNextMirror();
    if (triedMirrors.has(mirror)) continue;
    triedMirrors.add(mirror);

    try {
      const targetUrl = `${mirror}/stations/search?${queryParams.toString()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'NeoTune/3.1.0 (Web/Cross-Platform Audio Hub)',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const rawJson = await response.json();
        if (Array.isArray(rawJson)) {
          stationsData = rawJson.map((item: any) => {
            const rawUrl = item.url_resolved || item.url || '';
            const cleanName = item.name?.trim() || 'Live Radio';
            const resolvedUrl = resolveOverriddenStreamUrl(rawUrl, cleanName);
            return {
              id: item.stationuuid || `rb_${item.changeuuid || Math.random().toString(36).substring(2, 9)}`,
              name: cleanName,
              genre: item.tags ? item.tags.split(',').slice(0, 3).map((t: string) => t.trim()).filter(Boolean).join(', ') : 'Live Radio',
              country: item.country || 'Global',
              countryCode: item.countrycode || '',
              streamUrl: resolvedUrl,
              imageUrl: item.favicon || `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80`,
              bitrate: item.bitrate ? `${item.bitrate} kbps` : '128 kbps',
              codec: item.codec || 'MP3',
              isFavorite: false,
              isCustom: false,
              clickcount: item.clickcount || 0,
              votes: item.votes || 0,
              homepage: item.homepage || '',
            };
          });
          success = true;
          break;
        }
      }
    } catch (err) {
      // Rotate to next mirror
    }
  }

  if (!success || stationsData.length === 0) {
    // Filter fallback stations
    let filtered = [...CURATED_FALLBACK_STATIONS];
    if (name) {
      const q = String(name).toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.genre.toLowerCase().includes(q));
    }
    if (tag) {
      const t = String(tag).toLowerCase();
      filtered = filtered.filter(s => s.genre.toLowerCase().includes(t));
    }
    if (country) {
      const c = String(country).toLowerCase();
      filtered = filtered.filter(s => s.country.toLowerCase().includes(c));
    }
    if (countrycode) {
      const cc = String(countrycode).toUpperCase();
      filtered = filtered.filter(s => s.countryCode === cc);
    }
    return res.json({
      source: 'curated_fallback',
      count: filtered.length,
      stations: filtered
    });
  }

  return res.json({
    source: 'radio_browser',
    count: stationsData.length,
    stations: stationsData
  });
});

// 2.5 Station Lookup by ID/UUID
app.get('/api/radio/byid', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing station id' });
  const idStr = String(id).trim();

  // Check curated fallback stations
  const fallbackMatch = CURATED_FALLBACK_STATIONS.find(s => s.id === idStr);
  if (fallbackMatch) {
    return res.json({ station: fallbackMatch });
  }

  // Query radio-browser by stationuuid
  for (let attempt = 0; attempt < RADIO_BROWSER_MIRRORS.length; attempt++) {
    const mirror = getNextMirror();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${mirror}/stations/byuuid/${encodeURIComponent(idStr)}`, {
        headers: { 'User-Agent': 'NeoTune/3.1.0' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const rawJson = await response.json();
        if (Array.isArray(rawJson) && rawJson.length > 0) {
          const item = rawJson[0];
          const rawUrl = item.url_resolved || item.url || '';
          const cleanName = item.name?.trim() || 'Live Radio';
          const resolvedUrl = resolveOverriddenStreamUrl(rawUrl, cleanName);
          const station = {
            id: item.stationuuid || idStr,
            name: cleanName,
            genre: item.tags ? item.tags.split(',').slice(0, 3).map((t: string) => t.trim()).filter(Boolean).join(', ') : 'Live Radio',
            country: item.country || 'Global',
            countryCode: item.countrycode || '',
            streamUrl: resolvedUrl,
            imageUrl: item.favicon || `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80`,
            bitrate: item.bitrate ? `${item.bitrate} kbps` : '128 kbps',
            codec: item.codec || 'MP3',
            isFavorite: false,
            isCustom: false,
            clickcount: item.clickcount || 0,
            votes: item.votes || 0,
            homepage: item.homepage || '',
          };
          return res.json({ station });
        }
      }
    } catch {}
  }
  return res.status(404).json({ error: 'Station not found' });
});

// 2.7 Trending Radio Stations (Highest Global Listenership Growth / Click Trend)
app.get('/api/radio/trending', async (req, res) => {
  const { limit = '24' } = req.query;
  const targetLimit = parseInt(String(limit), 10) || 24;

  let success = false;
  let stationsData: any[] = [];
  const triedMirrors = new Set<string>();

  for (let attempt = 0; attempt < RADIO_BROWSER_MIRRORS.length; attempt++) {
    const mirror = getNextMirror();
    if (triedMirrors.has(mirror)) continue;
    triedMirrors.add(mirror);

    try {
      // Radio browser supports /stations/topclick or order=clicktrend
      const targetUrl = `${mirror}/stations/search?order=clicktrend&reverse=true&limit=${targetLimit}&hidebroken=true`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'NeoTune/3.2.0 (Web/Cross-Platform Trending)',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const rawJson = await response.json();
        if (Array.isArray(rawJson) && rawJson.length > 0) {
          stationsData = rawJson.map((item: any) => {
            const rawUrl = item.url_resolved || item.url || '';
            const cleanName = item.name?.trim() || 'Live Radio';
            const resolvedUrl = resolveOverriddenStreamUrl(rawUrl, cleanName);
            return {
              id: item.stationuuid || `rb_trend_${Math.random().toString(36).substring(2, 9)}`,
              name: cleanName,
              genre: item.tags ? item.tags.split(',').slice(0, 3).map((t: string) => t.trim()).filter(Boolean).join(', ') : 'Trending Radio',
              country: item.country || 'Global',
              countryCode: item.countrycode || '',
              streamUrl: resolvedUrl,
              imageUrl: item.favicon || `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80`,
              bitrate: item.bitrate ? `${item.bitrate} kbps` : '128 kbps',
              codec: item.codec || 'MP3',
              isFavorite: false,
              isCustom: false,
              clickcount: item.clickcount || 0,
              clicktrend: item.clicktrend || 0,
              votes: item.votes || 0,
              homepage: item.homepage || '',
            };
          });
          success = true;
          break;
        }
      }
    } catch {}
  }

  if (!success || stationsData.length === 0) {
    // Return top curated stations with mock growth trends
    const fallbackTrending = CURATED_FALLBACK_STATIONS.slice(0, targetLimit).map(s => ({
      ...s,
      clicktrend: 120 + Math.floor(Math.random() * 800)
    }));
    return res.json({
      source: 'curated_fallback',
      count: fallbackTrending.length,
      stations: fallbackTrending
    });
  }

  return res.json({
    source: 'radio_browser_clicktrend',
    count: stationsData.length,
    stations: stationsData
  });
});

// 3. Countries list with station counts
app.get('/api/radio/countries', async (req, res) => {
  let countriesList: any[] = [];
  const triedMirrors = new Set<string>();

  for (let attempt = 0; attempt < 3; attempt++) {
    const mirror = getNextMirror();
    if (triedMirrors.has(mirror)) continue;
    triedMirrors.add(mirror);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${mirror}/countries?order=stationcount&reverse=true&hidebroken=true`, {
        headers: { 'User-Agent': 'NeoTune/3.1.0' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          countriesList = data.slice(0, 100).map((c: any) => ({
            name: c.name,
            code: c.iso_3166_1 || '',
            flag: getFlagEmoji(c.iso_3166_1),
            stationCount: c.stationcount || 0
          }));
          break;
        }
      }
    } catch {
      // Continue to next mirror
    }
  }

  if (countriesList.length === 0) {
    countriesList = [
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

  res.json({ countries: countriesList });
});

// 4. iTunes Podcast Search Gateway
app.get('/api/podcast/search', async (req, res) => {
  const { term = 'technology', limit = '24', country = 'US' } = req.query;

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(String(term))}&entity=podcast&limit=${limit}&country=${country}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'NeoTune/3.1.0 (Podcasts)' }
    });

    if (response.ok) {
      const data = await response.json();
      const podcasts = (data.results || []).map((item: any) => ({
        id: `itunes_podcast_${item.collectionId}`,
        name: item.collectionName || item.trackName || 'Podcast Show',
        genre: item.primaryGenreName || 'Podcast',
        country: item.country || 'Global',
        countryCode: item.country || '',
        streamUrl: item.feedUrl || '',
        imageUrl: item.artworkUrl600 || item.artworkUrl100 || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&auto=format&fit=crop&q=80',
        bitrate: 'Podcast',
        codec: 'AAC/MP3',
        isFavorite: false,
        isCustom: false,
        artistName: item.artistName || '',
        trackCount: item.trackCount || 0,
        feedUrl: item.feedUrl || '',
        releaseDate: item.releaseDate || ''
      }));

      return res.json({ count: podcasts.length, podcasts });
    }
  } catch (err) {
    console.error('Podcast search error:', err);
  }

  // Fallback popular podcasts
  const fallbackPodcasts = [
    {
      id: 'itunes_podcast_1535844019',
      name: 'Huberman Lab',
      genre: 'Health & Science',
      country: 'US',
      countryCode: 'US',
      streamUrl: 'https://feeds.megaphone.fm/hubermanlab',
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&auto=format&fit=crop&q=80',
      bitrate: 'Podcast',
      codec: 'MP3',
      isFavorite: false,
      isCustom: false,
      artistName: 'Andrew Huberman',
      feedUrl: 'https://feeds.megaphone.fm/hubermanlab',
      trackCount: 180
    },
    {
      id: 'itunes_podcast_1088864895',
      name: 'The Daily',
      genre: 'News & Politics',
      country: 'US',
      countryCode: 'US',
      streamUrl: 'https://feeds.simplecast.com/54nAGcIl',
      imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=300&auto=format&fit=crop&q=80',
      bitrate: 'Podcast',
      codec: 'MP3',
      isFavorite: false,
      isCustom: false,
      artistName: 'The New York Times',
      feedUrl: 'https://feeds.simplecast.com/54nAGcIl',
      trackCount: 1500
    },
    {
      id: 'itunes_podcast_1455523348',
      name: 'Darknet Diaries',
      genre: 'Technology & Cyber',
      country: 'US',
      countryCode: 'US',
      streamUrl: 'https://feeds.megaphone.fm/darknetdiaries',
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&auto=format&fit=crop&q=80',
      bitrate: 'Podcast',
      codec: 'MP3',
      isFavorite: false,
      isCustom: false,
      artistName: 'Jack Rhysider',
      feedUrl: 'https://feeds.megaphone.fm/darknetdiaries',
      trackCount: 145
    },
    {
      id: 'itunes_podcast_917918570',
      name: 'TED Radio Hour',
      genre: 'Ideas & Innovation',
      country: 'US',
      countryCode: 'US',
      streamUrl: 'https://feeds.npr.org/510298/podcast.xml',
      imageUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300&auto=format&fit=crop&q=80',
      bitrate: 'Podcast',
      codec: 'MP3',
      isFavorite: false,
      isCustom: false,
      artistName: 'NPR',
      feedUrl: 'https://feeds.npr.org/510298/podcast.xml',
      trackCount: 400
    }
  ];

  return res.json({ count: fallbackPodcasts.length, podcasts: fallbackPodcasts });
});

// 5. Podcast RSS Parser Endpoint
app.get('/api/podcast/rss', async (req, res) => {
  const { url, showId = '' } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Feed URL is required' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NeoTune/3.1.0 (Podcast RSS Parser)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed (${response.status})`);
    }

    const xmlText = await response.text();

    // Regex XML parsing for high-performance and zero-dependency reliability
    const items: any[] = [];
    const itemRegex = /<item[\s\S]*?<\/item>/gi;
    let match;
    let index = 0;

    while ((match = itemRegex.exec(xmlText)) !== null && index < 50) {
      const itemXml = match[0];

      // Title
      const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const title = (titleMatch ? (titleMatch[1] || titleMatch[2] || '') : `Episode ${index + 1}`).trim();

      // Audio Enclosure URL
      const encMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i) ||
                       itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
      const audioUrl = encMatch ? encMatch[1] : '';

      if (!audioUrl) {
        index++;
        continue;
      }

      // Duration
      const durMatch = itemXml.match(/<itunes:duration>([^<]+)<\/itunes:duration>/i);
      let durationMs = 0;
      if (durMatch && durMatch[1]) {
        const rawDur = durMatch[1].trim();
        if (rawDur.includes(':')) {
          const parts = rawDur.split(':').map(Number);
          if (parts.length === 3) {
            durationMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
          } else if (parts.length === 2) {
            durationMs = (parts[0] * 60 + parts[1]) * 1000;
          }
        } else if (!isNaN(Number(rawDur))) {
          durationMs = Number(rawDur) * 1000;
        }
      }

      // Publication Date
      const pubMatch = itemXml.match(/<pubDate>([^<]+)<\/pubDate>/i);
      let pubDate = 'Recent';
      if (pubMatch && pubMatch[1]) {
        try {
          const d = new Date(pubMatch[1]);
          if (!isNaN(d.getTime())) {
            pubDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
        } catch {
          pubDate = pubMatch[1].slice(0, 16);
        }
      }

      // Description
      const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i) ||
                        itemXml.match(/<itunes:summary>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/itunes:summary>/i);
      let desc = descMatch ? (descMatch[1] || descMatch[2] || '') : '';
      // Strip HTML tags & decode basic entities
      desc = desc.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, 300);

      // Artwork
      const artMatch = itemXml.match(/<itunes:image[^>]+href=["']([^"']+)["']/i);
      const artworkUrl = artMatch ? artMatch[1] : '';

      items.push({
        id: `ep_${showId || 'feed'}_${index}_${Math.abs(audioUrl.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0))}`,
        showId: String(showId),
        title,
        description: desc || 'No episode description available.',
        audioUrl,
        pubDate,
        durationMs: durationMs || 1800000,
        artworkUrl
      });

      index++;
    }

    res.json({ count: items.length, episodes: items });
  } catch (err: any) {
    console.error('RSS parse error:', err.message);
    res.status(500).json({ error: 'Failed to parse RSS feed', message: err.message });
  }
});

// 6. Stream URL Resolver & Format Inspector
app.get('/api/stream/resolve', async (req, res) => {
  let { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Stream URL is required' });
  }

  // Intercept and auto-heal popular broken stream URLs
  url = resolveOverriddenStreamUrl(url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'NeoTune/3.1.0 (Stream Resolver)',
        'Icy-MetaData': '1'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';

    // If it's a PLS playlist
    if (contentType.includes('scpls') || url.toLowerCase().endsWith('.pls')) {
      const text = await response.text();
      const fileMatch = text.match(/File\d+=(https?:\/\/[^\r\n]+)/i);
      if (fileMatch && fileMatch[1]) {
        return res.json({ resolvedUrl: fileMatch[1].trim(), type: 'pls_extracted' });
      }
    }

    // If it's an M3U playlist
    if (contentType.includes('mpegurl') || url.toLowerCase().endsWith('.m3u')) {
      const text = await response.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      if (lines.length > 0 && lines[0].startsWith('http')) {
        return res.json({ resolvedUrl: lines[0], type: 'm3u_extracted' });
      }
    }

    // Direct stream
    return res.json({
      resolvedUrl: response.url || url,
      contentType,
      type: 'direct'
    });
  } catch (err: any) {
    // If resolve fails, return original url with protocol fallback candidate
    return res.json({
      resolvedUrl: url,
      fallbackUrl: url.startsWith('https://') ? url.replace('https://', 'http://') : url.replace('http://', 'https://'),
      type: 'unresolved'
    });
  }
});

// 7. Audio Stream Relay Proxy (Enables 100% pure HTTPS playback and CORS compliance for all radio streams)
app.get('/api/stream/proxy', async (req, res) => {
  let { url } = req.query;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return res.status(400).send('Invalid stream URL parameter');
  }

  // Intercept and auto-heal popular broken stream URLs
  url = resolveOverriddenStreamUrl(url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const upstream = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 NeoTune/3.1.0',
        'Icy-MetaData': '0',
        'Accept': '*/*'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!upstream.ok && upstream.status >= 400) {
      return res.status(upstream.status).send(`Upstream stream error: ${upstream.status}`);
    }

    const rawContentType = upstream.headers.get('content-type') || '';
    const isM3u8 = rawContentType.includes('mpegurl') || url.toLowerCase().includes('.m3u8');

    // Handle HLS Playlists (.m3u8): Parse and rewrite relative chunks to route through proxy
    if (isM3u8) {
      const playlistText = await upstream.text();
      const baseUrl = upstream.url || url;
      
      const rewritten = playlistText.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          return line;
        }
        try {
          const absoluteChunkUrl = new URL(trimmed, baseUrl).toString();
          return `/api/stream/proxy?url=${encodeURIComponent(absoluteChunkUrl)}`;
        } catch {
          return line;
        }
      }).join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(rewritten);
    }

    let contentType = rawContentType || 'audio/mpeg';
    if (!contentType.startsWith('audio/') && !contentType.startsWith('video/') && !contentType.includes('ogg')) {
      contentType = 'audio/mpeg';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Connection', 'keep-alive');

    if (!upstream.body) {
      return res.status(502).send('No audio data stream available');
    }

    const { Readable } = await import('stream');
    // @ts-ignore
    const nodeStream = Readable.fromWeb(upstream.body);
    nodeStream.on('error', () => {
      if (!res.writableEnded) res.end();
    });
    req.on('close', () => {
      try {
        nodeStream.destroy();
      } catch {}
    });

    nodeStream.pipe(res);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(502).send(`Proxy connection failed: ${err.message}`);
    }
  }
});

// 8. Remote Configuration Specification Endpoint
app.get('/api/remote-config', (req, res) => {
  res.json({
    ads_enabled: false,
    auto_quality_adaptive: true,
    min_buffer_ms_cellular: 20000,
    max_buffer_ms_cellular: 60000,
    show_network_quality_badge: true,
    latest_version_code: 31,
    min_required_version_code: 20,
    latest_version_name: '3.1.0',
    update_notes: 'Real-time 8-band audio visualizer, 5-band EQ presets, sleep timer fade-out & TV 10-foot mode!',
    server_time: Date.now()
  });
});

// 9. Gemini AI Commentary & Insights Endpoint (with graceful tier/quota limit fallback)
app.get('/api/ai/insights', async (req, res) => {
  const { name = 'Radio Station', genre = 'Music' } = req.query;
  const nameStr = String(name).trim();
  const genreStr = String(genre).trim();

  const generateLocalFallback = (reason: string) => {
    let commentary = `Welcome to ${nameStr}! Streaming high-fidelity ${genreStr} broadcasting worldwide. Sit back and enjoy the stream.`;
    let trivia = `${nameStr} is a popular ${genreStr} broadcast station tuned by music lovers across the globe.`;

    const lowerGenre = genreStr.toLowerCase();
    if (lowerGenre.includes('jazz')) {
      commentary = `Now tuning into ${nameStr} — presenting smooth jazz melodies and expressive solos.`;
      trivia = `Jazz radio streams offer syncopated rhythms and relaxing soundscapes.`;
    } else if (lowerGenre.includes('rock') || lowerGenre.includes('indie')) {
      commentary = `Turn up the volume on ${nameStr}! Delivering driving bass lines and classic rock anthems.`;
      trivia = `Indie and rock stations curate hand-picked records and underground vinyl tracks.`;
    } else if (lowerGenre.includes('ambient') || lowerGenre.includes('chill')) {
      commentary = `Immerse in tranquil soundscapes with ${nameStr}. Designed for deep focus and relaxation.`;
      trivia = `Ambient streams utilize atmospheric frequencies to create calming environments.`;
    }

    return {
      source: 'local_intelligent_fallback',
      reason,
      stationName: nameStr,
      genre: genreStr,
      commentary,
      trivia,
      recommendedTags: [genreStr, 'Live Stream', 'High Fidelity']
    };
  };

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json(generateLocalFallback('GEMINI_API_KEY environment variable not set on server; using local intelligent fallback'));
    }

    const prompt = `You are NeoTune AI Radio Host. Provide a 2-sentence intro and 1 trivia fact for radio station "${nameStr}" playing "${genreStr}". Respond with JSON object with "commentary" and "trivia" keys.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt
    });

    const text = response.text || '';
    let parsed: any = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {}

    if (parsed && parsed.commentary) {
      return res.json({
        source: 'gemini_ai',
        stationName: nameStr,
        genre: genreStr,
        commentary: parsed.commentary,
        trivia: parsed.trivia || `Broadcasting live ${genreStr} content globally.`
      });
    }

    return res.json({
      source: 'gemini_ai_raw',
      commentary: text.slice(0, 250) || generateLocalFallback('Empty response').commentary,
      trivia: `Featured stream: ${nameStr}`
    });
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn('[Gemini AI Gateway] Error or quota exceeded:', errMsg);
    const isQuotaExceeded = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('limit');
    return res.json(generateLocalFallback(
      isQuotaExceeded
        ? 'Gemini API quota/tier limit reached (429/RESOURCE_EXHAUSTED). Falling back to local audio insights.'
        : `Gemini API notice: ${errMsg}`
    ));
  }
});

// 10. AI Troubleshooter Suggestions based on User Agent and optional client data
app.post('/api/ai/troubleshoot', async (req, res) => {
  const { userAgent = 'Unknown', errorLogs = [] } = req.body;

  const generateLocalFallback = (reason: string) => {
    return {
      source: 'local_troubleshoot_fallback',
      reason,
      recommendations: [
        "Enable site autoplay and audio permissions in your browser's site settings tab.",
        "Toggle 'Use graphics acceleration when available' in browser settings to eliminate audio context stutter.",
        "Click 'Force Restart Engine' above to re-initialize your device's audio hardware pipelines.",
        "Check your network bandwidth, or enable Data Saver mode under Settings to compress streaming bandwidth."
      ],
      insights: "Standard HTML5 autoplay policy requires an active user gesture. For " + userAgent + ", ensuring permissions are set to 'Allow' is the primary fix."
    };
  };

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json(generateLocalFallback('GEMINI_API_KEY environment variable not set on server; using local fallback'));
    }

    const prompt = `The user is experiencing audio issues (e.g. stuttering, silent loops, or buffering) in a radio streaming app.
User-Agent: "${userAgent}"
Recent logs: ${JSON.stringify(errorLogs.slice(0, 5))}

Suggest 3 to 4 specific browser settings adjustments (such as Hardware Acceleration, Autoplay permissions, buffer thresholds, or site exceptions) tailored for their detected operating system and browser type.
Provide a concise 'insights' summary of their browser's potential Web Audio quirks.
Respond with a raw JSON object matching this structure exactly:
{
  "recommendations": ["setting 1 to change...", "setting 2 to change...", "setting 3 to change..."],
  "insights": "quirks summary..."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '';
    let parsed: any = null;
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    }

    if (parsed && Array.isArray(parsed.recommendations) && parsed.insights) {
      return res.json({
        source: 'gemini_ai',
        recommendations: parsed.recommendations,
        insights: parsed.insights
      });
    }

    return res.json(generateLocalFallback('AI output parsing failed'));
  } catch (err: any) {
    console.warn('[AI Troubleshooter] Error:', err?.message || err);
    return res.json(generateLocalFallback(`API Error: ${err?.message || 'Unknown error'}`));
  }
});

// Production and development Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NeoTune Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
