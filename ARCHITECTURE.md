# NeoTune: Cross-Platform Streaming Audio & Radio Architecture Documentation

## 1. Executive Summary & Overview
**NeoTune** is a modern, high-performance streaming audio platform engineered for Web, PWA, Mobile, Desktop, and Smart TVs. It unifies access to **50,000+ live global radio stations**, **podcasts with RSS parsing**, **Web Audio DSP processing (10-Band Equalizer & Spatial Audio)**, **real-time visualizers**, and **cross-device cloud synchronization**.

---

## 2. System Architecture

```
                                  +-----------------------------+
                                  |     User Interfaces / Views |
                                  | (Radio, Podcast, TV, Car)   |
                                  +--------------+--------------+
                                                 |
                   +-----------------------------+-----------------------------+
                   |                             |                             |
       +-----------v------------+    +-----------v------------+    +-----------v------------+
       |   Audio Engine (DSP)   |    |    State & Cloud Sync  |    |  i18n & Accessibility  |
       |  - Web Audio Context   |    |   - Firebase Firestore |    |  - 50 Global Locales   |
       |  - 10-Band Equalizer   |    |   - IndexedDB Storage  |    |  - RTL / LTR Engine    |
       |  - HLS.js / Icecast    |    |   - Local Fallback     |    |  - Voice Control       |
       +-----------+------------+    +-----------+------------+    +------------------------+
                   |                             |
                   +--------------+--------------+
                                  |
                   +--------------v--------------+
                   | Express Backend & Proxy API |
                   |  - Radio-Browser Mirrors    |
                   |  - Live Metadata (ICY)      |
                   |  - RSS / Podcast Parser     |
                   |  - Gemini AI Recommendation |
                   +-----------------------------+
```

---

## 3. Core Modules & Engine Specifications

### 3.1 Audio Engine (`src/services/audioEngine.ts`)
- **Streaming Protocols**: Supports direct HTTP/HTTPS audio streams (`MP3`, `AAC`, `OGG`, `OPUS`) and adaptive bitrate HLS (`m3u8`) with automatic fallback.
- **Web Audio DSP Pipeline**:
  - `AudioContext` with `MediaElementAudioSourceNode` routing.
  - **10-Band Biquad Parametric EQ**: 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz with preamp gain control.
  - **Spatial Audio Convolver**: Simulates room acoustics, stage wideners, and concert hall ambiance.
  - **Dynamic Compressor & Bass Booster**: Low-frequency harmonics booster without audio clipping.
  - **Audio Recording**: In-memory `MediaRecorder` stream recording directly into downloadable `.webm`/`.wav` files.
- **Audio Diagnostics & Telemetry**:
  - Live buffer health monitoring, Time To First Byte (TTFB), Bitrate detector, packet drop logs.

### 3.2 Backend Service & Proxy Server (`server.ts`)
- **Express Reverse Proxy**: Resolves mixed-content HTTP radio streams over HTTPS to prevent browser CORS and mixed-content security blocks.
- **ICY Metadata Extractor**: Real-time extraction of currently playing track name and artist from Icecast/Shoutcast metadata stream headers.
- **Podcast RSS Engine**: Fast XML parser resolving podcast episodes, duration, release dates, and audio enclosures.
- **AI Recommendation Engine**: Integrated server-side with Google GenAI (`@google/genai`) for intelligent genre classification and personalized radio discovery.

### 3.3 Storage, Caching & Cloud Synchronization (`src/services/`)
- **Multi-tiered Persistence**:
  1. **Firebase Firestore & Auth (`firebaseService.ts`)**: Connected to project `sentry-hub`. Real-time multi-device cloud synchronization for favorites, playlists, alarm schedules, and playback session handoff between devices.
  2. **Firebase Analytics**: Track user listening sessions and stream stability using Google Analytics `G-Z9850X9XBN`.
  3. **Multi-Platform Support**:
     - **Web / PWA**: App ID `1:770166560462:web:260911451b591a00a9229f` (Nickname: *NeoTune PWA*).
     - **Android**: Package `com.neotune.radio` (App Name: *Neotune Android*).
  4. **IndexedDB (`indexedDBService.ts`)**: Offline station database and cached podcast metadata.
  5. **Local Storage & Safe Fallback (`storageService.ts`)**: Zero-crash safe memory storage for iframe environments.

### 3.4 Localization & Accessibility Engine (`src/services/i18n.ts`)
- **50 Global Locales**: Full dictionary translations for English, Vietnamese, Spanish, French, German, Japanese, Chinese, Korean, Arabic (RTL), Hindi, Russian, Portuguese, and more.
- **Bi-directional Layout**: Automated `dir="rtl"` and document `lang` attribute switching for seamless Arabic, Hebrew, Persian, and Urdu support.
- **Voice Control Service (`voiceControlService.ts`)**: Hands-free voice recognition allowing commands like *"Play Jazz"*, *"Next Station"*, *"Mute"*, and *"Volume Up"*.

---

## 4. Primary Views & Capabilities

| View / Feature | Key Capabilities |
| :--- | :--- |
| **Radio View (`RadioView.tsx`)** | Filter 50,000+ stations by genre, country, popularity; live search; quick pin favorites; studio player fragment. |
| **Podcasts View (`PodcastsView.tsx`)** | Search podcast shows; browse episode guides; resume playback position with timestamp memory. |
| **Studio / Full Player (`FullPlayerModal.tsx`)** | 6 Canvas Visualizer Skins (Bars, Oscilloscope, Circular, Rainbow, Neon Ribbons, Cyberpunk Matrix); ICY lyrics & track artwork. |
| **Car Mode (`CarModeView.tsx`)** | High-contrast, large touch targets with one-tap favorites and distraction-free audio controls. |
| **TV Mode (`TVFocusManager.tsx`)** | D-pad / Remote control navigation, focus rings, and high-visibility typography for Smart TVs and projectors. |
| **Radio Alarm Clock (`AlarmModal.tsx`)** | Wake up to favourite live radio station, custom TTS weather announcements, and smart snooze intervals. |
| **Sleep Timer (`SleepTimerModal.tsx`)** | Customizable auto-off countdown with smooth volume fade-out. |

---

## 5. Environment & Deployment Setup

### Scripts (`package.json`)
- `npm run dev`: Boots full-stack development environment (`tsx server.ts`).
- `npm run build`: Compiles Vite static assets and bundles `server.ts` into a standalone CommonJS binary (`dist/server.cjs`).
- `npm run start`: Production server launch (`node dist/server.cjs`).
- `npm run lint`: Strict TypeScript validation (`tsc --noEmit`).

### Environment Variables (`.env.example`)
```env
PORT=3000
GEMINI_API_KEY=
FIREBASE_CONFIG=
```
