import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Volume2, VolumeX, Heart, Radio, Car } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { storageService } from '../services/storageService';
import { firebaseService } from '../services/firebaseService';
import { RadioStation } from '../types';

interface CarModeViewProps {
  onClose: () => void;
  stations: RadioStation[];
}

export const CarModeView: React.FC<CarModeViewProps> = ({ onClose, stations }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [station, setStation] = useState<RadioStation | null>(null);
  const [volume, setVolume] = useState(0.85);
  const [favorites, setFavorites] = useState<RadioStation[]>(() => storageService.getFavorites());

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setStation(state.currentStation);
      setVolume(state.volume);
    });

    const unsubFavs = storageService.subscribe(setFavorites);

    return () => {
      unsub();
      unsubFavs();
    };
  }, []);

  const handleNextStation = () => {
    if (!stations.length || !station) return;
    const currentIndex = stations.findIndex(s => s.id === station.id);
    const nextIdx = (currentIndex + 1) % stations.length;
    audioEngine.playStation(stations[nextIdx]);
  };

  const handlePrevStation = () => {
    if (!stations.length || !station) return;
    const currentIndex = stations.findIndex(s => s.id === station.id);
    const prevIdx = (currentIndex - 1 + stations.length) % stations.length;
    audioEngine.playStation(stations[prevIdx]);
  };

  const isFavorite = station ? favorites.some(f => f.id === station.id) : false;

  const handleToggleFavorite = async () => {
    if (station) {
      storageService.toggleFavorite(station);
      try {
        await firebaseService.syncFavoritesToCloud(storageService.getFavorites());
      } catch (e) {
        console.warn('[CarModeView] Cloud sync of favorites failed:', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050508] text-white flex flex-col justify-between p-6 sm:p-10 select-none animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/40">
            <Car className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-[var(--accent-primary)]">
              Car Mode
            </h1>
            <p className="text-xs text-zinc-400 font-semibold">Distraction-Free Safe Driving Controls</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-6 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm flex items-center gap-2 border border-zinc-700 transition-colors"
        >
          <X className="w-5 h-5" />
          Exit Car Mode
        </button>
      </div>

      {/* Main Station Banner */}
      <div className="my-auto flex flex-col items-center text-center">
        <div className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-3xl overflow-hidden shadow-2xl bg-zinc-900 border-2 border-white/20 mb-6">
          <img
            src={station?.imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80'}
            alt={station?.name || 'Radio'}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {isPlaying && (
            <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-red-600 font-bold text-xs">
              LIVE
            </div>
          )}
        </div>

        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white line-clamp-1 max-w-2xl">
          {station?.name || 'Select a Station'}
        </h2>

        <p className="text-lg sm:text-2xl font-bold text-[var(--accent-primary)] mt-2">
          {station?.genre || 'Live Radio Stream'} {station?.country ? `• ${station.country}` : ''}
        </p>
      </div>

      {/* Giant Transport Controls (≥72px targets) */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center gap-6 sm:gap-12">
          {/* Previous Station */}
          <button
            onClick={handlePrevStation}
            className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white flex items-center justify-center border border-zinc-700 shadow-xl transition-transform"
            aria-label="Previous Station"
          >
            <SkipBack className="w-10 h-10 sm:w-14 sm:h-14" />
          </button>

          {/* Master Play/Pause Giant Button */}
          <button
            onClick={() => audioEngine.togglePlay()}
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[var(--accent-primary)] hover:opacity-95 active:scale-95 text-black flex items-center justify-center shadow-2xl shadow-[var(--accent-primary)]/40 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-14 h-14 sm:w-18 sm:h-18 fill-current" />
            ) : (
              <Play className="w-14 h-14 sm:w-18 sm:h-18 fill-current ml-2" />
            )}
          </button>

          {/* Next Station */}
          <button
            onClick={handleNextStation}
            className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white flex items-center justify-center border border-zinc-700 shadow-xl transition-transform"
            aria-label="Next Station"
          >
            <SkipForward className="w-10 h-10 sm:w-14 sm:h-14" />
          </button>
        </div>

        {/* Bottom Quick Station Ribbon */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <button
            onClick={handleToggleFavorite}
            className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-colors ${
              isFavorite
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            {isFavorite ? 'Favorited' : 'Favorite'}
          </button>

          {/* Large Volume Slider */}
          <div className="flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-zinc-400" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => audioEngine.setVolume(parseFloat(e.target.value))}
              className="w-32 sm:w-48 h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
