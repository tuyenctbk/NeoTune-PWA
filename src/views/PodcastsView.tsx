import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Mic, RefreshCw, X, Zap, Play, Clock } from 'lucide-react';
import { PodcastShow, RadioStation, PodcastEpisode } from '../types';
import { apiService } from '../services/apiService';
import { firebaseService } from '../services/firebaseService';
import { audioEngine } from '../services/audioEngine';
import { storageService } from '../services/storageService';
import { PodcastCard } from '../components/PodcastCard';
import { NowPlayingStudioFragment } from '../components/NowPlayingStudioFragment';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { triggerHaptic } from '../utils/haptics';

import { useTranslation } from '../services/i18n';

interface PodcastsViewProps {
  onSelectPodcast: (show: PodcastShow) => void;
  onOpenEqualizer?: () => void;
  onOpenSleepTimer?: () => void;
  onOpenCarMode?: () => void;
  onOpenScreensaver?: () => void;
  onOpenFullPlayer?: () => void;
}

const PODCAST_CATEGORIES = [
  'Technology',
  'True Crime',
  'Comedy',
  'News',
  'Business',
  'Science',
  'Health',
  'Culture',
  'Music',
  'History'
];

export const PodcastsView: React.FC<PodcastsViewProps> = ({
  onSelectPodcast,
  onOpenEqualizer,
  onOpenSleepTimer,
  onOpenCarMode,
  onOpenScreensaver,
  onOpenFullPlayer,
}) => {
  const { t } = useTranslation();
  const [podcasts, setPodcasts] = useState<PodcastShow[]>([]);
  const [featuredPodcasts, setFeaturedPodcasts] = useState<PodcastShow[]>([]);
  const [recentEpisodes, setRecentEpisodes] = useState<{ show: RadioStation; episode: PodcastEpisode; timestamp: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [podcastLimit, setPodcastLimit] = useState(24);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Technology');
  const [activePlayingStation, setActivePlayingStation] = useState<RadioStation | null>(() => audioEngine.getState().currentStation);
  const [isPlaying, setIsPlaying] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRecentEpisodes(storageService.getRecentEpisodes());
    const unsubAudio = audioEngine.subscribe((state) => {
      setActivePlayingStation(state.currentStation);
      setIsPlaying(state.isPlaying);
      // Reload recents when state updates (e.g. on new playback trigger)
      setRecentEpisodes(storageService.getRecentEpisodes());
    });
    return unsubAudio;
  }, []);

  useEffect(() => {
    // Listen to Firebase Remote Config for dynamic featured podcasts
    const unsub = firebaseService.subscribeRemoteConfig((config) => {
      if (config.featuredPodcasts && config.featuredPodcasts.length > 0) {
        setFeaturedPodcasts(config.featuredPodcasts);
      }
    });

    return unsub;
  }, []);

  // Reset pagination limit and hasMore when query or category changes
  useEffect(() => {
    setPodcastLimit(24);
    setHasMore(true);
  }, [searchQuery, activeCategory]);

  // Initial and category/search fetch
  useEffect(() => {
    let active = true;
    setLoading(true);

    const term = searchQuery.trim() || activeCategory;
    const timer = setTimeout(() => {
      apiService.searchPodcasts(term, 'US', 24).then((items) => {
        if (!active) return;
        setPodcasts(items);
        setLoading(false);
        setIsLoadingMore(false);
        if (items.length < 24 || items.length === 0) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }).catch(() => {
        if (!active) return;
        setLoading(false);
        setIsLoadingMore(false);
      });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, activeCategory]);

  // Load More Handler (loads larger batch from iTunes API)
  const handleLoadMore = useCallback(async () => {
    if (loading || isLoadingMore || !hasMore) return;
    triggerHaptic('light');
    setIsLoadingMore(true);

    const nextLimit = Math.min(200, podcastLimit + 24);
    const term = searchQuery.trim() || activeCategory;

    try {
      const items = await apiService.searchPodcasts(term, 'US', nextLimit);
      if (items && items.length > 0) {
        if (items.length <= podcasts.length || items.length < nextLimit || nextLimit >= 200) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
        setPodcasts(items);
        setPodcastLimit(nextLimit);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.warn('Failed to load more podcasts:', e);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [loading, isLoadingMore, hasMore, podcastLimit, searchQuery, activeCategory, podcasts.length]);

  // Auto Load More on Scroll using IntersectionObserver + Scroll Listener fallback
  useEffect(() => {
    if (loading || isLoadingMore || !hasMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && !isLoadingMore && !loading && hasMore) {
          handleLoadMore();
        }
      },
      { root: null, rootMargin: '400px 0px', threshold: 0.01 }
    );

    observer.observe(sentinel);

    // Window scroll backup listener for fast fling scrolling
    let scrollTimeout: any = null;
    const handleScroll = () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
        if (typeof window === 'undefined') return;
        const scrollPosition = window.innerHeight + window.scrollY;
        const threshold = document.documentElement.offsetHeight - 500;
        if (scrollPosition >= threshold && !isLoadingMore && !loading && hasMore) {
          handleLoadMore();
        }
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [loading, isLoadingMore, hasMore, handleLoadMore]);

  return (
    <div id="podcasts-fragment-layout" className="lg:grid lg:grid-cols-12 lg:gap-6 xl:gap-8 items-start">
      {/* Master Podcasts Fragment */}
      <div id="master-podcasts-fragment" className="lg:col-span-7 xl:col-span-8 space-y-6 pb-28 min-w-0">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder={t('podcasts_search_placeholder', 'Search global podcasts...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-secondary)] shadow-md shadow-black/10 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Recently Played Episodes / Continue Listening */}
        {recentEpisodes.length > 0 && !searchQuery && (
          <div className="space-y-3 pt-1 animate-fadeIn">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                {t('continue_listening', 'Continue Listening')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {recentEpisodes.filter(item => item && item.show && item.episode).map(({ show, episode }) => {
                const progress = storageService.getPodcastProgress(episode.audioUrl);
                const progressPercent = progress && progress.durationMs && progress.positionMs
                  ? Math.min(100, Math.round((progress.positionMs / progress.durationMs) * 100))
                  : 0;

                return (
                  <button
                    key={`recent_episode_${episode.id || episode.audioUrl}`}
                    onClick={() => {
                      triggerHaptic('play');
                      audioEngine.playPodcastEpisode(show, episode);
                    }}
                    className="flex gap-3 p-3 rounded-2xl bg-[var(--surface-main)]/40 hover:bg-[var(--surface-main)]/80 border border-[var(--border-color)] text-left transition-all hover:scale-[1.01] group relative overflow-hidden focus:outline-none w-full"
                  >
                    {/* Artwork */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-black/40 relative">
                      <img
                        src={episode.artworkUrl || show.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-secondary)] transition-colors">
                          {episode.title}
                        </h4>
                        <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                          {show.name}
                        </p>
                      </div>

                      {/* Progress bar */}
                      {progressPercent > 0 ? (
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between items-center text-[9px] text-[var(--text-muted)] font-mono">
                            <span>{progressPercent}% completed</span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent-secondary)] rounded-full transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-1.5 uppercase tracking-wider">
                          <Play className="w-2 h-2 fill-current" /> Play Episode
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PODCAST_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat && !searchQuery;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[var(--accent-secondary)] text-white shadow-md shadow-[var(--accent-secondary)]/25'
                    : 'bg-[var(--surface-main)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-hover)]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Featured Podcasts (Firebase Remote Config) */}
        {featuredPodcasts.length > 0 && !searchQuery && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-400 border border-pink-500/30">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  <span className="hidden sm:inline">Featured Podcasts (Remote Config)</span>
                  <span className="sm:hidden">Featured Podcasts</span>
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold hidden sm:inline-block">
                Dynamic Cloud Spotlight
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {featuredPodcasts.map((podcast) => (
                <PodcastCard
                  key={`featured_${podcast.id}`}
                  podcast={podcast}
                  onSelect={onSelectPodcast}
                />
              ))}
            </div>
          </div>
        )}

        {/* Podcast Shows Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-[var(--accent-secondary)]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                {searchQuery ? `Results for "${searchQuery}"` : `${activeCategory} Podcasts`}
              </h3>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              {podcasts.length} shows
            </span>
          </div>

          {loading ? (
            <div className="py-24 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[var(--accent-secondary)]" />
              <p className="font-medium text-sm text-[var(--text-primary)]">
                <span className="hidden sm:inline">Querying Apple iTunes Podcast Directory...</span>
                <span className="sm:hidden">Searching podcasts...</span>
              </p>
            </div>
          ) : podcasts.length === 0 ? (
            <div className="text-center py-20 bg-[var(--surface-main)] rounded-2xl border border-[var(--border-color)] p-8">
              <Mic className="w-12 h-12 mx-auto text-[var(--text-muted)] opacity-40 mb-3" />
              <h4 className="text-base font-bold text-[var(--text-primary)]">No podcasts found</h4>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Try searching with another podcast keyword or selecting a different category.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {podcasts.map((podcast) => (
                  <PodcastCard
                    key={podcast.id}
                    podcast={podcast}
                    onSelect={onSelectPodcast}
                  />
                ))}
              </div>

              {/* Sentinel for Infinite Scroll Auto Load More */}
              {hasMore && <div ref={sentinelRef} className="h-8 -mt-4 pointer-events-none" aria-hidden="true" />}

              {/* Auto Loading More Spinner & Indicator */}
              {isLoadingMore && (
                <div className="py-6 text-center flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface-main)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] shadow-md">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--accent-secondary)]" />
                    <span>Loading more podcasts...</span>
                  </div>
                </div>
              )}

              {/* Manual Load More Button fallback */}
              {!isLoadingMore && hasMore && podcasts.length >= 24 && (
                <div className="pt-2 text-center">
                  <button
                    onClick={handleLoadMore}
                    className="px-6 py-2.5 rounded-2xl bg-[var(--surface-main)] hover:bg-white/10 border border-[var(--border-color)] hover:border-[var(--accent-secondary)] text-xs font-bold text-[var(--text-primary)] shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                    <span>Load More Podcasts ({podcasts.length} loaded)</span>
                  </button>
                </div>
              )}

              {/* End of list indicator */}
              {!hasMore && podcasts.length >= 12 && (
                <div className="pt-4 pb-2 text-center">
                  <p className="text-[11px] text-[var(--text-muted)] font-medium">
                    All available podcasts loaded ({podcasts.length} shows)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Scroll to Top Navigation */}
      <ScrollToTopButton />

      {/* Detail Studio Fragment (Tablet & Desktop) */}
      <div id="podcasts-detail-studio-fragment" className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20 h-[calc(100vh-6.5rem)] min-h-[580px]">
        <NowPlayingStudioFragment
          station={activePlayingStation}
          isPlaying={isPlaying}
          onPlay={(st) => audioEngine.playStation(st)}
          onToggleFavorite={async (st) => {
            storageService.toggleFavorite(st);
            await firebaseService.syncFavoritesToCloud(storageService.getFavorites());
          }}
          onShare={() => {}}
          onSetAlarm={() => {}}
          onOpenEqualizer={onOpenEqualizer || (() => {})}
          onOpenSleepTimer={onOpenSleepTimer || (() => {})}
          onOpenCarMode={onOpenCarMode || (() => {})}
          onOpenScreensaver={onOpenScreensaver || (() => {})}
          onOpenFullPlayer={onOpenFullPlayer || (() => {})}
          suggestedStations={storageService.getFavorites().slice(0, 3)}
        />
      </div>
    </div>
  );
};
