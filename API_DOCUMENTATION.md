# NeoTune REST API Reference Manual

The NeoTune backend provides a resilient, high-throughput Express API Gateway that powers radio station discovery, podcast feed parsing, audio relay proxying, live stream format resolving, and Gemini AI-powered music intelligence.

**Base URL**: `http://localhost:3000/api` (or relative `/api` on deployed containers)

---

## Table of Endpoints

1. [System Health Check](#1-system-health-check)
2. [Radio Station Search](#2-radio-station-search)
3. [Radio Station by ID Lookup](#3-radio-station-by-id-lookup)
4. [Trending Radio Stations](#4-trending-radio-stations)
5. [Countries Directory](#5-countries-directory)
6. [Podcast Show Search](#6-podcast-show-search)
7. [Podcast RSS Feed Parser](#7-podcast-rss-feed-parser)
8. [Stream URL Resolver](#8-stream-url-resolver)
9. [Audio Stream Relay Proxy](#9-audio-stream-relay-proxy)
10. [Remote Configuration](#10-remote-configuration)
11. [AI Music Insights & Commentary](#11-ai-music-insights--commentary)
12. [AI Audio Troubleshooter](#12-ai-audio-troubleshooter)

---

### 1. System Health Check
Check gateway status and server time.

- **Method**: `GET`
- **Path**: `/api/health`
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "service": "NeoTune API Gateway",
  "timestamp": 1773646045000
}
```

---

### 2. Radio Station Search
Search 50,000+ radio stations with automatic DNS mirror rotation and fallback.

- **Method**: `GET`
- **Path**: `/api/radio/search`
- **Query Parameters**:
  | Parameter | Type | Required | Default | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | string | Optional | `""` | Station name keyword match |
  | `tag` | string | Optional | `""` | Genre / music style tag (e.g., `jazz`, `rock`, `classical`, `chillout`) |
  | `country` | string | Optional | `""` | Country name (e.g., `United States`, `Vietnam`) |
  | `countrycode` | string | Optional | `""` | 2-letter ISO 3166-1 alpha-2 code (e.g., `US`, `GB`, `VN`, `FR`, `DE`, `JP`) |
  | `limit` | number | Optional | `40` | Maximum stations returned |
  | `offset` | number | Optional | `0` | Pagination offset |
  | `order` | string | Optional | `clickcount` | Sort criteria (`clickcount`, `votes`, `bitrate`, `name`) |
  | `reverse` | boolean | Optional | `true` | Reverse sort order (descending) |

- **Sample Request**:
```bash
curl "http://localhost:3000/api/radio/search?tag=jazz&countrycode=US&limit=5"
```

- **Sample Response**: `200 OK`
```json
{
  "source": "radio_browser",
  "count": 5,
  "stations": [
    {
      "id": "96bf36ee-0601-11e8-ae97-52543be04c81",
      "name": "Jazz24 (KNKX)",
      "genre": "Smooth Jazz, Bebop, Vocal",
      "country": "United States",
      "countryCode": "US",
      "streamUrl": "https://knkx.streamguys1.com/jazz24-aac-128",
      "imageUrl": "https://www.jazz24.org/wp-content/uploads/2020/03/jazz24-logo-dark.png",
      "bitrate": "128 kbps",
      "codec": "AAC",
      "isFavorite": false,
      "isCustom": false,
      "clickcount": 87000,
      "votes": 4300,
      "homepage": "https://www.jazz24.org"
    }
  ]
}
```

---

### 3. Radio Station by ID Lookup
Retrieve exact station metadata by UUID or custom identifier.

- **Method**: `GET`
- **Path**: `/api/radio/byid`
- **Query Parameters**:
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `id` | string | **Yes** | Station UUID or fallback ID |

- **Sample Response**: `200 OK`
```json
{
  "station": {
    "id": "soma_groove_salad",
    "name": "SomaFM: Groove Salad",
    "genre": "Ambient & Chill",
    "country": "United States",
    "countryCode": "US",
    "streamUrl": "https://ice1.somafm.com/groovesalad-128-mp3",
    "imageUrl": "https://somafm.com/img/groovesalad120.png",
    "bitrate": "128 kbps",
    "codec": "MP3"
  }
}
```

---

### 4. Trending Radio Stations
Fetches the fastest-growing and most viral radio stations worldwide based on real-time click trends.

- **Method**: `GET`
- **Path**: `/api/radio/trending`
- **Query Parameters**:
  | Parameter | Type | Required | Default | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `limit` | number | Optional | `24` | Number of trending stations |

- **Sample Response**: `200 OK`
```json
{
  "source": "radio_browser_clicktrend",
  "count": 24,
  "stations": [ ... ]
}
```

---

### 5. Countries Directory
Lists all countries with active broadcasting stations and calculated station counts.

- **Method**: `GET`
- **Path**: `/api/radio/countries`
- **Sample Response**: `200 OK`
```json
{
  "countries": [
    { "name": "United States", "code": "US", "flag": "🇺🇸", "stationCount": 4820 },
    { "name": "United Kingdom", "code": "GB", "flag": "🇬🇧", "stationCount": 3150 },
    { "name": "Germany", "code": "DE", "flag": "🇩🇪", "stationCount": 2900 },
    { "name": "France", "code": "FR", "flag": "🇫🇷", "stationCount": 2100 },
    { "name": "Vietnam", "code": "VN", "flag": "🇻🇳", "stationCount": 420 }
  ]
}
```

---

### 6. Podcast Show Search
Queries the Apple iTunes Podcast Directory for shows, episodes, and feed URLs.

- **Method**: `GET`
- **Path**: `/api/podcast/search`
- **Query Parameters**:
  | Parameter | Type | Required | Default | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `term` | string | Optional | `technology` | Search query |
  | `limit` | number | Optional | `24` | Maximum shows |
  | `country` | string | Optional | `US` | Storefront ISO country code |

- **Sample Response**: `200 OK`
```json
{
  "count": 24,
  "podcasts": [
    {
      "id": "itunes_podcast_1535844019",
      "name": "Huberman Lab",
      "genre": "Health & Science",
      "country": "US",
      "countryCode": "US",
      "streamUrl": "https://feeds.megaphone.fm/hubermanlab",
      "imageUrl": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300",
      "artistName": "Andrew Huberman",
      "trackCount": 180,
      "feedUrl": "https://feeds.megaphone.fm/hubermanlab"
    }
  ]
}
```

---

### 7. Podcast RSS Feed Parser
Fetches and parses standard XML/RSS podcast feeds into structured JSON episode lists.

- **Method**: `GET`
- **Path**: `/api/podcast/rss`
- **Query Parameters**:
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `url` | string | **Yes** | Valid HTTPS RSS feed URL |
  | `showId` | string | Optional | Parent podcast ID for reference |

- **Sample Response**: `200 OK`
```json
{
  "count": 50,
  "episodes": [
    {
      "id": "ep_1535844019_0_982341",
      "showId": "1535844019",
      "title": "Master Your Sleep & Be More Alert When Awake",
      "description": "Dr. Andrew Huberman discusses science-backed tools for sleep optimization...",
      "audioUrl": "https://traffic.megaphone.fm/HUB349281.mp3",
      "pubDate": "Jan 12, 2026",
      "durationMs": 7200000,
      "artworkUrl": "https://images.unsplash.com/photo-1507679799987-c73779587ccf"
    }
  ]
}
```

---

### 8. Stream URL Resolver
Inspects remote playlists (`.m3u`, `.pls`, redirect links) and extracts the raw direct audio stream URL.

- **Method**: `GET`
- **Path**: `/api/stream/resolve`
- **Query Parameters**:
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `url` | string | **Yes** | Any audio or playlist link |

- **Sample Response**: `200 OK`
```json
{
  "resolvedUrl": "https://ice1.somafm.com/groovesalad-128-mp3",
  "contentType": "audio/mpeg",
  "type": "direct"
}
```

---

### 9. Audio Stream Relay Proxy
High-performance streaming proxy that converts insecure `http://` streams and HLS `.m3u8` playlists into CORS-enabled, HTTPS audio streams.

- **Method**: `GET`
- **Path**: `/api/stream/proxy`
- **Query Parameters**:
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `url` | string | **Yes** | Upstream audio stream URL |

- **Headers Returned**:
  - `Content-Type`: `audio/mpeg`, `audio/aac`, `application/vnd.apple.mpegurl`
  - `Access-Control-Allow-Origin`: `*`
  - `Connection`: `keep-alive`

---

### 10. Remote Configuration
Serves operational parameters, network timeout thresholds, and version telemetry.

- **Method**: `GET`
- **Path**: `/api/remote-config`
- **Sample Response**: `200 OK`
```json
{
  "ads_enabled": false,
  "auto_quality_adaptive": true,
  "min_buffer_ms_cellular": 20000,
  "max_buffer_ms_cellular": 60000,
  "show_network_quality_badge": true,
  "latest_version_code": 31,
  "latest_version_name": "3.1.0",
  "server_time": 1773646045000
}
```

---

### 11. AI Music Insights & Commentary
Generates dynamic radio host introductions, station trivia, and genre insights using Google Gemini (`gemini-3.7-flash`).

- **Method**: `GET`
- **Path**: `/api/ai/insights`
- **Query Parameters**:
  | Parameter | Type | Required | Default | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | string | Optional | `Radio Station` | Station name |
  | `genre` | string | Optional | `Music` | Musical genre |

- **Sample Response**: `200 OK`
```json
{
  "source": "gemini_ai",
  "stationName": "SomaFM: Groove Salad",
  "genre": "Ambient & Chill",
  "commentary": "Welcome to SomaFM Groove Salad! Broadcasting pristine downtempo ambient electronica straight from San Francisco.",
  "trivia": "Groove Salad has been broadcasting uninterrupted chillout music since 2000."
}
```

---

### 12. AI Audio Troubleshooter
Diagnoses client-side playback issues, browser audio context suspensions, and hardware acceleration conflicts.

- **Method**: `POST`
- **Path**: `/api/ai/troubleshoot`
- **Request Body**:
```json
{
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...",
  "errorLogs": [
    "AudioContext was not allowed to start due to autoplay policy",
    "Buffer underflow on stream"
  ]
}
```

- **Sample Response**: `200 OK`
```json
{
  "source": "gemini_ai",
  "recommendations": [
    "Enable audio autoplay permissions for this domain in your browser settings.",
    "Click 'Force Restart Engine' to reset the Web Audio hardware pipeline.",
    "Toggle 'Data Saver' under Settings if experiencing cellular buffer underruns."
  ],
  "insights": "Chromium browsers suspend Web Audio Contexts until the first user interaction."
}
```
