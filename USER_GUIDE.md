# NeoTune PWA: Comprehensive User Guide & Feature Manual

Welcome to **NeoTune**, the ultimate cross-platform streaming audio hub and Progressive Web Application (PWA). This manual details every feature, screen layout, interaction pattern, keyboard shortcut, voice command, and audio DSP setting available in the app.

---

## Table of Contents
1. [Application Architecture & Main Navigation](#1-application-architecture--main-navigation)
2. [Radio Discovery & Playback Engine (50,000+ Stations)](#2-radio-discovery--playback-engine-50000-stations)
3. [Podcast Hub & Episode Manager](#3-podcast-hub--episode-manager)
4. [Favorites, Recents & Custom Stream URLs](#4-favorites-recents--custom-stream-urls)
5. [Immersive Studio Player & 60fps Canvas Visualizers](#5-immersive-studio-player--60fps-canvas-visualizers)
6. [10-Band Parametric Equalizer & Spatial Audio Suite](#6-10-band-parametric-equalizer--spatial-audio-suite)
7. [Device Ergonomics (Car Mode, 10-Foot Smart TV, OLED Screensaver)](#7-device-ergonomics-car-mode-10-foot-smart-tv-oled-screensaver)
8. [Radio Alarm Clock & Smart Sleep Timer](#8-radio-alarm-clock--smart-sleep-timer)
9. [Voice Control & Speech Recognition](#9-voice-control--speech-recognition)
10. [Keyboard Shortcuts Cheat Sheet](#10-keyboard-shortcuts-cheat-sheet)
11. [50-Language Localization & RTL Support](#11-50-language-localization--rtl-support)
12. [Cloud Sync & Cross-Device Handoff (Firebase)](#12-cloud-sync--cross-device-handoff-firebase)
13. [PWA Installation & Offline Capabilities](#13-pwa-installation--offline-capabilities)
14. [Stream Diagnostics & Troubleshooting](#14-stream-diagnostics--troubleshooting)

---

## 1. Application Architecture & Main Navigation

NeoTune's user interface is organized into a persistent, accessible layout designed for single-tap audio management:

- **Top Navigation Bar (`Navbar.tsx`)**:
  - **Logo & Live Status Indicator**: Displays live streaming pulse and app version.
  - **Global Quick Search (<kbd>/</kbd> or <kbd>Ctrl+K</kbd>)**: Omni-search modal for stations, podcasts, genres, and countries.
  - **Quick Genre Chips**: Fast filtering across popular genres (Ambient, Pop, Rock, Electronic, Jazz, Classical, News).
  - **Language Selector (🌐)**: Instant switching between 50 localized languages with bi-directional layout support.
  - **Specialized Mode Launchers**: Quick buttons for Car Mode (🚗), TV Mode (📺), and Screensaver (🌙).
  - **User Account & Cloud Sync**: Firebase authentication and sync status indicator.
- **Side Navigation (Desktop) / Bottom Nav Bar (Mobile)**:
  - 📻 **Radio**: Global live radio directory and genre explorer.
  - 🎙️ **Podcasts**: Apple iTunes podcast directory with full episode guide.
  - ❤️ **Favorites**: Pinned stations, recent listening history, listening habits analytics, and custom URLs.
  - ⚙️ **Settings**: Audio buffer config, EQ presets, theme customization, cloud backup, and cache manager.
- **Persistent MiniPlayer Dock (`MiniPlayer.tsx`)**:
  - Anchored at the bottom of every screen.
  - Real-time ICY song/artist metadata marquee with Google & YouTube search buttons.
  - Visualizer button, live recording button, 10-Band Equalizer shortcut, and volume slider.
  - Tap anywhere on the player to expand into the full-screen **Studio Player**.

---

## 2. Radio Discovery & Playback Engine (50,000+ Stations)

NeoTune connects directly to the decentralized Radio-Browser network with automated multi-mirror failover and backend HTTPS stream proxying.

### Key Discovery Features:
1. **Multi-Mirror Failover**: If a primary directory server fails, NeoTune seamlessly rotates through `all.api.radio-browser.info`, `de1`, `nl1`, `at1`, and `fr1` mirrors.
2. **Comprehensive Tag & Genre Filtering**: Select from hundreds of genre tags, mood filters, and musical eras.
3. **Country Browser (100+ Countries)**: Tap the country picker to explore stations by nation, complete with regional flags and live station counts.
4. **Click-Trend & Popularity Ranking**: Discover what listeners worldwide are streaming in real-time.
5. **HTTPS & CORS Proxy Relay**: Automatically converts insecure `http://` Icecast/Shoutcast streams and HLS `.m3u8` playlists into encrypted HTTPS streams playable in modern browsers.
6. **Live ICY Metadata Detection**: Automatically parses Shoutcast/Icecast stream headers to display the current artist, song title, and album art.

---

## 3. Podcast Hub & Episode Manager

Browse and stream millions of podcast episodes directly within the app:

1. **Apple iTunes Directory Search**: Search shows by title, host, network, or topic.
2. **Built-in RSS XML Feed Parser**: Extracts complete show notes, episode descriptions, high-resolution cover art, duration, and publication dates.
3. **Episode Drawer**: Click any podcast show to slide out the episode list.
4. **Dedicated Podcast Controls**:
   - Skip backward 15 seconds (<kbd>J</kbd>) or forward 30 seconds (<kbd>L</kbd>).
   - Variable playback speed: `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`.
   - **Smart Timestamp Resume**: Remembers exact playback position per episode across browser reloads.

---

## 4. Favorites, Recents & Custom Stream URLs

Manage your personalized radio library with rich organization tools:

1. **Pinning Favorites**: Tap the ❤️ Heart icon on any station to pin it to your library.
2. **Tag Filtering & Swiping**: Filter favorites by assigned tags. On touch devices, swipe left or right across the favorites canvas to cycle through tag filters.
3. **Recently Played History**: Automatically logs your latest listened stations with duration and timestamp.
4. **Listening Habits & Analytics**: Interactive charts showing your top genres, total listening hours, and favorite times of day.
5. **Add Custom Station URLs**:
   - Tap **"+ Add Station"** in the Favorites view.
   - Enter any direct Icecast, Shoutcast, or HLS `.m3u8` stream link.
   - Assign custom station names, logos, genres, and country metadata.
6. **Backup & Restore**: Export your complete favorites library as a portable JSON file, or restore from a previous backup.

---

## 5. Immersive Studio Player & 60fps Canvas Visualizers

Tap the MiniPlayer to enter the full-screen **Studio Player Modal (`FullPlayerModal.tsx`)**.

### 6 Real-Time Web Audio Visualizer Modes:
1. 📊 **Frequency Bars**: High-density 64-band FFT spectrum analyzer with vibrant gradient fills and physics-based floating peak decay caps.
2. 〰️ **Oscilloscope**: Direct time-domain analog waveform rendering with anti-aliased quadratic bezier curves.
3. ⭕ **Circular Radial**: 360-degree polar spectrum radiating outward from high-resolution station artwork with bass-responsive pulsing radius.
4. 🌈 **Rainbow Waves**: Multi-tiered fluid sine waves modulated in real time by low-end sub-bass energy.
5. 🎗️ **Neon Ribbons**: 3D perspective spatial ribbons flowing across the canvas according to harmonic frequency bands.
6. 👾 **Cyberpunk Matrix**: Digital cascading matrix telemetry reacting dynamically to audio frequency spikes.

### Live Stream Recording (`MediaRecorder`):
- Click the ⏺️ **Record** button in the Studio Player to capture live broadcast audio.
- Audio is encoded into high-quality `.webm` (Opus) or `.wav` format.
- Click Stop to immediately trigger an automated download with station name and timestamp.

---

## 6. 10-Band Parametric Equalizer & Spatial Audio Suite

Press <kbd>E</kbd> or tap the Equalizer button to access the Web Audio DSP suite:

### 10-Band Biquad Filter Specifications:
- **32 Hz**: Sub-bass rumble and kick drum weight
- **64 Hz**: Bass guitar punch and low-end warmth
- **125 Hz**: Lower midrange body and depth
- **250 Hz**: Snare drum body and vocal thickness
- **500 Hz**: Acoustic instrument resonance
- **1.0 kHz**: Vocal clarity and speech presence
- **2.0 kHz**: Guitar crunch and vocal bite
- **4.0 kHz**: Percussion snap and presence
- **8.0 kHz**: Cymbal shimmer and sibilance
- **16.0 kHz**: Air band and high-frequency sparkle

### Audio Processing Enhancements:
- **Preamp Gain**: Boost or attenuate overall signal levels before equalization.
- **Bass Enhancer**: Synthesizes low-end harmonics for deep, punchy sub-bass without distortion.
- **Dynamic Compressor**: Smooths out dramatic volume fluctuations between loud and quiet broadcasts.
- **Spatial Audio Convolver**:
  - *Direct Stereo*: Clean, uncolored stereo output.
  - *Stage Widener*: Broadens the stereo separation field.
  - *Studio Room*: Simulates the warm reflections of a treated studio booth.
  - *Concert Hall*: Expansive, immersive acoustic reverberation.

---

## 7. Device Ergonomics (Car Mode, 10-Foot Smart TV, OLED Screensaver)

NeoTune adapts its layout to your hardware:

### 🚗 Car Mode (<kbd>C</kbd>)
- Designed specifically for vehicular dashboard mounts and driving safety.
- Ultra-large, high-contrast buttons with minimum 64px touch targets.
- 6-preset 1-tap station grid for instant station switching without taking eyes off the road.
- High-visibility typography and simplified volume controls.

### 📺 Smart TV 10-Foot Navigation (<kbd>T</kbd>)
- Optimized for Android TV, Apple TV, Smart TVs, and living room projectors.
- **Full D-Pad Remote Support**: Navigate smoothly with Up, Down, Left, and Right arrow keys.
- **High-Visibility Focus Halo**: Active elements feature a glowing 3px neon focus ring.
- **Remote OK/Enter Activation**: Select, play, and toggle options directly with the remote control.

### 🌙 OLED Screensaver (<kbd>S</kbd>)
- Absolute pure black background (`#000000`) ensuring zero battery drain and complete protection against OLED pixel burn-in.
- Large floating digital clock and date display.
- Subtle organic drift: shifts position coordinates every 30 seconds across the display.
- Ambient minimal waveform showing active audio playback.

---

## 8. Radio Alarm Clock & Smart Sleep Timer

### ⏰ Radio Alarm Clock (`AlarmModal.tsx`)
- Set custom morning alarms that wake you up to your favorite live radio station.
- **AI Morning Briefing**: Integrated Google Gemini AI synthesizes local weather, current date, and an upbeat morning greeting before starting audio playback.
- **Volume Ramp-Up**: Gently increases volume over 30 seconds to prevent jarring wake-ups.
- **Customizable Snooze**: Set snooze duration for 5, 10, or 15 minutes.
- **System Backup Chime**: If an external radio stream is offline or buffering, a built-in melodic chime plays automatically so you never miss an alarm.

### ⏳ Smart Sleep Timer (`SleepTimerModal.tsx`)
- Preset durations: 15, 30, 45, 60, 90, or 120 minutes (or enter custom minutes).
- **Smooth Volume Fade-Out**: In the final 60 seconds of the countdown, audio smoothly fades to zero volume using an exponential curve before suspending playback.

---

## 9. Voice Control & Speech Recognition

Click the 🎙️ **Microphone** icon in the navigation bar to control NeoTune with your voice:

| Spoken Command | Executed Action |
| :--- | :--- |
| *"Play"* / *"Resume"* | Resumes audio streaming |
| *"Pause"* / *"Stop"* | Pauses audio streaming |
| *"Next station"* | Advances to the next station in catalog |
| *"Previous station"* | Returns to the previous station |
| *"Volume up"* | Increases master volume by 10% |
| *"Volume down"* | Decreases master volume by 10% |
| *"Mute"* / *"Unmute"* | Toggles master audio mute |
| *"Play Jazz"* / *"Play Rock"* / *"Play Ambient"* | Searches and starts playing the specified genre |
| *"Open Equalizer"* | Opens the 10-Band EQ modal |
| *"Car mode"* | Launches the Automotive Car Mode |
| *"Screensaver"* | Activates OLED Screensaver mode |

---

## 10. Keyboard Shortcuts Cheat Sheet

Press <kbd>?</kbd> anytime to display the keyboard shortcut cheat sheet:

| Key | Function |
| :--- | :--- |
| <kbd>Space</kbd> or <kbd>K</kbd> | Play / Pause audio |
| <kbd>M</kbd> | Mute / Unmute audio |
| <kbd>Arrow Up</kbd> | Increase volume (+5%) |
| <kbd>Arrow Down</kbd> | Decrease volume (-5%) |
| <kbd>Arrow Right</kbd> | Next station in list |
| <kbd>Arrow Left</kbd> | Previous station in list |
| <kbd>/</kbd> or <kbd>Ctrl+K</kbd> | Open Global Quick Search |
| <kbd>E</kbd> | Open 10-Band Equalizer & Spatial Audio |
| <kbd>C</kbd> | Toggle Car Mode |
| <kbd>T</kbd> | Toggle TV 10-Foot Remote Navigation |
| <kbd>S</kbd> | Toggle OLED Screensaver |
| <kbd>F</kbd> | Toggle Favorite for currently playing station |
| <kbd>R</kbd> | Start / Stop Live Audio Recording |
| <kbd>J</kbd> | Seek Backward 15s (Podcasts) |
| <kbd>L</kbd> | Seek Forward 30s (Podcasts) |
| <kbd>Escape</kbd> | Close active modal or exit full-screen mode |

---

## 11. 50-Language Localization & RTL Support

NeoTune features comprehensive translation dictionaries for **50 international languages**:

- **Switching Languages**: Click the 🌐 flag icon in the navbar or go to *Settings > Language*.
- **Supported Languages**: English, Vietnamese (Tiếng Việt), Spanish (Español), French (Français), German (Deutsch), Japanese (日本語), Chinese Simplified (简体中文), Chinese Traditional (繁體中文), Korean (한국어), Arabic (العربية), Hindi (हिन्दी), Portuguese (Português), Russian (Русский), Italian (Italiano), and 36 additional world languages.
- **Bi-Directional RTL Engine**: For Arabic, Hebrew, Urdu, and Persian, NeoTune automatically mirrors layouts, sidebars, and text alignment.

---

## 12. Cloud Sync & Cross-Device Handoff (Firebase)

Connect your Google Account or email via Firebase Authentication to unlock cloud capabilities:

- **Instant Favorite Synchronization**: Pinned stations and custom URLs sync immediately across your phone, tablet, laptop, and Smart TV.
- **Active Session Handoff**: Start listening on your computer, open NeoTune on your phone, and tap the **"Resume on this device"** banner to continue playback without missing a beat.
- **Cloud Settings Backup**: Preserves your custom 10-Band EQ presets and alarm configurations.

---

## 13. PWA Installation & Offline Capabilities

NeoTune is a full Progressive Web App (PWA) installable on any operating system:

### Installation Instructions:
- **Chrome / Edge (Desktop & Android)**: Click the **"Install"** button in the browser address bar or tap **Install NeoTune** in the app menu.
- **Safari (iOS & iPadOS)**: Tap the **Share** button (box with upward arrow) and select **"Add to Home Screen"**.
- **Offline Mode**: When disconnected from the internet, NeoTune loads its core app shell, cached offline station database, and saved podcast metadata from local IndexedDB storage.

---

## 14. Stream Diagnostics & Troubleshooting

If a stream fails to load or experiences stuttering:
1. **Diagnostics Modal**: Tap *Settings > Stream Diagnostics* to inspect real-time Time To First Byte (TTFB), active audio codec, buffer health graph, and network retry logs.
2. **Auto-Healing**: NeoTune automatically attempts 3 reconnect retries with exponential backoff before rotating to backup mirror servers.
3. **Clear Cache**: In *Settings > Storage & Maintenance*, click **"Clear Cache & Rebuild Station Index"** to refresh your local station database.
