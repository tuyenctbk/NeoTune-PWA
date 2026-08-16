import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  Sliders,
  Share2,
  Sparkles,
  Zap,
  Radio,
  Moon,
  Car,
  Tv,
  Maximize2,
  Clock,
  Activity,
  Flame,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { RadioStation, VisualizerSkin } from '../types';
import { audioEngine } from '../services/audioEngine';
import { storageService } from '../services/storageService';
import { VisualizerCanvas } from './VisualizerCanvas';
import { CommunityLiveChat } from './CommunityLiveChat';
import { triggerHaptic } from '../utils/haptics';

interface NowPlayingStudioFragmentProps {
  station: RadioStation | null;
  isPlaying: boolean;
  onPlay: (station: RadioStation) => void;
  onToggleFavorite: (station: RadioStation) => void;
  onShare: (station: RadioStation) => void;
  onSetAlarm: (station: RadioStation) => void;
  onOpenEqualizer: () => void;
  onOpenSleepTimer: () => void;
  onOpenCarMode: () => void;
  onOpenScreensaver: () => void;
  onOpenFullPlayer: () => void;
  suggestedStations?: RadioStation[];
}

const EQ_QUICK_PRESETS = ['Balanced', 'Bass Boost', 'Vocal', 'Club', 'Treble Boost'];
const VISUALIZER_SKINS: { id: VisualizerSkin; label: string }[] = [
  { id: 'bars', label: 'Bars' },
  { id: 'waveform', label: 'Wave' },
  { id: 'circular', label: 'Radar' },
  { id: 'dots', label: 'Dots' },
  { id: 'dynamic', label: 'Cycle' },
];

