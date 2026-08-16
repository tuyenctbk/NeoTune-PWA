# NeoTune PWA: UX/UI Design System & Layout Specifications

This document provides an exhaustive, production-grade specification of the **User Experience (UX)**, **User Interface (UI)**, **Design System**, **Responsive Layouts**, and **Interaction Models** across the NeoTune Progressive Web Application (PWA).

---

## 1. Design Philosophy & Aesthetic Archetype

NeoTune is designed under the **Hyper-Clean Cyber-Acoustic Glassmorphism** archetype. It merges high-fidelity studio audio ergonomics with refined glassmorphism, mathematical spacing, and zero-distraction usability.

### Core Tenets:
1. **Audio-First Spatial Hierarchy**: Audio controls and playback status are perpetually accessible via the persistent MiniPlayer dock, full-screen Studio Modal, or device-specific views (Car Mode, TV 10-Foot Mode).
2. **Mathematical Border & Padding Hierarchy**: Containers adhere to the nested corner radius formula:
   $$\text{Radius}_{\text{inner}} = \text{Radius}_{\text{outer}} - \text{Padding}$$
   Containers maintain an outer padding $\ge 16\text{px}$, with button horizontal padding strictly $2\times$ vertical padding.
3. **High-Contrast, Eye-Safe Dark Baselines**: Default backgrounds maintain $<5\%$ saturation with deep luminescent violet/slate hues, preventing visual fatigue during prolonged nighttime listening.
4. **Adaptive Context Ergonomics**: The interface dynamically reorganizes its visual density and touch targets based on the user's operational context (Desktop multi-column, Mobile single-hand thumb zone, In-car high-contrast driving mode, or 10-Foot living room Smart TV navigation).

---

## 2. Color Palette & Theming System

NeoTune includes **6 distinct visual themes**, selectable via *Settings > Appearance & Theming*. Every theme dynamically alters CSS custom properties (`--bg-main`, `--surface-main`, `--accent-primary`, etc.) across the DOM root.

### 2.1 Theme Color Specifications

| Theme Token | 1. Frosted Glass (Default) | 2. Cyberpunk Neon | 3. Warm Vintage Jazz | 4. Electric Rock | 5. Pure OLED Dark | 6. Daylight Blue Glass |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`--bg-main`** | `#0A050E` (Deep Violet) | `#05050A` (Midnight) | `#120E0A` (Espresso) | `#0A0A0A` (Obsidian) | `#000000` (True Black) | `#0F172A` (Slate Navy) |
| **`--surface-main`** | `rgba(26,16,37, 0.75)` | `rgba(18,12,30, 0.85)` | `rgba(38,26,18, 0.85)` | `rgba(28,28,28, 0.88)` | `rgba(18,18,18, 0.95)` | `rgba(30,41,59, 0.88)` |
| **`--surface-card`** | `rgba(255,255,255, 0.04)` | `rgba(0,240,255, 0.04)` | `rgba(245,158,11, 0.04)`| `rgba(239,68,68, 0.04)` | `rgba(255,255,255, 0.03)` | `rgba(255,255,255, 0.05)` |
| **`--accent-primary`** | `#A855F7` (Purple 500) | `#00F0FF` (Cyan Neon) | `#F59E0B` (Amber 500) | `#EF4444` (Crimson 500) | `#22C55E` (Emerald 500) | `#38BDF8` (Sky Blue 400) |
| **`--accent-secondary`**| `#EC4899` (Pink 500) | `#FF0055` (Magenta) | `#D97706` (Amber 600) | `#F97316` (Orange 500) | `#10B981` (Emerald 600) | `#818CF8` (Indigo 400) |
| **`--accent-tertiary`** | `#8B5CF6` (Violet 500) | `#7928CA` (Electric) | `#B45309` (Warm Brass) | `#DC2626` (Red 600) | `#059669` (Dark Green) | `#34D399` (Emerald 400) |
| **`--text-primary`** | `#FFFFFF` | `#FFFFFF` | `#FDF6E2` | `#FFFFFF` | `#FFFFFF` | `#F8FAFC` |
| **`--text-muted`** | `#A1A1AA` (Zinc 400) | `#94A3B8` (Slate 400) | `#D4B996` (Warm Tan) | `#A3A3A3` (Neutral 400)| `#71717A` (Zinc 500) | `#94A3B8` (Slate 400) |
| **`--border-color`** | `rgba(168,85,247, 0.2)` | `rgba(0,240,255, 0.25)` | `rgba(245,158,11, 0.2)` | `rgba(239,68,68, 0.25)`| `rgba(255,255,255, 0.1)` | `rgba(56,189,248, 0.22)` |
| **`--glass-blur`** | `16px` | `12px` | `16px` | `8px` | `0px` (Clean OLED) | `20px` |

