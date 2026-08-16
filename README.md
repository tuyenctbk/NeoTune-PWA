# NeoTune: Cross-Platform Streaming Audio & Global Radio Hub

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio-10--Band%20DSP-A855F7?logo=audio-technica&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![PWA](https://img.shields.io/badge/PWA-Installable-22C55E?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)

**NeoTune** is an enterprise-grade, high-performance streaming audio platform and Progressive Web Application (PWA) engineered for Web, Mobile, Desktop, and Smart TVs. It unifies access to **over 50,000+ live global radio stations**, **millions of podcast episodes with RSS feed parsing**, **a Web Audio DSP processing suite with a 10-band Equalizer and Spatial Audio**, **real-time 60fps canvas visualizers**, and **cross-device cloud synchronization via Firebase Firestore**.

---

## 🌟 Comprehensive Feature Matrix

### 📻 1. Global Live Radio Discovery (50,000+ Stations)
- **Multi-DNS Failover Mirrors**: Queries Radio-Browser with automated mirror rotation (`all`, `de1`, `nl1`, `at1`, `fr1`) and instantaneous fallback.
- **Smart Filtering & Tag Engine**: Search stations by name, genre/tag, country ISO code, popularity, click-trend, or bit-rate.
- **HTTPS & CORS Audio Relay Proxy**: High-throughput Express backend streaming proxy that converts insecure `http://` Icecast streams and HLS `.m3u8` playlists into secure, browser-playable HTTPS streams.
- **ICY Metadata Extraction**: Live detection of current artist and song title streaming directly from Shoutcast/Icecast headers with Google & YouTube search shortcuts.
- **Custom Station Manager**: Add personal Icecast, Shoutcast, or HLS `.m3u8` stream URLs with custom artwork and tag categorization.

### 🎙️ 2. Comprehensive Podcast Suite
- **Global Podcast Search**: Integrated with Apple iTunes Podcast Directory API.
- **Built-in RSS XML Feed Parser**: Extracts episode descriptions, high-resolution artwork, publication dates, durations, and audio enclosures.
- **Smart Resume Engine**: Remembers exact playback timestamps per episode for seamless continuation across devices.
- **Variable Speed & Seeking**: Skip backward 15s / forward 30s with variable speeds (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`).

### 🎛️ 3. Web Audio DSP & Studio Sound Engine
- **10-Band Parametric Equalizer**: 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, and 16kHz biquad filters with preamp gain.
- **Spatial Audio & Convolver**: Acoustic room simulations including Stage Widener, Studio Room, and Concert Hall reverb.
- **Bass Enhancer & Dynamic Compressor**: Punchy sub-bass harmonics without acoustic distortion or clipping.
- **Live Stream Recording**: Record live audio into high-fidelity `.webm` (Opus) or `.wav` tracks directly in the browser via `MediaRecorder`.
- **6 Real-Time Canvas Visualizers**:
  1. *Frequency Bars* (Neon spectrum analyzer with floating peak caps)
  2. *Oscilloscope* (Real-time analog wave rendering)
  3. *Circular Radial* (Pulsing 360-degree bass ring)
  4. *Rainbow Waves* (Fluid color-shifting wave)
  5. *Neon Ribbons* (Flowing multi-tier spatial ribbons)
  6. *Cyberpunk Matrix* (Digital grid telemetry)

### 🎨 4. UX/UI Design System & 6 Themes
- **Hyper-Clean Glassmorphism**: Mathematical padding and nested corner radius ratios.
- **6 Handcrafted Themes**:
  - *Frosted Glass (Default)*: Deep violet `#0A050E` with purple & pink luminescent accents.
  - *Cyberpunk Neon*: Midnight `#05050A` with cyan `#00F0FF` and magenta `#FF0055` laser accents.
  - *Warm Vintage Jazz*: Espresso `#120E0A` with warm amber `#F59E0B` and brass accents.
  - *Electric Rock*: Obsidian `#0A0A0A` with crimson red `#EF4444` and electric orange.
  - *Pure OLED Dark*: True black `#000000` with emerald green `#22C55E` and zero battery drain.
  - *Daylight Blue Glass*: Deep slate navy `#0F172A` with sky blue `#38BDF8` and indigo highlights.

### 📱 5. Multi-Device Ergonomics
- **🚗 Car Mode**: Large 64px+ touch targets, high contrast, distraction-free playback, and one-tap 6-station preset grid.
- **📺 Smart TV 10-Foot Navigation**: Full D-Pad keyboard and remote control focus engine (`TVFocusManager`) with high-visibility neon selection rings.
- **🌙 OLED Screensaver**: Burn-in safe drifting digital clock, subtle floating visuals, and minimalist track info.
- **⏰ Radio Alarm Clock**: Wake up to any live radio station with synthesized Google Gemini AI weather briefing and TTS morning greeting.
- **⏳ Smart Sleep Timer**: Gradual exponential volume fade-out before audio suspension.

### 🌍 6. Internationalization & Accessibility (50 Languages)
- **50 Global Locales**: Complete localized dictionary support (English, Vietnamese, Spanish, French, German, Japanese, Chinese, Korean, Arabic, Hindi, Portuguese, Russian, and 38 more).
- **Bi-directional Engine**: Automated text direction switching (`dir="rtl"` / `dir="ltr"`) for Arabic, Hebrew, Urdu, and Persian.
- **Voice Control Service**: Hands-free voice recognition allowing vocal commands: *"Play Jazz"*, *"Volume Up"*, *"Next Station"*, *"Mute"*, etc.

### ☁️ 7. Cloud Sync & Cross-Device Handoff
- **Firebase Firestore Cloud Sync**: Real-time cross-device synchronization of favorites, custom stations, listening habits, and active device handoff.
- **Multi-Platform Support**: Web, PWA, and Android (`com.neotune.radio`).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18.3.1, TypeScript 5.5, Vite 5.4 |
| **Styling & Design Tokens**| Tailwind CSS 4.0, Lucide Icons, Glassmorphism Tokens |
| **Audio Processing** | Web Audio API (`AudioContext`, `BiquadFilterNode`, `ConvolverNode`, `AnalyserNode`, `MediaRecorder`), HLS.js |
| **Backend & Proxy** | Node.js, Express, `node:stream`, `node:http`, `@google/genai` (Gemini 3.7 Flash) |
| **Cloud & Database** | Firebase Firestore, Firebase Authentication, IndexedDB, LocalStorage |
| **Internationalization** | Zero-Dependency Reactive i18n Hook (`useTranslation`) with 50 locales & RTL |
| **Platform Packaging** | Progressive Web App (PWA) Manifest, Service Worker Caching |

---

## 📂 Documentation Library

- 🎨 **[PWA UX/UI Design Specifications](PWA_UX_UI_DESIGN_SPEC.md)** — Exhaustive design system, themes, mathematical spacing, layouts, and motion guidelines.
- 👤 **[User Guide & Operator Manual](USER_GUIDE.md)** — Step-by-step user manual, shortcuts, voice commands, and feature guides.
- 🏗️ **[System Architecture Documentation](ARCHITECTURE.md)** — Component hierarchy, data flow, state management, and cloud synchronization.
- 🎛️ **[Audio Engine & Web Audio DSP Guide](AUDIO_ENGINE_GUIDE.md)** — 10-band EQ mathematics, spatial acoustic impulse responses, and FFT canvas visualizer algorithms.
- 📘 **[REST API Documentation](API_DOCUMENTATION.md)** — Backend proxy endpoints, payload schemas, and error codes.
- 🔥 **[Firebase Integration Guide](FIREBASE_INTEGRATION_GUIDE.md)** — Firestore security rules, collection schemas, and multi-platform Android/Web setup.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn

### Installation
```bash
# Clone repository
git clone <repository-url>
cd neotune

# Install dependencies
npm install
```

### Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### Running Locally
```bash
# Boots backend Express server + Vite client on port 3000
npm run dev
```
Open `http://localhost:3000` in your web browser.

### Building for Production
```bash
# Compile client assets & bundle server.ts into dist/server.cjs
npm run build

# Start the compiled production server
npm run start
```
