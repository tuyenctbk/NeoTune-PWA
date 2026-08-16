import React, { useState, useEffect } from 'react';
import { VisualizerSkin } from '../types';
import { storageService } from '../services/storageService';
import { audioEngine } from '../services/audioEngine';

interface CSSAudioVisualizerProps {
  isPlaying: boolean;
  isBuffering?: boolean;
  size?: 'sm' | 'md' | 'lg';
  skin?: VisualizerSkin;
  className?: string;
}

export const CSSAudioVisualizer: React.FC<CSSAudioVisualizerProps> = ({
  isPlaying,
  isBuffering = false,
  size = 'md',
  skin,
  className = ''
}) => {
  const [activeSkin, setActiveSkin] = useState<VisualizerSkin>(() => skin || storageService.getVisualizerSkin());
  const [dynamicCurrentIndex, setDynamicCurrentIndex] = useState<number>(0);
  const [currentGenre, setCurrentGenre] = useState<string>('');

  const CYCLING_SKINS: VisualizerSkin[] = ['bars', 'circular', 'waveform', 'dots'];

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setCurrentGenre(state.currentStation?.genre || '');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (skin) {
      setActiveSkin(skin);
    } else {
      setActiveSkin(storageService.getVisualizerSkin());
    }
  }, [skin]);

  // Dynamic cycling timer during playback
  useEffect(() => {
    if (activeSkin !== 'dynamic' || !isPlaying) return;

    const intervalSec = storageService.getVisualizerCycleInterval();
    const timer = setInterval(() => {
      setDynamicCurrentIndex((prev) => (prev + 1) % CYCLING_SKINS.length);
    }, Math.max(3, intervalSec) * 1000);

    return () => clearInterval(timer);
  }, [activeSkin, isPlaying]);

  // Determine actual rendered skin
  let effectiveSkin: VisualizerSkin = activeSkin === 'dynamic' ? CYCLING_SKINS[dynamicCurrentIndex] : activeSkin;

  if (effectiveSkin === 'auto') {
    let genreMatchedSkin: VisualizerSkin | null = null;
    if (currentGenre) {
      const g = currentGenre.toLowerCase();
      if (g.includes('rock') || g.includes('metal') || g.includes('alternative') || g.includes('indie')) {
        genreMatchedSkin = 'bars';
      } else if (g.includes('electronic') || g.includes('dance') || g.includes('house') || g.includes('techno') || g.includes('edm') || g.includes('club') || g.includes('synth')) {
        genreMatchedSkin = 'circular';
      } else if (g.includes('jazz') || g.includes('blues') || g.includes('soul') || g.includes('classical') || g.includes('acoustic') || g.includes('ambient') || g.includes('relax') || g.includes('chill')) {
        genreMatchedSkin = 'waveform';
      } else if (g.includes('pop') || g.includes('rap') || g.includes('hip hop') || g.includes('rnb') || g.includes('reggae') || g.includes('disco')) {
        genreMatchedSkin = 'dots';
      }
    }

    if (genreMatchedSkin) {
      effectiveSkin = genreMatchedSkin;
    } else {
      const currentTheme = storageService.getTheme() as string;
      if (currentTheme === 'rock' || currentTheme === 'cyberpunk') {
        effectiveSkin = 'bars';
      } else if (currentTheme === 'jazz' || currentTheme === 'retro' || currentTheme === 'vintage') {
        effectiveSkin = 'waveform';
      } else if (currentTheme === 'oled' || currentTheme === 'neon' || currentTheme === 'synthwave') {
        effectiveSkin = 'circular';
      } else if (currentTheme === 'frosted-glass' || currentTheme === 'minimal' || currentTheme === 'clean') {
        effectiveSkin = 'dots';
      } else {
        effectiveSkin = 'bars';
      }
    }
  }

  // Skin 1: Bars
  if (effectiveSkin === 'bars') {
    const heights = {
      sm: 'h-4 w-3.5 gap-0.5',
      md: 'h-6 w-5 gap-1',
      lg: 'h-8 w-7 gap-1.5'
    }[size];

    const barWidths = {
      sm: 'w-0.5',
      md: 'w-1',
      lg: 'w-1.5'
    }[size];

    return (
      <div
        className={`inline-flex items-end justify-center visualizer-skin-bars ${heights} ${className}`}
        title={isPlaying ? 'Audio Visualizer (Bars)' : 'Audio Paused'}
        aria-label="Audio activity visualizer"
      >
        <span
          className={`rounded-full bg-gradient-to-t from-[var(--accent-primary)] to-[var(--accent-secondary)] ${barWidths} transition-all duration-300 ${
            isPlaying
              ? 'animate-eq-bar-1'
              : isBuffering
              ? 'h-2 opacity-50 animate-pulse'
              : 'h-1 opacity-30'
          }`}
          style={{ animationDuration: isPlaying ? '0.75s' : '1.5s' }}
        />
        <span
          className={`rounded-full bg-gradient-to-t from-[var(--accent-primary)] to-[var(--accent-secondary)] ${barWidths} transition-all duration-300 ${
            isPlaying
              ? 'animate-eq-bar-2'
              : isBuffering
              ? 'h-3.5 opacity-70 animate-pulse'
              : 'h-1.5 opacity-30'
          }`}
          style={{ animationDuration: isPlaying ? '0.55s' : '1.5s', animationDelay: '0.15s' }}
        />
        <span
          className={`rounded-full bg-gradient-to-t from-[var(--accent-primary)] to-[var(--accent-secondary)] ${barWidths} transition-all duration-300 ${
            isPlaying
              ? 'animate-eq-bar-3'
              : isBuffering
              ? 'h-2 opacity-50 animate-pulse'
              : 'h-1 opacity-30'
          }`}
          style={{ animationDuration: isPlaying ? '0.85s' : '1.5s', animationDelay: '0.3s' }}
        />
      </div>
    );
  }

  // Skin 2: Circular (Concentric pulsating radar rings)
  if (effectiveSkin === 'circular') {
    const ringSizes = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8'
    }[size];

    return (
      <div
        className={`relative inline-flex items-center justify-center visualizer-skin-circular ${ringSizes} ${className}`}
        title={isPlaying ? 'Audio Visualizer (Circular Radar)' : 'Audio Paused'}
        aria-label="Audio activity visualizer"
      >
        {/* Core Center Orb */}
        <span
          className={`w-2 h-2 rounded-full bg-[var(--accent-primary)] transition-all ${
            isPlaying ? 'scale-110 shadow-sm shadow-[var(--accent-primary)]' : 'opacity-40 scale-75'
          }`}
        />
        {/* Outer Ring 1 */}
        <span
          className={`absolute inset-0 rounded-full border border-[var(--accent-primary)] ${
            isPlaying ? 'animate-circular-1' : isBuffering ? 'opacity-30 animate-pulse' : 'opacity-20'
          }`}
        />
        {/* Outer Ring 2 */}
        <span
          className={`absolute inset-0 rounded-full border border-[var(--accent-secondary)] ${
            isPlaying ? 'animate-circular-2' : 'hidden'
          }`}
        />
      </div>
    );
  }

  // Skin 3: Waveform (Undulating smooth soundwaves)
  if (effectiveSkin === 'waveform') {
    const waveHeights = {
      sm: 'h-3.5 w-4 gap-0.5',
      md: 'h-5 w-6 gap-0.5',
      lg: 'h-7 w-8 gap-1'
    }[size];

    const waveWidths = {
      sm: 'w-0.5',
      md: 'w-1',
      lg: 'w-1.5'
    }[size];

    return (
      <div
        className={`inline-flex items-center justify-center visualizer-skin-waveform ${waveHeights} ${className}`}
        title={isPlaying ? 'Audio Visualizer (Waveform)' : 'Audio Paused'}
        aria-label="Audio activity visualizer"
      >
        <span
          className={`h-full rounded-full bg-[var(--accent-primary)] origin-center ${waveWidths} ${
            isPlaying
              ? 'animate-waveform-1'
              : isBuffering
              ? 'scale-y-50 opacity-50'
              : 'scale-y-20 opacity-30'
          }`}
        />
        <span
          className={`h-full rounded-full bg-[var(--accent-secondary)] origin-center ${waveWidths} ${
            isPlaying
              ? 'animate-waveform-2'
              : isBuffering
              ? 'scale-y-75 opacity-70'
              : 'scale-y-35 opacity-30'
          }`}
        />
        <span
          className={`h-full rounded-full bg-[var(--accent-tertiary)] origin-center ${waveWidths} ${
            isPlaying
              ? 'animate-waveform-3'
              : isBuffering
              ? 'scale-y-50 opacity-50'
              : 'scale-y-20 opacity-30'
          }`}
        />
        <span
          className={`h-full rounded-full bg-[var(--accent-secondary)] origin-center ${waveWidths} ${
            isPlaying
              ? 'animate-waveform-1'
              : isBuffering
              ? 'scale-y-40 opacity-40'
              : 'scale-y-15 opacity-20'
          }`}
        />
      </div>
    );
  }

  // Skin 4: Dots (Matrix bouncy glow dots)
  const dotSizes = {
    sm: 'w-1 h-1 gap-1',
    md: 'w-1.5 h-1.5 gap-1.5',
    lg: 'w-2 h-2 gap-2'
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center visualizer-skin-dots ${className}`}
      title={isPlaying ? 'Audio Visualizer (Dots)' : 'Audio Paused'}
      aria-label="Audio activity visualizer"
    >
      <div className={`flex items-center ${dotSizes}`}>
        <span
          className={`rounded-full bg-[var(--accent-primary)] transition-all ${
            isPlaying
              ? 'animate-dot-1 shadow-[0_0_6px_var(--accent-primary)]'
              : isBuffering
              ? 'opacity-60 animate-pulse'
              : 'opacity-30'
          }`}
        />
        <span
          className={`rounded-full bg-[var(--accent-secondary)] transition-all ${
            isPlaying
              ? 'animate-dot-2 shadow-[0_0_6px_var(--accent-secondary)]'
              : isBuffering
              ? 'opacity-70 animate-pulse'
              : 'opacity-30'
          }`}
        />
        <span
          className={`rounded-full bg-[var(--accent-tertiary)] transition-all ${
            isPlaying
              ? 'animate-dot-3 shadow-[0_0_6px_var(--accent-tertiary)]'
              : isBuffering
              ? 'opacity-60 animate-pulse'
              : 'opacity-30'
          }`}
        />
      </div>
    </div>
  );
};
