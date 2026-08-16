# NeoTune Mobile App Conversion & Optimization Guide

This guide outlines how to build, optimize, and package the **NeoTune React + TypeScript** codebase into native **iOS (.ipa)** and **Android (.apk / .aab)** applications using **Capacitor** or **Trusted Web Activity (TWA)**.

---

## 🚀 1. Overview & Architecture Feasibility

Yes! The NeoTune codebase is designed from the ground up for full cross-platform compatibility:

- **Web Audio DSP & HTML5 Engine**: Uses standard HTML5 audio and Web Audio API nodes supported natively by iOS WKWebView and Android AndroidView / Chromium WebView.
- **Capacitor Integration**: Includes `@capacitor/core` and `capacitor.config.json` pre-configured for instant native IDE export.
- **Mobile Safe Areas**: Styled with CSS `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` for iPhone camera islands (Dynamic Island) and Android navigation bars.
- **Background Audio & Lock Screen Controls**: Powered by `navigator.mediaSession` for native lock screen metadata, album art, play/pause, and skip controls.
- **Tactile Touch Haptics**: Uses Web Vibration API and native haptics (`src/utils/haptics.ts`) for physical feedback on button presses.

---

## 🛠️ 2. Step-by-Step Mobile App Build (Capacitor)

### Prerequisites:
- **For Android**: Install [Android Studio](https://developer.android.com/studio) & JDK 17+.
- **For iOS**: Install [Xcode](https://developer.apple.com/xcode/) (macOS required) & CocoaPods (`sudo gem install cocoapods`).

---

### Step 1: Build Web Assets
First, compile the production Web bundle into the `dist/` directory:
```bash
npm run build
```

---

### Step 2: Add Native Mobile Platforms
Add Android and iOS native platform wrappers to your project:

```bash
# Add Android platform
npx cap add android

# Add iOS platform (on macOS)
npx cap add ios
```

---

### Step 3: Sync Web Assets with Native Apps
Whenever you make changes to the frontend code, run:
```bash
npm run build
npx cap sync
```

---

### Step 4: Open in Native IDEs & Run on Device/Emulator

#### **For Android Studio (Build APK / AAB)**:
```bash
npx cap open android
```
- In Android Studio, click **Run (Shift+F10)** to test on a device or emulator.
- To generate a release APK/AAB for Google Play: Go to **Build > Generate Signed Bundle / APK**.

#### **For iOS Xcode (Build IPA / TestFlight)**:
```bash
npx cap open ios
```
- In Xcode, select your signing team under **Target > Signing & Capabilities**.
- Select a connected iPhone or iOS Simulator and click **Play / Run (Cmd+R)**.
- To archive for App Store / TestFlight: Go to **Product > Archive**.

---

## ⚡ 3. Mobile Performance & UX Optimizations in Codebase

### 📱 1. Touch Target & Delay Optimizations
- **`touch-action: manipulation`**: Removes the 300ms double-tap zoom delay on mobile webviews.
- **`-webkit-tap-highlight-color: transparent`**: Eliminates gray highlight overlays on touchable buttons.
- **44px+ Touch Boundaries**: Interactive station icons, volume sliders, and tab buttons adhere to Apple Human Interface Guidelines and Android Material Design density.

### 🔋 2. Battery & WebGL Performance
- **Background Visualizer Suspension**: When the full-screen visualizer modal is closed or the app is backgrounded, WebGL / Canvas animation frame requests (`requestAnimationFrame`) pause immediately to preserve mobile battery life.
- **IndexedDB Caching**: Station searches and recent listening history are stored locally in IndexedDB to minimize network requests.

### 🎵 3. Lock Screen & Hardware Media Controls
- Integrated with `navigator.mediaSession` to provide:
  - High-resolution station logo and track title on lock screens and bluetooth car displays.
  - Hardware button support (headset play/pause, steering wheel next/prev track).
  - Background audio playback capability when screen turns off.

### 📳 4. Tactile Touch Feedback (`src/utils/haptics.ts`)
```ts
import { haptics } from '../utils/haptics';

// Triggers subtle 10ms vibration on mobile devices
haptics.light();
```

---

## 🌐 4. Handling Backend Audio Stream Proxy on Mobile

Live radio streams often suffer from HTTP mixed-content blocks or CORS restrictions on iOS/Android. NeoTune solves this via its Express proxy backend (`server.ts`):

1. **Local Dev / Single Container**: In dev and Cloud Run containers, the frontend and backend share the same origin (`http://localhost:3000`).
2. **Standalone Mobile Production**:
   - Deploy `server.ts` to Cloud Run, Vercel, Railway, or Render (e.g. `https://neotune-backend.run.app`).
   - Set the API origin URL in `capacitor.config.json`:
     ```json
     {
       "appId": "com.neotune.radio",
       "appName": "NeoTune",
       "webDir": "dist",
       "server": {
         "androidScheme": "https",
         "cleartext": true
       }
     }
     ```

---

## 📱 5. Mobile Native App Capabilities Matrix

| Feature | Mobile Web (PWA) | Android Native (Capacitor) | iOS Native (Capacitor) |
| :--- | :---: | :---: | :---: |
| **Installable to Home Screen** | ✅ | ✅ | ✅ |
| **Lock Screen Audio Controls** | ✅ | ✅ | ✅ |
| **Background Streaming** | ✅ | ✅ | ✅ |
| **Offline IndexedDB Storage** | ✅ | ✅ | ✅ |
| **10-Band EQ & Spatial Reverb**| ✅ | ✅ | ✅ |
| **Safe Area Insets (Notch/Island)**| ✅ | ✅ | ✅ |
| **Physical Haptics** | ✅ | ✅ | ✅ |
| **Google Play / App Store Distribution**| TWA | ✅ (.aab) | ✅ (.ipa) |

---

## 📑 Summary

With the pre-configured `capacitor.config.json`, mobile CSS safe area utilities, touch haptics engine, and MediaSession lock screen integration, NeoTune can be compiled directly into production-ready Android and iOS applications with a single command!
