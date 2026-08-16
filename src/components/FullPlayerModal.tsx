import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Heart, Volume2, VolumeX, Sliders, Moon, Car, Tv, RotateCcw, RotateCw, Gauge, RefreshCw, Zap, Share2, Bell, SkipBack, SkipForward, MessageSquare, Copy, Check } from 'lucide-react';
import { audioEngine, EQ_PRESETS } from '../services/audioEngine';
import { storageService } from '../services/storageService';
import { firebaseService } from '../services/firebaseService';
import { RadioStation, PodcastEpisode, GestureAction } from '../types';
import { VisualizerCanvas } from './VisualizerCanvas';
import { CommunityLiveChat } from './CommunityLiveChat';
import { triggerHaptic } from '../utils/haptics';

interface FullPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEQ: () => void;
  onOpenSleepTimer: () => void;
  onOpenCarMode: () => void;
  onOpenScreensaver: () => void;
  onOpenShare: (station: RadioStation) => void;
  onOpenAlarm: (station: RadioStation) => void;
}

export const FullPlayerModal: React.FC<FullPlayerModalProps> = ({
  isOpen,
  onClose,
  onOpenEQ,
  onOpenSleepTimer,
  onOpenCarMode,
  onOpenScreensaver,
  onOpenShare,
  onOpenAlarm,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [station, setStation] = useState<RadioStation | null>(null);
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [trackTitle, setTrackTitle] = useState('');
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);
  const [activeEQ, setActiveEQ] = useState('Balanced');
  const [favorites, setFavorites] = useState<RadioStation[]>(() => storageService.getFavorites());
  const [showChat, setShowChat] = useState(false);
  const [copied, setCopied] = useState(false);
  const [normalizeAudioActive, setNormalizeAudioActive] = useState(() => audioEngine.getState().normalizeAudio);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleCopyStreamUrl = () => {
    if (!station) return;
    try {
      const deepLinkUrl = `${window.location.origin}${window.location.pathname}?stationId=${encodeURIComponent(station.id)}`;
      navigator.clipboard.writeText(deepLinkUrl);
      setCopied(true);
      triggerHaptic('light');
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const executeGestureAction = async (action: GestureAction) => {
    switch (action) {
      case 'next_station':
        triggerHaptic('station_change');
        await audioEngine.playNextStation();
        break;
      case 'prev_station':
        triggerHaptic('station_change');
        await audioEngine.playPreviousStation();
        break;
      case 'toggle_favorite':
        triggerHaptic('selection');
        if (station) {
          storageService.toggleFavorite(station);
          await firebaseService.syncFavoritesToCloud(storageService.getFavorites());
        }
        break;
      case 'toggle_play':
        triggerHaptic(isPlaying ? 'pause' : 'play');
        audioEngine.togglePlay();
        break;
      case 'close_player':
        triggerHaptic('light');
        onClose();
        break;
      case 'none':
      default:
        break;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(diffX) > 65 || Math.abs(diffY) > 65) {
      const gestureConfig = storageService.getGestureConfig();
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
          executeGestureAction(gestureConfig.swipeLeft);
        } else {
          executeGestureAction(gestureConfig.swipeRight);
        }
      } else {
        if (diffY < 0) {
          executeGestureAction(gestureConfig.swipeUp);
        } else {
          executeGestureAction(gestureConfig.swipeDown);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setIsLoading(state.isLoading);
      setStation(state.currentStation);
      setEpisode(state.currentEpisode);
      setTrackTitle(state.currentTrackTitle);
      setVolume(state.volume);
      setIsMuted(state.isMuted);
      setCurrentTime(state.currentTime);
      setDuration(state.duration);
      setSleepRemaining(state.sleepTimerRemainingSec);
      setNormalizeAudioActive(state.normalizeAudio);
    });
    
    const unsubFavs = storageService.subscribe(setFavorites);
    setActiveEQ(storageService.getEQPreset());

    return () => {
      unsub();
      unsubFavs();
    };
  }, []);

  if (!isOpen || !station) return null;

  const isPodcast = !!episode;
  const isCurrentStationFavorite = station ? favorites.some(f => f.id === station.id) : false;

  const handleToggleFavorite = async () => {
    if (station) {
      storageService.toggleFavorite(station);
      await firebaseService.syncFavoritesToCloud(storageService.getFavorites());
    }
  };

  const handleEQSelect = (preset: string) => {
    setActiveEQ(preset);
    const booster = preset === 'Audio Booster';
    audioEngine.applyEQPreset(preset, booster);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-2xl animate-fadeIn overflow-hidden">
      {/* Dynamic Dominant Backdrop Glow */}
      <div
        className="fixed inset-0 opacity-25 pointer-events-none blur-3xl scale-125 transition-all duration-1000"
        style={{
          backgroundImage: `radial-gradient(circle at center, var(--accent-primary) 0%, var(--accent-secondary) 50%, transparent 80%)`
        }}
      />

      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl rounded-none sm:rounded-3xl bg-[var(--surface-main)]/95 sm:bg-[var(--surface-main)]/85 backdrop-blur-3xl border-0 sm:border border-white/10 p-4 sm:p-8 shadow-2xl shadow-black/60 ring-0 sm:ring-1 ring-white/10 flex flex-col justify-between z-10 overflow-y-auto"
      >
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              {isPodcast ? 'PODCAST' : <><span className="hidden sm:inline">GLOBAL </span>LIVE STREAM</>}
            </span>

            {/* Community Chat Toggle Button */}
            {!isPodcast && station && (
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setShowChat(!showChat);
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showChat
                    ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black'
                    : 'bg-white/10 hover:bg-white/20 text-cyan-300 border border-white/10'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>{showChat ? 'Hide Chat' : 'Live Chat'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Favorite toggle */}
            <button
              onClick={handleToggleFavorite}
              className={`p-2.5 sm:p-2 rounded-xl transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center ${
                isCurrentStationFavorite
                  ? 'text-rose-500 hover:bg-rose-500/10'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
              }`}
              title={isCurrentStationFavorite ? 'Remove Favorite' : 'Save Favorite'}
              aria-label="Toggle Favorite"
            >
              <Heart className={`w-5 h-5 ${isCurrentStationFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Share */}
            <button
              onClick={() => onOpenShare(station)}
              className="p-2.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Share Stream"
              aria-label="Share Stream"
            >
              <Share2 className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>

            {/* Copy Share Link */}
            {station && (
              <button
                onClick={handleCopyStreamUrl}
                className={`p-2.5 sm:p-2 rounded-xl transition-all duration-300 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  copied
                    ? 'text-green-400 bg-green-500/10 scale-110'
                    : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
                }`}
                title="Copy Share Link"
                aria-label="Copy Share Link"
              >
                <div className="relative w-4 sm:w-5 h-4 sm:h-5 flex items-center justify-center">
                  <span className={`absolute transition-all duration-300 ${copied ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}>
                    <Copy className="w-4 sm:w-5 h-4 sm:h-5" />
                  </span>
                  <span className={`absolute transition-all duration-300 ${copied ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`}>
                    <Check className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 font-bold" />
                  </span>
                </div>
              </button>
            )}

            {/* Set Alarm */}
            <button
              onClick={() => onOpenAlarm(station)}
              className="p-2.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Set as Wake Alarm"
              aria-label="Set Alarm"
            >
              <Bell className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>

            {/* Car Mode */}
            <button
              onClick={() => {
                onClose();
                onOpenCarMode();
              }}
              className="p-2.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Car Mode"
              aria-label="Car Mode"
            >
              <Car className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>

            {/* Screensaver */}
            <button
              onClick={() => {
                onClose();
                onOpenScreensaver();
              }}
              className="p-2.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Ambient Screensaver"
              aria-label="Screensaver"
            >
              <Tv className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>

            {/* Close / Minimize */}
            <button
              onClick={onClose}
              className="p-2.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center ml-1"
              aria-label="Close Player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center: Large Artwork & Station Details */}
        <div className="my-6 flex flex-col items-center text-center">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-3xl overflow-hidden shadow-2xl bg-black/50 border border-white/15 group">
            <img
              src={episode?.artworkUrl || station.imageUrl}
              alt={station.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-3">
                <span className="text-[10px] font-mono text-[var(--accent-primary)] font-bold">
                  {station.bitrate} • {station.codec}
                </span>
              </div>
            )}
          </div>

          {/* Titles & Marquee */}
          <div className="mt-5 w-full max-w-md">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight truncate">
              {episode ? episode.title : station.name}
            </h2>

            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium flex items-center justify-center gap-2">
              <span>{episode ? station.name : station.genre}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <span>{station.country}</span>
            </p>
          </div>
        </div>

        {/* 8-Band Real-Time Spectrum Visualizer Canvas */}
        <div className="my-2 p-4 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-2 font-mono">
            <span><span className="hidden sm:inline">8-BAND PERCEPTUAL </span>FFT ANALYZER</span>
            <span className="text-[var(--accent-primary)] font-bold">LIVE</span>
          </div>
          <VisualizerCanvas height={90} barCount={8} showLabels={true} />
        </div>

        {/* Live Community Chat Panel */}
        {showChat && station && (
          <div className="my-3 animate-fadeIn">
            <CommunityLiveChat station={station} />
          </div>
        )}

        {/* Podcast Scrubber (if playing episode) */}
        {isPodcast && (
          <div className="mt-4 px-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => audioEngine.seekTo(parseFloat(e.target.value))}
              className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--accent-secondary)]"
            />
            <div className="flex justify-between text-xs text-[var(--text-muted)] font-mono mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Primary Audio Transport Controls */}
        <div className="mt-6 flex items-center justify-center gap-4 sm:gap-6">
          {isPodcast ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                audioEngine.seekRelative(-15);
              }}
              className="p-3 rounded-full bg-white/5 hover:bg-white/15 text-[var(--text-primary)] text-xs transition-transform active:scale-95 flex items-center gap-1"
              title="Jump -15s"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={async () => {
                triggerHaptic('station_change');
                await audioEngine.playPreviousStation();
              }}
              className="p-3.5 rounded-full bg-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              title="Previous Station"
            >
              <SkipBack className="w-6 h-6" />
            </button>
          )}

          {/* Master Play/Pause */}
          <button
            onClick={() => {
              triggerHaptic(isPlaying ? 'pause' : 'play');
              audioEngine.togglePlay();
            }}
            disabled={isLoading}
            className="p-5 rounded-full bg-[var(--accent-primary)] text-black shadow-2xl shadow-[var(--accent-primary)]/40 hover:scale-105 active:scale-95 transition-all"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <RefreshCw className="w-8 h-8 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          {isPodcast ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                audioEngine.seekRelative(15);
              }}
              className="p-3 rounded-full bg-white/5 hover:bg-white/15 text-[var(--text-primary)] text-xs transition-transform active:scale-95 flex items-center gap-1"
              title="Jump +15s"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={async () => {
                triggerHaptic('station_change');
                await audioEngine.playNextStation();
              }}
              className="p-3.5 rounded-full bg-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              title="Next Station"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Volume & Equalizer Preset Bar */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* EQ Preset Quick Selector Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
            {['Balanced', 'Bass Boost', 'Chill Lounge', 'Audio Booster'].map((preset) => {
              const isSelected = activeEQ === preset;
              return (
                <button
                  key={preset}
                  onClick={() => handleEQSelect(preset)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[var(--accent-primary)] text-black shadow-md'
                      : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {preset === 'Audio Booster' ? '⚡ +6dB Boost' : preset}
                </button>
              );
            })}
            <button
              onClick={onOpenEQ}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10"
              title="More EQ options"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Auto Volume Normalization Toggle */}
            <button
              onClick={() => {
                triggerHaptic('selection');
                audioEngine.toggleNormalizeAudio();
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                normalizeAudioActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold shadow-sm shadow-emerald-500/10'
                  : 'bg-white/5 border-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10'
              }`}
              title="Auto Volume Normalizer: Analyzes and levels loudness across different radio streams automatically"
            >
              <Zap className={`w-3.5 h-3.5 ${normalizeAudioActive ? 'fill-current text-emerald-400 animate-pulse' : ''}`} />
              <span>Auto-Level</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => audioEngine.toggleMute()}
                className="p-1.5 text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={(e) => audioEngine.setVolume(parseFloat(e.target.value))}
                className="w-28 h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
