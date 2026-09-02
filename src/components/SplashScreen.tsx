import React, { useEffect, useState } from 'react';
import { Radio, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  progress: number;
  trivia: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ progress, trivia }) => {
  const [internalProgress, setInternalProgress] = useState(0);

  // Smooth progress interpolation
  useEffect(() => {
    const start = internalProgress;
    const end = progress;
    if (start === end) return;

    const duration = 250; // ms
    const stepTime = 10;
    const steps = duration / stepTime;
    const increment = (end - start) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      setInternalProgress((prev) => {
        const nextVal = prev + increment;
        return nextVal >= end ? end : nextVal;
      });

      if (currentStep >= steps) {
        clearInterval(interval);
        setInternalProgress(end);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [progress]);

  // Determine sub-label description based on progress milestones
  const getStatusMessage = (p: number) => {
    if (p < 25) return 'Initializing High-Fidelity AudioEngine...';
    if (p < 55) return 'Establishing secure connection to Firebase services...';
    if (p < 85) return 'Synchronizing cloud user stats and favorite presets...';
    if (p < 100) return 'Scanning global radio directories and caching streams...';
    return 'Systems active. Preparing NeoTune dashboard...';
  };

  return (
    <div id="neotune_splash" className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-main)] text-[var(--text-primary)] p-6 overflow-hidden select-none transition-colors duration-300">
      {/* Background radial glow mapped to active theme's accent color */}
      <div 
        className="absolute inset-0 animate-pulse pointer-events-none opacity-15" 
        style={{ backgroundImage: 'radial-gradient(circle at center, var(--accent-primary) 0%, transparent 60%)' }} 
      />

      <div className="w-full max-w-md flex flex-col items-center text-center space-y-8 relative z-10">
        {/* Animated App Logo Icon */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-[var(--accent-primary)]/20 blur-xl animate-pulse" />
          <div className="relative p-5 rounded-3xl bg-[var(--surface-main)] border border-[var(--border-color)] shadow-2xl">
            <Radio className="w-12 h-12 text-[var(--accent-primary)] animate-pulse" />
          </div>
        </div>

        {/* Brand Typography */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">
            NEO<span className="text-[var(--accent-primary)]">TUNE</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-medium tracking-widest uppercase">
            Global Radio Engine & Visualizer
          </p>
        </div>

        {/* Trivia Fact Card */}
        <div className="w-full p-5 rounded-2xl bg-[var(--surface-main)] border border-[var(--border-color)] backdrop-blur-md space-y-3 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent-primary)]" />
          <div className="flex items-center gap-2 text-[10px] text-[var(--accent-primary)] font-extrabold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Audio Trivia Fact</span>
          </div>
          <p className="text-xs sm:text-[13px] leading-relaxed text-[var(--text-primary)] text-left font-medium opacity-90">
            {trivia}
          </p>
        </div>

        {/* Progress & State descriptions */}
        <div className="w-full space-y-3.5 pt-4">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] font-mono px-1">
            <span className="text-[11px] truncate max-w-[80%] opacity-85">
              {getStatusMessage(internalProgress)}
            </span>
            <span className="text-[var(--accent-primary)]">{Math.round(internalProgress)}%</span>
          </div>

          {/* Core progress bar track */}
          <div className="h-2 w-full rounded-full bg-[var(--bg-main)] border border-[var(--border-color)] overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-tertiary)] shadow-lg transition-all duration-75"
              style={{ width: `${internalProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Decorative cyber stripes */}
      <div className="absolute bottom-6 left-6 font-mono text-[9px] text-[var(--text-muted)] tracking-wider opacity-40">
        CORE-VER: 2.1.0-STABLE // BUILD: 0823.01
      </div>
      <div className="absolute bottom-6 right-6 font-mono text-[9px] text-[var(--text-muted)] tracking-wider opacity-40">
        ENCRYPTION: AES-GCM
      </div>
    </div>
  );
};
