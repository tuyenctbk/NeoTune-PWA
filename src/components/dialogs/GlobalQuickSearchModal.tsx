import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Radio, Disc, Play, Sparkles, Volume2, HelpCircle, Keyboard, AlertTriangle, ArrowRight, CornerDownLeft } from 'lucide-react';
import { RadioStation, PodcastShow, PodcastEpisode } from '../../types';
import { apiService } from '../../services/apiService';
import { audioEngine } from '../../services/audioEngine';
import { searchAndRank } from '../../utils/fuzzySearch';
import { triggerHaptic } from '../../utils/haptics';

interface GlobalQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayPodcastEpisode?: (show: PodcastShow, episode: PodcastEpisode) => void;
}

interface MergedSearchResult {
  id: string;
  type: 'station' | 'podcast' | 'episode';
  title: string;
  subtitle: string;
  imageUrl: string;
  score: number;
  original: any;
}

export const GlobalQuickSearchModal: React.FC<GlobalQuickSearchModalProps> = ({
  isOpen,
  onClose,
  onPlayPodcastEpisode
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'station' | 'podcast'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MergedSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Ctrl+K / Cmd+K handler & keyboard navigation
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle live searches with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Concurrently search station API and podcast search API
        const [stationRes, podcastRes] = await Promise.all([
          apiService.searchRadioStations({ query, limit: 30 }).catch(() => ({ stations: [] })),
          apiService.searchPodcasts(query).catch(() => [] as PodcastShow[])
        ]);

        const stations: RadioStation[] = stationRes.stations || [];
        const podcasts: PodcastShow[] = podcastRes || [];

        // Apply our advanced phonetic and fuzzy ranking algorithms on top of the search sets
        const rankedStations = searchAndRank(stations, query, (s) => [s.name, s.genre, s.country || '']);
        const rankedPodcasts = searchAndRank(podcasts, query, (p) => [p.name, p.genre || '', p.country || '']);

        const merged: MergedSearchResult[] = [];

        rankedStations.forEach(({ item, score }) => {
          merged.push({
            id: item.id,
            type: 'station',
            title: item.name,
            subtitle: `${item.genre} • ${item.country || 'Global'} (${item.bitrate || '128k'} ${item.codec || 'MP3'})`,
            imageUrl: item.imageUrl,
            score,
            original: item
          });
        });

        rankedPodcasts.forEach(({ item, score }) => {
          merged.push({
            id: item.id,
            type: 'podcast',
            title: item.name,
            subtitle: `${item.genre || 'Podcast'} • ${item.country || 'Global'}`,
            imageUrl: item.imageUrl,
            score,
            original: item
          });
        });

        // Final sorting by score descending
        merged.sort((a, b) => b.score - a.score);
        setResults(merged);
        setSelectedIndex(0);
      } catch (err) {
        console.warn('Global quick search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250); // 250ms debounce

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Handle keyboard arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(filteredResults.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelectResult(filteredResults[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, activeTab]);

  const filteredResults = results.filter((r) => {
    if (activeTab === 'all') return true;
    return r.type === activeTab;
  });

  const handleSelectResult = async (result: MergedSearchResult) => {
    triggerHaptic();
    if (result.type === 'station') {
      audioEngine.playStation(result.original);
      onClose();
    } else if (result.type === 'podcast') {
      // If user plays a podcast from search, we can fetch episodes and play the latest
      setIsLoading(true);
      try {
        const episodes = await apiService.getPodcastEpisodes(result.original.feedUrl, result.original.id);
        if (episodes && episodes.length > 0) {
          if (onPlayPodcastEpisode) {
            onPlayPodcastEpisode(result.original, episodes[0]);
          } else {
            // Play using audio engine default
            audioEngine.playPodcastEpisode(result.original, episodes[0]);
          }
          onClose();
        } else {
          alert('No playable episodes found for this show.');
        }
      } catch (err) {
        console.warn('Failed to load episodes:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn overflow-y-auto">
      {/* Backdrop blur */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Main modal container */}
      <div 
        ref={modalRef}
        className="relative my-auto w-full max-w-2xl h-auto max-h-[85vh] sm:max-h-[85vh] bg-[#12121a] border border-white/20 rounded-2xl shadow-2xl shadow-black/95 flex flex-col overflow-hidden z-10"
      >
        {/* Search header bar */}
        <div className="flex items-center gap-2 sm:gap-3 px-3.5 sm:px-4 py-3 border-b border-white/10 bg-[#0f1628] shrink-0">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 50,000+ radio stations or podcasts..."
            className="w-full bg-transparent border-0 outline-none text-sm text-white placeholder-zinc-500 py-1"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white shrink-0"
              aria-label="Clear Search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 sm:p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 ml-1"
            aria-label="Close Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters/Tabs bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0a0d16]/40 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setActiveTab('all'); setSelectedIndex(0); }}
              className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all ${
                activeTab === 'all'
                  ? 'bg-[var(--accent-primary)]/25 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Results
            </button>
            <button
              onClick={() => { setActiveTab('station'); setSelectedIndex(0); }}
              className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all ${
                activeTab === 'station'
                  ? 'bg-[var(--accent-primary)]/25 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Radio Stations
            </button>
            <button
              onClick={() => { setActiveTab('podcast'); setSelectedIndex(0); }}
              className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all ${
                activeTab === 'podcast'
                  ? 'bg-[var(--accent-primary)]/25 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Podcasts
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
            <Keyboard className="w-3.5 h-3.5 mr-1" />
            <span>↑↓ to navigate</span>
            <span className="mx-1">•</span>
            <span>↵ to play</span>
          </div>
        </div>

        {/* Results section */}
        <div className="overflow-y-auto flex-1 min-h-[220px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-16">
              <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-400 font-mono animate-pulse">Running semantic fuzzy scanning...</span>
            </div>
          ) : !query.trim() ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-6">
              <Sparkles className="w-8 h-8 text-[var(--accent-primary)] animate-pulse opacity-40 mb-1" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Instant Smart Finder</h3>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed mt-1">
                Type anything to search. Features phonetic matching for fuzzy, typo-tolerant station discovery!
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-6">
              <AlertTriangle className="w-8 h-8 text-amber-500/50 mb-1" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">No Matches Found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mt-1">
                Try searching phonetically (e.g. "lofi" for "low-fi") or search by city / genre.
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {filteredResults.map((result, idx) => {
                const isSelected = idx === selectedIndex;
                const matchPct = Math.round(result.score * 100);
                
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-[#1b253b] border-[var(--accent-primary)]/50 shadow-md shadow-black/30'
                        : 'bg-transparent border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Image Thumbnail */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 border border-white/10 shrink-0 relative">
                        <img
                          src={result.imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80'}
                          alt={result.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/10" />
                        {result.type === 'station' ? (
                          <Radio className="absolute bottom-1 right-1 w-3 h-3 text-[var(--accent-primary)] bg-black/60 rounded-full p-0.5" />
                        ) : (
                          <Disc className="absolute bottom-1 right-1 w-3 h-3 text-purple-400 bg-black/60 rounded-full p-0.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-white truncate flex items-center gap-1.5 uppercase tracking-wide">
                          {result.title}
                        </h4>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {result.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Search match badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black ${
                        result.score > 0.7
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : result.score > 0.4
                          ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                          : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                      }`}>
                        {result.score > 0.65 ? '🎯 DIRECT' : `🔊 PHONETIC`} {matchPct}%
                      </span>

                      {isSelected ? (
                        <div className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[9px] text-zinc-400 font-mono flex items-center gap-1">
                          <span>Play</span>
                          <CornerDownLeft className="w-2.5 h-2.5" />
                        </div>
                      ) : (
                        <Play className="w-3.5 h-3.5 text-zinc-500 hover:text-white" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