---

## 3. Typography & Mathematical Scaling

Typography pairs high-impact modern sans-serifs with geometric mono numerics for precise audio telemetry:

- **Primary UI & Headings**: Inter / Plus Jakarta Sans (`font-sans`), `-0.02em` letter-spacing for tight display hierarchy.
- **Audio Telemetry & Timers**: JetBrains Mono / SF Mono (`font-mono`), tabular numerals (`font-feature-settings: "tnum"`) to eliminate jitter during countdowns and bitrate tracking.
- **Hierarchy Scale** (Major Second 1.125 & Minor Third 1.2):
  - **Display / Hero**: `32px` - `40px` (Line height: `1.2`, Weight: `800 Bold`)
  - **H1 (View Titles)**: `24px` - `28px` (Line height: `1.25`, Weight: `700 Bold`)
  - **H2 (Section Dividers)**: `18px` - `20px` (Line height: `1.3`, Weight: `600 Semi-Bold`)
  - **H3 / Card Titles**: `15px` - `16px` (Line height: `1.4`, Weight: `600 Semi-Bold`)
  - **Body Text**: `14px` - `15px` (Line height: `1.6`, Weight: `400 Regular`)
  - **Captions & Badges**: `11px` - `12px` (Line height: `1.5`, Weight: `500 Medium`, Uppercase tracking: `+0.05em`)

---

## 4. Layout Architecture & Screen Templates

```
+---------------------------------------------------------------------------------------+
|  TOP NAVIGATION / APP BAR (Navbar.tsx)                                                |
|  [Logo: NeoTune] [Global Search /] [Genre Quick-Pills] [Lang 50] [Car] [TV] [Profile] |
+-----------------------+---------------------------------------------------------------+
|                       |  MAIN VIEW CONTENT CONTAINER                                  |
|  SIDEBAR NAVIGATION   |                                                               |
|  - 📻 Radio Explorer  |  [Hero Banner / Quick Play Strip]                             |
|  - 🎙️ Podcasts Directory|                                                             |
|  - ❤️ My Favorites    |  [Live Audio Station Grid / Bento Layout]                     |
|  - ⚙️ Settings Hub    |  [StationCard] [StationCard] [StationCard] [StationCard]     |
|                       |                                                               |
|  [Sleep Timer Badge]  |  [Recent Stations Strip / Listening Habits Chart]             |
|  [Storage / PWA Badge]|                                                               |
+-----------------------+---------------------------------------------------------------+
|  PERSISTENT DOCKED MINI PLAYER (MiniPlayer.tsx)                                       |
|  [Artwork + Live Wave] [Title + ICY Metadata] [Play/Pause/Skip] [Visualizer] [Vol 🔊] |
+---------------------------------------------------------------------------------------+
```

### 4.1 Responsive Breakpoints & Adaptive Ergonomics

