# NeoTune Web Audio DSP & Studio Engine Guide

This guide details the internal architecture and digital signal processing (DSP) pipeline implemented in `src/services/audioEngine.ts` and `src/components/VisualizerCanvas.tsx`.

---

## 1. Web Audio DSP Signal Flow

The audio pipeline connects HTML5 Media elements with the Web Audio API graph to deliver studio-quality sound shaping, spatialization, dynamic compression, and real-time visual analysis.

```
+---------------------------+
|  <audio> HTML5 Element    |
| (Icecast/MP3/AAC/HLS.js)  |
+-------------+-------------+
              |
+-------------v-------------+
| MediaElementAudioSourceNode|
+-------------+-------------+
              |
+-------------v-------------+
|   Preamp Gain Node (dB)   |
+-------------+-------------+
              |
+-------------v-------------+
| 10-Band Biquad EQ Filters | (32Hz -> 16kHz Peaking Filters)
+-------------+-------------+
              |
+-------------v-------------+
|  Bass Booster / Low Shelf | (Sub-bass harmonic enhancer)
+-------------+-------------+
              |
+-------------v-------------+
|  Spatial Convolver Node   | (Impulse Response Reverb Matrix)
+-------------+-------------+
              |
+-------------v-------------+
| Dynamic Compressor Node   | (Prevents clipping & smooths peaks)
+-------------+-------------+
              |
+-------------v-------------+
|   Master Volume Gain Node | (Volume & Sleep Timer Fade-outs)
+-------------+-------------+
              |
       +------+------+
       |             |
+------v------+ +----v------------------+
| AnalyserNode| | AudioDestinationNode  |
|  (FFT Data) | |  (Speakers/Headphones)|
+------+------+ +-----------------------+
       |
+------v------------------------+
| 60fps HTML5 Canvas Visualizers |
| (Bars, Wave, Radial, Ribbons) |
+-------------------------------+
```

---

## 2. 10-Band Parametric Equalizer Specifications

The 10-band equalizer uses cascaded `BiquadFilterNode` instances configured as `peaking` filters (with low-shelf and high-shelf boundary filters).

| Band # | Center Frequency ($f_0$) | Filter Type | Q Factor | Gain Range | Description |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **Band 1** | **32 Hz** | `lowshelf` | 1.0 | $-12\text{ dB}$ to $+12\text{ dB}$ | Sub-bass rumble and kick energy |
| **Band 2** | **64 Hz** | `peaking` | 1.4 | $-12\text{ dB}$ to $+12\text{ dB}$ | Bass guitar warmth and punch |
| **Band 3** | **125 Hz** | `peaking` | 1.4 | $-12\text{ dB}$ to $+12\text{ dB}$ | Lower midrange body |
| **Band 4** | **250 Hz** | `peaking` | 1.4 | $-12\text{ dB}$ to $+12\text{ dB}$ | Vocal thickness and snare warmth |
| **Band 5** | **500 Hz** | `peaking` | 1.4 | $-12\text{ dB}$ to $+12\text{ dB}$ | Acoustic instrument resonance |
| **Band 6** | **1.0 kHz** | `peaking` | 1.4 | $-12\text{ dB}$ to $+12\text{ dB}$ | Vocal clarity and speech intelligibility |
| **Band 7** | **2.0 kHz** | `peaking` | 1.4 | $-12\text{ dB}$ to $+12\text{ dB}$ | Guitar bite and vocal presence |
| **Band 8** | **4.0 kHz** | `peaking` | 1.4 | $-12\text{ dB}$ to $+12\text{ dB}$ | Percussion attack and brightness |
| **Band 9** | **8.0 kHz** | `peaking` | 1.4 | $-12\text{ dB}$ to $+12\text{ dB}$ | Cymbals, vocal sibilance, crispness |
| **Band 10** | **16.0 kHz**| `highshelf`| 1.0 | $-12\text{ dB}$ to $+12\text{ dB}$ | Air, shimmer, and high-frequency sparkle |

### EQ Presets Reference
- **Flat**: `[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]`
- **Bass Boost**: `[6, 5, 4, 2, 0, 0, 0, 1, 2, 3]`
- **Vocal & Talk**: `[-2, -1, 0, 2, 4, 4, 3, 2, 0, -1]`
- **Electronic / Club**: `[5, 4, 2, 0, -2, 2, 3, 4, 5, 4]`
- **Jazz & Acoustic**: `[3, 2, 1, 2, -1, 1, 2, 3, 3, 4]`
- **Rock & Metal**: `[4, 3, 1, -1, -2, 1, 3, 4, 4, 3]`

---

## 3. Spatial Audio Convolver Engine

NeoTune generates synthesized impulse responses ($h(t)$) in real time without requiring heavy static `.wav` impulse downloads:

$$\text{Impulse}(t) = (2 \cdot \text{rand}() - 1) \cdot e^{-\frac{t}{\tau}}$$

### Spatial Modes:
1. **Disabled / Direct**: Clean stereo bypass.
2. **Stage Widener**: $\tau = 0.08\text{s}$, broadens the stereo field by phase-decorrelating micro-reflections.
3. **Studio Room**: $\tau = 0.25\text{s}$, simulates an acoustically treated recording studio booth.
4. **Concert Hall**: $\tau = 1.40\text{s}$, provides expansive cathedral/hall reverberation.

---

## 4. Real-Time Canvas Visualizer Modes

The `VisualizerCanvas` component attaches to the `AnalyserNode` with an FFT size of $2048$ ($1024$ distinct frequency bins) and smoothing time constant of $0.82$.

### Visualizer Skins:
1. **Frequency Bars**: Renders 64 grouped frequency buckets with dynamic color gradients and floating peak cap physics.
2. **Oscilloscope**: Direct time-domain waveform rendering ($y = f(t)$) using quadratic bezier curves.
3. **Circular Radial**: 360-degree polar coordinate spectrum radiating outward from the station artwork.
4. **Rainbow Waves**: Overlapping translucent sinusoids modulated by real-time bass energy.
5. **Neon Ribbons**: 3-dimensional perspective audio ribbons dancing across the Z-plane.
6. **Cyberpunk Matrix**: Digital vertical falling matrix bars reacting to audio frequency spikes.

---

## 5. Live Stream Recording (`MediaRecorder`)

NeoTune allows users to capture live broadcast audio into high-fidelity local files:
- **Audio Routing**: A `MediaStreamAudioDestinationNode` taps into the master post-DSP output.
- **MIME Types**: Automatically chooses `audio/webm;codecs=opus` (Chrome/Firefox/Edge) or `audio/mp4` / `audio/wav` (Safari/iOS).
- **Download Automation**: Creates a Blob URL and triggers an automated download with station name and ISO timestamp.

---

## 6. Stream Diagnostics & Telemetry

The Diagnostics Service (`diagnosticsService.ts`) monitors stream health metrics:
- **Time To First Byte (TTFB)**: Measures DNS + TLS + initial audio packet latency.
- **Buffer Health**: Monitors HTML5 `audio.buffered` time ranges against current `currentTime`.
- **Bitrate Detector**: Calculates network payload chunk size over elapsed streaming intervals.
- **Packet Drop Log**: Automatically logs network retry attempts and auto-heals failed streams.