export const NowPlayingStudioFragment: React.FC<NowPlayingStudioFragmentProps> = ({
  station,
  isPlaying,
  onPlay,
  onToggleFavorite,
  onShare,
  onSetAlarm,
  onOpenEqualizer,
  onOpenSleepTimer,
  onOpenCarMode,
  onOpenScreensaver,
  onOpenFullPlayer,
  suggestedStations = [],
}) => {
  const [audioState, setAudioState] = useState(() => audioEngine.getState());
  const [volume, setVolume] = useState(() => storageService.getVolume());
  const [isMuted, setIsMuted] = useState(false);
  const [activeSkin, setActiveSkin] = useState<VisualizerSkin>(() => storageService.getVisualizerSkin());
  const [boosterActive, setBoosterActive] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState(() => storageService.getEQPreset());

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setAudioState(state);
      setVolume(state.volume);
      setIsMuted(state.isMuted);
    });
    return () => unsub();
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioEngine.setVolume(val);
  };

  const handleToggleMute = () => {
    triggerHaptic('light');
    audioEngine.toggleMute();
  };

  const handlePresetSelect = (preset: string) => {
    triggerHaptic('selection');
    setActivePreset(preset);
    audioEngine.applyEQPreset(preset, boosterActive);
  };

  const handleToggleBooster = () => {
    triggerHaptic('medium');
    const next = !boosterActive;
    setBoosterActive(next);
    audioEngine.applyEQPreset(activePreset, next);
  };

  const handleSkinSelect = (skin: VisualizerSkin) => {
    triggerHaptic('selection');
    setActiveSkin(skin);
    storageService.saveVisualizerSkin(skin);
  };

  if (!station) {
    return (
      <div
        id="studio-fragment-empty"
        className="h-full flex flex-col justify-between p-6 rounded-3xl bg-gradient-to-b from-[var(--surface-main)]/90 via-[var(--surface-main)]/60 to-[var(--surface-main)]/90 border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Live Audio Studio</h3>
                <p className="text-xs text-[var(--text-muted)]">Audiophile Broadcast Stage</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-neutral-400">
              Standby
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-black/40 border border-white/5 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-neutral-400">
              <Radio className="w-8 h-8 opacity-60" />
            </div>
            <h4 className="text-base font-bold text-white">Select any station to begin</h4>
            <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
              Tap any radio station from the catalog to activate real-time visualizers, studio equalizer, and instant playback controls.
            </p>
          </div>

          {suggestedStations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Quick Picks to Tune In</span>
              </div>
              <div className="space-y-2">
                {suggestedStations.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      triggerHaptic('medium');
                      onPlay(item);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[var(--accent-primary)]/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-10 h-10 rounded-xl object-cover bg-black/40 shrink-0 border border-white/10"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate group-hover:text-[var(--accent-primary)] transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-neutral-400 truncate">{item.genre} • {item.country}</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 group-hover:bg-[var(--accent-primary)] group-hover:text-black transition-colors shrink-0 text-white">
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Lossless stream engine active</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-500">v3.2</span>
        </div>
      </div>
    );
  }

  const isCurrentPlaying = isPlaying && audioState.currentStation?.id === station.id;

  return (
    <div
      id="studio-fragment-active"
      className="h-full flex flex-col justify-between p-5 lg:p-6 rounded-3xl bg-gradient-to-b from-[var(--surface-main)]/95 via-[var(--surface-main)]/85 to-[var(--surface-main)]/95 border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden"
    >
      <div className="space-y-5">
        {/* Top Header: Studio Title & Expand Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Live Studio</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">Broadcasting Real-time</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                triggerHaptic('light');
                onShare(station);
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Share Station"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                onToggleFavorite(station);
              }}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                station.isFavorite
                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300 hover:text-white'
              }`}
              title="Favorite Station"
            >
              <Heart className={`w-4 h-4 ${station.isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => {
                triggerHaptic('medium');
                onOpenFullPlayer();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Expand Full Screen Player"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Artwork & Metadata Banner */}
        <div className="relative p-4 rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex items-center gap-4">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-black/60 shrink-0 border border-white/15 shadow-lg group">
            <img
              src={station.imageUrl}
              alt={station.name}
              className={`w-full h-full object-cover transition-transform duration-700 ${isCurrentPlaying ? 'scale-105' : 'scale-100'}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80';
              }}
            />
            {isCurrentPlaying && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <span className="w-3 h-3 rounded-full bg-[var(--accent-primary)] animate-ping" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <h4 className="text-base sm:text-lg font-black text-white truncate leading-tight">
              {station.name}
            </h4>
            <p className="text-xs text-neutral-400 truncate">
              {station.genre || 'Live Radio'} • {station.country || 'Global'}
            </p>
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-neutral-300 border border-white/5">
                {station.bitrate ? `${station.bitrate}k` : '128k'} {station.codec || 'AAC'}
              </span>
              {station.countryCode && (
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-neutral-300 border border-white/5">
                  {station.countryCode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Visualizer Canvas */}
        <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
              <span>Real-time Spectrum</span>
            </div>
            <div className="flex items-center gap-1">
              {VISUALIZER_SKINS.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => handleSkinSelect(skin.id)}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                    activeSkin === skin.id
                      ? 'bg-[var(--accent-primary)] text-black'
                      : 'bg-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  {skin.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-16 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center p-1">
            <VisualizerCanvas
              height={64}
              skin={activeSkin}
              barCount={16}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Studio Equalizer Quick Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Sound Profile
            </span>
            <button
              onClick={() => {
                triggerHaptic('medium');
                onOpenEqualizer();
              }}
              className="flex items-center gap-1 text-[10px] font-bold text-[var(--accent-primary)] hover:underline cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>Full 5-Band EQ</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {EQ_QUICK_PRESETS.map((preset) => {
              const isSel = activePreset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => handlePresetSelect(preset)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSel
                      ? 'bg-white text-black font-black shadow-sm'
                      : 'bg-white/5 text-neutral-400 hover:text-white border border-white/5'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
            <button
              onClick={handleToggleBooster}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap flex items-center gap-1 border transition-all cursor-pointer ${
                boosterActive
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>+6dB Boost</span>
            </button>
          </div>
        </div>

        {/* Master Playback & Volume Strip */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => {
                triggerHaptic('heavy');
                audioEngine.togglePlay();
              }}
              className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/25 transition-all shrink-0 cursor-pointer"
            >
              {isCurrentPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2.5 flex-1">
              <button
                onClick={handleToggleMute}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
              />
              <span className="text-[10px] font-mono text-neutral-400 w-8 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Community Station Chat */}
        {station && (
          <div className="pt-1">
            <CommunityLiveChat station={station} />
          </div>
        )}
      </div>

      {/* Bottom Utility Launcher Bar */}
      <div className="pt-4 border-t border-white/10 grid grid-cols-4 gap-2">
        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenSleepTimer();
          }}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-neutral-400 hover:text-white transition-colors cursor-pointer text-center"
          title="Sleep Timer"
        >
          <Moon className="w-4 h-4 text-indigo-400 mb-1" />
          <span className="text-[9px] font-bold">Timer</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            onSetAlarm(station);
          }}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-neutral-400 hover:text-white transition-colors cursor-pointer text-center"
          title="Alarm Clock"
        >
          <Clock className="w-4 h-4 text-amber-400 mb-1" />
          <span className="text-[9px] font-bold">Alarm</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenCarMode();
          }}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-neutral-400 hover:text-white transition-colors cursor-pointer text-center"
          title="Car Dashboard"
        >
          <Car className="w-4 h-4 text-emerald-400 mb-1" />
          <span className="text-[9px] font-bold">Car</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenScreensaver();
          }}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-neutral-400 hover:text-white transition-colors cursor-pointer text-center"
          title="OLED Screensaver"
        >
          <Tv className="w-4 h-4 text-cyan-400 mb-1" />
          <span className="text-[9px] font-bold">Display</span>
        </button>
      </div>
    </div>
  );
};
