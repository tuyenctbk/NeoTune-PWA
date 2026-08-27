import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Heart, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Car, 
  Moon, 
  Sliders, 
  AlertCircle, 
  RefreshCw, 
  SkipBack, 
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Share2,
  Sparkles,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { storageService } from '../services/storageService';
import { firebaseService } from '../services/firebaseService';
import { RadioStation, PodcastEpisode, VisualizerSkin } from '../types';
import { VisualizerCanvas } from './VisualizerCanvas';
import { CSSAudioVisualizer } from './CSSAudioVisualizer';
import { triggerHaptic } from '../utils/haptics';

interface MiniPlayerProps {
  onExpandPlayer: () => void;
  onOpenCarMode: () => void;
  onOpenScreensaver: () => void;
  onOpenEQ: () => void;
  onOpenSleepTimer: () => void;
  onOpenShare?: (station: RadioStation) => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  onExpandPlayer,
  onOpenCarMode,
  onOpenScreensaver,
  onOpenEQ,
  onOpenSleepTimer,
  onOpenShare,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [station, setStation] = useState<RadioStation | null>(null);
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [trackTitle, setTrackTitle] = useState('');
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<RadioStation[]>(() => storageService.getFavorites());
  const [visSkin, setVisSkin] = useState<VisualizerSkin>(() => storageService.getVisualizerSkin());
  const [showSkinDropdown, setShowSkinDropdown] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  const fallbackArt = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80';

  const handleSelectSkin = (skin: VisualizerSkin) => {
    triggerHaptic('selection');
    setVisSkin(skin);
    storageService.saveVisualizerSkin(skin);
    setShowSkinDropdown(false);
  };

  // Horizontal & Vertical Swipe Gestures State
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [swipeFeedback, setSwipeFeedback] = useState<'prev' | 'next' | null>(null);
  const [showVolumeHUD, setShowVolumeHUD] = useState<boolean>(false);
  const [volumeHudTimeout, setVolumeHudTimeout] = useState<NodeJS.Timeout | null>(null);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const touchStartVolume = useRef<number>(0.85);
  const gestureMode = useRef<'none' | 'horizontal' | 'vertical'>('none');
  const lastVolStep = useRef<number>(0);

