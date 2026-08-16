# NeoTune: Cross-Platform Streaming Audio & Global Radio Hub

NeoTune is an enterprise-grade, high-performance streaming audio platform engineered for the modern web, progressive web apps (PWA), desktop, mobile, and Smart TVs. It unifies access to **over 50,000+ live global radio stations**, **millions of podcast episodes with RSS parsing**, **a Web Audio DSP processing suite with a 10-band Equalizer and Spatial Audio**, **real-time canvas visualizers**, and **cross-device cloud synchronization via Firebase Firestore**.

---

## 🌟 Key Features

### 📻 1. Global Live Radio Discovery (50,000+ Stations)
- **Multi-DNS Failover Mirrors**: Queries Radio-Browser with automated mirror rotation (`all`, `de1`, `nl1`, `at1`, `fr1`) and instantaneous curated fallback.
- **Smart Filtering**: Search stations by name, genre/tag, country ISO code, popularity, click-trend, or bit-rate.
- **HTTPS & CORS Audio Relay Proxy**: High-throughput Express backend streaming proxy that converts insecure `http://` Icecast streams and HLS `.m3u8` playlists into secure, browser-playable HTTPS streams.
- **ICY Metadata Extraction**: Live detection of current artist and song title streaming directly from Shoutcast/Icecast headers.

### 🎙️ 2. Comprehensive Podcast Suite
- **Global Podcast Search**: Integrated with Apple iTunes Podcast Directory API.
- **Built-in RSS XML Feed Parser**: Extracts episode descriptions, high-resolution artwork, publication dates, durations, and audio enclosures.
- **Smart Resume**: Remembers exact playback timestamps per episode for seamless continuation.

### 🎛️ 3. Web Audio DSP & Studio Sound Engine
- **10-Band Parametric Equalizer**: 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, and 16kHz biquad filters with preamp gain.
- **Spatial Audio & Convolver**: Acoustic simulations including Stage Widener, Studio Room, and Concert Hall reverb.
- **Bass Enhancer & Dynamic Compressor**: Punchy sub-bass harmonics without acoustic distortion or clipping.
- **Live Stream Recording**: Record live audio into high-fidelity `.webm` or `.wav` tracks directly in the browser via `MediaRecorder`.
- **6 Canvas Visualizers**: Real-time FFT spectrum visualizer skins:
  1. *Frequency Bars* (Neon spectrum analyzer)
  2. *Oscilloscope* (Real-time analog wave rendering)
  3. *Circular Radial* (Pulsing 360-degree bass ring)
  4. *Rainbow Waves* (Fluid color-shifting wave)
  5. *Neon Ribbons* (Flowing multi-tier spatial ribbons)
  6. *Cyberpunk Matrix* (Digital grid telemetry)

### 🌍 4. Internationalization & Accessibility (50 Languages)
- **50 Global Locales**: Complete localized dictionary support (English, Vietnamese, Spanish, French, German, Japanese, Chinese, Korean, Arabic, Hindi, Portuguese, Russian, and 38 more).
- **Bi-directional Engine**: Automated text direction switching (`dir="rtl"` / `dir="ltr"`) and document attributes for Arabic, Hebrew, Urdu, and Persian.
- **Voice Control Service**: Hands-free voice recognition allowing vocal commands: *"Play Jazz"*, *"Volume Up"*, *"Next Station"*, *"Mute"*, etc.

### 📱 5. Multi-Device Experience (Car, TV, PWA & Cloud Sync)
- **Car Mode**: High-contrast, large touch targets, distraction-free playback, and one-tap station presets.
- **Smart TV 10-Foot Navigation**: Full D-Pad keyboard and remote control focus engine (`TVFocusManager`) with high-visibility selection rings.
- **OLED Screensaver**: Burn-in safe clock, subtle floating visuals, and minimalist track info.
- **Radio Alarm Clock**: Wake up to any live radio station with synthesized TTS weather and daily briefing.
- **Smart Sleep Timer**: Gradual exponential volume fade-out before audio suspension.
- **Firebase Firestore Cloud Sync**: Real-time cross-device synchronization of favorites, custom stations, listening habits, and active device handoff.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & UI** | Tailwind CSS, Lucide Icons, Headless UI Patterns |
| **Audio Processing** | Web Audio API (`AudioContext`, `BiquadFilterNode`, `ConvolverNode`, `AnalyserNode`, `MediaRecorder`), HLS.js |
| **Backend & Proxy** | Node.js, Express, `node:stream`, `node:http`, `@google/genai` (Gemini 3.7 Flash) |
| **Cloud & Database** | Firebase Firestore, Firebase Authentication, IndexedDB, LocalStorage |
| **Internationalization** | Custom Zero-Dependency Reactive i18n Hook (`useTranslation`) with 50 locales |
| **Platform Packaging** | Progressive Web App (PWA) Manifest, Service Worker |

---

## 📂 Directory Structure

