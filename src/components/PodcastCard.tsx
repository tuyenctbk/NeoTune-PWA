import React, { useState } from 'react';
import { Play, Mic, Radio, Layers, Share2, Check } from 'lucide-react';
import { PodcastShow } from '../types';
import { shareContent } from '../utils/shareHelper';

interface PodcastCardProps {
  podcast: PodcastShow;
  onSelect: (podcast: PodcastShow) => void;
}

export const PodcastCard: React.FC<PodcastCardProps> = ({ podcast, onSelect }) => {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://neotune.app';
    const payload = {
      title: `${podcast.name} - NeoTune Podcasts`,
      text: `Listen to ${podcast.name} (${podcast.genre}) on NeoTune Podcasts!`,
      url: `${appUrl}?podcast=${encodeURIComponent(podcast.id)}`
    };
    const res = await shareContent(payload);
    if (res.success) {
      setShareFeedback(res.message);
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  return (
    <div
      onClick={() => onSelect(podcast)}
      className="group relative flex flex-col justify-between p-3.5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] hover:border-[var(--accent-secondary)]/50 hover:bg-[var(--surface-hover)]/70 shadow-lg shadow-black/20 transition-all duration-200 cursor-pointer tv-focusable"
    >
      <div className="flex items-start gap-3">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/40 shrink-0 border border-white/5">
          <img
            src={podcast.imageUrl}
            alt={podcast.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
            <div className="p-2 rounded-full bg-[var(--accent-secondary)] text-white shadow-lg">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-white flex items-center gap-0.5">
            <Mic className="w-2.5 h-2.5 text-[var(--accent-secondary)]" />
          </div>
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-secondary)] transition-colors">
            {podcast.name}
          </h4>
          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
            {podcast.artistName || podcast.genre}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-[var(--text-muted)]">
            <span className="px-2 py-0.5 rounded-md bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] font-semibold text-[10px]">
              {podcast.genre}
            </span>
            {podcast.trackCount > 0 && (
              <span className="text-[10px] text-[var(--text-muted)]">
                {podcast.trackCount} eps
              </span>
            )}
          </div>
          {shareFeedback && (
            <div className="mt-1.5 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-semibold flex items-center gap-1">
              <Check className="w-3 h-3 text-purple-400" />
              <span>{shareFeedback}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span className="text-[11px] truncate">{podcast.artistName ? `By ${podcast.artistName}` : 'Podcast Feed'}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-[var(--text-muted)] hover:text-white transition-colors"
            title="Share podcast"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(podcast);
            }}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] transition-colors"
          >
            Episodes
          </button>
        </div>
      </div>
    </div>
  );
};
