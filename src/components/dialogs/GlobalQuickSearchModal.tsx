import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, X, Radio, Disc, Play, Sparkles, Volume2, HelpCircle, Keyboard, 
  AlertTriangle, ArrowRight, CornerDownLeft, Filter, Globe, Gauge, Music, 
  RotateCcw, SlidersHorizontal, ChevronDown, Check
} from 'lucide-react';
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
  bitrateNum?: number;
  original: any;
}

const GENRE_CATEGORIES = [
  'All Genres',
  'Pop',
  'Rock',
  'Jazz',
  'Electronic',
  'Classical',
  'Hip Hop',
  'Lounge',
  'Ambient',
  'Talk & News',
  'Country',
  'Reggae',
  'Metal',
  'Blues',
  'Dance'
];

const POPULAR_COUNTRIES = [
  { name: 'All Countries', code: '' },
  { name: 'United States', code: 'US' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'Germany', code: 'DE' },
  { name: 'France', code: 'FR' },
  { name: 'Canada', code: 'CA' },
  { name: 'Australia', code: 'AU' },
  { name: 'Japan', code: 'JP' },
  { name: 'Brazil', code: 'BR' },
  { name: 'Spain', code: 'ES' },
  { name: 'Italy', code: 'IT' },
  { name: 'Netherlands', code: 'NL' },
  { name: 'Vietnam', code: 'VN' }
];

const BITRATE_OPTIONS = [
  { label: 'All Bitrates', minKbps: 0 },
  { label: 'High Quality (128k+)', minKbps: 128 },
  { label: 'Studio HD (192k+)', minKbps: 192 },
  { label: 'Audiophile (320k)', minKbps: 320 }
];

function extractBitrateNumber(bitrateStr?: string): number {
  if (!bitrateStr) return 128;
  const match = bitrateStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 128;
}

