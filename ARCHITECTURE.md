# NeoTune: Cross-Platform Streaming Audio & Radio Architecture Documentation

## 1. System Architecture & High-Level Topology

NeoTune is architected as an offline-capable Progressive Web Application (PWA) backed by a high-throughput Node.js/Express audio proxy and Google Firebase Firestore for real-time cloud data synchronization.

```
+---------------------------------------------------------------------------------------------------+
|                                     CLIENT APPLICATION LAYER (React 18 + TypeScript)              |
|                                                                                                   |
|   +-------------------+  +--------------------+  +--------------------+  +--------------------+   |
|   |    RadioView      |  |    PodcastsView    |  |   FavoritesView    |  |    SettingsView    |   |
|   | (50k+ Stations)   |  | (Apple RSS Engine) |  | (Habits & Analytics)|  | (DSP & Theme Hub) |   |
|   +---------+---------+  +---------+----------+  +---------+----------+  +---------+----------+   |
|             |                      |                       |                       |              |
|             +----------------------+-----------------------+-----------------------+              |
|                                            |                                                      |
|   +----------------------------------------v--------------------------------------------------+   |
|   |                         PERSISTENT AUDIO CONTROLLER & DOCKED MINIPLAYER                   |   |
|   |         - FullPlayerModal (6 Canvas Visualizers, ICY Metadata, Stream Recorder)           |   |
|   |         - CarModeView (High-Contrast Large Targets) | TVFocusManager (D-Pad 10-Foot UI)   |   |
|   +----------------------------------------+--------------------------------------------------+   |
+--------------------------------------------|------------------------------------------------------+
                                             |
                   +-------------------------+-------------------------+
                   |                                                   |
+------------------v------------------+             +------------------v------------------+
|      WEB AUDIO DSP AUDIO ENGINE     |             |      DATA PERSISTENCE & CLOUD       |
|    (`src/services/audioEngine.ts`)  |             |      (`src/services/`)              |
|  - HTML5 Audio & HLS.js Demuxer     |             |  - Firebase Firestore (`sentry-hub`)|
|  - 10-Band Biquad Parametric EQ     |             |  - Firebase Auth (Google & Email)   |
|  - Spatial Convolver Reverb Matrix  |             |  - IndexedDB (Offline Station DB)   |
|  - Bass Enhancer & Dynamic Comp     |             |  - LocalStorage / Safe Fallback     |
|  - 60fps FFT Visualizer Analyser    |             |  - i18n Engine (50 Global Locales)  |
|  - MediaRecorder Stream Capture     |             |  - Voice Control SpeechRecognition  |
+------------------+------------------+             +-------------------------------------+
                   |
+------------------v--------------------------------------------------------------------------------+
|                         BACKEND PROXY & COMPUTE SERVICES (`server.ts`)                            |
|  - HTTPS / CORS Stream Proxy Relay (Streams Icecast, Shoutcast, & HLS without browser blocks)     |
|  - Real-Time ICY Metadata Stream Extractor (`/api/metadata`)                                      |
|  - Radio-Browser Multi-DNS Resolver & Mirror Failover (`/api/stations/*`)                         |
|  - Podcast RSS XML Feed Parser & iTunes Search API (`/api/podcasts/*`)                             |
|  - Google Gemini 3.7 Flash AI Morning Briefing & Genre Categorization (`@google/genai`)           |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Audio Processing Pipeline (Web Audio API)

The audio engine (`src/services/audioEngine.ts`) routes audio from HTML5 Media Elements or HLS.js through a low-latency Web Audio DSP node graph:

```
[MediaElement (Icecast/HLS/MP3)]
              │
              ▼
 [MediaElementAudioSourceNode]
              │
              ▼
   [Preamp Gain Node (dB)]
              │
              ▼
 [10-Band Biquad Filter Array] (32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz)
              │
              ▼
 [Bass Booster Harmonic Filter]
              │
              ▼
 [Spatial Convolver Reverb Node] (Impulse Response Synthesis: Stage, Studio, Hall)
              │
              ▼
   [Dynamic Compressor Node] (Threshold: -24dB, Knee: 30, Ratio: 12, Attack: 3ms, Release: 250ms)
              │
              ▼
  [Master Volume Gain Node] (Volume curves & smooth sleep timer fade-outs)
              │
      ┌───────┴───────┐
      ▼               ▼
[AnalyserNode]  [AudioDestinationNode] (Speakers / Headphones)
      │
      ▼
[6-Mode 60fps Canvas Visualizers]
```

---

## 3. PWA Lifecycle, Service Worker & Offline Caching

NeoTune is engineered as an offline-first Progressive Web Application:

1. **Service Worker Layer**: Pre-caches the application shell (HTML, CSS, JS bundles, icon assets, fonts) on initial install.
2. **IndexedDB Offline Station Cache (`src/services/indexedDBService.ts`)**:
   - Stores up to 10,000 recently browsed and favorite stations locally.
   - Provides instant instant-on station search even in airplane mode or unstable network environments.
3. **PWA Installation Workflow (`src/components/dialogs/PWAInstallModal.tsx`)**:
   - Monitors `beforeinstallprompt` event on Chromium browsers.
   - Provides guided visual prompts for iOS Safari (*"Tap Share > Add to Home Screen"*) and Android Chrome.

---

## 4. Multi-Platform Cloud Synchronization (`sentry-hub`)

Connected to the Firebase `sentry-hub` project:

### Supported Platforms:
- **Web / PWA Application**: App ID `1:770166560462:web:260911451b591a00a9229f`
- **Android Application**: Package `com.neotune.radio` (App Name: `Neotune Android`)

### Firestore Schema:
- `/users/{userId}/favorites/{stationId}`: Pinned stations, custom metadata, and added timestamps.
- `/users/{userId}/custom_stations/{stationId}`: User-defined stream URLs and logos.
- `/users/{userId}/playback_state/current`: Active station ID, volume, and playback position for multi-device handoff.
- `/users/{userId}/listening_habits/{month}`: Total hours, top genres, and station frequency telemetry.

---

## 5. UI/UX Component Hierarchy & Navigation Flow

```
App.tsx (Root Controller & Theme Injector)
 ├── ErrorBoundary (Crash Guard & Recovery)
 ├── Navbar (Top Bar, Quick Search, 50-Lang Picker, Car/TV/Screensaver Mode Triggers)
 ├── Main View Switcher
 │    ├── RadioView (Explorer, Bento Station Cards, Tag Cloud, Country Browser)
 │    ├── PodcastsView (iTunes Search, Episode Slider Drawer, Variable Speed Player)
 │    ├── FavoritesView (Pinned Grid, Habits Charts, Horizontal Tag Swipe, Custom Stations)
 │    └── SettingsView (6 Themes, Audio Quality, Cache Manager, Cloud Sync, Telemetry)
 ├── MiniPlayer (Docked Audio Bar, ICY Song Marquee, Mini EQ, Record Button)
 └── Modals & Overlays
      ├── FullPlayerModal (6 Canvas Visualizers, Live Recording, Song Search)
      ├── CarModeView (Distraction-Free Automotive Safe UI)
      ├── ScreensaverView (OLED Burn-in Safe Drifting Canvas)
      ├── TVFocusManager (D-Pad 10-Foot Living Room Navigation)
      ├── EqualizerModal (10-Band Biquad EQ, Bass Boost, Spatial Reverb)
      ├── AlarmModal (Gemini AI Morning Weather Briefing & Radio Alarm)
      ├── SleepTimerModal (Exponential Volume Fade-Out)
      ├── DiagnosticsModal (Buffer Health, Bitrate, TTFB Graph)
      └── CountryPickerModal (100+ ISO Countries with National Flags)
```
