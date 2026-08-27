import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Heart, Search, Plus, Radio, ArrowUpDown, Trash2, Sparkles, Cloud, Check, Tag, X, PlusCircle, ChevronDown, Clock, Play, Pause, Headphones, ListX, Bookmark } from 'lucide-react';
import { RadioStation, UserProfile, ListenLaterItem } from '../types';
import { storageService } from '../services/storageService';
import { firebaseService } from '../services/firebaseService';
import { audioEngine } from '../services/audioEngine';
import { StationCard } from '../components/StationCard';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { NowPlayingStudioFragment } from '../components/NowPlayingStudioFragment';
import { triggerHaptic } from '../utils/haptics';

import { useTranslation } from '../services/i18n';

interface FavoritesViewProps {
  onOpenAddStation: () => void;
  onSetAlarm: (station: RadioStation) => void;
  onShareStation: (station: RadioStation) => void;
  onNavigateRadio: () => void;
  onOpenEqualizer?: () => void;
  onOpenSleepTimer?: () => void;
  onOpenCarMode?: () => void;
  onOpenScreensaver?: () => void;
  onOpenFullPlayer?: () => void;
}

const PRESET_TAG_SUGGESTIONS = ['Work', 'Chill', 'Morning', 'Focus', 'Workout', 'News', 'Lofi', 'Jazz', 'Night'];

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  onOpenAddStation,
  onSetAlarm,
  onShareStation,
  onNavigateRadio,
  onOpenEqualizer,
  onOpenSleepTimer,
  onOpenCarMode,
  onOpenScreensaver,
  onOpenFullPlayer,
}) => {
  const { t } = useTranslation();
  const [viewTab, setViewTab] = useState<'favorites' | 'listen_later'>('favorites');
  const [listenLaterItems, setListenLaterItems] = useState<ListenLaterItem[]>(() => storageService.getListenLaterQueue());
  const [favorites, setFavorites] = useState<RadioStation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date_added' | 'alpha' | 'recent_played'>('date_added');
  const [currentStationId, setCurrentStationId] = useState<string | null>(null);
  const [activePlayingStation, setActivePlayingStation] = useState<RadioStation | null>(() => audioEngine.getState().currentStation);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => firebaseService.getCurrentUser());
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Tag Editor Dialog State
  const [editingStation, setEditingStation] = useState<RadioStation | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [activeStationTags, setActiveStationTags] = useState<string[]>([]);
  const [favDisplayLimit, setFavDisplayLimit] = useState(24);
  const favSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubFavs = storageService.subscribe(setFavorites);
    const unsubListenLater = storageService.subscribeListenLater(setListenLaterItems);
    const unsubAudio = audioEngine.subscribe((state) => {
      setCurrentStationId(state.currentStation?.id || null);
      setActivePlayingStation(state.currentStation);
      setIsPlaying(state.isPlaying);
    });

    const unsubAuth = firebaseService.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch cloud favorites & sync with local
        const cloudFavs = await firebaseService.fetchFavoritesFromCloud();
        if (cloudFavs && cloudFavs.length > 0) {
          const localFavs = storageService.getFavorites();
          // Merge unique by station id
          const map = new Map<string, RadioStation>();
          localFavs.forEach(s => map.set(s.id, s));
          cloudFavs.forEach(s => map.set(s.id, s));
          const merged = Array.from(map.values());
          storageService.saveFavorites(merged);
        }
      }
    });

    return () => {
      unsubAudio();
      unsubAuth();
      unsubFavs();
      unsubListenLater();
    };
  }, []);

  const handlePlayListenLaterItem = (item: ListenLaterItem) => {
    triggerHaptic('selection');
    if (item.type === 'radio' && item.station) {
      audioEngine.playStation(item.station);
    } else if (item.type === 'podcast_episode' && item.episode) {
      const dummyShow = item.show || {
        id: item.episode.showId || 'podcast_show',
        name: item.subtitle || 'Podcast Episode',
        genre: 'Podcast',
        country: 'Global',
        streamUrl: item.episode.audioUrl,
        imageUrl: item.imageUrl || item.episode.artworkUrl || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&q=80',
        bitrate: '128k',
        codec: 'MP3',
        isFavorite: false,
        artistName: item.subtitle,
        trackCount: 1,
        feedUrl: ''
      };
      audioEngine.playPodcastEpisode(dummyShow, item.episode);
    } else if (item.audioUrl) {
      const customStation: RadioStation = {
        id: item.id,
        name: item.title,
        genre: item.subtitle || 'Saved Item',
        country: 'Global',
        streamUrl: item.audioUrl,
        imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&q=80',
        bitrate: '128k',
        codec: 'MP3',
        isFavorite: false
      };
      audioEngine.playStation(customStation);
    }
  };

  const handleRemoveListenLater = (id: string) => {
    triggerHaptic('light');
    storageService.removeFromListenLater(id);
  };

  const handlePlayStation = (station: RadioStation) => {
    if (currentStationId === station.id) {
      audioEngine.togglePlay();
    } else {
      audioEngine.playStation(station);
    }
  };

  const handleToggleFavorite = async (station: RadioStation) => {
    storageService.toggleFavorite(station);
    const updated = storageService.getFavorites();
    setFavorites(updated);
    // Cloud sync
    await firebaseService.syncFavoritesToCloud(updated);
  };

  // Open Tag Manager Modal
  const handleOpenTagManager = (station: RadioStation) => {
    setEditingStation(station);
    setActiveStationTags(station.customTags ? [...station.customTags] : []);
    setNewTagInput('');
  };

  const handleAddTag = (tagToAdd?: string) => {
    const tag = (tagToAdd || newTagInput).trim();
    if (!tag) return;
    if (!activeStationTags.map(t => t.toLowerCase()).includes(tag.toLowerCase())) {
      setActiveStationTags([...activeStationTags, tag]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setActiveStationTags(activeStationTags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase()));
  };

  const handleSaveTags = async () => {
    if (!editingStation) return;
    const updatedList = storageService.setFavoriteTags(editingStation.id, activeStationTags);
    setFavorites(updatedList);
    await firebaseService.syncFavoritesToCloud(updatedList);
    setEditingStation(null);
  };

  // Compute all unique custom tags across all favorited stations
  const availableTags = useMemo(() => {
    const tagCountMap = new Map<string, number>();
    favorites.forEach(s => {
      if (Array.isArray(s.customTags)) {
        s.customTags.forEach(t => {
          const clean = t.trim();
          if (clean) {
            tagCountMap.set(clean, (tagCountMap.get(clean) || 0) + 1);
          }
        });
      }
    });
    return Array.from(tagCountMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [favorites]);

  const filteredFavorites = useMemo(() => {
    let list = [...favorites];
    // Filter by Custom Tag
    if (selectedTag !== 'All') {
      list = list.filter(s =>
        Array.isArray(s.customTags) && s.customTags.some(t => t.toLowerCase() === selectedTag.toLowerCase())
      );
    }
    // Filter by Search text
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        (Array.isArray(s.customTags) && s.customTags.some(t => t.toLowerCase().includes(q)))
      );
    }
    if (sortBy === 'alpha') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'recent_played') {
      list.sort((a, b) => (b.lastListenedTimestamp || 0) - (a.lastListenedTimestamp || 0));
    } else {
      // Preserve exact array state order for custom reordering & default chronological additions
    }
    return list;
  }, [favorites, searchQuery, selectedTag, sortBy]);

  useEffect(() => {
    setFavDisplayLimit(24);
  }, [selectedTag, searchQuery, sortBy]);

  useEffect(() => {
    if (favDisplayLimit >= filteredFavorites.length) return;
    const sentinel = favSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setFavDisplayLimit((prev) => prev + 24);
        }
      },
      { root: null, rootMargin: '350px', threshold: 0.01 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredFavorites.length, favDisplayLimit]);

  // Touch Swipe Gesture State for Tag Filter Cycling
  const favSwipeStartX = useRef<number | null>(null);
  const favSwipeEndX = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      const listCopy = [...favorites];
      const draggedItem = listCopy[dragIndex];
      listCopy.splice(dragIndex, 1);
      listCopy.splice(index, 0, draggedItem);
      setFavorites(listCopy);
      setDragIndex(index);
    }
  };

  const handleDragEnd = async () => {
    setDragIndex(null);
    triggerHaptic('medium');
    storageService.saveFavorites(favorites);
    try {
      await firebaseService.syncFavoritesToCloud(favorites);
    } catch (err) {
      console.warn('Failed to sync favorites order on drag end:', err);
    }
  };

  const handleFavTouchStart = (e: React.TouchEvent) => {
    favSwipeStartX.current = e.targetTouches[0].clientX;
    favSwipeEndX.current = null;
  };

  const handleFavTouchMove = (e: React.TouchEvent) => {
    favSwipeEndX.current = e.targetTouches[0].clientX;
  };

  const handleFavTouchEnd = () => {
    if (!favSwipeStartX.current || !favSwipeEndX.current) return;
    const diff = favSwipeStartX.current - favSwipeEndX.current;
    if (Math.abs(diff) > 60 && availableTags.length > 0) {
      const allTagOptions = ['All', ...availableTags.map(t => t[0])];
      const currentIndex = allTagOptions.indexOf(selectedTag);
      if (diff > 0) {
        // Swipe Left -> next tag filter
        const nextIndex = (currentIndex + 1) % allTagOptions.length;
        setSelectedTag(allTagOptions[nextIndex]);
        triggerHaptic('swipe');
      } else {
        // Swipe Right -> prev tag filter
        const prevIndex = (currentIndex - 1 + allTagOptions.length) % allTagOptions.length;
        setSelectedTag(allTagOptions[prevIndex]);
        triggerHaptic('swipe');
      }
    }
    favSwipeStartX.current = null;
    favSwipeEndX.current = null;
  };

  return (
    <div id="favorites-fragment-layout" className="lg:grid lg:grid-cols-12 lg:gap-6 xl:gap-8 items-start">
      {/* Master Favorites Fragment */}
      <div
        id="master-favorites-fragment"
        onTouchStart={handleFavTouchStart}
        onTouchMove={handleFavTouchMove}
        onTouchEnd={handleFavTouchEnd}
        className="lg:col-span-7 xl:col-span-8 space-y-6 pb-28 min-w-0"
      >
        {/* View Tab Selector: Favorites vs Listen Later */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--surface-main)]/60 border border-[var(--border-color)]">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewTab('favorites');
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              viewTab === 'favorites'
                ? 'bg-[var(--accent-primary)] text-black shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Heart className={`w-4 h-4 ${viewTab === 'favorites' ? 'fill-current text-black' : ''}`} />
            <span>Saved Favorites ({favorites.length})</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewTab('listen_later');
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              viewTab === 'listen_later'
                ? 'bg-[var(--accent-primary)] text-black shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Listen Later ({listenLaterItems.length})</span>
          </button>
        </div>

        {/* Tab 1: Saved Favorites */}
        {viewTab === 'favorites' && (
          <div className="space-y-6">
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500 fill-current" />
                    <span>Saved Favorites</span>
                  </h2>
                  {currentUser && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                      <Cloud className="w-3 h-3" />
                      <span>Cloud Synced</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 hidden sm:block">
                  {currentUser
                    ? 'Stored securely in Firebase Firestore with custom organizational tags and cross-device sync.'
                    : 'Instant offline access to your curated live broadcasts. Add custom tags to categorize stations.'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 sm:hidden">
                  {currentUser ? 'Synced securely with Cloud' : 'Offline local library'}
                </p>
              </div>

              <button
                onClick={onOpenAddStation}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-black text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom URL</span>
              </button>
            </div>

      {favorites.length > 0 && (
        <>
          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            {/* Search within Favorites */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder={t('search_favorites_placeholder', 'Search favorites by name, genre or tag...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] shadow-md shadow-black/10"
              />
            </div>

            {/* Sort Dropdown Selector */}
            <div className="relative shrink-0 flex items-center">
              <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--accent-primary)] pointer-events-none z-10" />
              <select
                id="favorites-sort-select"
                value={sortBy}
                onChange={(e) => {
                  triggerHaptic('selection');
                  setSortBy(e.target.value as any);
                }}
                className="pl-10 pr-9 py-3 sm:py-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] hover:border-white/20 shadow-md shadow-black/10 transition-colors cursor-pointer appearance-none focus:outline-none focus:border-[var(--accent-primary)] z-0 min-h-[44px]"
              >
                <option value="date_added" className="bg-zinc-950 text-white">Date Added</option>
                <option value="alpha" className="bg-zinc-950 text-white">Name (A-Z)</option>
                <option value="recent_played" className="bg-zinc-950 text-white">Recently Played</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-[var(--text-muted)]">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Drag & Drop Reorder Tip banner */}
          {sortBy === 'date_added' && selectedTag === 'All' && !searchQuery.trim() && favorites.length > 1 && (
            <div className="text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 p-2 rounded-xl flex items-center gap-1.5 animate-fadeIn">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Drag & drop any card below to manually reorder your favorites.</span>
            </div>
          )}

          {/* Custom Tag Filter Ribbon */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1 shrink-0 mr-1">
              <Tag className="w-3 h-3 text-purple-400" />
              <span>Tags:</span>
            </span>

            {/* 'All' tag button */}
            <button
              onClick={() => setSelectedTag('All')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedTag === 'All'
                  ? 'bg-[var(--accent-primary)] text-black shadow-sm'
                  : 'bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-white hover:bg-white/10'
              }`}
            >
              All ({favorites.length})
            </button>

            {/* User Custom Tags */}
            {availableTags.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? 'All' : tag)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  selectedTag === tag
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/25'
                    : 'bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20'
                }`}
              >
                <span>#{tag}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedTag === tag ? 'bg-black/20 text-white' : 'bg-purple-500/20 text-purple-200'}`}>
                  {count}
                </span>
              </button>
            ))}

            {availableTags.length === 0 && (
              <span className="text-[11px] text-[var(--text-muted)] italic">
                Tip: Click the tag icon on any station to add custom tags (e.g. Work, Chill, Morning)
              </span>
            )}
          </div>
        </>
      )}

      {/* Grid of Favorites */}
      {filteredFavorites.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface-main)] rounded-2xl border border-[var(--border-color)] p-8">
          <Heart className="w-12 h-12 mx-auto text-rose-500/40 mb-3" />
          <h4 className="text-base font-bold text-[var(--text-primary)]">
            {selectedTag !== 'All' ? `No stations tagged with "#${selectedTag}"` : 'No favorites found'}
          </h4>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
            {selectedTag !== 'All'
              ? 'Try selecting "All" or tagging more stations with this category.'
              : 'Tap the heart icon on any radio station to keep your top stations here.'}
          </p>
          {selectedTag !== 'All' ? (
            <button
              onClick={() => setSelectedTag('All')}
              className="mt-4 px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] text-black text-xs font-bold hover:opacity-90 cursor-pointer shadow-md"
            >
              Show All Favorites
            </button>
          ) : (
            <button
              onClick={onNavigateRadio}
              className="mt-4 px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] text-black text-xs font-bold hover:opacity-90 cursor-pointer shadow-md"
            >
              Browse Live Radio
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 w-full animate-fadeIn">
            {filteredFavorites.slice(0, favDisplayLimit).map((station, index) => {
              const isCurrentlyDragging = dragIndex === index;
              const isReorderable = sortBy === 'date_added' && selectedTag === 'All' && !searchQuery.trim() && favorites.length > 1;
              return (
                <div
                  key={`fav_${station.id}`}
                  className={`w-full transition-all duration-200 ${
                    isCurrentlyDragging ? 'opacity-30 border-2 border-dashed border-[var(--accent-primary)] rounded-2xl scale-95' : 'opacity-100'
                  }`}
                  draggable={isReorderable}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <StationCard
                    station={station}
                    isPlaying={isPlaying}
                    isCurrent={currentStationId === station.id}
                    onPlay={handlePlayStation}
                    onToggleFavorite={handleToggleFavorite}
                    onSetAlarm={onSetAlarm}
                    onShare={onShareStation}
                    onEditTags={handleOpenTagManager}
                  />
                </div>
              );
            })}
          </div>

          {/* Sentinel for infinite scroll */}
          {favDisplayLimit < filteredFavorites.length && (
            <div ref={favSentinelRef} className="py-4 text-center">
              <button
                onClick={() => setFavDisplayLimit((prev) => prev + 24)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
              >
                Showing {favDisplayLimit} of {filteredFavorites.length} favorites — Scroll to load more
              </button>
            </div>
          )}
        </>
      )}
          </div>
        )}

        {/* Tab 2: Listen Later Queue */}
        {viewTab === 'listen_later' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Read / Listen Later Queue</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                  {listenLaterItems.length}
                </span>
              </div>
              {listenLaterItems.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all saved items in your Listen Later queue?')) {
                      triggerHaptic('medium');
                      storageService.clearListenLaterQueue();
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Queue</span>
                </button>
              )}
            </div>

            {listenLaterItems.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-3xl bg-[var(--surface-main)]/40 border border-[var(--border-color)] text-center flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Your Listen Later Queue is Empty</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
                  Save specific radio segments, live channels, or podcast episodes to your secondary Read/Listen Later list to catch up anytime.
                </p>
                <button
                  onClick={onNavigateRadio}
                  className="mt-2 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-black font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2 shadow-md"
                >
                  <Radio className="w-4 h-4" />
                  <span>Explore Channels</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {listenLaterItems.map((item) => {
                  const isCurrentPlaying = (currentStationId === item.station?.id || audioEngine.getState().currentEpisode?.id === item.episode?.id) && isPlaying;
                  return (
                    <div
                      key={item.id}
                      className="group relative p-3.5 rounded-2xl bg-[var(--surface-main)]/70 hover:bg-[var(--surface-main)]/95 border border-[var(--border-color)] hover:border-amber-500/30 transition-all duration-300 shadow-lg shadow-black/20 flex items-center gap-3.5 min-w-0"
                    >
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/10">
                        <img
                          src={item.imageUrl || item.station?.imageUrl || item.episode?.artworkUrl || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&q=80'}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <button
                          onClick={() => handlePlayListenLaterItem(item)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                        >
                          {isCurrentPlaying ? (
                            <Pause className="w-6 h-6 text-amber-300 fill-current drop-shadow-md" />
                          ) : (
                            <Play className="w-6 h-6 text-white fill-current drop-shadow-md" />
                          )}
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-bold tracking-wider uppercase border border-amber-500/20">
                            {item.type === 'podcast_episode' ? 'Episode' : 'Radio Stream'}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            {new Date(item.addedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-amber-300 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handlePlayListenLaterItem(item)}
                          className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                            isCurrentPlaying
                              ? 'bg-amber-500 text-black shadow-md'
                              : 'bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-black'
                          }`}
                          title={isCurrentPlaying ? 'Pause' : 'Play Now'}
                        >
                          {isCurrentPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>
                        <button
                          onClick={() => handleRemoveListenLater(item.id)}
                          className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove from Queue"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {/* Custom Tag Management Modal Dialog */}
      {editingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[var(--surface-main)] rounded-2xl border border-[var(--border-color)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Manage Custom Tags</h3>
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[240px]">
                    {editingStation.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingStation(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Active Tags */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                Active Tags on this Station
              </label>
              {activeStationTags.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic bg-white/5 p-3 rounded-xl border border-white/5">
                  No tags added yet. Choose from quick suggestions below or type your own.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {activeStationTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-xs font-semibold text-purple-200"
                    >
                      <span>#{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="p-0.5 hover:text-white text-purple-300 rounded hover:bg-purple-500/30 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Input for adding new tag */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                Add New Tag
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Work, Chill, Morning..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                />
                <button
                  onClick={() => handleAddTag()}
                  disabled={!newTagInput.trim()}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Quick Suggestions */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                Quick Suggestions
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TAG_SUGGESTIONS.map((preset) => {
                  const isAdded = activeStationTags.map(t => t.toLowerCase()).includes(preset.toLowerCase());
                  return (
                    <button
                      key={preset}
                      disabled={isAdded}
                      onClick={() => handleAddTag(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        isAdded
                          ? 'bg-white/5 text-slate-500 border border-transparent cursor-not-allowed'
                          : 'bg-white/5 hover:bg-purple-500/20 border border-white/10 text-slate-300 hover:text-purple-200 cursor-pointer'
                      }`}
                    >
                      + #{preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setEditingStation(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTags}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Tags & Sync</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Scroll to Top Navigation */}
      <ScrollToTopButton />
      </div>

      {/* Detail Fragment: Live Now Playing Studio (Tablet & Desktop) */}
      <div id="favorites-detail-studio-fragment" className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20 h-[calc(100vh-6.5rem)] min-h-[580px]">
        <NowPlayingStudioFragment
          station={activePlayingStation}
          isPlaying={isPlaying}
          onPlay={(st) => audioEngine.playStation(st)}
          onToggleFavorite={async (st) => {
            storageService.toggleFavorite(st);
            await firebaseService.syncFavoritesToCloud(storageService.getFavorites());
          }}
          onShare={onShareStation}
          onSetAlarm={onSetAlarm}
          onOpenEqualizer={onOpenEqualizer || (() => {})}
          onOpenSleepTimer={onOpenSleepTimer || (() => {})}
          onOpenCarMode={onOpenCarMode || (() => {})}
          onOpenScreensaver={onOpenScreensaver || (() => {})}
          onOpenFullPlayer={onOpenFullPlayer || (() => {})}
          suggestedStations={favorites.filter(f => f.id !== activePlayingStation?.id).slice(0, 4)}
        />
      </div>
    </div>
  );
};
