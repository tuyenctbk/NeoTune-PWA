import React, { useState, useEffect } from 'react';
import { X, Moon, Radio, Disc3 } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { RadioStation, PodcastEpisode } from '../types';
import { VisualizerCanvas } from './VisualizerCanvas';

interface ScreensaverViewProps {
  onClose: () => void;
}

export const ScreensaverView: React.FC<ScreensaverViewProps> = ({ onClose }) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [station, setStation] = useState<RadioStation | null>(null);
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setStation(state.currentStation);
      setEpisode(state.currentEpisode);
      setIsPlaying(state.isPlaying);
    });

    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
    };

    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    // OLED Burn-in protection: slowly drift elements by 5-10px every 30 seconds
    const driftInterval = setInterval(() => {
      const dx = (Math.random() - 0.5) * 20;
      const dy = (Math.random() - 0.5) * 20;
      setOffset({ x: dx, y: dy });
    }, 30000);

    const handleKeyDown = () => {
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsub();
      clearInterval(clockInterval);
      clearInterval(driftInterval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-8 sm:p-12 cursor-pointer select-none animate-fadeIn"
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: 'transform 4s ease-in-out'
      }}
    >
      {/* Top Left Indicator */}
      <div className="flex items-center justify-between opacity-60">
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase">
          <Moon className="w-4 h-4 text-[var(--accent-primary)]" />
          <span>OLED Ambient Mode • Tap Anywhere to Exit</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Big Digital Clock Center */}
      <div className="my-auto flex flex-col items-center text-center">
        <div className="text-7xl sm:text-9xl font-black tracking-tighter font-mono text-white/90 drop-shadow-2xl">
          {timeStr || '00:00:00'}
        </div>
        <div className="text-lg sm:text-2xl font-medium text-zinc-400 mt-2">
          {dateStr}
        </div>

        {/* Current Radio / Podcast Status */}
        {station && (
          <div className="mt-8 flex items-center gap-4 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-900 max-w-md">
            <img
              src={episode?.artworkUrl || station.imageUrl}
              alt={station.name}
              className="w-14 h-14 rounded-xl object-cover border border-white/10"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="text-left min-w-0 flex-1">
              <div className="text-sm font-bold text-white truncate">
                {episode ? episode.title : station.name}
              </div>
              <div className="text-xs text-[var(--accent-primary)] truncate font-semibold">
                {episode ? station.name : station.genre} • {station.country}
              </div>
              {isPlaying && (
                <div className="text-[10px] text-green-400 font-mono flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                  Streaming Live Audio
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Audio Spectrum Visualizer Bar */}
      <div className="w-full max-w-xl mx-auto opacity-70">
        <VisualizerCanvas height={60} barCount={8} colorScheme="mono" />
      </div>
    </div>
  );
};
