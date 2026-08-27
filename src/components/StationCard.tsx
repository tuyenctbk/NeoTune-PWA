import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, Heart, MoreVertical, Bell, ShieldAlert, Share2, 
  ExternalLink, Bookmark, BookmarkCheck, Tag, Globe, Gauge, Cpu, 
  ChevronDown, ChevronUp, Link as LinkIcon, Sparkles, FileText, 
  Volume2, Check, Sliders, Info, X
} from 'lucide-react';
import { RadioStation } from '../types';
import { storageService } from '../services/storageService';
import { audioEngine } from '../services/audioEngine';
import { triggerHaptic } from '../utils/haptics';
import { shareContent, createStationShareData } from '../utils/shareHelper';

interface StationCardProps {
  station: RadioStation;
  isPlaying: boolean;
  isCurrent: boolean;
  onPlay: (station: RadioStation) => void;
  onToggleFavorite: (station: RadioStation) => void;
  onToggleQueue?: (station: RadioStation) => void;
  isQueued?: boolean;
  onSetAlarm?: (station: RadioStation) => void;
  onBlockStation?: (station: RadioStation) => void;
  onShare?: (station: RadioStation) => void;
  onEditTags?: (station: RadioStation) => void;
  isCompact?: boolean;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  isPlaying,
  isCurrent,
  onPlay,
  onToggleFavorite,
  onToggleQueue,
  isQueued = false,
  onSetAlarm,
  onBlockStation,
  onShare,
  onEditTags,
  isCompact = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Custom Station Note State
  const [stationNote, setStationNote] = useState<string>(() => storageService.getStationNote(station.id));
  const [noteInput, setNoteInput] = useState<string>(() => storageService.getStationNote(station.id));
  const [noteSavedAlert, setNoteSavedAlert] = useState(false);

  // Per-Station Loudness Normalization Override State
  const [loudnessOverride, setLoudnessOverride] = useState<'default' | 'enabled' | 'disabled'>(
    () => storageService.getStationLoudnessOverride(station.id)
  );

  // Station Mood Tags State
  const [stationTags, setStationTags] = useState<string[]>(() => storageService.getStationTags(station.id));
  const [showTagEditor, setShowTagEditor] = useState<boolean>(false);
  const [customTagInput, setCustomTagInput] = useState<string>('');

  // Listen Later State
  const [isInListenLaterQueue, setIsInListenLaterQueue] = useState<boolean>(() => storageService.isInListenLater(station.id));

  useEffect(() => {
    const unsub = storageService.subscribeListenLater((queue) => {
      setIsInListenLaterQueue(queue.some(i => i.id === station.id || i.station?.id === station.id || i.audioUrl === station.streamUrl));
    });
    return unsub;
  }, [station.id, station.streamUrl]);

  const handleToggleListenLater = () => {
    triggerHaptic('selection');
    if (onToggleQueue) {
      onToggleQueue(station);
    } else {
      storageService.toggleListenLater({
        type: 'radio',
        title: station.name,
        subtitle: station.genre || 'Live Stream',
        audioUrl: station.streamUrl,
        imageUrl: station.imageUrl,
        station: station
      });
    }
  };

  const PRESET_MOOD_TAGS = ['Focus', 'Workout', 'Relax', 'Chill', 'Energy', 'Sleep', 'Morning', 'Jazz'];

  const handleToggleTag = (tag: string) => {
    triggerHaptic('selection');
    if (stationTags.includes(tag)) {
      const updated = storageService.removeStationTag(station.id, tag);
      setStationTags(updated);
    } else {
      const updated = storageService.addStationTag(station.id, tag);
      setStationTags(updated);
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTagInput.trim()) return;
    triggerHaptic('success');
    const updated = storageService.addStationTag(station.id, customTagInput.trim());
    setStationTags(updated);
    setCustomTagInput('');
  };

