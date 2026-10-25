import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, RotateCw, Tv, Volume2, VolumeX, List, Music, Radio, Mic, ChevronRight, X, Clock } from 'lucide-react';
import { RadioStation, PodcastEpisode, PodcastShow, LyricsLine, PodcastChapter } from '../types';
import { audioEngine } from '../services/audioEngine';
import { apiService } from '../services/apiService';
import { VisualizerCanvas } from './VisualizerCanvas';
import { useTranslation } from '../services/i18n';

interface TVLeanbackViewProps {
  isOpen: boolean;
  onClose: () => void;
  stations: RadioStation[];
  onSelectStation: (station: RadioStation) => void;
}

export const TVLeanbackView: React.FC<TVLeanbackViewProps> = ({
  isOpen,
  onClose,
  stations,
  onSelectStation,
}) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [backdropUrl, setBackdropUrl] = useState<string>('');
  const [lyrics, setLyrics] = useState<LyricsLine[]>([]);
  const [activeLyricsIndex, setActiveLyricsIndex] = useState(-1);
  const [chapters, setChapters] = useState<PodcastChapter[]>([]);
  const [activeTab, setActiveTab] = useState<'now_playing' | 'stations' | 'lyrics'>('now_playing');

  // Audio Engine State Listener
  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setCurrentStation(state.currentStation);
      setCurrentEpisode(state.currentEpisode);
      setCurrentTime(state.currentTime);
      setDuration(state.duration);
      setIsMuted(state.isMuted);
    });
    return unsub;
  }, []);

  // Fetch 4K Visualizer Backdrop & LRCLIB Synced Lyrics / Chapters
  useEffect(() => {
    if (!isOpen) return;

    const title = currentEpisode?.title || currentStation?.name || 'Radio';
    const genre = currentStation?.genre || 'Music';
    
    // Fetch Backdrop
    apiService.getVisualizerBackdrop(title, genre).then((url) => {
      setBackdropUrl(url);
    });

    // Fetch LRCLIB Synced Lyrics if playing
    if (title && title !== 'Radio') {
      const artist = currentStation?.name || '';
      apiService.getSyncedLyrics(title, artist, duration).then((res) => {
        if (res && res.parsedLines && res.parsedLines.length > 0) {
          setLyrics(res.parsedLines);
        } else {
          setLyrics([]);
        }
      });
    } else {
      setLyrics([]);
    }

    // Fetch Podcast Chapters if episode playing
    if (currentEpisode && currentEpisode.chaptersUrl) {
      apiService.getPodcastChapters(currentEpisode.chaptersUrl).then((ch) => {
        setChapters(ch);
      });
    } else {
      setChapters([]);
    }
  }, [isOpen, currentStation?.id, currentEpisode?.id]);

  // Track Synced Lyrics highlighting
  useEffect(() => {
    if (lyrics.length === 0) {
      setActiveLyricsIndex(-1);
      return;
    }

    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].timeSec) {
        idx = i;
      } else {
        break;
      }
    }
    setActiveLyricsIndex(idx);

    // Auto-scroll active lyrics line
    if (idx >= 0 && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.children[idx] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, lyrics]);

  // D-Pad Remote Keyboard Control
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'BackSpace') {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        audioEngine.togglePlay();
      } else if (e.key === 'ArrowLeft') {
        if (currentEpisode) audioEngine.seek(Math.max(0, currentTime - 10));
      } else if (e.key === 'ArrowRight') {
        if (currentEpisode) audioEngine.seek(Math.min(duration || 3600, currentTime + 30));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentEpisode, currentTime, duration, onClose]);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const displayTitle = currentEpisode ? currentEpisode.title : (currentStation ? currentStation.name : 'NeoTune Radio');
  const displaySubtitle = currentEpisode ? (currentStation ? currentStation.name : 'Podcast Episode') : (currentStation ? `${currentStation.genre} • ${currentStation.country}` : 'Global Live Audio');
  const imageUrl = currentEpisode?.artworkUrl || currentStation?.imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col overflow-hidden animate-fadeIn font-sans">
      {/* Dynamic 4K Ambient Visualizer Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-105 filter brightness-40 blur-2xl opacity-60"
        style={{ backgroundImage: `url(${backdropUrl || imageUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />

      {/* Audio Spectrum Visualizer Layer */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <VisualizerCanvas skin="bars" />
      </div>

      {/* TV Leanback Header Bar */}
      <div className="relative z-10 px-12 py-8 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-pink-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Tv className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-pink-300">
              NeoTune Leanback TV
            </h1>
            <p className="text-sm font-medium text-cyan-300/80 tracking-widest uppercase">
              {t('tv_dpad_nav')}
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-3 bg-white/10 p-1.5 rounded-2xl border border-white/15">
          <button
            onClick={() => setActiveTab('now_playing')}
            className={`px-6 py-2.5 rounded-xl text-base font-bold transition-all focus:ring-4 focus:ring-cyan-400 ${
              activeTab === 'now_playing' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40' : 'text-white/70 hover:text-white'
            }`}
          >
            {t('full_player')}
          </button>
          <button
            onClick={() => setActiveTab('stations')}
            className={`px-6 py-2.5 rounded-xl text-base font-bold transition-all focus:ring-4 focus:ring-cyan-400 ${
              activeTab === 'stations' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40' : 'text-white/70 hover:text-white'
            }`}
          >
            {t('nav_radio')} ({stations.length})
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-6 py-2.5 rounded-xl text-base font-bold transition-all focus:ring-4 focus:ring-cyan-400 ${
              activeTab === 'lyrics' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40' : 'text-white/70 hover:text-white'
            }`}
          >
            {t('transcript_lyrics')}
          </button>
        </div>

        {/* Close / Exit Button */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 transition-all font-bold text-base focus:ring-4 focus:ring-red-400"
        >
          <X className="w-5 h-5" />
          <span>{t('exit_tv_mode')}</span>
        </button>
      </div>

      {/* Main Content Body */}
      <div className="relative z-10 flex-1 p-12 overflow-hidden flex items-center justify-center">
        {activeTab === 'now_playing' && (
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Artwork & Status */}
            <div className="lg:col-span-5 flex flex-col items-center text-center">
              <div className="relative group w-80 h-80 lg:w-96 lg:h-96 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/20 border-2 border-white/20">
                <img src={imageUrl} alt={displayTitle} className="w-full h-full object-cover" />
                {isPlaying && (
                  <div className="absolute top-4 right-4 bg-cyan-500 text-black font-black px-4 py-1.5 rounded-full text-sm uppercase tracking-widest animate-pulse shadow-lg">
                    {t('live')}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Title, Controls, Details */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-sm tracking-wider uppercase mb-3 border border-cyan-500/30">
                  {currentEpisode ? 'Podcast Episode' : 'Live Broadcast'}
                </span>
                <h2 className="text-4xl lg:text-5xl font-black text-white line-clamp-2 leading-tight">
                  {displayTitle}
                </h2>
                <p className="text-xl lg:text-2xl text-cyan-200/80 font-medium mt-2">
                  {displaySubtitle}
                </p>
              </div>

              {/* Progress bar if podcast episode */}
              {currentEpisode && (
                <div className="space-y-2">
                  <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-pink-500 h-full transition-all duration-300"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-base font-bold text-white/70">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              )}

              {/* Chapters list preview */}
              {chapters.length > 0 && (
                <div className="bg-white/10 rounded-2xl p-4 border border-white/15 max-h-36 overflow-y-auto space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-cyan-300 mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{t('chapters_title')} ({chapters.length})</span>
                  </div>
                  {chapters.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => audioEngine.seek(ch.startTimeSec)}
                      className="w-full text-left flex items-center justify-between text-sm py-1 px-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <span className="font-semibold text-white/90 truncate">{ch.title}</span>
                      <span className="text-xs text-cyan-300 font-mono ml-3">{formatTime(ch.startTimeSec)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* TV Remote Friendly Playback Controls */}
              <div className="flex items-center gap-6 pt-4">
                {currentEpisode && (
                  <button
                    onClick={() => audioEngine.seek(Math.max(0, currentTime - 10))}
                    className="p-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all focus:ring-4 focus:ring-cyan-400"
                  >
                    <RotateCcw className="w-8 h-8" />
                  </button>
                )}

                <button
                  onClick={() => audioEngine.togglePlay()}
                  className="p-7 rounded-3xl bg-gradient-to-br from-cyan-400 to-pink-500 text-black hover:scale-105 transition-all shadow-xl shadow-cyan-500/40 focus:ring-4 focus:ring-white"
                >
                  {isPlaying ? <Pause className="w-12 h-12 fill-current" /> : <Play className="w-12 h-12 fill-current ml-1" />}
                </button>

                {currentEpisode && (
                  <button
                    onClick={() => audioEngine.seek(Math.min(duration || 3600, currentTime + 30))}
                    className="p-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all focus:ring-4 focus:ring-cyan-400"
                  >
                    <RotateCw className="w-8 h-8" />
                  </button>
                )}

                <button
                  onClick={() => audioEngine.setMuted(!isMuted)}
                  className="p-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all focus:ring-4 focus:ring-cyan-400 ml-auto"
                >
                  {isMuted ? <VolumeX className="w-8 h-8 text-red-400" /> : <Volume2 className="w-8 h-8" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stations Selector Tab */}
        {activeTab === 'stations' && (
          <div className="w-full h-full max-w-6xl flex flex-col">
            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
              <Radio className="w-7 h-7 text-cyan-400" />
              <span>{t('top_global_stations')}</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pr-4 max-h-[65vh]">
              {stations.map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    onSelectStation(st);
                    setActiveTab('now_playing');
                  }}
                  className={`p-5 rounded-3xl bg-white/10 hover:bg-cyan-500/20 border transition-all text-left group focus:ring-4 focus:ring-cyan-400 flex flex-col items-center text-center ${
                    currentStation?.id === st.id ? 'border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/30' : 'border-white/10'
                  }`}
                >
                  <img src={st.imageUrl} alt={st.name} className="w-24 h-24 rounded-2xl object-cover mb-4 border border-white/20" />
                  <h4 className="text-lg font-bold text-white line-clamp-1 group-hover:text-cyan-300">{st.name}</h4>
                  <p className="text-sm text-cyan-200/70 line-clamp-1 mt-1">{st.genre}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Synced Lyrics / Transcript Tab */}
        {activeTab === 'lyrics' && (
          <div className="w-full h-full max-w-4xl flex flex-col items-center">
            <h3 className="text-2xl font-black text-cyan-300 mb-6 flex items-center gap-3">
              <Music className="w-7 h-7 text-pink-400" />
              <span>{t('synced_lyrics')}</span>
            </h3>
            {lyrics.length > 0 ? (
              <div 
                ref={lyricsContainerRef}
                className="w-full max-h-[60vh] overflow-y-auto space-y-6 text-center px-8 py-6 scroll-smooth"
              >
                {lyrics.map((line, idx) => (
                  <p
                    key={idx}
                    className={`text-2xl lg:text-3xl font-bold transition-all duration-300 cursor-pointer ${
                      idx === activeLyricsIndex
                        ? 'text-cyan-300 scale-110 drop-shadow-[0_0_20px_rgba(0,240,255,0.8)]'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                    onClick={() => audioEngine.seek(line.timeSec)}
                  >
                    {line.text}
                  </p>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-white/50">
                <Music className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-xl font-bold">{t('no_lyrics_found')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