1. **Mobile Handheld (`< 640px`)**:
   - **Thumb-Zone Optimization**: Primary navigation shifts to a bottom-anchored tab bar.
   - **Compact Cards**: Station tiles collapse into dense horizontal rows with large 44px+ tap targets.
   - **Drawer Interactions**: Episode lists, Equalizers, and Station Info open as bottom-sheet modal drawers.
   - **MiniPlayer**: Elevated above bottom navigation with high-visibility play/pause and swipe-up to expand studio player.

2. **Tablet & Foldable (`640px - 1024px`)**:
   - **2-Column Responsive Grid**: Station cards display in a balanced 2-column or 3-column bento configuration.
   - **Split Detail Panels**: Podcast shows display cover art on left and scrollable episode tracklist on right.

3. **Desktop & Widescreen (`1024px - 1920px`)**:
   - **Collapsible Glass Sidebar**: Full-featured navigation panel with station counts, active recording telemetry, and quick shortcuts.
   - **4 to 6 Column Grid**: High-density browsing with infinite scrolling, hover preview triggers, and drag-and-drop playlist sorting.

4. **10-Foot TV / Projector Mode (`TVFocusManager.tsx`)**:
   - **Oversized Typography**: High-contrast labels visible from 10 feet away.
   - **D-Pad Spatial Navigation**: Arrow keys automatically calculate nearest neighbor element on 2D grid.
   - **Focus Ring Glow**: Active element features an animated 3px neon halo (`ring-4 ring-purple-500 ring-offset-4 ring-offset-[#0A050E]`).

5. **Car Mode (`CarModeView.tsx`)**:
   - **Distraction-Free Automotive Safety**: Minimum 64px tap targets, high contrast, zero tiny text.
   - **Preset Grid**: 6 large station preset tiles for single-tap channel changing while mounted on a dashboard.

---

## 5. UI Component Hierarchy & Specifications

### 5.1 StationCard (`src/components/StationCard.tsx`)
- **Dimensions**: Flexible grid item with 1:1 aspect ratio artwork or 16:9 banner preview.
- **Dynamic State Rings**:
  - *Inactive*: Subdued 1px border (`border-white/10`).
  - *Playing*: Animated pulsating glow border with active equalizer bars overlay (`animate-pulse border-purple-500`).
  - *Buffering*: Rotating spinner with Time To First Byte (TTFB) indicator.
- **Action Buttons**: Instant Play overlay, Favorite Toggle (Heart), Queue Button, Station Diagnostics Inspector.

### 5.2 MiniPlayer (`src/components/MiniPlayer.tsx`)
- **Position**: `fixed bottom-0 left-0 right-0 z-40`, backdrop blur `16px`.
- **Elements**:
  - **Left**: Live spinning station vinyl/album art with stream codec badge (`AAC`, `MP3`, `HLS`).
  - **Center**: Scrolling Marquee track metadata (ICY current song & artist) with Google/YouTube search buttons.
  - **Right**: Web Audio Visualizer toggle, Live Recording trigger, 10-Band EQ button, Volume slider with mute memory.

### 5.3 FullPlayerModal (`src/components/FullPlayerModal.tsx`)
- **Full-Screen Canvas Stage**: Renders selected 60fps Web Audio FFT visualizer mode behind station metadata.
- **Visualizer Modes**:
  1. *Frequency Bars* (Neon spectrum analyzer with floating peak caps)
  2. *Oscilloscope* (Real-time analog oscilloscope wave rendering)
  3. *Circular Radial* (360° pulsating radial bass ring)
  4. *Rainbow Waves* (Fluid color-shifting multi-layer waves)
  5. *Neon Ribbons* (3D perspective floating acoustic ribbons)
  6. *Cyberpunk Matrix* (Falling digital matrix code streams reacting to audio frequencies)
- **Studio Controls**: Stream bit-rate inspector, live audio recording into `.webm`/`.wav`, sleep timer shortcut, car mode launcher, and live share QR code.