  const handleNativeShare = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowMenu(false);
    const payload = createStationShareData(station);
    const result = await shareContent(payload);
    if (result.success) {
      setShareFeedback(result.message);
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  useEffect(() => {
    const savedNote = storageService.getStationNote(station.id);
    setStationNote(savedNote);
    setNoteInput(savedNote);
    setLoudnessOverride(storageService.getStationLoudnessOverride(station.id));
  }, [station.id]);

  // Language detection helper
  const detectedLanguage = React.useMemo(() => {
    if ((station as any).language) {
      const l = String((station as any).language).trim();
      if (l) return l.charAt(0).toUpperCase() + l.slice(1);
    }
    const text = ((station.name || '') + ' ' + (station.genre || '') + ' ' + (station.country || '')).toLowerCase();
    if (station.countryCode) {
      const cc = station.countryCode.toUpperCase();
      if (['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'ZA'].includes(cc)) return 'English';
      if (['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'DO'].includes(cc)) return 'Spanish';
      if (['FR', 'BE', 'CH', 'SN', 'CI', 'CM'].includes(cc)) return 'French';
      if (['DE', 'AT', 'LI'].includes(cc)) return 'German';
      if (['IT', 'SM'].includes(cc)) return 'Italian';
      if (['VN'].includes(cc)) return 'Vietnamese';
      if (['JP'].includes(cc)) return 'Japanese';
      if (['BR', 'PT', 'AO', 'MZ'].includes(cc)) return 'Portuguese';
      if (['CN', 'TW', 'HK', 'SG'].includes(cc)) return 'Chinese';
      if (['RU', 'BY', 'KZ'].includes(cc)) return 'Russian';
      if (['NL'].includes(cc)) return 'Dutch';
      if (['PL'].includes(cc)) return 'Polish';
      if (['KR'].includes(cc)) return 'Korean';
      if (['TR'].includes(cc)) return 'Turkish';
      if (['SE', 'NO', 'DK', 'FI'].includes(cc)) return 'Nordic';
      if (['IN'].includes(cc)) return 'Hindi';
      if (['GR'].includes(cc)) return 'Greek';
      if (['TH'].includes(cc)) return 'Thai';
    }
    if (text.includes('english')) return 'English';
    if (text.includes('spanish') || text.includes('español')) return 'Spanish';
    if (text.includes('french') || text.includes('français')) return 'French';
    if (text.includes('german') || text.includes('deutsch')) return 'German';
    if (text.includes('vietnamese') || text.includes('tiếng việt')) return 'Vietnamese';
    if (text.includes('japanese')) return 'Japanese';
    if (text.includes('portuguese')) return 'Portuguese';
    if (text.includes('italian')) return 'Italian';
    if (text.includes('russian')) return 'Russian';
    return null;
  }, [station]);

  const fallbackArt = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80';

  const formattedBitrate = React.useMemo(() => {
    if (!station.bitrate) return '128k';
    const num = station.bitrate.replace(/\D/g, '');
    return num ? `${num}k` : station.bitrate;
  }, [station.bitrate]);

  const formattedCodec = React.useMemo(() => {
    return (station.codec || 'MP3').toUpperCase();
  }, [station.codec]);

  const isHQ = React.useMemo(() => {
    const num = parseInt((station.bitrate || '').replace(/\D/g, ''), 10);
    return num >= 192 || formattedCodec === 'AAC' || formattedCodec === 'FLAC';
  }, [station.bitrate, formattedCodec]);

  if (isCompact) {
    return (
      <div
        id={`compact_station_${station.id}`}
        className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all duration-200 tv-focusable backdrop-blur-xl shadow-sm gap-3 ${
          isCurrent
            ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/70 ring-1 ring-[var(--accent-primary)]/30'
            : 'bg-[var(--surface-main)]/70 border-[var(--border-color)] hover:border-white/20 hover:bg-[var(--surface-hover)]/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Smaller cover artwork */}
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0 shadow-sm">
            <img
              src={imgError || !station.imageUrl ? fallbackArt : station.imageUrl}
              alt={station.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
            {isCurrent && isPlaying ? (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-0.5">
                <span className="w-0.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
                <span className="w-0.5 bg-[var(--accent-secondary)] rounded-full animate-bounce" style={{ height: '90%', animationDelay: '150ms' }} />
              </div>
            ) : (
              <button
                onClick={() => {
                  triggerHaptic('play');
                  onPlay(station);
                }}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
          </div>

          {/* Title & Genre */}
          <div className="min-w-0 flex-1">
            <h4
              onClick={() => {
                triggerHaptic('play');
                onPlay(station);
              }}
              className={`text-xs font-bold truncate cursor-pointer hover:underline ${
                isCurrent ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {station.name}
            </h4>
            <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 flex items-center gap-1">
              {station.countryCode && (
                <span className="shrink-0 text-[10px]">{getFlag(station.countryCode)}</span>
              )}
              <span className="truncate">{station.genre || 'Live Stream'}</span>
            </p>
          </div>
        </div>

        {/* Specs and action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono">
            {formattedBitrate}
          </span>
          
          <button
            onClick={() => {
              triggerHaptic('favorite');
              onToggleFavorite(station);
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              station.isFavorite
                ? 'text-rose-500 hover:text-rose-600'
                : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${station.isFavorite ? 'fill-current' : ''}`} />
          </button>

          {/* Quick Play/Pause */}
          <button
            onClick={() => {
              triggerHaptic('play');
              if (isCurrent && isPlaying) {
                audioEngine.pause();
              } else {
                onPlay(station);
              }
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isCurrent
                ? 'bg-[var(--accent-primary)] text-black font-extrabold'
                : 'bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white'
            }`}
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex flex-col justify-between p-3 rounded-2xl border transition-all duration-200 tv-focusable backdrop-blur-xl shadow-sm ${
        isCurrent
          ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/70 ring-1 ring-[var(--accent-primary)]/30'
          : 'bg-[var(--surface-main)]/70 border-[var(--border-color)] hover:border-white/20 hover:bg-[var(--surface-hover)]/80'
      }`}
    >
      {/* Station Top Main Section */}
      <div className="flex items-start gap-3">
        {/* Cover Artwork */}
        <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shrink-0 shadow-md">
          <img
            src={imgError || !station.imageUrl ? fallbackArt : station.imageUrl}
            alt={station.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Active Equalizer Overlay */}
          {isCurrent && isPlaying ? (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-0.5">
              <span className="w-1 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
              <span className="w-1 bg-[var(--accent-secondary)] rounded-full animate-bounce" style={{ height: '90%', animationDelay: '150ms' }} />
              <span className="w-1 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ height: '40%', animationDelay: '300ms' }} />
            </div>
          ) : (
            <button
              onClick={() => {
                triggerHaptic('play');
                onPlay(station);
              }}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity bg-gradient-to-t from-black/80 to-transparent cursor-pointer"
              aria-label={`Play ${station.name}`}
            >
              <div className="p-1.5 rounded-full bg-[var(--accent-primary)] text-black shadow-lg">
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </div>
            </button>
          )}

          {/* Live Tag Pill */}
          <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-red-600/90 text-white text-[8px] font-bold uppercase tracking-wider">
            LIVE
          </div>
        </div>

        {/* Station Info: Full Name, Genre, Simplified Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h4
              onClick={() => {
                triggerHaptic('play');
                onPlay(station);
              }}
              className={`text-sm font-bold truncate cursor-pointer hover:underline flex-1 min-w-0 ${
                isCurrent ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'
              }`}
              title={station.name}
            >
              {station.name}
            </h4>

            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                setShowDetails(!showDetails);
              }}
              className={`p-1 rounded-lg transition-colors shrink-0 text-[var(--text-muted)] hover:text-white hover:bg-white/10 ${
                showDetails ? 'bg-white/10 text-[var(--accent-primary)]' : ''
              }`}
              title={showDetails ? 'Collapse Drawer' : 'Expand Station Drawer'}
              aria-label="Toggle Drawer"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDetails ? 'rotate-180 text-[var(--accent-primary)]' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5 flex items-center gap-1.5" title={station.genre}>
            {station.countryCode && (
              <span className="shrink-0 text-xs">{getFlag(station.countryCode)}</span>
            )}
            <span className="truncate">{station.genre || 'Live Stream'}</span>
          </p>

          {/* Clean Stream Specs & Tags (Single Clean Row) */}
          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] flex-wrap">
            {/* Format Pill (e.g. 128k MP3) */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono font-medium">
              <span>{formattedBitrate}</span>
              <span className="text-[9px] opacity-70">{formattedCodec}</span>
            </span>

            {/* HQ Badge if high bitrate */}
            {isHQ && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-300 font-bold text-[9px]">
                <Sparkles className="w-2.5 h-2.5" />
                <span>HQ</span>
              </span>
            )}

            {/* Language Tag if present */}
            {detectedLanguage && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-500/20 text-teal-300 font-semibold text-[9px] truncate max-w-[80px]">
                <Globe className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{detectedLanguage}</span>
              </span>
            )}

            {/* Custom Mood Tags Pills */}
            {stationTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[9px] font-bold"
              >
                <Tag className="w-2 h-2" />
                <span>{tag}</span>
              </span>
            ))}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                setShowTagEditor(!showTagEditor);
                setShowDetails(true);
              }}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white text-[9px] font-semibold transition-colors cursor-pointer"
              title="Add or Edit Mood Tags"
            >
              <Tag className="w-2.5 h-2.5" />
              <span>+ Tag</span>
            </button>
          </div>

          {/* Active Streaming Indicator */}
          {isCurrent && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400 font-medium animate-fadeIn">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="truncate font-semibold">Active Stream Playing</span>
            </div>
          )}

          {/* Custom Note Indicator if note exists */}
          {stationNote && !showDetails && (
            <div 
              onClick={() => setShowDetails(true)}
              className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-300/90 truncate cursor-pointer hover:underline"
              title={stationNote}
            >
              <FileText className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate italic">"{stationNote}"</span>
            </div>
          )}

          {/* Share Feedback Toast */}
          {shareFeedback && (
            <div className="mt-1.5 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold flex items-center gap-1 animate-fadeIn">
              <Check className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>{shareFeedback}</span>
            </div>
          )}
        </div>
      </div>

      {/* EXPANDABLE DETAILS & SETTINGS PANEL (Toggled via 3-dot menu or Details button) */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5 text-xs animate-fadeIn">
          {/* Header of details panel */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Station Details</span>
            </span>
            <button
              onClick={() => setShowDetails(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Details"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Custom Mood Tags Manager */}
          <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-purple-300">
              <span className="flex items-center gap-1 text-[11px]">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span>Custom Mood Tags</span>
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">{stationTags.length} tagged</span>
            </div>

            {/* Quick Mood Chips */}
            <div className="flex flex-wrap gap-1">
              {PRESET_MOOD_TAGS.map((tag) => {
                const isSelected = stationTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTag(tag);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-purple-500 text-black border-purple-400 shadow-sm'
                        : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <form onSubmit={handleAddCustomTag} className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="New mood tag (e.g. Study)..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400 min-w-0"
              />
              <button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                className="px-2.5 py-1 rounded-lg bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold hover:bg-purple-500/40 cursor-pointer shrink-0"
              >
                Add
              </button>
            </form>
          </div>

          {/* Custom Station Note Editor */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-white">
              <span className="flex items-center gap-1 text-[11px]">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Station Note</span>
              </span>
              {noteSavedAlert && <span className="text-[10px] text-emerald-400 font-bold animate-fadeIn">Saved!</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Add text note (e.g. Morning show at 8 AM)..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400 min-w-0"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('success');
                  storageService.saveStationNote(station.id, noteInput);
                  setStationNote(noteInput.trim());
                  setNoteSavedAlert(true);
                  setTimeout(() => setNoteSavedAlert(false), 2000);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/30 cursor-pointer shrink-0"
              >
                Save
              </button>
            </div>
          </div>

          {/* Loudness Normalization Override */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px] truncate">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">Loudness Norm:</span>
            </div>
            <select
              value={loudnessOverride}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                const mode = e.target.value as 'default' | 'enabled' | 'disabled';
                setLoudnessOverride(mode);
                storageService.setStationLoudnessOverride(station.id, mode);
                if (isCurrent) {
                  audioEngine.checkAndApplyStationNormalizeOverride(station);
                }
                triggerHaptic('selection');
              }}
              className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
            >
              <option value="default" className="bg-zinc-950 text-white">Default</option>
              <option value="enabled" className="bg-zinc-950 text-white">Force On</option>
              <option value="disabled" className="bg-zinc-950 text-white">Off</option>
            </select>
          </div>

          {/* Stream URL & Website links */}
          <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-1 text-[11px] text-[var(--text-muted)]">
            <div className="flex items-center justify-between">
              <span>Stream:</span>
              <span className="font-mono text-white font-medium">{formattedCodec} @ {formattedBitrate}</span>
            </div>
            {station.homepage && (
              <a
                href={station.homepage}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[11px] text-[var(--accent-primary)] hover:underline pt-0.5 font-semibold"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">Official Station Website</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* CARD FOOTER: SIMPLIFIED, CLEAN & NON-OVERLAPPING */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
        {/* Primary Action Button: Listen / Playing */}
        <button
          onClick={() => {
            triggerHaptic('medium');
            onPlay(station);
          }}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer min-h-[34px] truncate ${
            isCurrent && isPlaying
              ? 'bg-[var(--accent-primary)] text-black shadow-md'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {isCurrent && isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Playing</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current ml-0.5 shrink-0" />
              <span>Listen</span>
            </>
          )}
        </button>

        {/* Secondary Clean Action Buttons (Queue + Favorite + 3-Dot Menu) */}
        <div className="flex items-center gap-1 relative shrink-0">
          {/* Queue for Later Toggle Button */}
          <button
            onClick={handleToggleListenLater}
            className={`p-1.5 rounded-xl transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer ${
              isInListenLaterQueue || isQueued
                ? 'text-amber-400 hover:text-amber-300 bg-amber-500/15 border border-amber-500/30'
                : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
            }`}
            title={isInListenLaterQueue || isQueued ? 'Remove from Listen Later' : 'Save to Listen Later'}
            aria-label="Toggle Listen Later"
          >
            <Bookmark className={`w-4 h-4 ${isInListenLaterQueue || isQueued ? 'fill-current' : ''}`} />
          </button>

          {/* Favorite Toggle Button */}
          <button
            onClick={() => {
              triggerHaptic('favorite');
              onToggleFavorite(station);
            }}
            className={`p-1.5 rounded-xl transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer ${
              station.isFavorite
                ? 'text-rose-500 hover:text-rose-400 bg-rose-500/15 border border-rose-500/30'
                : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
            }`}
            title={station.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            aria-label="Toggle Favorite"
          >
            <Heart className={`w-4 h-4 ${station.isFavorite ? 'fill-current' : ''}`} />
          </button>

          {/* Drawer Expand Toggle Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowDetails(!showDetails);
            }}
            className={`p-1.5 rounded-xl transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer ${
              showDetails
                ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30'
                : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
            }`}
            title={showDetails ? 'Collapse Station Drawer' : 'Expand Station Drawer'}
            aria-label="Toggle Drawer"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
          </button>

          {/* 3-Dot Options Context Menu Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              setShowMenu(!showMenu);
            }}
            className={`p-1.5 rounded-xl transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer ${
              showMenu ? 'bg-white/20 text-white' : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
            }`}
            title="More Options"
            aria-label="Station Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu (Clean, Z-indexed, Non-overlapping) */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 bottom-full mb-1.5 z-40 w-52 rounded-2xl bg-[var(--surface-main)] border border-[var(--border-color)] p-1.5 shadow-2xl shadow-black/90 space-y-0.5 text-xs text-[var(--text-primary)] backdrop-blur-2xl animate-fadeIn"
              >
                {/* Quick Play */}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    triggerHaptic('play');
                    onPlay(station);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left font-bold text-[var(--accent-primary)] cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="truncate">{isCurrent && isPlaying ? 'Pause Playback' : 'Play Station'}</span>
                </button>

                {/* Queue for Later */}
                {onToggleQueue && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      triggerHaptic('selection');
                      onToggleQueue(station);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left text-[var(--text-primary)] cursor-pointer"
                  >
                    {isQueued ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Remove from Queue</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Queue for Later</span>
                      </>
                    )}
                  </button>
                )}

                {/* Custom Tags */}
                {onEditTags && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEditTags(station);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left text-[var(--text-primary)] cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="truncate">Manage Tags</span>
                  </button>
                )}

                {/* Wake Alarm */}
                {onSetAlarm && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      triggerHaptic('selection');
                      onSetAlarm(station);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left text-[var(--text-primary)] cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Set as Wake Alarm</span>
                  </button>
                )}

                {/* Share Station */}
                <button
                  onClick={() => {
                    handleNativeShare();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left text-[var(--text-primary)] cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">Share Station</span>
                </button>

                {/* Station Details & Notes Toggle */}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDetails(!showDetails);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left text-[var(--text-primary)] cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{showDetails ? 'Hide Details' : 'Details & Notes'}</span>
                </button>

                {/* Official Website */}
                {station.homepage && (
                  <a
                    href={station.homepage}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShowMenu(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left text-[var(--text-muted)] hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Official Website</span>
                  </a>
                )}

                {/* Block / Hide Station */}
                {onBlockStation && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onBlockStation(station);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-500/20 text-red-300 text-left font-semibold cursor-pointer border-t border-white/5 mt-1 pt-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="truncate">Block Station</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function getFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