```text
/
├── ARCHITECTURE.md             # System architecture & high-level component diagrams
├── API_DOCUMENTATION.md        # Complete REST API reference with payload schemas
├── AUDIO_ENGINE_GUIDE.md       # Deep dive into Web Audio DSP & visualizers
├── FIREBASE_INTEGRATION_GUIDE.md # Multi-platform Firebase setup (Web & Android)
├── USER_GUIDE.md               # End-user manual, shortcuts & voice commands
├── package.json                # Dependencies and build scripts
├── server.ts                   # Express proxy server, RSS parser & Gemini AI gateway
├── firebase-applet-config.json # Firebase Web App configuration
├── firestore.rules             # Firebase Firestore security rules
├── firebase-blueprint.json     # Firestore collections schema definition
├── src/
│   ├── main.tsx                # Client application bootstrap
│   ├── App.tsx                 # Core app state coordinator & view switcher
│   ├── index.css               # Global Tailwind stylesheet and design tokens
│   ├── types.ts                # TypeScript global interfaces, models & enums
│   ├── components/
│   │   ├── Navbar.tsx          # Responsive navigation sidebar & header
│   │   ├── MiniPlayer.tsx      # Persistent bottom dock audio player
│   │   ├── FullPlayerModal.tsx # Immersive studio player with visualizers
│   │   ├── StationCard.tsx     # Radio station tile with play/fav actions
│   │   ├── PodcastCard.tsx     # Podcast show tile
│   │   ├── VisualizerCanvas.tsx# 6-Mode Web Audio FFT Canvas Visualizer
│   │   ├── CarModeView.tsx     # Distraction-free driver interface
│   │   ├── TVFocusManager.tsx  # D-pad remote navigation for Smart TVs
│   │   ├── ScreensaverView.tsx # OLED burn-in safe ambient screensaver
│   │   ├── dialogs/            # Modals: EQ, Alarm, Sleep Timer, Diagnostics, etc.
│   │   └── ...
│   ├── views/
│   │   ├── RadioView.tsx       # Primary radio explorer, search & genres
│   │   ├── PodcastsView.tsx    # Podcast directory & episode player
│   │   ├── FavoritesView.tsx   # Pinned stations, recents & custom URLs
│   │   └── SettingsView.tsx    # Audio preferences, cloud sync & themes
│   ├── services/
│   │   ├── audioEngine.ts      # Web Audio DSP pipeline, EQ & recording
│   │   ├── apiService.ts       # Frontend client for backend proxy endpoints
│   │   ├── firebaseService.ts  # Firestore real-time sync & auth
│   │   ├── indexedDBService.ts # Offline station cache & IndexedDB store
│   │   ├── storageService.ts   # Safe fallback storage layer
│   │   ├── i18n.ts             # 50-language translation dictionary & RTL logic
│   │   ├── voiceControlService.ts # Hands-free SpeechRecognition engine
│   │   └── diagnosticsService.ts # Stream telemetry, TTFB & buffer health
│   └── utils/
│       ├── haptics.ts          # Mobile vibration feedback
│       └── ...
```

---

## 🔥 Firebase Multi-Platform Configuration (`sentry-hub`)

NeoTune is connected to the `sentry-hub` Firebase project supporting Web, PWA, and Android platforms:

### 📱 Android Application
- **App Name**: `Neotune Android`
- **Package Name**: `com.neotune.radio`
- **Target OS**: Android (Mobile, Tablet, Android Auto, Android TV)

### 🌐 Web Application
- **App Nickname**: `NeoTune PWA`
- **App ID**: `1:770166560462:web:260911451b591a00a9229f`
- **Measurement ID**: `G-Z9850X9XBN`
- **Auth Domain**: `sentry-hub.firebaseapp.com`
- **Storage Bucket**: `sentry-hub.firebasestorage.app`

For detailed setup, rules, and Firestore schemas, see [Firebase Integration Guide](FIREBASE_INTEGRATION_GUIDE.md).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd neotune

# Install dependencies
npm install
```

### Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```env
PORT=3000
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### Running Locally
```bash
# Start development server (boots backend Express + Vite on port 3000)
npm run dev
```
Navigate to `http://localhost:3000` in your browser.

### Building for Production
```bash
# Compile client assets & bundle server.ts into dist/server.cjs
npm run build

# Start the compiled production server
npm run start
```

---

## 📖 Further Documentation
- 📘 [API Documentation](API_DOCUMENTATION.md) — Backend endpoints, parameters, and payloads.
- 🎛️ [Audio Engine Guide](AUDIO_ENGINE_GUIDE.md) — DSP pipeline, 10-band EQ specifications, and FFT visualizers.
- 👤 [User Guide](USER_GUIDE.md) — End-user instructions, voice commands, and shortcuts.
- 🏗️ [Architecture Overview](ARCHITECTURE.md) — High-level module architecture and data flow diagrams.
