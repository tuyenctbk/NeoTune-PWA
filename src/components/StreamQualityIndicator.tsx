import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Info, Zap } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { RadioStation } from '../types';

export const StreamQualityIndicator: React.FC = () => {
  const [station, setStation] = useState<RadioStation | null>(() => audioEngine.getState().currentStation);
  const [isPlaying, setIsPlaying] = useState(() => audioEngine.getState().isPlaying);

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((state) => {
      setStation(state.currentStation);
      setIsPlaying(state.isPlaying);
    });
    return unsubscribe;
  }, []);

  if (!station || !isPlaying) return null;

  const rawBitrate = station.bitrate || '128 kbps';
  const numericBitrate = parseInt(rawBitrate, 10) || 128;
  const codec = (station.codec || 'MP3').toUpperCase();
  
  const isHighQuality = numericBitrate >= 128;

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 shadow-lg shadow-black/20 w-full max-w-sm mx-auto">
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Stream Telemetry</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white">{codec}</span>
          <span className="text-xs text-[var(--text-muted)]">•</span>
          <span className="text-xs font-bold text-[var(--text-muted)]">{rawBitrate.includes('kbps') ? rawBitrate : `${rawBitrate} kbps`}</span>
          <span className="text-xs text-[var(--text-muted)]">•</span>
          <span className="text-xs font-semibold text-[var(--text-muted)]">44.1 kHz</span>
        </div>
      </div>

      <div className="shrink-0">
        {isHighQuality ? (
          <div className="flex items-center gap-1 bg-green-500/15 border border-green-500/30 px-2.5 py-1 rounded-full text-green-400 font-extrabold text-[10px] uppercase tracking-wider shadow-sm shadow-green-500/10">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            <span>HQ Audio</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full text-amber-400 font-extrabold text-[10px] uppercase tracking-wider shadow-sm shadow-amber-500/10">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>LQ / Saver</span>
          </div>
        )}
      </div>
    </div>
  );
};
