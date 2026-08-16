import { RadioStation, PodcastEpisode, EQPreset, AlarmConfig } from '../types';
import { storageService } from './storageService';
import { diagnosticsService } from './diagnosticsService';
import { firebaseService } from './firebaseService';
import { triggerHaptic } from '../utils/haptics';
import Hls from 'hls.js';

export const EQ_PRESETS: Record<string, EQPreset> = {
  'Balanced': {
    name: 'Balanced',
    band60Hz: 0,
    band230Hz: 0,
    band910Hz: 0,
    band3600Hz: 0,
    band14000Hz: 0,
    preampGain: 0,
  },
  'Bass Boost': {
    name: 'Bass Boost',
    band60Hz: 6,
    band230Hz: 4,
    band910Hz: 1,
    band3600Hz: 0,
    band14000Hz: 1,
    preampGain: 2,
  },
  'Chill Lounge': {
    name: 'Chill Lounge',
    band60Hz: 4,
    band230Hz: 2,
    band910Hz: -2,
    band3600Hz: 2,
    band14000Hz: 5,
    preampGain: 1,
  },
  'Acoustic': {
    name: 'Acoustic',
    band60Hz: 2,
    band230Hz: 3,
    band910Hz: 4,
    band3600Hz: 3,
    band14000Hz: 2,
    preampGain: 0,
  },
  'Vocal Focus': {
    name: 'Vocal Focus',
    band60Hz: -3,
    band230Hz: 1,
    band910Hz: 5,
    band3600Hz: 4,
    band14000Hz: -1,
    preampGain: 1,
  },
  'Electronic': {
    name: 'Electronic',
    band60Hz: 5,
    band230Hz: 3,
    band910Hz: -1,
    band3600Hz: 3,
    band14000Hz: 5,
    preampGain: 2,
  },
  'Classical': {
    name: 'Classical',
    band60Hz: 4,
    band230Hz: 3,
    band910Hz: -1,
    band3600Hz: 2,
    band14000Hz: 4,
    preampGain: 1,
  },
  'Rock': {
    name: 'Rock',
    band60Hz: 5,
    band230Hz: 3,
    band910Hz: -2,
    band3600Hz: 4,
    band14000Hz: 4,
    preampGain: 2,
  },
  'Jazz': {
    name: 'Jazz',
    band60Hz: 3,
    band230Hz: 2,
    band910Hz: 1,
    band3600Hz: 3,
    band14000Hz: 4,
    preampGain: 1,
  },
  'Pop': {
    name: 'Pop',
    band60Hz: -1,
    band230Hz: 2,
    band910Hz: 4,
    band3600Hz: 3,
    band14000Hz: -1,
    preampGain: 1,
  },
  'Audio Booster': {
    name: 'Audio Booster',
    band60Hz: 6,
    band230Hz: 6,
    band910Hz: 6,
    band3600Hz: 6,
    band14000Hz: 6,
    preampGain: 6,
    isBooster: true,
  }
};

// Open-Meteo Open Weather API integration for Alarm Announcements
export async function getLocalWeatherInfo(cityHint?: string): Promise<{
  tempC: number;
  tempF: number;
  conditionText: string;
  cityName: string;
}> {
  let lat = 40.7128;
  let lon = -74.0060;
  let cityName = cityHint && cityHint.trim() ? cityHint.trim() : 'your local area';

  try {
    if (cityHint && cityHint.trim()) {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityHint.trim())}&count=1&language=en&format=json`
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
          cityName = geoData.results[0].name;
        }
      }
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { timeout: 3000 }
        );
      });
      if (pos) {
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      }
    }
  } catch (e) {
    console.warn('Geocoding fallback note:', e);
  }

  try {
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`
    );
    if (!weatherRes.ok) {
      throw new Error('Weather API returned status ' + weatherRes.status);
    }
    const data = await weatherRes.json();
    const tempC = Math.round(data.current.temperature_2m);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const code = data.current.weather_code;

    let conditionText = 'clear and sunny';
    if (code === 0) conditionText = 'clear skies';
    else if (code === 1 || code === 2) conditionText = 'partly cloudy';
    else if (code === 3) conditionText = 'overcast';
    else if (code === 45 || code === 48) conditionText = 'foggy';
    else if (code >= 51 && code <= 55) conditionText = 'light drizzle';
    else if (code >= 61 && code <= 65) conditionText = 'gentle rain';
    else if (code >= 71 && code <= 77) conditionText = 'snow showers';
    else if (code >= 80 && code <= 82) conditionText = 'passing rain showers';
    else if (code >= 95) conditionText = 'thunderstorms';

    return { tempC, tempF, conditionText, cityName };
  } catch (err) {
    return { tempC: 21, tempF: 70, conditionText: 'fair and mild', cityName };
  }
}

