import React, { useState, useEffect } from 'react';
import { Play, Pause, AlertTriangle, Activity, Database, Music, Volume2, ShieldAlert, Bug, X } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

// Only show debug / dev dialog on preview or development screens; never in production unless explicitly requested with ?debug=true
const isDebugEnabledInEnv = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('debug') === 'true' || searchParams.get('dev') === 'true') {
      return true;
    }
  } catch {}

  if ((import.meta as any)?.env?.DEV) return true;

  const host = window.location.hostname || '';
  if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('ais-dev-')) {
    return true;
  }

  return false;
};

export const AudioDebuggerHUD: React.FC = () => {
  const isDebugAllowed = isDebugEnabledInEnv();
  const [isOpen, setIsOpen] = useState(false);
  const [audioState, setAudioState] = useState(() => audioEngine.getState());
  const [actualSrc, setActualSrc] = useState('');
  const [networkState, setNetworkState] = useState<number>(0);
  const [readyState, setReadyState] = useState<number>(0);

  useEffect(() => {
    if (!isDebugAllowed) return;

    const unsub = audioEngine.subscribe((state) => {
      setAudioState(state);
      // Access direct HTMLMediaElement states
      const audioEl = (audioEngine as any).audio;
      if (audioEl) {
        setActualSrc(audioEl.src || '');
        setNetworkState(audioEl.networkState);
        setReadyState(audioEl.readyState);
      }
    });

    const interval = setInterval(() => {
      const audioEl = (audioEngine as any).audio;
      if (audioEl) {
        setActualSrc(audioEl.src || '');
        setNetworkState(audioEl.networkState);
        setReadyState(audioEl.readyState);
      }
    }, 1000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [isDebugAllowed]);

  if (!isDebugAllowed) {
    return null;
  }

  const getNetworkStateString = (state: number) => {
    switch (state) {
      case 0: return 'NETWORK_EMPTY (Uninitialized)';
      case 1: return 'NETWORK_IDLE (Active/Idle)';
      case 2: return 'NETWORK_LOADING (Downloading)';
      case 3: return 'NETWORK_NO_SOURCE (Failed/No Source)';
      default: return 'UNKNOWN';
    }
  };

  const getReadyStateString = (state: number) => {
    switch (state) {
      case 0: return 'HAVE_NOTHING (No data)';
      case 1: return 'HAVE_METADATA (Metadata loaded)';
      case 2: return 'HAVE_CURRENT_DATA (Current pos available)';
      case 3: return 'HAVE_FUTURE_DATA (Can play next frame)';
      case 4: return 'HAVE_ENOUGH_DATA (Playable/Buffered)';
      default: return 'UNKNOWN';
    }
  };

  if (!isOpen) {
    return (
      <button
        id="debug-hud-toggle"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 bg-neutral-900/90 text-amber-500 hover:text-amber-400 p-2.5 rounded-xl border border-amber-500/30 hover:border-amber-500 shadow-lg transition-all duration-200 flex items-center gap-1.5 text-xs font-mono backdrop-blur-md"
        title="Toggle Audio Diagnostics HUD"
      >
        <Bug className="w-3.5 h-3.5 animate-pulse" />
        <span>Audio HUD</span>
      </button>
    );
  }

  return (
    <div
      id="debug-hud-panel"
      className="fixed bottom-24 right-4 z-50 w-80 max-w-full bg-neutral-950/95 border border-neutral-800 rounded-xl p-4 shadow-2xl backdrop-blur-md font-mono text-[10px] text-neutral-300 transition-all duration-200 select-none animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
        <div className="flex items-center gap-2 text-amber-500 font-bold">
          <Bug className="w-4 h-4" />
          <span>AUDIO DIAGNOSTICS</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-neutral-500 hover:text-neutral-300 p-0.5 rounded-md hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2.5">
        {/* Core Playback Status */}
        <div className="bg-neutral-900/60 p-2 rounded-lg border border-neutral-800/40">
          <div className="text-[9px] text-neutral-500 mb-1 font-bold uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span>Engine Core State</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">Playing:</span>
              <span className={`font-bold ${audioState.isPlaying ? 'text-emerald-500' : 'text-neutral-400'}`}>
                {audioState.isPlaying ? 'TRUE' : 'FALSE'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">Buffering:</span>
              <span className={`font-bold ${audioState.isBuffering ? 'text-amber-500 animate-pulse' : 'text-neutral-400'}`}>
                {audioState.isBuffering ? 'TRUE' : 'FALSE'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">Loading:</span>
              <span className={`font-bold ${audioState.isLoading ? 'text-blue-500' : 'text-neutral-400'}`}>
                {audioState.isLoading ? 'TRUE' : 'FALSE'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">Latency:</span>
              <span className="font-bold text-sky-400">
                {audioState.audioLatencyMs}ms
              </span>
            </div>
          </div>
        </div>

        {/* HTMLMediaElement Details */}
        <div className="bg-neutral-900/60 p-2 rounded-lg border border-neutral-800/40">
          <div className="text-[9px] text-neutral-500 mb-1 font-bold uppercase tracking-wider flex items-center gap-1">
            <Database className="w-3 h-3 text-sky-500" />
            <span>HTML5 Audio Element</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Network State:</span>
              <span className="text-sky-400 font-bold">{getNetworkStateString(networkState)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Ready State:</span>
              <span className="text-sky-400 font-bold">{getReadyStateString(readyState)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Context State:</span>
              <span className={`font-bold ${audioState.audioContextState === 'running' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {audioState.audioContextState.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Media Streams */}
        <div className="bg-neutral-900/60 p-2 rounded-lg border border-neutral-800/40">
          <div className="text-[9px] text-neutral-500 mb-1 font-bold uppercase tracking-wider flex items-center gap-1">
            <Music className="w-3 h-3 text-purple-500" />
            <span>Active Stream Info</span>
          </div>
          <div className="space-y-1 overflow-hidden">
            <div className="truncate">
              <span className="text-neutral-500">Station:</span>{' '}
              <span className="text-purple-400 font-bold">{audioState.currentStation?.name || 'None'}</span>
            </div>
            <div className="truncate">
              <span className="text-neutral-500">Title:</span>{' '}
              <span className="text-neutral-300">{audioState.currentTrackTitle || 'Unspecified'}</span>
            </div>
            <div className="mt-1 pt-1 border-t border-neutral-800/60">
              <span className="text-neutral-500 block mb-0.5">Underlying Media Source URL:</span>
              <div className="bg-black/40 p-1.5 rounded text-[8px] font-mono break-all max-h-12 overflow-y-auto select-text text-neutral-400 border border-neutral-800/40">
                {actualSrc || 'No audio src loaded'}
              </div>
            </div>
          </div>
        </div>

        {/* Engine Volume & Controls */}
        <div className="bg-neutral-900/60 p-2 rounded-lg border border-neutral-800/40">
          <div className="text-[9px] text-neutral-500 mb-1 font-bold uppercase tracking-wider flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-pink-500" />
            <span>Output Level</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-neutral-500">Volume:</span>
              <span className="text-neutral-300 font-bold">{Math.round(audioState.volume * 100)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-neutral-500">Muted:</span>
              <span className="text-neutral-300 font-bold">{audioState.isMuted ? 'YES' : 'NO'}</span>
            </div>
          </div>
        </div>

        {/* Error Console */}
        {audioState.error && (
          <div className="bg-rose-950/40 border border-rose-800/50 p-2 rounded-lg flex items-start gap-2 text-rose-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            <div>
              <div className="font-bold text-[9px] uppercase">Engine Exception Detected</div>
              <div className="text-[8px] leading-relaxed mt-0.5">{audioState.error}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-neutral-800 flex justify-between items-center text-[8px] text-neutral-500">
        <span>NeoTune Engine v1.4</span>
        <button
          onClick={() => audioEngine.forceRestart()}
          className="text-amber-500 hover:text-amber-400 font-bold uppercase flex items-center gap-1 hover:underline"
        >
          <Bug className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '3s' }} />
          <span>Force Reconnect</span>
        </button>
      </div>
    </div>
  );
};