  useEffect(() => {
    setImgError(false);
  }, [station?.id, episode?.id]);

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setIsLoading(state.isLoading);
      setIsBuffering(state.isBuffering);
      setStation(state.currentStation);
      setEpisode(state.currentEpisode);
      setTrackTitle(state.currentTrackTitle);
      setVolume(state.volume);
      setIsMuted(state.isMuted);
      setError(state.error);
      setSleepRemaining(state.sleepTimerRemainingSec);
    });
    
    const unsubFavs = storageService.subscribe(setFavorites);

    return () => {
      unsub();
      unsubFavs();
      if (volumeHudTimeout) clearTimeout(volumeHudTimeout);
    };
  }, [volumeHudTimeout]);

  if (!station) return null;

  const isCurrentStationFavorite = station ? favorites.some(f => f.id === station.id) : false;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('favorite');
    if (station) {
      storageService.toggleFavorite(station);
      await firebaseService.syncFavoritesToCloud(storageService.getFavorites());
    }
  };

  const handleNextStation = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('station_change');
    await audioEngine.playNextStation();
  };

  const handlePrevStation = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('station_change');
    await audioEngine.playPreviousStation();
  };

  // Touch Gesture Handlers (Horizontal Station Change + Vertical Volume Control)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    touchStartVolume.current = volume;
    lastVolStep.current = Math.round(volume * 20);
    gestureMode.current = 'none';
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    // Detect gesture intent
    if (gestureMode.current === 'none') {
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
        gestureMode.current = 'horizontal';
        setIsSwiping(true);
        triggerHaptic('swipe');
      } else if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX) * 1.15) {
        gestureMode.current = 'vertical';
        setShowVolumeHUD(true);
        if (volumeHudTimeout) clearTimeout(volumeHudTimeout);
        triggerHaptic('light');
      }
    }

    if (gestureMode.current === 'horizontal') {
      // Horizontal swipe to switch station
      const dampedOffset = Math.max(-90, Math.min(90, deltaX * 0.75));
      setSwipeOffset(dampedOffset);

      if (dampedOffset < -35) {
        setSwipeFeedback('next');
      } else if (dampedOffset > 35) {
        setSwipeFeedback('prev');
      } else {
        setSwipeFeedback(null);
      }
    } else if (gestureMode.current === 'vertical') {
      // Vertical swipe to adjust volume: Dragging up increases, down decreases
      // 160px drag spans the entire 0.0 - 1.0 volume range
      const calculatedVol = Math.max(0, Math.min(1, touchStartVolume.current - (deltaY / 160)));
      audioEngine.setVolume(calculatedVol);

      // Trigger subtle haptic click on each 5% change
      const currentStep = Math.round(calculatedVol * 20);
      if (currentStep !== lastVolStep.current) {
        lastVolStep.current = currentStep;
        triggerHaptic('selection');
      }

      setShowVolumeHUD(true);
    }
  };

  const handleTouchEnd = async () => {
    if (gestureMode.current === 'horizontal') {
      const threshold = 40;
      if (swipeOffset < -threshold) {
        // Swiped Left -> Next Station
        triggerHaptic('station_change');
        setSwipeOffset(-100);
        setTimeout(async () => {
          await audioEngine.playNextStation();
          setSwipeOffset(0);
          setIsSwiping(false);
          setSwipeFeedback(null);
        }, 120);
      } else if (swipeOffset > threshold) {
        // Swiped Right -> Previous Station
        triggerHaptic('station_change');
        setSwipeOffset(100);
        setTimeout(async () => {
          await audioEngine.playPreviousStation();
          setSwipeOffset(0);
          setIsSwiping(false);
          setSwipeFeedback(null);
        }, 120);
      } else {
        setSwipeOffset(0);
        setIsSwiping(false);
        setSwipeFeedback(null);
      }
    } else if (gestureMode.current === 'vertical') {
      const t = setTimeout(() => {
        setShowVolumeHUD(false);
      }, 1000);
      setVolumeHudTimeout(t);
    } else {
      setSwipeOffset(0);
      setIsSwiping(false);
      setSwipeFeedback(null);
    }
    gestureMode.current = 'none';
  };

  const isPodcast = !!episode;

  return (
    <div
      id="neotune-miniplayer"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+58px)] md:bottom-0 left-0 right-0 z-40 px-2 pb-1.5 md:px-6 md:pb-4 pointer-events-none animate-slideUp select-none"
    >
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          setSwipeOffset(0);
          setIsSwiping(false);
          setSwipeFeedback(null);
          setShowVolumeHUD(false);
          gestureMode.current = 'none';
        }}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
        className="max-w-7xl mx-auto rounded-2xl bg-[var(--surface-main)]/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/60 ring-1 ring-white/5 p-2.5 sm:p-3.5 pointer-events-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-6 relative overflow-hidden"
      >
        {/* Visual Swipe Directional Indicator Badges */}
        {swipeFeedback === 'next' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500 text-black font-bold text-xs shadow-lg animate-pulse">
            <span>Next Station</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
        {swipeFeedback === 'prev' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500 text-white font-bold text-xs shadow-lg animate-pulse">
            <ChevronLeft className="w-4 h-4" />
            <span>Prev Station</span>
          </div>
        )}

        {/* Live Vertical Volume Gesture HUD Overlay */}
        {showVolumeHUD && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex items-center justify-between px-5 pointer-events-none animate-fadeIn border border-white/15 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--accent-primary)] text-black">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Swipe Volume
                </div>
                <div className="text-base font-black text-white">
                  {Math.round(volume * 100)}%
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-[200px] mx-4">
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${Math.round(volume * 100)}%`,
                    background: 'linear-gradient(to right, #06b6d4, var(--accent-primary))'
                  }}
                />
              </div>
            </div>

            <span className="text-[11px] font-mono text-[var(--accent-primary)] font-bold">
              {volume > 0.8 ? 'HIGH' : volume > 0.4 ? 'MED' : 'LOW'}
            </span>
          </div>
        )}

        {/* Mobile Grab Indicator */}
        <div 
          onClick={onExpandPlayer}
          className="sm:hidden w-full flex justify-center py-0.5 cursor-pointer -mt-1"
        >
          <span className="w-8 h-1 rounded-full bg-white/25 hover:bg-white/40 transition-colors" />
        </div>

        <div className="w-full flex items-center justify-between gap-2.5 sm:gap-6">
          {/* Left: Station Artwork & Metadata */}
          <div
            onClick={onExpandPlayer}
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 cursor-pointer group"
          >
            <div className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-black/40 shrink-0 border transition-all duration-300 ${
              isPlaying && !isBuffering
                ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/50 ring-offset-1 ring-offset-black/80 shadow-[0_0_20px_rgba(167,139,250,0.5)] animate-beat-pulse'
                : 'border-white/10 group-hover:border-[var(--accent-primary)]'
            }`}>
              <img
                src={imgError || (!episode?.artworkUrl && !station.imageUrl) ? fallbackArt : (episode?.artworkUrl || station.imageUrl)}
                alt={station.name}
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  isPlaying && !isBuffering ? 'scale-105' : 'group-hover:scale-105'
                }`}
                onError={() => setImgError(true)}
              />
              {isPlaying && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-white/10 flex items-center gap-1 z-10">
                  <CSSAudioVisualizer isPlaying={isPlaying} isBuffering={isBuffering} size="sm" />
                  <span className="text-white text-[8px] font-bold uppercase tracking-wider">
                    {isPodcast ? 'EP' : 'LIVE'}
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                  {episode ? episode.title : station.name}
                </h4>
                {sleepRemaining !== null && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      onOpenSleepTimer();
                    }}
                    className={`sm:hidden px-2 py-0.5 rounded-full font-mono text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-sm transition-all duration-500 ${
                      sleepRemaining < 300
                        ? 'bg-amber-500/30 border border-amber-500/60 text-amber-200 ring-2 ring-amber-400/40 animate-pulse'
                        : 'bg-indigo-500/25 border border-indigo-500/40 text-indigo-300'
                    }`}
                    title="Sleep Timer Active - Tap to view"
                  >
                    <Moon className={`w-3 h-3 ${sleepRemaining < 300 ? 'text-amber-300 fill-amber-300/50' : 'text-indigo-400 fill-indigo-400/40'}`} />
                    <span>{formatRemainingTimer(sleepRemaining)}</span>
                  </span>
                )}
                {station.countryCode && !episode && (
                  <span className="text-xs shrink-0 hidden sm:inline">{getFlag(station.countryCode)}</span>
                )}
              </div>

              <p className="text-[11px] sm:text-xs text-[var(--text-muted)] truncate flex items-center gap-1.5 mt-0.5">
                <span>{episode ? station.name : station.genre}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="font-mono text-[10px]">{station.bitrate}</span>
              </p>

              {error && (
                <div className="text-[10px] text-amber-400 truncate flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Center: Real-Time Spectrum Visualizer Preview & Interactive Station Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* 3-Band CSS Visualizer (Mobile & Compact View) */}
            <div
              onClick={onExpandPlayer}
              className="md:hidden flex items-center justify-center p-1.5 rounded-xl bg-white/5 border border-white/5 cursor-pointer"
              title="Audio Activity"
            >
              <CSSAudioVisualizer isPlaying={isPlaying} isBuffering={isBuffering} size="sm" />
            </div>

            {/* 8-Band FFT Visualizer Mini Preview (Desktop) */}
            <div
              onClick={onExpandPlayer}
              className="hidden md:block w-24 lg:w-32 h-9 cursor-pointer px-1 py-0.5 rounded-lg bg-black/30 border border-white/5 relative group"
              title="Click to view Full Audiophile Visualizer"
            >
              <VisualizerCanvas height={32} barCount={8} skin={visSkin} />
            </div>

            {/* Previous Station Button */}
            <button
              onClick={handlePrevStation}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              title="Previous Station (or Swipe Right)"
              aria-label="Previous Station"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Rewind 30s Button */}
            <button
              onClick={() => audioEngine.rewind30Seconds()}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 active:scale-95 transition-all relative"
              title="Rewind 30 Seconds"
              aria-label="Rewind 30 Seconds"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="absolute top-0.5 right-0.5 bg-[var(--accent-primary)] text-black font-extrabold text-[7px] p-0.5 rounded-full scale-[0.8] leading-none">30</span>
            </button>

            {/* Primary Play/Pause Button with Haptic Pulse */}
            <button
              onClick={() => {
                triggerHaptic(isPlaying ? 'pause' : 'play');
                audioEngine.togglePlay();
              }}
              disabled={isLoading}
              className="p-3 sm:p-3.5 rounded-full bg-[var(--accent-primary)] text-black shadow-lg hover:scale-105 active:scale-95 transition-all relative group"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading || isBuffering ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Station Button */}
            <button
              onClick={handleNextStation}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              title="Next Station (or Swipe Left)"
              aria-label="Next Station"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Favorite Toggle */}
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-xl transition-colors ${
                isCurrentStationFavorite
                  ? 'text-rose-500 hover:text-rose-400 bg-rose-500/10'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Favorite"
            >
              <Heart className={`w-4 h-4 ${isCurrentStationFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Right: Volume Slider & Mode Shortcuts */}
          <div className="hidden sm:flex items-center gap-2 lg:gap-3 shrink-0">
            {/* Sleep Timer Indicator Button */}
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenSleepTimer();
              }}
              className={`p-2 rounded-xl transition-all duration-500 cursor-pointer ${
                sleepRemaining !== null
                  ? sleepRemaining < 300
                    ? 'bg-amber-500/30 text-amber-200 font-mono text-xs flex items-center gap-1.5 border border-amber-500/60 shadow-md shadow-amber-950/60 ring-2 ring-amber-400/50 animate-pulse'
                    : 'bg-indigo-500/25 text-indigo-200 font-mono text-xs flex items-center gap-1.5 border border-indigo-500/40 shadow-sm shadow-indigo-950/50 ring-1 ring-indigo-400/30'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
              }`}
              title={sleepRemaining !== null ? `Sleep Timer Active: ${formatRemainingTimer(sleepRemaining)} remaining` : "Set Sleep Timer"}
            >
              <Moon className={`w-4 h-4 ${
                sleepRemaining !== null
                  ? sleepRemaining < 300
                    ? 'text-amber-300 fill-amber-300/50'
                    : 'text-indigo-400 fill-indigo-400/40'
                  : ''
              }`} />
              {sleepRemaining !== null && (
                <span className="font-bold">{formatRemainingTimer(sleepRemaining)}</span>
              )}
            </button>

            {/* Visualizer Skin Dropdown Selector */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  setShowSkinDropdown(!showSkinDropdown);
                }}
                className={`p-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer ${
                  showSkinDropdown
                    ? 'bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30'
                    : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
                }`}
                title={`Visualizer Skin: ${visSkin.toUpperCase()}`}
                aria-label="Select Visualizer Skin"
              >
                <Sparkles className="w-4 h-4 text-[var(--accent-secondary)]" />
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showSkinDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSkinDropdown(false);
                    }}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 bottom-12 z-50 w-56 p-2.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] shadow-2xl shadow-black/90 space-y-1.5 text-xs backdrop-blur-3xl animate-fadeIn"
                  >
                    <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
                      <span>Visualizer Skin</span>
                      <span className="text-[9px] text-[var(--accent-secondary)] font-mono uppercase">{visSkin}</span>
                    </div>
                    {[
                      { id: 'bars' as const, label: 'Bar Spectrum' },
                      { id: 'circular' as const, label: 'Circular Radial' },
                      { id: 'waveform' as const, label: 'Waveform Sine' },
                      { id: 'dots' as const, label: 'Dot Matrix' },
                      { id: 'vumeter' as const, label: 'VU Meter Analog' },
                      { id: 'cassette' as const, label: 'Cassette Tape' },
                      { id: 'dynamic' as const, label: 'Dynamic Auto-Cycle' },
                    ].map((s) => (
                      <button
                        key={`mini_vis_skin_${s.id}`}
                        onClick={() => handleSelectSkin(s.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-3 sm:py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                          visSkin === s.id
                            ? 'bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)] font-bold border border-[var(--accent-secondary)]/30'
                            : 'text-[var(--text-primary)] hover:bg-white/10'
                        }`}
                      >
                        <span>{s.label}</span>
                        {visSkin === s.id && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-secondary)] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Equalizer DSP Shortcut */}
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenEQ();
              }}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
              title="Equalizer & Audio Booster"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Car Mode Launcher */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                onOpenCarMode();
              }}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
              title="Car Mode (Big Buttons)"
            >
              <Car className="w-4 h-4" />
            </button>

            {/* Share Broadcast Station */}
            {onOpenShare && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  if (station) onOpenShare(station);
                }}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                title="Share Station via Web Share API or QR Code"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  audioEngine.toggleMute();
                }}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white transition-colors"
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
                className="w-16 lg:w-20 h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
              />
            </div>

            {/* Expand Full Player */}
            <button
              onClick={() => {
                triggerHaptic('light');
                onExpandPlayer();
              }}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
              title="Expand Full Screen Player"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function getFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function formatRemainingTimer(totalSec: number): string {
  if (totalSec <= 0) return '0:00';
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rmMins = mins % 60;
    return `${hrs}h ${rmMins}m`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
