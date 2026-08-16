import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Heart, MoreVertical, Bell, ShieldAlert, Share2, Radio, ExternalLink, Bookmark, BookmarkCheck, Tag, Globe, Gauge, Cpu, ChevronDown, ChevronUp, Link as LinkIcon, Sparkles, FileText, QrCode, Volume2 } from 'lucide-react';
import { RadioStation } from '../types';
import { storageService } from '../services/storageService';
import { audioEngine } from '../services/audioEngine';
import { triggerHaptic } from '../utils/haptics';

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
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Custom Station Note State
  const [stationNote, setStationNote] = useState<string>(() => storageService.getStationNote(station.id));
  const [noteInput, setNoteInput] = useState<string>(() => storageService.getStationNote(station.id));
  const [noteSavedAlert, setNoteSavedAlert] = useState(false);

  // Per-Station Loudness Normalization Override State
  const [loudnessOverride, setLoudnessOverride] = useState<'default' | 'enabled' | 'disabled'>(
    () => storageService.getStationLoudnessOverride(station.id)
  );

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
      if (['IN'].includes(cc)) return 'Hindi / English';
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
    return station.countryCode ? station.countryCode.toUpperCase() : 'Global';
  }, [station]);

  // Touch Swipe Gesture State
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const fallbackArt = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80';

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 45;
    const isRightSwipe = distance < -45;

    if (isLeftSwipe || isRightSwipe) {
      triggerHaptic('swipe');
      setIsExpanded(prev => !prev);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`group relative flex flex-col justify-between p-3 rounded-2xl border transition-all duration-300 tv-focusable backdrop-blur-xl shadow-md shadow-black/20 ${
        isCurrent
          ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/70 shadow-[var(--accent-primary)]/15 ring-1 ring-[var(--accent-primary)]/30'
          : 'bg-[var(--surface-main)]/60 border-[var(--border-color)] hover:border-white/20 hover:bg-[var(--surface-hover)]/70'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Cover Artwork & Country Abbr Tag under Avatar */}
        <div className="flex flex-col items-center shrink-0 w-16">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/5">
            <img
              src={imgError || !station.imageUrl ? fallbackArt : station.imageUrl}
              alt={station.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            {/* Active Animated Playing Equalizer Indicator */}
            {isCurrent && isPlaying ? (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-1">
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
                <div className="p-2 rounded-full bg-[var(--accent-primary)] text-black shadow-lg">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
              </button>
            )}

            {/* Live Tag Pill */}
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-red-600/90 text-white text-[8px] font-bold uppercase tracking-wider">
              LIVE
            </div>
          </div>

          {/* Minimized Country Abbreviation Badge Under Avatar */}
          <span className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-[var(--text-muted)] max-w-[64px] truncate" title={`Country: ${station.country || 'Global'}`}>
            <span className="shrink-0">{station.countryCode ? getFlag(station.countryCode) : '🌐'}</span>
            <span className="truncate">{station.countryCode ? station.countryCode.toUpperCase() : (station.country ? station.country.slice(0, 3).toUpperCase() : 'GLB')}</span>
          </span>
        </div>

        {/* Station Info */}
        <div className="flex-1 min-w-0 pr-0.5">
          <div className="flex items-center justify-between gap-1">
            <h4
              onClick={() => {
                triggerHaptic('selection');
                setIsExpanded(!isExpanded);
              }}
              className={`text-sm font-bold truncate cursor-pointer hover:underline ${
                isCurrent ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {station.name}
            </h4>

            {/* Expand Toggle Chevron Button */}
            <button
              onClick={toggleExpand}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer shrink-0 ml-1"
              title={isExpanded ? 'Collapse station details' : 'Expand station actions & info'}
              aria-label="Toggle Expand Station"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
            {station.genre}
          </p>

          {/* Unified Reordered Tags Row (Max 2 Rows strictly) */}
          <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px] max-h-[3.2rem] overflow-hidden">
            {/* Bitrate Badge */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono font-semibold" title={`Bitrate: ${station.bitrate || '128 kbps'}`}>
              <Gauge className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{station.bitrate ? (station.bitrate.includes('k') ? station.bitrate : `${station.bitrate}k`) : '128k'}</span>
            </span>

            {/* Codec Badge */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono font-semibold uppercase" title={`Codec: ${station.codec || 'MP3'}`}>
              <Cpu className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{station.codec || 'MP3'}</span>
            </span>

            {/* Language Tag */}
            {detectedLanguage && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-500/20 border border-teal-500/30 text-teal-300 font-bold" title={`Primary Language: ${detectedLanguage}`}>
                <Globe className="w-2.5 h-2.5" />
                <span>{detectedLanguage}</span>
              </span>
            )}

            {/* High Quality Tag */}
            {(parseInt((station.bitrate || '').replace(/\D/g, ''), 10) >= 192 || (station.codec || '').toUpperCase() === 'AAC' || (station.codec || '').toUpperCase() === 'FLAC') && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold">
                <Sparkles className="w-2.5 h-2.5" />
                <span>HQ</span>
              </span>
            )}

            {/* Ad-Free Tag */}
            {((station.genre || '') + ' ' + (station.customTags || []).join(' ')).toLowerCase().match(/ad-free|no-ads|non-profit|public|community/) && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold">
                <span>Ad-Free</span>
              </span>
            )}

            {/* Local Tag */}
            {station.countryCode && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold">
                <span>Local</span>
              </span>
            )}
          </div>

          {/* Actual Stream Bitrate & Format Detected During Playback */}
          {isCurrent && (
            <div className="mt-2 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[10px] text-emerald-300 font-mono font-medium animate-fadeIn">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold">Detected Live Stream:</span>
              </div>
              <span>
                {station.bitrate ? (station.bitrate.includes('k') ? station.bitrate : `${station.bitrate} kbps`) : '128 kbps'} • {(station.codec || 'MP3').toUpperCase()}
              </span>
            </div>
          )}

          {/* Saved Custom Note Preview Badge */}
          {stationNote && (
            <div className="mt-2 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] flex items-start gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="italic line-clamp-1 truncate">{stationNote}</span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Tags Section if available */}
      {station.customTags && station.customTags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1">
          {station.customTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-[10px] font-semibold text-purple-300"
            >
              <Tag className="w-2.5 h-2.5 opacity-70" />
              <span>{tag}</span>
            </span>
          ))}
        </div>
      )}

      {/* EXPANDED ACTION & DETAILS DRAWER PANEL */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-3 animate-fadeIn">
          {/* Quick Direct Action Toolbar */}
          <div className="grid grid-cols-4 gap-2">
            {/* Direct Play Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(isCurrent && isPlaying ? 'pause' : 'play');
                onPlay(station);
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[50px] ${
                isCurrent && isPlaying
                  ? 'bg-[var(--accent-primary)] text-black shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isCurrent && isPlaying ? <Pause className="w-4 h-4 fill-current mb-0.5" /> : <Play className="w-4 h-4 fill-current ml-0.5 mb-0.5" />}
              <span className="text-[10px]">{isCurrent && isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            {/* Direct Favorite Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('favorite');
                onToggleFavorite(station);
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[50px] ${
                station.isFavorite
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Heart className={`w-4 h-4 mb-0.5 ${station.isFavorite ? 'fill-current text-rose-500' : ''}`} />
              <span className="text-[10px]">{station.isFavorite ? 'Saved' : 'Favorite'}</span>
            </button>

            {/* Direct Share / QR Code Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('selection');
                if (onShare) onShare(station);
              }}
              className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer min-h-[50px]"
            >
              <QrCode className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">QR / Share</span>
            </button>

            {/* Direct Alarm / Queue Button */}
            {onSetAlarm ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('selection');
                  onSetAlarm(station);
                }}
                className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer min-h-[50px]"
              >
                <Bell className="w-4 h-4 mb-0.5" />
                <span className="text-[10px]">Alarm</span>
              </button>
            ) : onToggleQueue ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('selection');
                  onToggleQueue(station);
                }}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[50px] ${
                  isQueued
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {isQueued ? <BookmarkCheck className="w-4 h-4 mb-0.5" /> : <Bookmark className="w-4 h-4 mb-0.5" />}
                <span className="text-[10px]">{isQueued ? 'Queued' : 'Queue'}</span>
              </button>
            ) : null}
          </div>

          {/* Custom Station Note Block */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-white">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Custom Station Note</span>
              </span>
              {noteSavedAlert && <span className="text-[10px] text-emerald-400 font-bold animate-fadeIn">Saved!</span>}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Add custom text note (e.g. Favorite show at 8 AM)..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400"
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
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/30 cursor-pointer shrink-0"
              >
                Save
              </button>
            </div>
          </div>

          {/* Loudness Normalization Override Selector */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Loudness Normalization:</span>
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
              className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer min-h-[44px] sm:min-h-[36px]"
            >
              <option value="default" className="bg-zinc-950 text-white">Default (Global)</option>
              <option value="enabled" className="bg-zinc-950 text-white">Force On</option>
              <option value="disabled" className="bg-zinc-950 text-white">Override Off</option>
            </select>
          </div>

          {/* Technical Station Details & Stream Source Link */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-[11px] text-[var(--text-muted)]">
            <div className="flex items-center justify-between">
              <span>Stream Format:</span>
              <span className="font-mono text-white font-semibold">{station.codec || 'MP3'} @ {station.bitrate || '128'} kbps</span>
            </div>
            {station.streamUrl && (
              <div className="flex items-center justify-between gap-2 overflow-hidden">
                <span className="shrink-0 flex items-center gap-1">
                  <LinkIcon className="w-3 h-3 text-cyan-400" />
                  <span>Stream URL:</span>
                </span>
                <span className="font-mono text-[10px] text-cyan-300 truncate max-w-[180px]" title={station.streamUrl}>
                  {station.streamUrl}
                </span>
              </div>
            )}
            {station.homepage && (
              <a
                href={station.homepage}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs text-[var(--accent-primary)] hover:underline pt-1 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Visit Official Radio Website</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Card Footer Actions */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs gap-1.5">
        <button
          onClick={() => {
            triggerHaptic('medium');
            onPlay(station);
          }}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs transition-colors min-h-[36px] cursor-pointer ${
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

        <div className="flex items-center gap-1 relative shrink-0">
          {/* Custom Tags Button if onEditTags provided */}
          {onEditTags && (
            <button
              onClick={() => onEditTags(station)}
              className="p-2 rounded-xl text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              title="Add / Edit Custom Tags"
            >
              <Tag className="w-4 h-4" />
            </button>
          )}

          {/* Quick Queue Toggle Button */}
          {onToggleQueue && (
            <button
              onClick={() => {
                triggerHaptic('selection');
                onToggleQueue(station);
              }}
              className={`p-2 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer ${
                isQueued
                  ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
              }`}
              title={isQueued ? 'In Queued for Later (Saved Offline)' : 'Queue for Later'}
            >
              {isQueued ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => {
              triggerHaptic('favorite');
              onToggleFavorite(station);
            }}
            className={`p-2 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer ${
              station.isFavorite
                ? 'text-rose-500 hover:text-rose-400 bg-rose-500/10'
                : 'text-[var(--text-muted)] hover:text-white hover:bg-white/10'
            }`}
            title={station.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
          >
            <Heart className={`w-4 h-4 ${station.isFavorite ? 'fill-current' : ''}`} />
          </button>

          {/* Expand Details Button */}
          <button
            onClick={toggleExpand}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
            title={isExpanded ? 'Hide Details' : 'Expand Details'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--accent-primary)]" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* 3-Dot Context Menu Toggle */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 bottom-8 z-30 w-56 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] p-2.5 shadow-2xl shadow-black/95 space-y-1 text-xs text-[var(--text-primary)] backdrop-blur-3xl">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    triggerHaptic('play');
                    onPlay(station);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-3 sm:py-2.5 rounded-xl hover:bg-white/10 text-left font-bold text-[var(--accent-primary)] cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="truncate">Quick Play</span>
                </button>

                {onEditTags && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEditTags(station);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-3 sm:py-2.5 rounded-xl hover:bg-white/10 text-left text-[var(--text-primary)]"
                  >
                    <Tag className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="truncate">Manage Custom Tags</span>
                  </button>
                )}

                {onToggleQueue && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onToggleQueue(station);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-3 sm:py-2.5 rounded-xl hover:bg-white/10 text-left text-[var(--text-primary)]"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{isQueued ? 'Remove from Queue' : 'Queue for Later'}</span>
                  </button>
                )}

                {onSetAlarm && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSetAlarm(station);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-3 sm:py-2.5 rounded-xl hover:bg-white/10 text-left text-[var(--text-primary)]"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Set as Wake Alarm</span>
                  </button>
                )}

                {onShare && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onShare(station);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-3 sm:py-2.5 rounded-xl hover:bg-white/10 text-left text-[var(--text-primary)]"
                  >
                    <Share2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">Share Station</span>
                  </button>
                )}

                {station.homepage && (
                  <a
                    href={station.homepage}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center gap-2.5 px-3.5 py-3 sm:py-2.5 rounded-xl hover:bg-white/10 text-left text-[var(--text-muted)]"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Official Website</span>
                  </a>
                )}

                {onBlockStation && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onBlockStation(station);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-3 sm:py-2.5 rounded-xl hover:bg-red-500/20 text-red-300 text-left font-semibold"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="truncate">Block / Hide Station</span>
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