type AudioStateListener = (state: {
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  currentStation: RadioStation | null;
  currentEpisode: PodcastEpisode | null;
  currentTrackTitle: string;
  volume: number;
  isMuted: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  sleepTimerRemainingSec: number | null;
  sleepTimerTotalSec: number | null;
  sleepTimerFadeSec: number | null;
  sleepTimerFadeCurve: 'linear' | 'exponential' | 'logarithmic';
  isAlarmRinging: boolean;
  normalizeAudio: boolean;
  nightMode: boolean;
  targetNormalizeLevel: number;
  crossfadeDurationMs: number;
  visualizerSensitivity: number;
  visualizerIntensity: number;
  dataSaverBitrate: string;
  audioContextState: 'running' | 'suspended' | 'closed' | 'not_initialized';
  audioLatencyMs: number;
  heartbeatActive: boolean;
}) => void;

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private normalizeGainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private preampGainNode: GainNode | null = null;
  private webAudioInitialized = false;
  private preCachedAudios: Map<string, HTMLAudioElement> = new Map();
  private activePlayPromise: Promise<void> | null = null;

  private currentStation: RadioStation | null = null;
  private currentEpisode: PodcastEpisode | null = null;
  private currentTrackTitle = '';
  private isPlaying = false;
  private isLoading = false;
  private isBuffering = false;
  private volume = 0.85;
  private isMuted = false;
  private error: string | null = null;
  private currentTime = 0;
  private duration = 0;
  private playbackSpeed = 1.0;
  private normalizeAudio = false;
  private nightMode = false;
  private targetNormalizeLevel = 0.85;
  private crossfadeDurationMs = 500;
  private visualizerSensitivity = 1.0;
  private visualizerIntensity = 1.0;
  private lastPodcastCloudSyncTime = 0;
  private isCrossfading = false;
  private autoLevelInterval: any = null;
  private measuredRMSHistory: number[] = [];
  private dataSaverBitrate = 'auto';

  // Audio Heartbeat Monitor state
  private heartbeatInterval: any = null;
  private lastCurrentTime = 0;
  private lastProgressTimestamp = Date.now();
  private isHeartbeatStalled = false;

  private sleepTimerId: any = null;
  private sleepTimerRemainingSec: number | null = null;
  private sleepTimerTotalSec: number | null = null;
  private sleepTimerFadeSec: number | null = null;
  private sleepTimerFadeCurve: 'linear' | 'exponential' | 'logarithmic' = 'linear';
  private sleepTimerInterval: any = null;

  private alarmCheckInterval: any = null;
  private alarmVibrationInterval: any = null;
  private isAlarmRinging = false;
  private activeEQPresetName = 'Balanced';
  private boosterEnabled = false;
  private hls: any = null;

  // Auto-retry & Exponential Backoff State
  private streamRetryCount = 0;
  private maxStreamRetries = 4;
  private retryTimeoutId: any = null;

  private wakeLockSentinel: any = null;
  private keepAliveOsc: OscillatorNode | null = null;
  private keepAliveGain: GainNode | null = null;
  private chimeInterval: any = null;
  private chimeGainNode: GainNode | null = null;

  // Battery Manager Telemetry
  private isLowBatteryDetected = false;
  private isRunningOnBattery = false;
  private batteryLevel = 1.0;
  private isCharging = true;

  private listeners: Set<AudioStateListener> = new Set();
  private prevFFTValues: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
  private lastStatTrackingTime = Date.now();
  private streamStartTimestamp = 0;

  constructor() {
    this.audio = new Audio(); // satisfying property initialization
    this.volume = storageService.getVolume();
    this.audio.volume = this.volume;
    this.audio.muted = false;
    this.activeEQPresetName = storageService.getEQPreset();
    this.normalizeAudio = storageService.getNormalizeAudio();
    this.nightMode = storageService.getNightMode();
    this.targetNormalizeLevel = storageService.getTargetNormalizeLevel();
    this.crossfadeDurationMs = storageService.getCrossfadeDurationMs();
    this.visualizerSensitivity = storageService.getVisualizerSensitivity();
    this.visualizerIntensity = storageService.getVisualizerIntensity();
    this.dataSaverBitrate = storageService.getDataSaverBitrate();

    this.recreateAudioElement();
    this.setupAlarmChecker();
    this.setupMediaSession();
    this.setupUserGestureUnlock();
    this.setupAudioHeartbeat();
    this.setupInterruptionListener();
    this.setupBatteryMonitoring();
    // Warm up pre-cache pool in the background after a brief delay
    setTimeout(() => this.updatePreCache(), 2500);
  }

  // Monitor device battery status to dynamically trigger Battery Saver visualizer throttling
  private setupBatteryMonitoring() {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateStatus = () => {
          this.isCharging = battery.charging;
          this.isRunningOnBattery = !battery.charging;
          this.batteryLevel = battery.level;
          // Trigger low battery throttling when on battery power and level <= 20%
          this.isLowBatteryDetected = !battery.charging && battery.level <= 0.20;
          diagnosticsService.log('info', 'stream', `Battery state: ${Math.round(battery.level * 100)}% (${battery.charging ? 'Charging' : 'On Battery'}), Saver Throttling: ${this.isBatterySavingActive()}`);
          this.notifyState();
        };

        updateStatus();
        battery.addEventListener('chargingchange', updateStatus);
        battery.addEventListener('levelchange', updateStatus);
      }).catch((e: any) => {
        console.warn('[AudioEngine] Battery Status API check note:', e);
      });
    }
  }

  // Request Android / Mobile WakeLock to prevent OS power management from suspending background audio
  private async acquireWakeLock() {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && this.isPlaying) {
      try {
        if (!this.wakeLockSentinel) {
          this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
          this.wakeLockSentinel.addEventListener('release', () => {
            this.wakeLockSentinel = null;
          });
          diagnosticsService.log('info', 'stream', 'Mobile Screen/CPU WakeLock acquired for background playback');
        }
      } catch (e) {
        // WakeLock may be rejected if tab is not focused; safe to ignore
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {}
      this.wakeLockSentinel = null;
    }
  }

  private async clearActivePlayPromise(): Promise<void> {
    if (this.activePlayPromise) {
      try {
        await this.activePlayPromise;
      } catch (e) {
        console.warn('[AudioEngine] Suppressing aborted play promise:', e);
      }
      this.activePlayPromise = null;
    }
  }

  // Recreates the HTML5 Audio element from scratch and binds event listeners
  private recreateAudioElement() {
    if (this.hls) {
      try {
        this.hls.destroy();
      } catch (e) {
        console.warn('Failed to destroy previous Hls instance:', e);
      }
      this.hls = null;
    }
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.src = '';
        this.audio.load();
      } catch (e) {
        console.warn('Cleanup of old audio element failed:', e);
      }
    }

    this.audio = new Audio();
    this.audio.preload = 'none';
    this.audio.crossOrigin = 'anonymous';
    this.audio.setAttribute('playsinline', 'true');
    this.audio.setAttribute('webkit-playsinline', 'true');
    this.audio.volume = this.isMuted ? 0 : this.volume;
    this.audio.muted = false;

    this.setupAudioListeners();
  }

  // Load stream source with auto-configured Hls support
  private loadStreamSource(url: string) {
    // 1. Clean up existing Hls instance if any
    if (this.hls) {
      try {
        this.hls.destroy();
      } catch (e) {
        console.warn('Failed to destroy previous Hls instance in loadStreamSource:', e);
      }
      this.hls = null;
    }

    // 2. Check if the URL is an HLS playlist (ends with or contains .m3u8)
    const isHls = url.toLowerCase().includes('.m3u8');

    if (isHls) {
      // Check for native HLS support (like Safari, iOS, iPadOS)
      if (this.audio.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('[AudioEngine] Browser supports native HLS playback for:', url);
        this.audio.src = url;
      } else if (Hls.isSupported()) {
        // Fallback to hls.js for browsers without native HLS support (e.g., Chrome, Firefox, Edge on desktop/Android)
        console.log('[AudioEngine] Initializing hls.js for stream:', url);
        try {
          this.hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            maxBufferLength: 15,
            maxMaxBufferLength: 30,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10
          });
          this.hls.loadSource(url);
          this.hls.attachMedia(this.audio);
          
          this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('[HlsJS] Stream manifest parsed successfully');
            if (this.isPlaying) {
              this.audio.play().catch(() => {});
            }
          });

          this.hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error('[HlsJS] Fatal network error, attempting reload...', data);
                  this.hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error('[HlsJS] Fatal media error, attempting media recovery...', data);
                  this.hls.recoverMediaError();
                  break;
                default:
                  console.error('[HlsJS] Unrecoverable fatal error:', data);
                  this.error = 'Live HLS Stream playback interrupted. Tap to retry.';
                  this.notifyState();
                  break;
              }
            }
          });
        } catch (err) {
          console.error('[AudioEngine] Failed to load or initialize hls.js. Falling back to native assignment:', err);
          this.audio.src = url;
        }
      } else {
        console.warn('[AudioEngine] HLS playback is not supported on this browser.');
        this.audio.src = url;
      }
    } else {
      // Standard audio formats (MP3, AAC, etc.)
      this.audio.src = url;
    }
  }

  // Audio Heartbeat Monitor: Checks every 1.5s to ensure currentTime is advancing when stream is active.
  // If stream is active but currentTime is frozen for >3 seconds, triggers auto-healing reconnection.
  private setupAudioHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = setInterval(() => {
      if (typeof window === 'undefined') return;

      if (this.isPlaying && !this.audio.paused && !this.isLoading && !this.isBuffering) {
        const now = Date.now();
        const current = this.audio.currentTime;

        if (current > 0 && current === this.lastCurrentTime) {
          const stallDurationMs = now - this.lastProgressTimestamp;
          if (stallDurationMs > 3000 && !this.isHeartbeatStalled) {
            this.isHeartbeatStalled = true;
            console.warn('[AudioHeartbeat] Silent audio stall detected (>3s frozen currentTime). Triggering stream auto-heal...');
            diagnosticsService.log(
              'warn',
              'stream',
              'Audio Heartbeat monitor detected silent stream stall (>3s without currentTime progress). Triggering stream auto-heal reconnection...',
              undefined,
              this.audio.src
            );
            this.autoHealReconnect();
          }
        } else {
          this.lastCurrentTime = current;
          this.lastProgressTimestamp = now;
          this.isHeartbeatStalled = false;
        }
      } else {
        this.lastCurrentTime = this.audio.currentTime || 0;
        this.lastProgressTimestamp = Date.now();
        this.isHeartbeatStalled = false;
      }
    }, 1500);
  }

  // Resume Playback on Interruption Listener:
  // Automatically resumes AudioContext & HTML5 Audio when browser policy interrupts or suspends context
  private setupInterruptionListener() {
    if (typeof window === 'undefined') return;

    const handleInterruptionRecovery = () => {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().then(() => {
          diagnosticsService.log('info', 'audio_context', 'AudioContext successfully resumed from suspended state after user interaction/visibility change');
          this.notifyState();
        }).catch(() => {});
      }

      if (this.isPlaying && this.audio.paused && this.audio.src) {
        diagnosticsService.log('warn', 'stream', 'Re-triggering stream playback following browser interruption / window focus', undefined, this.audio.src);
        this.audio.play().catch(() => {});
      }
    };

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleInterruptionRecovery();
      }
    }, { passive: true });

    window.addEventListener('pointerdown', handleInterruptionRecovery, { passive: true });
    window.addEventListener('touchstart', handleInterruptionRecovery, { passive: true });
    window.addEventListener('touchend', handleInterruptionRecovery, { passive: true });
    window.addEventListener('click', handleInterruptionRecovery, { passive: true });
    window.addEventListener('focus', handleInterruptionRecovery, { passive: true });
  }

  private setupUserGestureUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('touchend', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  private setupAudioListeners() {
    this.audio.addEventListener('play', () => {
      this.isPlaying = !this.audio.paused;
      this.isLoading = false;
      this.isBuffering = false;
      this.error = null;
      this.acquireWakeLock();
      this.notifyState();
      this.updateMediaSessionPlaybackState('playing');
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = !this.audio.paused;
      this.isLoading = false;
      this.isBuffering = false;
      this.releaseWakeLock();
      this.notifyState();
      this.updateMediaSessionPlaybackState('paused');
    });

    this.audio.addEventListener('waiting', () => {
      this.isBuffering = true;
      diagnosticsService.recordBufferUnderrun(this.audio.src);
      this.notifyState();
    });

    this.audio.addEventListener('playing', () => {
      this.isBuffering = false;
      this.isLoading = false;
      this.streamRetryCount = 0;
      if (this.currentStation) {
        storageService.resetFailedAttempts(this.currentStation.id);
      }
      this.acquireWakeLock();
      const latency = this.streamStartTimestamp > 0 ? Date.now() - this.streamStartTimestamp : 450;
      diagnosticsService.recordStartupSuccess(
        latency,
        this.currentStation?.name || this.currentEpisode?.title,
        this.audio.src
      );
      this.notifyState();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio.currentTime;
      this.duration = this.audio.duration || 0;

      // Update MediaSession position state for lockscreen audio widget on Android
      if ('mediaSession' in navigator && (navigator.mediaSession as any).setPositionState) {
        try {
          if (this.duration && isFinite(this.duration) && this.duration > 0) {
            (navigator.mediaSession as any).setPositionState({
              duration: this.duration,
              playbackRate: this.audio.playbackRate || 1,
              position: Math.min(this.currentTime, this.duration)
            });
          }
        } catch {}
      }

      // Track listening stats every 10 seconds
      const now = Date.now();
      if (this.isPlaying && now - this.lastStatTrackingTime > 10000) {
        storageService.addListeningTime(10);
        this.lastStatTrackingTime = now;
      }

      // Save podcast progress if playing episode
      if (this.currentEpisode) {
        const progress = {
          stationIdOrUrl: this.currentEpisode.audioUrl,
          positionMs: Math.floor(this.currentTime * 1000),
          durationMs: Math.floor(this.duration * 1000),
          episodeTitle: this.currentEpisode.title,
          lastPlayedTimestamp: Date.now()
        };
        storageService.savePodcastProgress(progress);

        const nowMs = Date.now();
        if (nowMs - this.lastPodcastCloudSyncTime > 5000) {
          this.lastPodcastCloudSyncTime = nowMs;
          if (firebaseService.getCurrentUser()) {
            firebaseService.syncPodcastProgressToCloud(progress).catch(() => {});
          }
        }
      }

      this.notifyState();
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.currentTime = 0;
      this.releaseWakeLock();
      this.notifyState();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio playback error encountered:', e);
      diagnosticsService.log('error', 'stream', 'HTML5 Audio element error encountered during stream decode/fetch', undefined, this.audio.src, { error: e });
      this.handlePlaybackError();
    });
  }

  private handlePlaybackError() {
    this.isLoading = false;
    this.isBuffering = false;

    if (this.currentStation) {
      const currentSrc = this.audio.src || '';
      const station = this.currentStation;

      // Tier 1: If direct stream failed, try proxy relay
      if (!currentSrc.includes('/api/stream/proxy') && station.streamUrl) {
        const proxyUrl = `/api/stream/proxy?url=${encodeURIComponent(station.streamUrl)}`;
        diagnosticsService.log('warn', 'stream', 'Direct stream failed, trying HTTPS proxy relay', undefined, proxyUrl);
        this.error = 'Reconnecting via secure audio relay...';
        this.notifyState();
        setTimeout(() => {
          this.loadStreamSource(proxyUrl);
          this.audio.play().catch(() => {
            this.handleFallbackMirrors(station);
          });
        }, 600);
        return;
      }

      // Tier 2: Try specific station fallback mirrors
      this.handleFallbackMirrors(station);
      return;
    }

    this.error = 'Unable to stream audio. Station may be offline.';
    this.isPlaying = false;
    this.releaseWakeLock();
    diagnosticsService.log('error', 'stream', 'Audio stream failed to play (Station offline)', undefined, this.audio.src);
    this.notifyState();
  }

  private handleFallbackMirrors(station: RadioStation) {
    // Known mirrors for high-profile stations (e.g. Xone FM / VOV3 / Zeno)
    const norm = (station.name + ' ' + station.streamUrl).toLowerCase();
    let backupUrl = '';
    if (norm.includes('xone') || norm.includes('vov3') || norm.includes('vov 3')) {
      backupUrl = 'https://audio-lss.vov.vn/live/vov3.m3u8';
    } else if (norm.includes('vov1') || norm.includes('vov 1')) {
      backupUrl = 'https://audio-lss.vov.vn/live/vov1.m3u8';
    } else if (norm.includes('vov2') || norm.includes('vov 2')) {
      backupUrl = 'https://audio-lss.vov.vn/live/vov2.m3u8';
    }

    if (backupUrl && !this.audio.src.includes(encodeURIComponent(backupUrl)) && this.audio.src !== backupUrl) {
      diagnosticsService.log('info', 'stream', 'Trying verified CDN backup mirror for station', undefined, backupUrl);
      this.error = 'Switching to verified backup stream mirror...';
      this.notifyState();
      setTimeout(() => {
        const target = `/api/stream/proxy?url=${encodeURIComponent(backupUrl)}`;
        this.loadStreamSource(target);
        this.audio.play().catch(() => {
          this.error = 'Station stream is temporarily unavailable. Tap to retry or choose another station.';
          this.isPlaying = false;
          this.releaseWakeLock();
          this.notifyState();
        });
      }, 700);
      return;
    }

    this.error = 'Station stream is temporarily unavailable. Tap to retry or choose another station.';
    this.isPlaying = false;
    this.releaseWakeLock();
    diagnosticsService.log('error', 'stream', 'Station stream unavailable after all fallback attempts', undefined, station.streamUrl);
    this.notifyState();
  }

  // Initialize Web Audio API nodes on user gesture
  public initWebAudio() {
    if (this.webAudioInitialized) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

      // Create 5 EQ Biquad Filter Nodes
      const frequencies = [60, 230, 910, 3600, 14000];
      const types: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];

      this.eqFilters = frequencies.map((freq, i) => {
        const filter = this.audioCtx!.createBiquadFilter();
        filter.type = types[i];
        filter.frequency.value = freq;
        filter.gain.value = 0;
        filter.Q.value = 1.0;
        return filter;
      });

      // Normalize Audio Stage: DynamicsCompressorNode & GainNode
      this.normalizeGainNode = this.audioCtx.createGain();
      this.compressorNode = this.audioCtx.createDynamicsCompressor();

      // Configure compressor for automatic broadcast loudness equalization
      this.updateNormalizeNodes();

      // Preamp Gain Node (Audio Booster)
      this.preampGainNode = this.audioCtx.createGain();
      this.preampGainNode.gain.value = 1.0;

      // FFT Analyser Node
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.65;

      // Connect graph: Source -> EQ1 -> EQ2 -> EQ3 -> EQ4 -> EQ5 -> normalizeGain -> compressor -> PreampGain -> Analyser -> Destination
      let prevNode: AudioNode = this.sourceNode;
      for (const filter of this.eqFilters) {
        prevNode.connect(filter);
        prevNode = filter;
      }
      prevNode.connect(this.normalizeGainNode);
      this.normalizeGainNode.connect(this.compressorNode);
      this.compressorNode.connect(this.preampGainNode);
      this.preampGainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);

      // Inaudible keepalive carrier node to prevent Android Chrome audio thread freeze during background / screen-off
      try {
        this.keepAliveOsc = this.audioCtx.createOscillator();
        this.keepAliveGain = this.audioCtx.createGain();
        this.keepAliveGain.gain.value = 0.000001; // Inaudible carrier signal
        this.keepAliveOsc.connect(this.keepAliveGain);
        this.keepAliveGain.connect(this.audioCtx.destination);
        this.keepAliveOsc.start();
      } catch (e) {
        console.warn('Keep-alive carrier setup bypassed:', e);
      }

      this.webAudioInitialized = true;
      this.applyEQPreset(this.activeEQPresetName, this.boosterEnabled);

      if (this.audioCtx) {
        this.audioCtx.onstatechange = () => {
          console.log(`[AudioEngine] AudioContext state changed: ${this.audioCtx?.state}`);
          diagnosticsService.log('info', 'audio_context', `AudioContext state changed to: ${this.audioCtx?.state}`);
          if (this.isPlaying && this.audioCtx?.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
          }
          this.notifyState();
        };
      }
    } catch (e) {
      console.warn('Web Audio initialization fallback:', e);
    }
  }

  private updateNormalizeNodes() {
    if (!this.audioCtx || !this.compressorNode || !this.normalizeGainNode) return;
    if (this.isCrossfading) return;
    const now = this.audioCtx.currentTime;
    if (this.nightMode) {
      // Night Mode: Strong dynamic compression & peak limiting to prevent sudden volume spikes
      this.compressorNode.threshold.setValueAtTime(-36, now);
      this.compressorNode.knee.setValueAtTime(8, now);
      this.compressorNode.ratio.setValueAtTime(12, now);
      this.compressorNode.attack.setValueAtTime(0.003, now);
      this.compressorNode.release.setValueAtTime(0.20, now);
      this.normalizeGainNode.gain.setValueAtTime(0.90, now);
      this.setupAutoNormalizeLoop();
    } else if (this.normalizeAudio) {
      // Broadcast standard multiband leveling profile
      this.compressorNode.threshold.setValueAtTime(-24, now);
      this.compressorNode.knee.setValueAtTime(12, now);
      this.compressorNode.ratio.setValueAtTime(8, now);
      this.compressorNode.attack.setValueAtTime(0.005, now);
      this.compressorNode.release.setValueAtTime(0.25, now);
      const baseGain = 1.2 * (this.targetNormalizeLevel / 0.85);
      this.normalizeGainNode.gain.setValueAtTime(baseGain, now);
      this.setupAutoNormalizeLoop();
    } else {
      // Bypass compression & normalization
      this.compressorNode.threshold.setValueAtTime(0, now);
      this.compressorNode.ratio.setValueAtTime(1, now);
      this.normalizeGainNode.gain.setValueAtTime(1.0, now);
      if (this.autoLevelInterval) {
        clearInterval(this.autoLevelInterval);
        this.autoLevelInterval = null;
      }
    }
  }

  public setNightMode(enabled: boolean) {
    this.nightMode = enabled;
    storageService.saveNightMode(enabled);
    this.updateNormalizeNodes();
    this.notifyState();
  }

  public getNightMode(): boolean {
    return this.nightMode;
  }

  private setupAutoNormalizeLoop() {
    if (this.autoLevelInterval) return;
    this.autoLevelInterval = setInterval(() => {
      if (!this.isPlaying || !this.normalizeAudio || !this.analyserNode || !this.normalizeGainNode || !this.audioCtx) {
        return;
      }

      try {
        const bufferLength = this.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyserNode.getByteFrequencyData(dataArray);

        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normalized = dataArray[i] / 255;
          sumSquares += normalized * normalized;
        }
        const currentRMS = Math.sqrt(sumSquares / bufferLength);

        if (currentRMS > 0.015) {
          this.measuredRMSHistory.push(currentRMS);
          if (this.measuredRMSHistory.length > 10) {
            this.measuredRMSHistory.shift();
          }

          const avgRMS = this.measuredRMSHistory.reduce((a, b) => a + b, 0) / this.measuredRMSHistory.length;
          const targetRMS = 0.22 * (this.targetNormalizeLevel / 0.85);

          let desiredGain = targetRMS / avgRMS;
          desiredGain = Math.max(0.4, Math.min(2.5, desiredGain));

          const now = this.audioCtx.currentTime;
          this.normalizeGainNode.gain.setTargetAtTime(desiredGain, now, 0.25);
        }
      } catch (e) {
        // Safe catch
      }
    }, 200);
  }

  public setNormalizeAudio(enabled: boolean) {
    this.normalizeAudio = enabled;
    storageService.setLoudnessNormalization(enabled);
    this.updateNormalizeNodes();
    this.notifyState();
  }

  public checkAndApplyStationNormalizeOverride(station: RadioStation) {
    const override = storageService.getStationLoudnessOverride(station.id);
    if (override === 'enabled') {
      this.normalizeAudio = true;
    } else if (override === 'disabled') {
      this.normalizeAudio = false;
    } else {
      this.normalizeAudio = storageService.getLoudnessNormalization();
    }
    this.updateNormalizeNodes();
  }

  public setTargetNormalizeLevel(level: number) {
    this.targetNormalizeLevel = Math.max(0.5, Math.min(1.0, level));
    storageService.setTargetNormalizeLevel(this.targetNormalizeLevel);
    this.updateNormalizeNodes();
    this.notifyState();
  }

  public getTargetNormalizeLevel(): number {
    return this.targetNormalizeLevel;
  }

  public setCrossfadeDurationMs(ms: number) {
    this.crossfadeDurationMs = Math.max(0, Math.min(3000, ms));
    storageService.setCrossfadeDurationMs(this.crossfadeDurationMs);
    this.notifyState();
  }

  public getCrossfadeDurationMs(): number {
    return this.crossfadeDurationMs;
  }

  public toggleNormalizeAudio() {
    this.setNormalizeAudio(!this.normalizeAudio);
  }

  public setDataSaverBitrate(bitrate: string) {
    this.dataSaverBitrate = bitrate;
    storageService.setDataSaverBitrate(bitrate);
    this.notifyState();
    if (this.currentStation && this.isPlaying) {
      this.playStation(this.currentStation);
    }
  }

  private async executeCrossfadeTransition(playNewStreamCallback: () => Promise<void>): Promise<void> {
    const fadeMs = Math.max(100, Math.min(3000, this.crossfadeDurationMs));
    const halfFadeSec = (fadeMs / 2) / 1000;
    this.isCrossfading = true;

    // Phase 1: Smooth Fade-Out
    if (this.webAudioInitialized && this.audioCtx && this.normalizeGainNode && this.audioCtx.state === 'running') {
      try {
        const now = this.audioCtx.currentTime;
        const currentGain = this.normalizeGainNode.gain.value;
        this.normalizeGainNode.gain.setValueAtTime(currentGain, now);
        this.normalizeGainNode.gain.linearRampToValueAtTime(0.001, now + halfFadeSec);
      } catch {}
      await new Promise(r => setTimeout(r, Math.floor(fadeMs / 2)));
    } else {
      const startVol = this.audio.volume;
      const steps = 8;
      const stepTime = Math.floor((fadeMs / 2) / steps);
      for (let i = steps - 1; i >= 0; i--) {
        this.audio.volume = (startVol * i) / steps;
        await new Promise(r => setTimeout(r, stepTime));
      }
    }

    this.measuredRMSHistory = [];

    // Phase 2: Play new stream (starts at volume 0 because of internalPlayStation volume check)
    await playNewStreamCallback();

    // Phase 3: Smooth Fade-In
    const targetVol = this.isMuted ? 0 : Math.max(0.05, this.volume);
    if (this.webAudioInitialized && this.audioCtx && this.normalizeGainNode) {
      try {
        // Since we are routing through Web Audio, let HTMLAudioElement volume be targetVol,
        // and fade in via the gain node.
        this.audio.volume = targetVol;
        const now = this.audioCtx.currentTime;
        const targetGain = 1.2 * (this.targetNormalizeLevel / 0.85);
        this.normalizeGainNode.gain.setValueAtTime(0.001, now);
        this.normalizeGainNode.gain.linearRampToValueAtTime(targetGain, now + halfFadeSec);
      } catch {}
    } else {
      const steps = 8;
      const stepTime = Math.floor((fadeMs / 2) / steps);
      for (let i = 1; i <= steps; i++) {
        this.audio.volume = (targetVol * i) / steps;
        await new Promise(r => setTimeout(r, stepTime));
      }
      this.audio.volume = targetVol;
    }

    this.isCrossfading = false;
  }

  public setStation(station: RadioStation) {
    this.currentStation = station;
    this.currentEpisode = null;
    this.currentTrackTitle = station.name;
    this.loadStreamSource(station.streamUrl);
    this.audio.load();
    this.isPlaying = false;
    this.isLoading = false;
    this.notifyState();
  }

  public async playStation(station: RadioStation) {
    // Crucial: Initialize and resume Web Audio synchronously inside the user-gesture callstack before any async crossfade transitions!
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch {}
    }

    if (this.isPlaying && this.crossfadeDurationMs > 0 && !this.isCrossfading) {
      this.isCrossfading = true;
      try {
        await this.executeCrossfadeTransition(() => this.internalPlayStation(station));
      } finally {
        this.isCrossfading = false;
      }
    } else {
      await this.internalPlayStation(station);
    }
  }

  public detectAndApplyAutoEQ(station: RadioStation) {
    if (!storageService.getAutoEQEnabled()) return;
    const text = ((station.genre || '') + ' ' + (station.customTags || []).join(' ') + ' ' + (station.name || '')).toLowerCase();
    
    let targetPreset = 'Balanced';
    if (text.includes('classical') || text.includes('symphony') || text.includes('orchestra') || text.includes('opera') || text.includes('baroque')) {
      targetPreset = 'Classical';
    } else if (text.includes('rock') || text.includes('metal') || text.includes('alternative') || text.includes('punk') || text.includes('guitar')) {
      targetPreset = 'Rock';
    } else if (text.includes('electronic') || text.includes('edm') || text.includes('dance') || text.includes('techno') || text.includes('house') || text.includes('trance') || text.includes('club')) {
      targetPreset = 'Electronic';
    } else if (text.includes('jazz') || text.includes('blues') || text.includes('swing') || text.includes('bossa') || text.includes('big band')) {
      targetPreset = 'Jazz';
    } else if (text.includes('pop') || text.includes('hits') || text.includes('top 40') || text.includes('chart')) {
      targetPreset = 'Pop';
    } else if (text.includes('news') || text.includes('talk') || text.includes('podcast') || text.includes('speech') || text.includes('sports')) {
      targetPreset = 'Vocal Focus';
    } else if (text.includes('bass') || text.includes('hiphop') || text.includes('hip hop') || text.includes('rap') || text.includes('dubstep')) {
      targetPreset = 'Bass Boost';
    } else if (text.includes('lounge') || text.includes('chill') || text.includes('ambient') || text.includes('lofi') || text.includes('lo-fi')) {
      targetPreset = 'Chill Lounge';
    } else if (text.includes('acoustic') || text.includes('folk') || text.includes('singer')) {
      targetPreset = 'Acoustic';
    }

    if (targetPreset !== this.activeEQPresetName) {
      this.applyEQPreset(targetPreset, this.boosterEnabled);
      diagnosticsService.log('info', 'audio_context', `Intelligent EQ automatically selected preset '${targetPreset}' for station genre '${station.genre}'`);
    }
  }

  private handleExponentialBackoffRetry(station: RadioStation, _originalErr?: any) {
    if (this.streamRetryCount < this.maxStreamRetries) {
      this.streamRetryCount++;
      const backoffMs = Math.min(8000, 1000 * Math.pow(2, this.streamRetryCount - 1)); // 1s, 2s, 4s, 8s
      this.isLoading = true;
      this.error = `Trying to reconnect... (Attempt ${this.streamRetryCount}/${this.maxStreamRetries})`;
      diagnosticsService.log('warn', 'stream', `Exponential backoff auto-retry attempt ${this.streamRetryCount}/${this.maxStreamRetries} in ${backoffMs}ms for ${station.name}`);
      this.notifyState();

      if (this.retryTimeoutId) clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = setTimeout(async () => {
        try {
          let targetUrl = `/api/stream/proxy?url=${encodeURIComponent(station.streamUrl)}`;
          if (this.dataSaverBitrate !== 'auto') {
            targetUrl += `&maxBitrate=${this.dataSaverBitrate}`;
          }
          await this.clearActivePlayPromise();
          this.loadStreamSource(targetUrl);
          this.audio.muted = false;
          this.audio.volume = this.isMuted ? 0 : Math.max(0.05, this.volume);
          const p = this.audio.play();
          this.activePlayPromise = p;
          await p;
          this.error = null;
          this.streamRetryCount = 0;
          this.notifyState();
        } catch (e) {
          this.handleExponentialBackoffRetry(station, e);
        }
      }, backoffMs);
      return;
    }

    // Retries exhausted
    this.streamRetryCount = 0;
    this.isLoading = false;
    this.isPlaying = false;
    this.releaseWakeLock();

    const failures = storageService.incrementFailedAttempts(station.id);
    const autoPrune = storageService.getAutoPruneDeadStations();

    if (autoPrune && failures >= 3 && storageService.isFavorite(station.id)) {
      storageService.removeFavorite(station.id);
      this.error = `Station "${station.name}" failed to load 3 times and was automatically removed from Favorites.`;
      diagnosticsService.log('warn', 'stream', `Auto-Pruned dead station ${station.name} (${station.id}) from Favorites after 3 consecutive load failures`);
    } else {
      this.error = `Stream connection failed after multiple retries. Station may be offline.`;
      diagnosticsService.log('error', 'stream', `Stream connection failed after ${this.maxStreamRetries} exponential backoff retries`);
    }

    this.notifyState();
  }

  private async internalPlayStation(station: RadioStation) {
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch {}
    }

    this.streamStartTimestamp = Date.now();
    diagnosticsService.recordStreamStart();
    this.currentStation = station;
    this.currentEpisode = null;
    this.currentTrackTitle = station.name;
    this.isLoading = true;
    this.error = null;
    this.notifyState();

    // Auto EQ preset curve selection based on station genre metadata
    this.detectAndApplyAutoEQ(station);

    // Apply Loudness Normalization (GainNode / Compressor) according to global or station override settings
    this.checkAndApplyStationNormalizeOverride(station);

    diagnosticsService.log('info', 'stream', `Connecting to station stream: ${station.name}`, undefined, station.streamUrl, {
      bitrate: station.bitrate,
      codec: station.codec,
      country: station.country,
      dataSaverBitrate: this.dataSaverBitrate
    });

    storageService.addRecent(station);
    firebaseService.addRecentStationToCloud(station).catch(() => {});

    // 1. Check if we have a pre-cached audio connection for this station
    const cachedAudio = this.preCachedAudios.get(station.id);
    if (cachedAudio) {
      console.log(`[AudioEngine] Promoting pre-cached audio connection for: ${station.name}`);
      try {
        if (this.hls) {
          this.hls.destroy();
          this.hls = null;
        }
        this.audio.pause();
        this.audio.src = '';
        this.audio.load();
      } catch {}

      this.audio = cachedAudio;
      this.audio.muted = false;
      this.audio.volume = this.isCrossfading ? 0 : (this.isMuted ? 0 : Math.max(0.05, this.volume));
      this.preCachedAudios.delete(station.id);
      
      this.setupAudioListeners();

      // Re-setup Web Audio source node and routing
      if (this.audioCtx && this.webAudioInitialized) {
        try {
          if (this.sourceNode) {
            this.sourceNode.disconnect();
          }
        } catch {}
        try {
          this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
          let prevNode: AudioNode = this.sourceNode;
          for (const filter of this.eqFilters) {
            prevNode.connect(filter);
            prevNode = filter;
          }
          prevNode.connect(this.normalizeGainNode!);
        } catch (e) {
          console.warn('Failed to reconnect promoted source node:', e);
        }
      }

      try {
        await this.clearActivePlayPromise();
        const p = this.audio.play();
        this.activePlayPromise = p;
        await p;
        this.updateMediaSessionMetadata(station.name, station.genre, station.imageUrl);
        diagnosticsService.log('success', 'stream', `Instant playback from pre-cached connection for ${station.name}`);
        
        // Trigger background pre-caching update for the next stations
        setTimeout(() => this.updatePreCache(), 1000);
        return; // Success! Return early
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('interrupted')) {
          console.log('[AudioEngine] Promoted play request was intentionally aborted/paused.');
          return;
        }
        console.warn('Promoted audio play failed, falling back to standard loading:', err);
      }
    }

    try {
      this.audio.muted = false;
      this.audio.volume = this.isCrossfading ? 0 : (this.isMuted ? 0 : Math.max(0.05, this.volume));

      // Route stream through CORS-compliant Proxy Relay for Mobile Chrome & HTTPS environments
      let targetUrl = station.streamUrl;
      const isHls = station.streamUrl.toLowerCase().includes('.m3u8');
      const isMobileOrHttps = typeof window !== 'undefined' && (
        window.location.protocol === 'https:' ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      );
      const isDataSaverActive = this.dataSaverBitrate !== 'auto';

      // HLS streams with CORS support should be loaded directly to allow Hls.js/Safari native chunk parsing
      if (isHls && targetUrl.startsWith('https://')) {
        targetUrl = station.streamUrl;
      } else if (isMobileOrHttps || isDataSaverActive || !targetUrl.startsWith('https://')) {
        targetUrl = `/api/stream/proxy?url=${encodeURIComponent(station.streamUrl)}`;
        if (isDataSaverActive) {
          targetUrl += `&maxBitrate=${this.dataSaverBitrate}`;
          diagnosticsService.log('info', 'stream', `Data Saver active (${this.dataSaverBitrate}kbps cap): routing via bitrate limited relay`, undefined, targetUrl);
        }
      }

      await this.clearActivePlayPromise();
      this.loadStreamSource(targetUrl);
      this.audio.playbackRate = 1.0;
      const p = this.audio.play();
      this.activePlayPromise = p;
      await p;
      this.updateMediaSessionMetadata(station.name, station.genre, station.imageUrl);

      // Trigger background pre-caching update for the next stations
      setTimeout(() => this.updatePreCache(), 1000);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('interrupted')) {
        console.log('[AudioEngine] Play request was intentionally aborted/paused. Skipping fallback.');
        return;
      }
      console.warn('Initial play promise rejected, trying proxy fallback:', err);
      diagnosticsService.log('warn', 'stream', 'Direct play promise rejected: switching to audio relay proxy', undefined, station.streamUrl, { error: err?.message || String(err) });
      // Auto-healing fallback via stream proxy
      try {
        let proxyUrl = `/api/stream/proxy?url=${encodeURIComponent(station.streamUrl)}`;
        if (this.dataSaverBitrate !== 'auto') {
          proxyUrl += `&maxBitrate=${this.dataSaverBitrate}`;
        }
        await this.clearActivePlayPromise();
        this.loadStreamSource(proxyUrl);
        this.audio.muted = false;
        this.audio.volume = this.isMuted ? 0 : Math.max(0.05, this.volume);
        const p = this.audio.play();
        this.activePlayPromise = p;
        await p;
        this.updateMediaSessionMetadata(station.name, station.genre, station.imageUrl);

        // Trigger background pre-caching update for the next stations
        setTimeout(() => this.updatePreCache(), 1000);
      } catch (proxyErr) {
        this.handleExponentialBackoffRetry(station, proxyErr);
      }
    }
  }

  public async playPodcastEpisode(show: RadioStation, episode: PodcastEpisode) {
    // Crucial: Initialize and resume Web Audio synchronously inside the user-gesture callstack before any async crossfade transitions!
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch {}
    }

    if (this.isPlaying && this.crossfadeDurationMs > 0 && !this.isCrossfading) {
      this.isCrossfading = true;
      try {
        await this.executeCrossfadeTransition(() => this.internalPlayPodcastEpisode(show, episode));
      } finally {
        this.isCrossfading = false;
      }
    } else {
      await this.internalPlayPodcastEpisode(show, episode);
    }
  }

  private async internalPlayPodcastEpisode(show: RadioStation, episode: PodcastEpisode) {
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch {}
    }

    this.currentStation = show;
    this.currentEpisode = episode;
    this.currentTrackTitle = episode.title;
    this.isLoading = true;
    this.error = null;
    this.notifyState();

    storageService.addRecent(show);
    storageService.addRecentEpisode(show, episode);

    try {
      this.audio.muted = false;
      this.audio.volume = this.isMuted ? 0 : Math.max(0.05, this.volume);
      this.loadStreamSource(episode.audioUrl);
      this.audio.playbackRate = this.playbackSpeed;

      // Resume from previous progress if stored
      let progress = storageService.getPodcastProgress(episode.audioUrl);
      if (firebaseService.getCurrentUser()) {
        try {
          const cloudProgress = await firebaseService.getCloudPodcastProgress(episode.audioUrl);
          if (cloudProgress) {
            if (!progress || cloudProgress.lastPlayedTimestamp > progress.lastPlayedTimestamp) {
              progress = cloudProgress;
              storageService.savePodcastProgress(cloudProgress);
            }
          }
        } catch (e) {
          console.warn('[AudioEngine] Could not retrieve cloud podcast progress:', e);
        }
      }

      if (progress && progress.positionMs > 5000 && progress.positionMs < (episode.durationMs - 15000)) {
        this.audio.currentTime = progress.positionMs / 1000;
      }

      await this.clearActivePlayPromise();
      const p = this.audio.play();
      this.activePlayPromise = p;
      await p;
      this.updateMediaSessionMetadata(episode.title, show.name, episode.artworkUrl || show.imageUrl);

      // Trigger background pre-caching update for the next stations
      setTimeout(() => this.updatePreCache(), 1000);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('interrupted')) {
        console.log('[AudioEngine] Podcast play request was intentionally aborted/paused. Skipping fallback.');
        return;
      }
      console.error('Failed to play podcast episode:', err);
      // Try proxy fallback if podcast audio host blocks CORS
      try {
        const proxyUrl = `/api/stream/proxy?url=${encodeURIComponent(episode.audioUrl)}`;
        await this.clearActivePlayPromise();
        this.loadStreamSource(proxyUrl);
        const p = this.audio.play();
        this.activePlayPromise = p;
        await p;
        this.updateMediaSessionMetadata(episode.title, show.name, episode.artworkUrl || show.imageUrl);

        // Trigger background pre-caching update for the next stations
        setTimeout(() => this.updatePreCache(), 1000);
      } catch {
        this.error = 'Failed to load podcast episode.';
        this.isLoading = false;
        this.isPlaying = false;
        this.notifyState();
      }
    }
  }

  public async togglePlay() {
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch {}
    }

    const currentlyPaused = this.audio.paused;

    if (!currentlyPaused) {
      this.audio.pause();
      this.isPlaying = false;
      this.isLoading = false;
      this.isBuffering = false;
      this.notifyState();
    } else {
      this.audio.muted = false;
      this.audio.volume = this.isMuted ? 0 : Math.max(0.05, this.volume);
      if (this.audio.src) {
        try {
          await this.clearActivePlayPromise();
          const p = this.audio.play();
          this.activePlayPromise = p;
          await p;
        } catch (e: any) {
          if (e?.name === 'AbortError' || e?.message?.includes('aborted') || e?.message?.includes('interrupted')) {
            console.log('[AudioEngine] Toggle play resume was aborted.');
            return;
          }
          console.warn('Play resume error:', e);
        }
      } else if (this.currentStation) {
        await this.playStation(this.currentStation);
      } else if (this.currentEpisode && this.currentStation) {
        await this.internalPlayPodcastEpisode(this.currentStation, this.currentEpisode);
      }
    }
  }

  public pause() {
    this.stopSystemChimeLoop();
    this.audio.pause();
  }

  public stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    this.notifyState();
  }

  public seekTo(timeSec: number) {
    if (!isNaN(timeSec) && isFinite(timeSec)) {
      this.audio.currentTime = Math.max(0, Math.min(timeSec, this.duration || 999999));
      this.currentTime = this.audio.currentTime;
      this.notifyState();
    }
  }

  public seek(timeSec: number) {
    this.seekTo(timeSec);
  }

  public seekRelative(deltaSec: number) {
    this.seekTo(this.audio.currentTime + deltaSec);
  }

  public async resume() {
    if (!this.isPlaying) {
      await this.togglePlay();
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.audio.volume = this.isMuted ? 0 : this.volume;
    this.notifyState();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.audio.volume = this.isMuted ? 0 : this.volume;
    storageService.saveVolume(this.volume);
    this.notifyState();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.audio.volume = this.isMuted ? 0 : this.volume;
    this.notifyState();
  }

  public setPlaybackSpeed(speed: number) {
    this.playbackSpeed = speed;
    this.audio.playbackRate = speed;
    this.notifyState();
  }

  // Equalizer & Audio Booster
  public applyEQPreset(presetName: string, booster: boolean = false) {
    this.activeEQPresetName = presetName;
    this.boosterEnabled = booster;
    storageService.saveEQPreset(presetName);

    const preset = EQ_PRESETS[presetName] || EQ_PRESETS['Balanced'];
    const gainBoost = booster ? 4 : 0;

    if (this.eqFilters.length === 5) {
      this.eqFilters[0].gain.value = preset.band60Hz + gainBoost;
      this.eqFilters[1].gain.value = preset.band230Hz + gainBoost;
      this.eqFilters[2].gain.value = preset.band910Hz + gainBoost;
      this.eqFilters[3].gain.value = preset.band3600Hz + gainBoost;
      this.eqFilters[4].gain.value = preset.band14000Hz + gainBoost;
    }

    if (this.preampGainNode) {
      const dbGain = preset.preampGain + (booster ? 3 : 0);
      // Convert dB to linear gain: 10^(dB / 20)
      const linearGain = Math.pow(10, dbGain / 20);
      this.preampGainNode.gain.value = Math.min(linearGain, 2.0); // Safe threshold limiter
    }
  }

  // 8-Band Audio Visualizer Real-Time Energy Provider
  public getVisualizerEnergy(): number[] {
    if (!this.isPlaying) {
      return [0, 0, 0, 0, 0, 0, 0, 0];
    }

    const alpha = 0.65; // Exponential smoothing constant
    let rawBands = [0, 0, 0, 0, 0, 0, 0, 0];

    if (this.analyserNode) {
      try {
        const bufferLength = this.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyserNode.getByteFrequencyData(dataArray);

        // Sum non-zero data
        const sum = dataArray.reduce((a, b) => a + b, 0);

        if (sum > 0) {
          // Calculate 8 perceptual bands across the frequency spectrum
          const binCount = bufferLength;
          const bandRanges = [
            [0, Math.floor(binCount * 0.03)],       // Sub-Bass (20-60Hz)
            [Math.floor(binCount * 0.03), Math.floor(binCount * 0.08)],  // Bass (60-250Hz)
            [Math.floor(binCount * 0.08), Math.floor(binCount * 0.16)],  // Low-Mids (250-500Hz)
            [Math.floor(binCount * 0.16), Math.floor(binCount * 0.32)],  // Mids (500-2kHz)
            [Math.floor(binCount * 0.32), Math.floor(binCount * 0.50)],  // High-Mids (2-4kHz)
            [Math.floor(binCount * 0.50), Math.floor(binCount * 0.68)],  // Presence (4-6kHz)
            [Math.floor(binCount * 0.68), Math.floor(binCount * 0.85)],  // Brilliance (6-12kHz)
            [Math.floor(binCount * 0.85), binCount]                      // Air (12-20kHz)
          ];

          rawBands = bandRanges.map(([start, end]) => {
            let total = 0;
            let count = 0;
            for (let i = start; i <= end && i < binCount; i++) {
              total += dataArray[i];
              count++;
            }
            const avg = count > 0 ? total / count : 0;
            return avg / 255;
          });
        }
      } catch (e) {
        // Fallback below
      }
    }

    // Fallback rhythmic pulse if CORS restricts analyser raw frequency bytes
    const isSilent = rawBands.every(v => v === 0);
    if (isSilent && this.isPlaying) {
      const time = Date.now() / 200;
      rawBands = [
        0.4 + 0.5 * Math.abs(Math.sin(time * 0.8)),
        0.5 + 0.45 * Math.abs(Math.sin(time * 1.1 + 0.5)),
        0.35 + 0.4 * Math.abs(Math.sin(time * 1.4 + 1.0)),
        0.6 + 0.35 * Math.abs(Math.sin(time * 1.7 + 1.5)),
        0.45 + 0.4 * Math.abs(Math.sin(time * 2.0 + 2.0)),
        0.3 + 0.5 * Math.abs(Math.sin(time * 2.3 + 2.5)),
        0.4 + 0.45 * Math.abs(Math.sin(time * 2.6 + 3.0)),
        0.3 + 0.4 * Math.abs(Math.sin(time * 2.9 + 3.5)),
      ];
    }

    // Apply exponential smoothing: A_t = alpha * Target + (1 - alpha) * A_{t-1}
    const smoothed = rawBands.map((target, idx) => {
      const prev = this.prevFFTValues[idx] || 0;
      const val = alpha * target + (1 - alpha) * prev;
      return Math.max(0.05, Math.min(1.0, val));
    });

    this.prevFFTValues = smoothed;
    const scaled = smoothed.map(val => Math.max(0.05, Math.min(1.0, val * this.visualizerSensitivity * this.visualizerIntensity)));
    return scaled;
  }

  public setVisualizerSensitivity(sensitivity: number) {
    this.visualizerSensitivity = Math.max(0.2, Math.min(2.5, sensitivity));
    storageService.saveVisualizerSensitivity(this.visualizerSensitivity);
    this.notifyState();
  }

  public getVisualizerSensitivity(): number {
    return this.visualizerSensitivity;
  }

  public setVisualizerIntensity(intensity: number) {
    this.visualizerIntensity = Math.max(0.1, Math.min(3.0, intensity));
    storageService.saveVisualizerIntensity(this.visualizerIntensity);
    this.notifyState();
  }

  public getVisualizerIntensity(): number {
    return this.visualizerIntensity;
  }

  // Sleep Timer with Linear/Exponential Volume Fade-Out (Supports 5-30m fade-out duration)
  public startSleepTimer(minutes: number, fadeOutMinutes: number = 0, curve: 'linear' | 'exponential' | 'logarithmic' = 'linear') {
    this.clearSleepTimer();
    const totalSec = minutes * 60;
    // Fade duration cannot exceed total duration
    const safeFadeMinutes = Math.min(fadeOutMinutes, minutes);
    const fadeSec = safeFadeMinutes * 60;

    this.sleepTimerTotalSec = totalSec;
    this.sleepTimerRemainingSec = totalSec;
    this.sleepTimerFadeSec = fadeSec;
    this.sleepTimerFadeCurve = curve;
    this.notifyState();

    this.sleepTimerInterval = setInterval(() => {
      if (this.sleepTimerRemainingSec !== null && this.sleepTimerRemainingSec > 0) {
        this.sleepTimerRemainingSec -= 1;

        // If fade-out duration is set and remaining seconds are within the fade window
        if (this.sleepTimerFadeSec && this.sleepTimerFadeSec > 0 && this.sleepTimerRemainingSec <= this.sleepTimerFadeSec) {
          const fadeRatio = Math.max(0, this.sleepTimerRemainingSec / this.sleepTimerFadeSec);
          
          let perceptualVolume = fadeRatio; // Default linear
          if (this.sleepTimerFadeCurve === 'exponential') {
            perceptualVolume = (Math.exp(3 * fadeRatio) - 1) / (Math.exp(3) - 1);
          } else if (this.sleepTimerFadeCurve === 'logarithmic') {
            perceptualVolume = Math.log10(1 + 9 * fadeRatio);
          }
          
          this.audio.volume = Math.max(0, Math.min(1, this.volume * perceptualVolume));
        } else if (this.sleepTimerRemainingSec <= 3 && this.sleepTimerRemainingSec > 0) {
          // Fallback final 3-second micro ease
          const fadeRatio = this.sleepTimerRemainingSec / 3;
          this.audio.volume = this.volume * fadeRatio;
        }

        if (this.sleepTimerRemainingSec === 0) {
          this.clearSleepTimer();
          this.pause();
          this.audio.volume = this.volume; // Reset volume to baseline
        }

        this.notifyState();
      }
    }, 1000);
  }

  public clearSleepTimer() {
    if (this.sleepTimerInterval) {
      clearInterval(this.sleepTimerInterval);
      this.sleepTimerInterval = null;
    }
    this.sleepTimerRemainingSec = null;
    this.sleepTimerTotalSec = null;
    this.sleepTimerFadeSec = null;
    this.audio.volume = this.volume;
    this.notifyState();
  }

  public playSystemChimeLoop(volume: number = 0.8) {
    this.initWebAudio();
    if (!this.audioCtx) return;

    this.stopSystemChimeLoop();

    // Create a chime gain node connected to the destination
    this.chimeGainNode = this.audioCtx.createGain();
    this.chimeGainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.chimeGainNode.connect(this.audioCtx.destination);

    const playChime = () => {
      if (!this.audioCtx || !this.chimeGainNode) return;
      
      const now = this.audioCtx.currentTime;
      
      // Synth a soft chime (e.g., combination of two soft sine waves)
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      // Chime-like frequencies: A5 (880Hz) + C#6 (1109Hz)
      osc1.frequency.setValueAtTime(880, now);
      osc2.frequency.setValueAtTime(1109, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4 * volume, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.chimeGainNode);

      osc1.start(now);
      osc2.start(now);
      
      osc1.stop(now + 2.6);
      osc2.stop(now + 2.6);
    };

    // Play immediately, then repeat every 3 seconds
    playChime();
    this.chimeInterval = setInterval(playChime, 3000);
  }

  public stopSystemChimeLoop() {
    if (this.chimeInterval) {
      clearInterval(this.chimeInterval);
      this.chimeInterval = null;
    }
    if (this.chimeGainNode) {
      try {
        this.chimeGainNode.disconnect();
      } catch {}
      this.chimeGainNode = null;
    }
  }

  // Radio Alarm Clock Engine
  private setupAlarmChecker() {
    this.alarmCheckInterval = setInterval(() => {
      const alarm = storageService.getAlarmConfig();
      if (!alarm || !alarm.isEnabled) return;

      const now = new Date();
      if (now.getHours() === alarm.hour && now.getMinutes() === alarm.minute && now.getSeconds() < 6) {
        if (!this.isAlarmRinging) {
          this.triggerAlarm(alarm);
        }
      } else {
        this.isAlarmRinging = false;
      }
    }, 5000);
  }

  private async triggerAlarm(alarm: AlarmConfig) {
    this.isAlarmRinging = true;
    console.log('⏰ Radio Alarm triggered for station:', alarm.stationName);

    // Start rhythmic attention-grabbing vibration pattern for mobile haptics
    if (this.alarmVibrationInterval) {
      clearInterval(this.alarmVibrationInterval);
    }
    triggerHaptic('alarm');
    this.alarmVibrationInterval = setInterval(() => {
      if (this.isAlarmRinging) {
        triggerHaptic('alarm');
      } else {
        if (this.alarmVibrationInterval) {
          clearInterval(this.alarmVibrationInterval);
          this.alarmVibrationInterval = null;
        }
      }
    }, 4000);

    const station: RadioStation = {
      id: alarm.stationId,
      name: alarm.stationName,
      genre: alarm.stationGenre || 'Alarm Radio',
      country: 'Global',
      streamUrl: alarm.stationUrl,
      imageUrl: alarm.stationImageUrl || 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&auto=format&fit=crop&q=80',
      bitrate: '128 kbps',
      codec: 'MP3',
      isFavorite: false,
    };

    let shouldRamp = true;
    if (alarm.weatherRampEnabled) {
      try {
        const weather = await getLocalWeatherInfo(alarm.weatherCity);
        const condition = (weather.conditionText || '').toLowerCase();
        const selectedCond = alarm.weatherRampCondition || 'any';
        
        let met = false;
        if (selectedCond === 'any') {
          met = true;
        } else if (selectedCond === 'clear') {
          met = condition.includes('clear') || condition.includes('sunny') || condition.includes('mild');
        } else if (selectedCond === 'rainy') {
          met = condition.includes('rain') || condition.includes('drizzle') || condition.includes('storm') || condition.includes('shower');
        } else if (selectedCond === 'snowy') {
          met = condition.includes('snow');
        } else if (selectedCond === 'cloudy') {
          met = condition.includes('cloud') || condition.includes('overcast') || condition.includes('fog');
        }
        
        shouldRamp = met;
        console.log(`[Alarm Weather Ramp] Weather condition is "${condition}". Selected condition is "${selectedCond}". Match met: ${met}`);
      } catch (e) {
        console.warn('Failed to evaluate alarm weather condition, defaulting to normal play:', e);
        shouldRamp = true;
      }
    }

    if (shouldRamp) {
      // Smooth wake-up volume ramp up
      this.audio.volume = 0.05;
      await this.playStation(station);

      let ramp = 0.05;
      const rampInterval = setInterval(() => {
        if (!this.isAlarmRinging) {
          clearInterval(rampInterval);
          return;
        }
        ramp += 0.05;
        const targetVol = alarm.volume ?? this.volume;
        if (ramp >= targetVol) {
          this.audio.volume = targetVol;
          clearInterval(rampInterval);
        } else {
          this.audio.volume = ramp;
        }
      }, 1000);
    } else {
      // Immediately set target volume
      const targetVol = alarm.volume ?? this.volume;
      this.audio.volume = targetVol;
      await this.playStation(station);
    }

    // If custom voice memo is recorded, play voice memo audio overlay
    if (alarm.voiceMemoDataUrl) {
      setTimeout(() => {
        if (this.isAlarmRinging || this.isPlaying) {
          try {
            const memoAudio = new Audio(alarm.voiceMemoDataUrl);
            memoAudio.volume = 1.0;
            const targetVol = this.volume;
            this.audio.volume = Math.max(0.1, targetVol * 0.3);
            memoAudio.onended = () => {
              this.audio.volume = targetVol;
            };
            memoAudio.onerror = () => {
              this.audio.volume = targetVol;
            };
            memoAudio.play().catch(() => {
              this.audio.volume = targetVol;
            });
          } catch (e) {
            console.warn('Voice memo playback error:', e);
          }
        }
      }, 1500);
    }

    // If weather announcement option is enabled, announce local conditions after station starts playing
    if (alarm.announceWeather) {
      setTimeout(() => {
        if (this.isAlarmRinging || this.isPlaying) {
          this.announceCurrentWeather(alarm).catch(() => {});
        }
      }, alarm.voiceMemoDataUrl ? 7500 : 3500);
    }

    this.notifyState();
  }

  // Public method for previewing or triggering weather announcement
  public async announceCurrentWeather(alarmConfig?: AlarmConfig): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const cfg = alarmConfig || storageService.getAlarmConfig();
      const weather = await getLocalWeatherInfo(cfg.weatherCity);
      const isFahrenheit = cfg.temperatureUnit === 'fahrenheit';
      const tempText = isFahrenheit ? `${weather.tempF} degrees Fahrenheit` : `${weather.tempC} degrees Celsius`;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];

      const announcement = `Good morning! Currently in ${weather.cityName}, it is ${tempText} with ${weather.conditionText}. Today is ${today}. Enjoy waking up to ${cfg.stationName || 'NeoTune Global Radio'}.`;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(announcement);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const previousVol = this.audio.volume;
      if (this.isPlaying) {
        this.audio.volume = Math.max(0.08, previousVol * 0.35);
      }

      utterance.onend = () => {
        if (this.isPlaying) {
          this.audio.volume = previousVol;
        }
      };
      utterance.onerror = () => {
        if (this.isPlaying) {
          this.audio.volume = previousVol;
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Weather speech announcement error:', e);
    }
  }

  public stopAlarm() {
    this.isAlarmRinging = false;
    this.stopSystemChimeLoop();
    if (this.alarmVibrationInterval) {
      clearInterval(this.alarmVibrationInterval);
      this.alarmVibrationInterval = null;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(0); } catch {}
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.pause();
    this.notifyState();
  }

  // MediaSession API integration
  private setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        triggerHaptic('play');
        this.togglePlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        triggerHaptic('pause');
        this.togglePlay();
      });
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
      navigator.mediaSession.setActionHandler('seekbackward', () => this.seekRelative(-15));
      navigator.mediaSession.setActionHandler('seekforward', () => this.seekRelative(15));
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPreviousStation());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNextStation());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) this.seekTo(details.seekTime);
      });
    }
  }

  // Play Next Station in active context (favorites, queued, or recents)
  public async playNextStation(customList?: RadioStation[]): Promise<boolean> {
    const list = customList && customList.length > 0 
      ? customList 
      : (storageService.getFavorites().length > 0 
          ? storageService.getFavorites() 
          : (storageService.getQueuedStations().length > 0 
              ? storageService.getQueuedStations() 
              : storageService.getRecents()));

    if (!list || list.length === 0) return false;

    let currentIndex = -1;
    if (this.currentStation) {
      currentIndex = list.findIndex(s => s.id === this.currentStation?.id || s.streamUrl === this.currentStation?.streamUrl);
    }

    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % list.length : 0;
    const nextStation = list[nextIndex];
    if (nextStation) {
      triggerHaptic('station_change');
      await this.playStation(nextStation);
      return true;
    }
    return false;
  }

  // Play Previous Station in active context (favorites, queued, or recents)
  public async playPreviousStation(customList?: RadioStation[]): Promise<boolean> {
    const list = customList && customList.length > 0 
      ? customList 
      : (storageService.getFavorites().length > 0 
          ? storageService.getFavorites() 
          : (storageService.getQueuedStations().length > 0 
              ? storageService.getQueuedStations() 
              : storageService.getRecents()));

    if (!list || list.length === 0) return false;

    let currentIndex = -1;
    if (this.currentStation) {
      currentIndex = list.findIndex(s => s.id === this.currentStation?.id || s.streamUrl === this.currentStation?.streamUrl);
    }

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1;
    const prevStation = list[prevIndex];
    if (prevStation) {
      triggerHaptic('station_change');
      await this.playStation(prevStation);
      return true;
    }
    return false;
  }

  private updateMediaSessionMetadata(title: string, artist: string, artworkUrl?: string) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'NeoTune Radio',
        artist: artist || 'Global Live Stream',
        album: 'NeoTune Global Live Radio & Podcasts',
        artwork: [
          { src: artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512&auto=format&fit=crop&q=80', sizes: '512x512', type: 'image/png' }
        ]
      });
    }
  }

  private updateMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none') {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  }

  // Auto-healing stream reconnect helper
  public async autoHealReconnect(): Promise<void> {
    diagnosticsService.log('warn', 'stream', 'Executing automatic stream auto-heal reconnection...', undefined, this.audio.src);
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch {}
    }

    if (this.currentStation) {
      await this.internalPlayStation(this.currentStation);
    } else if (this.currentEpisode && this.currentStation) {
      await this.internalPlayPodcastEpisode(this.currentStation, this.currentEpisode);
    } else if (this.audio.src) {
      try {
        this.audio.load();
        await this.audio.play();
      } catch (e) {
        console.warn('Auto heal play retry note:', e);
      }
    }
  }

  // Handle network recovery after offline/online transitions
  public async handleNetworkRecovery(): Promise<void> {
    console.log('[AudioEngine] Network connection recovered. Re-verifying stream and WebAudio status...');
    diagnosticsService.log('info', 'network', 'Network connection recovered. Verifying AudioContext & stream health...');

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch {}
    }

    if (this.isPlaying && (this.audio.paused || this.isBuffering || this.error)) {
      await this.autoHealReconnect();
    } else {
      this.notifyState();
    }
  }

  // Manual Force Restart: Rebuilds WebAudio graph, resets HTML5 audio element, and reconnects active stream
  public async forceRestart(): Promise<void> {
    console.log('[AudioEngine] Manual Force Restart triggered. Tearing down and re-building audio pipeline...');
    diagnosticsService.log('warn', 'audio_context', 'Manual Force Restart initiated: tearing down WebAudio graph & Audio element');

    this.isBuffering = true;
    this.notifyState();

    // 1. Close existing AudioContext
    if (this.audioCtx) {
      try {
        if (this.audioCtx.state !== 'closed') {
          await this.audioCtx.close();
        }
      } catch (e) {
        console.warn('AudioContext close exception during force restart:', e);
      }
      this.audioCtx = null;
      this.webAudioInitialized = false;
    }

    // 2. Recreate HTML5 audio element from scratch to avoid 'already connected' MediaElementSourceNode error
    this.recreateAudioElement();

    // 3. Re-initialize WebAudio context
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch {}
    }

    // 4. Re-play station or podcast
    if (this.currentStation) {
      await this.internalPlayStation(this.currentStation);
    } else if (this.currentEpisode && this.currentStation) {
      await this.internalPlayPodcastEpisode(this.currentStation, this.currentEpisode);
    } else {
      this.isBuffering = false;
      this.notifyState();
    }

    diagnosticsService.log('success', 'audio_context', 'Audio Engine successfully force-restarted and reconnected!');
  }

  public isBatterySavingActive(): boolean {
    const manualSaver = storageService.getBatterySaver();
    if (manualSaver) return true;
    return this.isLowBatteryDetected;
  }

  public getBatteryDetails(): {
    isLowBattery: boolean;
    isRunningOnBattery: boolean;
    batteryLevel: number;
    isCharging: boolean;
    isBatterySavingActive: boolean;
  } {
    return {
      isLowBattery: this.isLowBatteryDetected,
      isRunningOnBattery: this.isRunningOnBattery,
      batteryLevel: this.batteryLevel,
      isCharging: this.isCharging,
      isBatterySavingActive: this.isBatterySavingActive()
    };
  }

  public getAudioContextState(): 'running' | 'suspended' | 'closed' | 'not_initialized' {
    if (!this.audioCtx) return 'not_initialized';
    return this.audioCtx.state as 'running' | 'suspended' | 'closed';
  }

  public getAudioLatencyMs(): number {
    if (!this.audioCtx) return 0;
    const outputLat = (this.audioCtx as any).outputLatency || 0;
    const baseLat = this.audioCtx.baseLatency || 0;
    const total = Math.round((outputLat + baseLat) * 1000);
    return total > 0 ? total : 24;
  }

  public getBufferHealthSec(): number {
    if (!this.audio) return 0;
    try {
      const buffered = this.audio.buffered;
      const currentTime = this.audio.currentTime;
      for (let i = 0; i < buffered.length; i++) {
        const start = buffered.start(i);
        const end = buffered.end(i);
        if (currentTime >= start && currentTime <= end) {
          return Math.max(0, end - currentTime);
        }
      }
    } catch {}
    return 0;
  }

  public updatePreCache() {
    // Get top 3 likely stations
    const recents = storageService.getRecents();
    const favorites = storageService.getFavorites();
    const likely: RadioStation[] = [];
    
    // Merge recents and favorites
    const seen = new Set<string>();
    for (const r of recents) {
      if (likely.length >= 3) break;
      if (!seen.has(r.id)) {
        seen.add(r.id);
        likely.push(r);
      }
    }
    for (const f of favorites) {
      if (likely.length >= 3) break;
      if (!seen.has(f.id)) {
        seen.add(f.id);
        likely.push(f);
      }
    }

    // Clean up any cache entries that are no longer in the top 3
    const likelyIds = new Set(likely.map(s => s.id));
    for (const [id, audio] of this.preCachedAudios.entries()) {
      if (!likelyIds.has(id)) {
        try {
          audio.pause();
          audio.src = '';
          audio.load();
        } catch {}
        this.preCachedAudios.delete(id);
      }
    }

    // Don't pre-buffer live streams if user is on data saver or offline
    const dataSaver = storageService.getDataSaverBitrate() !== 'off';
    if (dataSaver || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return;
    }

    // Pre-load the top 3 likely stations
    for (const station of likely) {
      // If currently playing or already pre-cached, skip
      if (this.currentStation?.id === station.id) continue;
      if (this.preCachedAudios.has(station.id)) continue;

      try {
        const pAudio = new Audio();
        pAudio.preload = 'auto'; // load a small buffer
        pAudio.crossOrigin = 'anonymous';
        pAudio.volume = 0; // keep silent
        pAudio.muted = true; // ensure silent
        pAudio.setAttribute('playsinline', 'true');
        pAudio.setAttribute('webkit-playsinline', 'true');
        
        let targetUrl = station.streamUrl;
        const isMobileOrHttps = typeof window !== 'undefined' && (
          window.location.protocol === 'https:' ||
          /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
        );
        const isDataSaverActive = this.dataSaverBitrate !== 'auto';

        if (isMobileOrHttps || isDataSaverActive || !targetUrl.startsWith('https://')) {
          targetUrl = `/api/stream/proxy?url=${encodeURIComponent(station.streamUrl)}`;
          if (isDataSaverActive) {
            targetUrl += `&maxBitrate=${this.dataSaverBitrate}`;
          }
        }

        pAudio.src = targetUrl;
        pAudio.load(); // triggers background metadata loading and TCP warm up
        
        // Keep in memory
        this.preCachedAudios.set(station.id, pAudio);
        console.log(`[AudioEngine] Pre-cached connection for station: ${station.name}`);
        diagnosticsService.log('info', 'stream', `Background pre-caching initialized for: ${station.name}`);
      } catch (e) {
        console.warn('Pre-cache error:', e);
      }
    }
  }

  // Listeners & State Notifications
  public subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState() {
    return {
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      isBuffering: this.isBuffering,
      currentStation: this.currentStation,
      currentEpisode: this.currentEpisode,
      currentTrackTitle: this.currentTrackTitle,
      volume: this.volume,
      isMuted: this.isMuted,
      error: this.error,
      currentTime: this.currentTime,
      duration: this.duration,
      playbackSpeed: this.playbackSpeed,
      sleepTimerRemainingSec: this.sleepTimerRemainingSec,
      sleepTimerTotalSec: this.sleepTimerTotalSec,
      sleepTimerFadeSec: this.sleepTimerFadeSec,
      sleepTimerFadeCurve: this.sleepTimerFadeCurve,
      isAlarmRinging: this.isAlarmRinging,
      normalizeAudio: this.normalizeAudio,
      nightMode: this.nightMode,
      targetNormalizeLevel: this.targetNormalizeLevel,
      crossfadeDurationMs: this.crossfadeDurationMs,
      visualizerSensitivity: this.visualizerSensitivity,
      visualizerIntensity: this.visualizerIntensity,
      dataSaverBitrate: this.dataSaverBitrate,
      audioContextState: this.getAudioContextState(),
      audioLatencyMs: this.getAudioLatencyMs(),
      heartbeatActive: this.heartbeatInterval !== null,
    };
  }

  private notifyState() {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

export const audioEngine = new AudioEngine();