export const GlobalQuickSearchModal: React.FC<GlobalQuickSearchModalProps> = ({
  isOpen,
  onClose,
  onPlayPodcastEpisode
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'station' | 'podcast'>('all');
  const [selectedGenre, setSelectedGenre] = useState('All Genres');
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [minBitrate, setMinBitrate] = useState<number>(0);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MergedSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Check if any category filter is active
  const hasActiveFilters = selectedGenre !== 'All Genres' || selectedCountryCode !== '' || minBitrate > 0;

  const handleResetFilters = () => {
    triggerHaptic('selection');
    setSelectedGenre('All Genres');
    setSelectedCountryCode('');
    setMinBitrate(0);
  };

  // Ctrl+K / Cmd+K handler & keyboard navigation
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle live searches and category filtering
  useEffect(() => {
    if (!isOpen) return;

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const tagParam = selectedGenre !== 'All Genres' ? selectedGenre.toLowerCase() : undefined;
        const countryCodeParam = selectedCountryCode ? selectedCountryCode : undefined;

        // Concurrently search station API and podcast search API
        const [stationRes, podcastRes] = await Promise.all([
          apiService.searchRadioStations({
            query: query.trim() || undefined,
            tag: tagParam,
            countrycode: countryCodeParam,
            limit: 45
          }).catch(() => ({ stations: [] })),
          activeTab !== 'station' && query.trim()
            ? apiService.searchPodcasts(query.trim()).catch(() => [] as PodcastShow[])
            : Promise.resolve([] as PodcastShow[])
        ]);

        let stations: RadioStation[] = stationRes.stations || [];
        const podcasts: PodcastShow[] = podcastRes || [];

        // Apply Bitrate Filtering on stations
        if (minBitrate > 0) {
          stations = stations.filter((s) => extractBitrateNumber(s.bitrate) >= minBitrate);
        }

        // Apply advanced phonetic and fuzzy ranking if a text query exists
        let rankedStations = stations.map((s) => ({ item: s, score: 0.8 }));
        let rankedPodcasts = podcasts.map((p) => ({ item: p, score: 0.8 }));

        if (query.trim()) {
          rankedStations = searchAndRank(stations, query, (s) => [s.name, s.genre, s.country || '']);
          rankedPodcasts = searchAndRank(podcasts, query, (p) => [p.name, p.genre || '', p.country || '']);
        }

        const merged: MergedSearchResult[] = [];

        rankedStations.forEach(({ item, score }) => {
          const bNum = extractBitrateNumber(item.bitrate);
          merged.push({
            id: item.id,
            type: 'station',
            title: item.name,
            subtitle: `${item.genre} • ${item.country || 'Global'} (${item.bitrate || '128k'} ${item.codec || 'MP3'})`,
            imageUrl: item.imageUrl,
            score,
            bitrateNum: bNum,
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

        // Sorting by score descending
        if (query.trim()) {
          merged.sort((a, b) => b.score - a.score);
        }
        
        setResults(merged);
        setSelectedIndex(0);
      } catch (err) {
        console.warn('Global quick search with filters failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => clearTimeout(delayDebounce);
  }, [query, selectedGenre, selectedCountryCode, minBitrate, activeTab, isOpen]);

  // Handle keyboard navigation
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

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (activeTab === 'all') return true;
      return r.type === activeTab;
    });
  }, [results, activeTab]);

  const handleSelectResult = async (result: MergedSearchResult) => {
    triggerHaptic('play');
    if (result.type === 'station') {
      audioEngine.playStation(result.original);
      onClose();
    } else if (result.type === 'podcast') {
      setIsLoading(true);
      try {
        const episodes = await apiService.getPodcastEpisodes(result.original.feedUrl, result.original.id);
        if (episodes && episodes.length > 0) {
          if (onPlayPodcastEpisode) {
            onPlayPodcastEpisode(result.original, episodes[0]);
          } else {
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
        className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main modal container */}
      <div 
        ref={modalRef}
        className="relative my-auto w-full max-w-3xl h-auto max-h-[90vh] bg-[#101422] border border-white/20 rounded-3xl shadow-2xl shadow-black/95 flex flex-col overflow-hidden z-10"
      >
        {/* Search header bar */}
        <div className="flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 py-3.5 border-b border-white/10 bg-[#0d1220] shrink-0">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stations, podcasts, genres, or cities..."
            className="w-full bg-transparent border-0 outline-none text-sm sm:text-base text-white placeholder-zinc-500 py-1"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white shrink-0 transition-colors"
              aria-label="Clear Search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Toggle Category Filters Panel Button */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              setShowFiltersDrawer(!showFiltersDrawer);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              showFiltersDrawer || hasActiveFilters
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
            }`}
            title="Toggle Category Filters (Genre, Country, Bitrate)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-1"
            aria-label="Close Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters Bar & Drawer (Genre, Country, Bitrate) */}
        <div className="border-b border-white/10 bg-[#0a0e1a]/80 p-3 sm:px-5 space-y-2.5">
          {/* Quick Content Type Tabs & Active Filter Badges */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setActiveTab('all'); setSelectedIndex(0); }}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all ${
                  activeTab === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Results
              </button>
              <button
                onClick={() => { setActiveTab('station'); setSelectedIndex(0); }}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all ${
                  activeTab === 'station'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Radio Stations
              </button>
              <button
                onClick={() => { setActiveTab('podcast'); setSelectedIndex(0); }}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all ${
                  activeTab === 'podcast'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Podcasts
              </button>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Category Filter Selectors (Genre, Country, Bitrate) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
            {/* 1. Genre Category Selector */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Music className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full bg-transparent text-white font-medium outline-none cursor-pointer text-xs pr-2"
                >
                  {GENRE_CATEGORIES.map((g) => (
                    <option key={g} value={g} className="bg-[#101422] text-white">
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Country Category Selector */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">Country</label>
                <select
                  value={selectedCountryCode}
                  onChange={(e) => setSelectedCountryCode(e.target.value)}
                  className="w-full bg-transparent text-white font-medium outline-none cursor-pointer text-xs pr-2"
                >
                  {POPULAR_COUNTRIES.map((c) => (
                    <option key={c.name} value={c.code} className="bg-[#101422] text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Bitrate Category Selector */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Gauge className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block">Bitrate Quality</label>
                <select
                  value={minBitrate}
                  onChange={(e) => setMinBitrate(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-medium outline-none cursor-pointer text-xs pr-2"
                >
                  {BITRATE_OPTIONS.map((b) => (
                    <option key={b.label} value={b.minKbps} className="bg-[#101422] text-white">
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results section */}
        <div className="overflow-y-auto flex-1 min-h-[260px] p-2 sm:p-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-16">
              <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-400 font-mono animate-pulse">
                Filtering & scanning radio catalog...
              </span>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-6">
              <AlertTriangle className="w-8 h-8 text-amber-500/60 mb-1" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">No Matching Stations Found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mt-1">
                Try loosening your category filters (Genre, Country, or Bitrate) or adjust your search keywords.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2 py-1 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                <span>Found {filteredResults.length} stream{filteredResults.length !== 1 ? 's' : ''}</span>
                <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                  <Keyboard className="w-3 h-3" /> ↑↓ to navigate • ↵ to play
                </span>
              </div>

              {filteredResults.map((result, idx) => {
                const isSelected = idx === selectedIndex;
                const matchPct = Math.round(result.score * 100);
                
                return (
                  <button
                    key={`${result.type}_${result.id}_${idx}`}
                    onClick={() => handleSelectResult(result)}
                    className={`w-full flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1b233a] border-cyan-500/50 shadow-lg shadow-black/40 scale-[1.005]'
                        : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Image Thumbnail */}
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-black/50 border border-white/10 shrink-0 relative">
                        <img
                          src={result.imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80'}
                          alt={result.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/20" />
                        {result.type === 'station' ? (
                          <Radio className="absolute bottom-1 right-1 w-3.5 h-3.5 text-cyan-400 bg-black/70 rounded-full p-0.5" />
                        ) : (
                          <Disc className="absolute bottom-1 right-1 w-3.5 h-3.5 text-purple-400 bg-black/70 rounded-full p-0.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5 tracking-wide">
                          {result.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {result.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Bitrate & Match Tags */}
                      {result.bitrateNum && result.bitrateNum >= 192 && (
                        <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          HD {result.bitrateNum}k
                        </span>
                      )}

                      {query.trim() && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                          result.score > 0.7
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {matchPct}%
                        </span>
                      )}

                      <div className={`p-2 rounded-xl transition-colors ${
                        isSelected ? 'bg-cyan-500 text-black font-bold shadow' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}>
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
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
