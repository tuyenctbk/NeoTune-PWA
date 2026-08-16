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
  ChevronDown
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

  const handleSelectSkin = (skin: VisualizerSkin) => {
    triggerHaptic('selection');
    setVisSkin(skin);
    storageService.saveVisualizerSkin(skin);
    setShowSkinDropdown(false);
  };

  // Horizontal Swipe Gestures State
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [swipeFeedback, setSwipeFeedback] = useState<'prev' | 'next' | null>(null);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean>(false);

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
    };
  }, []);

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

  // Horizontal Touch Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isHorizontalSwipe.current = false;
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    // Detect if this is an intentional horizontal swipe
    if (!isHorizontalSwipe.current && Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      isHorizontalSwipe.current = true;
      setIsSwiping(true);
      triggerHaptic('swipe');
    }

    if (isHorizontalSwipe.current) {
      // Apply rubber-band damping
      const dampedOffset = Math.max(-90, Math.min(90, deltaX * 0.75));
      setSwipeOffset(dampedOffset);

      if (dampedOffset < -35) {
        setSwipeFeedback('next');
      } else if (dampedOffset > 35) {
        setSwipeFeedback('prev');
      } else {
        setSwipeFeedback(null);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (isHorizontalSwipe.current) {
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
        // Spring back to center
        setSwipeOffset(0);
        setIsSwiping(false);
        setSwipeFeedback(null);
      }
    } else {
      setSwipeOffset(0);
      setIsSwiping(false);
      setSwipeFeedback(null);
    }
    isHorizontalSwipe.current = false;
  };

  const isPodcast = !!episode;

  return (
    <div
      id="neotune-miniplayer"
      className="fixed bottom-0 left-0 right-0 z-40 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] sm:px-6 sm:pb-4 pointer-events-none animate-slideUp select-none"
    >
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          setSwipeOffset(0);
          setIsSwiping(false);
          setSwipeFeedback(null);
          isHorizontalSwipe.current = false;
        }}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
        className="max-w-7xl mx-auto rounded-2xl bg-[var(--surface-main)]/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/60 ring-1 ring-white/5 p-2.5 sm:p-3.5 pointer-events-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-6 relative overflow-hidden"
      >
        {/* Visual Swipe Directional Indicator Badges */}
        {swipeFeedback === 'next' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500 text-black font-bold text-xs shadow-lg animate-pulse">
            <span>Next Station</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
        {swipeFeedback === 'prev' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500 text-white font-bold text-xs shadow-lg animate-pulse">
            <ChevronLeft className="w-4 h-4" />
            <span>Prev Station</span>
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
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-black/40 shrink-0 border border-white/10 group-hover:border-[var(--accent-primary)] transition-colors">
              <img
                src={episode?.artworkUrl || station.imageUrl}
                alt={station.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              {isPlaying && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-white/10 flex items-center gap-1">
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
              className={`p-2 rounded-xl transition-colors ${
                sleepRemaining !== null
                  ? 'bg-indigo-500/20 text-indigo-300 font-mono text-[11px] flex items-center gap-1 border border-indigo-500/30'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
              }`}
              title="Sleep Timer"
            >
              <Moon className="w-4 h-4" />
              {sleepRemaining !== null && (
                <span>{Math.floor(sleepRemaining / 60)}m</span>
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