### 5.4 10-Band Equalizer Modal (`src/components/dialogs/EqualizerModal.tsx`)
- **10 Vertical Sliders**: 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz with tactile dB markers ($-12\text{dB}$ to $+12\text{dB}$).
- **Preamp Gain**: Slider to boost or attenuate overall pre-EQ volume without clipping.
- **Spatial Audio Matrix**: Selection pills for *Direct Stereo*, *Stage Widener*, *Studio Room*, and *Concert Hall*.
- **Bass Enhancer**: Toggle switch for low-frequency harmonic excitation.

---

## 6. Motion, Animations & Micro-Interactions

All interface animations are engineered for 60fps performance using CSS hardware acceleration (`transform`, `opacity`, `will-change`):

1. **Station Play Ripple**: Clicking play creates a radiating radial pulse from the card center.
2. **MiniPlayer Waveform Ticker**: 4 animated SVG bars modulated in height based on real-time playback state.
3. **Modal Transitions**: Modals enter with a subtle zoom (`scale(0.96) -> scale(1.0)`) and fade (`opacity 0 -> 1`) over `180ms cubic-bezier(0.16, 1, 0.3, 1)`.
4. **Volume Slider Smooth Drag**: Instant reactive audio gain change with smooth visual fill gradient.
5. **Screensaver Organic Drift**: Drifts across the X and Y plane by $\pm 40\text{px}$ every 30 seconds to prevent OLED pixel burn-in.

---

## 7. Internationalization (i18n) & Accessibility (a11y)

### 7.1 50 Global Locales
The application features a custom reactive i18n engine with full translation dictionaries for **50 international languages**:
- **European**: English, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Swedish, Norwegian, Danish, Finnish, Greek, Czech, Romanian, Hungarian, Ukrainian, Turkish.
- **Asian**: Vietnamese, Japanese, Simplified Chinese, Traditional Chinese, Korean, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Thai, Indonesian, Malay, Tagalog.
- **Middle Eastern & African (RTL)**: Arabic (`ar`), Hebrew (`he`), Persian (`fa`), Urdu (`ur`), Swahili, Amharic.
- **Global**: Russian, Serbian, Croatian, Slovak, Bulgarian, Lithuanian, Latvian, Estonian, Slovenian.

### 7.2 RTL (Right-to-Left) Engine
When an RTL language is active:
- Document `dir="rtl"` is set on `<html>`.
- Navigation sidebar mirrors from left to right.
- Text alignments, back buttons, and chevron indicators flip axes automatically.

### 7.3 Accessibility Standards
- **WCAG 2.1 AA Compliance**: All text elements maintain $\ge 4.5:1$ contrast ratio against their glass surfaces.
- **Screen Reader ARIA**: Meaningful `aria-label`, `aria-expanded`, and `role="region"` attributes on all interactive controls.
- **Keyboard Trapping & Escape Handlers**: All dialogs trap focus and dismiss smoothly on <kbd>Escape</kbd>.
- **Haptic Touch**: Mobile devices trigger subtle vibrations on card clicks, volume adjustments, and favorite toggles via `navigator.vibrate`.

---

## 8. Progressive Web App (PWA) Offline & Install Architecture

- **Web App Manifest (`manifest.json`)**:
  - `display: "standalone"` for borderless app experience.
  - `theme_color: "#0A050E"` & `background_color: "#0A050E"`.
  - High-resolution adaptive icons (192x192, 512x512, maskable icons).
- **Service Worker Caching**:
  - Static shell (HTML, CSS, JS, Fonts, Icons) cached for offline app startup.
  - IndexedDB storage for offline station directories and recent listening history.
- **Smart Install Banners (`PWAInstallBanner.tsx` & `PWAInstallModal.tsx`)**:
  - Intercepts native `beforeinstallprompt` event on Chromium browsers.
  - Shows custom platform-specific installation instructions for iOS Safari (*"Tap Share -> Add to Home Screen"*).
