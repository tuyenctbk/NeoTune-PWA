import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, RotateCw, Gauge, Clock, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { PodcastShow, PodcastEpisode, RadioStation } from '../types';
import { apiService } from '../services/apiService';
import { audioEngine } from '../services/audioEngine';
import { storageService } from '../services/storageService';

interface PodcastEpisodeDrawerProps {
  show: PodcastShow | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PodcastEpisodeDrawer: React.FC<PodcastEpisodeDrawerProps> = ({
  show,
  isOpen,
  onClose,
}) => {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEpId, setActiveEpId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (isOpen && show && show.feedUrl) {
      setLoading(true);
      setError(null);
      apiService.getPodcastEpisodes(show.feedUrl, show.id)
        .then((items) => {
          setEpisodes(items);
          setLoading(false);
        })
        .catch(() => {
          setError('Could not load RSS feed. Stream may be protected or invalid.');
          setLoading(false);
        });
    }
  }, [isOpen, show]);

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setActiveEpId(state.currentEpisode?.id || null);
      setCurrentTime(state.currentTime);
      setDuration(state.duration);
      setSpeed(state.playbackSpeed);
    });
    return unsub;
  }, []);

  if (!isOpen || !show) return null;

  const handlePlayEpisode = (episode: PodcastEpisode) => {
    const stationRep: RadioStation = {
      id: show.id,
      name: show.name,
      genre: show.genre,
      country: show.country,
      streamUrl: episode.audioUrl,
      imageUrl: show.imageUrl,
      bitrate: 'Podcast',
      codec: 'MP3',
      isFavorite: false,
    };
    audioEngine.playPodcastEpisode(stationRep, episode);
  };

  const handleTogglePlay = () => {
    audioEngine.togglePlay();
  };

  const handleSpeedCycle = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    audioEngine.setPlaybackSpeed(nextSpeed);
  };

  const formatDuration = (msOrSec: number) => {
    const totalSec = msOrSec > 10000 ? Math.floor(msOrSec / 1000) : Math.floor(msOrSec);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end p-0 sm:p-4 bg-black/80 backdrop-blur-xl animate-fadeIn overflow-hidden">
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-xl rounded-none sm:rounded-3xl bg-[var(--surface-main)]/95 sm:bg-[var(--surface-main)]/85 backdrop-blur-2xl border-0 sm:border border-white/10 p-4 sm:p-6 shadow-2xl shadow-black/60 ring-0 sm:ring-1 ring-white/10 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-3 pr-2 min-w-0">
            <img
              src={show.imageUrl}
              alt={show.name}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover bg-black/40 border border-white/10 shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">{show.name}</h3>
              <p className="text-xs text-[var(--text-muted)] truncate">{show.artistName || show.genre}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)] font-semibold">
                  {show.genre}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">{episodes.length} Episodes</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 ml-auto"
            aria-label="Close Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Episode Scrubbing Controller Banner (if podcast is currently playing) */}
        {activeEpId && (
          <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-purple-900/30 via-[var(--surface-hover)] to-cyan-900/30 border border-[var(--accent-secondary)]/30">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-[var(--accent-secondary)] truncate max-w-[240px]">
                Now Playing Episode
              </span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
            </div>

            {/* Interactive Progress Scrubber */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => audioEngine.seekTo(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--accent-secondary)]"
            />

            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => audioEngine.seekRelative(-15)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[var(--text-primary)] text-xs flex items-center gap-1"
                  title="Jump back 15s"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[10px]">15s</span>
                </button>
                <button
                  onClick={() => audioEngine.seekRelative(15)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[var(--text-primary)] text-xs flex items-center gap-1"
                  title="Jump forward 15s"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="text-[10px]">15s</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSpeedCycle}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[var(--accent-primary)] text-xs font-mono font-bold flex items-center gap-1"
                >
                  <Gauge className="w-3 h-3" />
                  {speed}x
                </button>

                <button
                  onClick={handleTogglePlay}
                  className="p-2 rounded-full bg-[var(--accent-secondary)] text-white shadow-lg shadow-purple-500/20"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Episodes List Container */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-2.5">
          {loading ? (
            <div className="py-16 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[var(--accent-secondary)]" />
              <span>Fetching & parsing RSS enclosures...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : episodes.length === 0 ? (
            <div className="text-center py-16 text-xs text-[var(--text-muted)]">
              No audio episodes found in this podcast feed.
            </div>
          ) : (
            episodes.map((ep, idx) => {
              const isCurrent = activeEpId === ep.id;
              const savedProgress = storageService.getPodcastProgress(ep.audioUrl);
              const progressPercent = savedProgress && savedProgress.durationMs > 0
                ? (savedProgress.positionMs / savedProgress.durationMs) * 100
                : 0;

              return (
                <div
                  key={ep.id || idx}
                  onClick={() => handlePlayEpisode(ep)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[var(--accent-secondary)]/15 border-[var(--accent-secondary)] shadow-md'
                      : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 text-[11px] text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {ep.pubDate}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {formatDuration(ep.durationMs)}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
                        {ep.title}
                      </h4>

                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1 leading-relaxed">
                        {ep.description}
                      </p>
                    </div>

                    <button
                      className={`p-2.5 rounded-full shrink-0 transition-colors ${
                        isCurrent && isPlaying
                          ? 'bg-[var(--accent-secondary)] text-white'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                      aria-label="Play episode"
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>

                  {/* Stored resume progress bar */}
                  {progressPercent > 5 && (
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span>Resume progress: {Math.floor(progressPercent)}%</span>
                      <div className="w-24 h-1 bg-black/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent-secondary)] rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
