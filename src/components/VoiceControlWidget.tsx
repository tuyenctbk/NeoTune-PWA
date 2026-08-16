import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, Sparkles, HelpCircle, X, Check, Search, SkipForward, SkipBack, Moon } from 'lucide-react';
import { voiceControlService, VoiceRecognitionState } from '../services/voiceControlService';

interface VoiceControlWidgetProps {
  className?: string;
  onOpenSleepTimer?: () => void;
}

export const VoiceControlWidget: React.FC<VoiceControlWidgetProps> = ({
  className = '',
  onOpenSleepTimer
}) => {
  const [voiceState, setVoiceState] = useState<VoiceRecognitionState>(() => voiceControlService.getState());
  const [showHelp, setShowHelp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = voiceControlService.subscribe((state) => {
      setVoiceState(state);

      if (state.lastCommand && Date.now() - state.lastCommand.timestamp < 3000) {
        if (state.lastCommand.type === 'play') setToastMessage('▶ Resumed Playback');
        else if (state.lastCommand.type === 'pause') setToastMessage('⏸ Paused Playback');
        else if (state.lastCommand.type === 'next') setToastMessage('⏭ Next Station');
        else if (state.lastCommand.type === 'previous') setToastMessage('⏮ Previous Station');
        else if (state.lastCommand.type === 'volume_up') setToastMessage('🔊 Volume Increased');
        else if (state.lastCommand.type === 'volume_down') setToastMessage('🔉 Volume Decreased');
        else if (state.lastCommand.type === 'mute') setToastMessage('🔇 Muted Audio');
        else if (state.lastCommand.type === 'unmute') setToastMessage('🔊 Unmuted Audio');
        else if (state.lastCommand.type === 'search') setToastMessage(`🔍 Searching: "${state.lastCommand.target}"`);
        else if (state.lastCommand.type === 'favorite') setToastMessage('⭐ Station Saved to Favorites');
        else if (state.lastCommand.type === 'sleep_timer') {
          setToastMessage('🌙 Sleep Timer Opened');
          if (onOpenSleepTimer) onOpenSleepTimer();
        }

        const timer = setTimeout(() => setToastMessage(null), 3000);
        return () => clearTimeout(timer);
      }
    });

    return unsub;
  }, [onOpenSleepTimer]);

  if (!voiceState.isSupported) {
    return null;
  }

  const handleToggleMic = () => {
    voiceControlService.toggleListening();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Real-time Recognition Speech Feedback Pill */}
      {voiceState.isListening && (voiceState.transcript || voiceState.interimTranscript || toastMessage) && (
        <div className="absolute bottom-full right-0 mb-3 w-64 sm:w-72 p-3 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-cyan-500/40 shadow-2xl shadow-cyan-500/20 text-xs space-y-1.5 animate-fadeIn z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Voice Listening</span>
            </div>
            <button
              onClick={() => voiceControlService.stopListening()}
              className="text-zinc-400 hover:text-white p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {toastMessage ? (
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 font-semibold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-cyan-300" />
              <span>{toastMessage}</span>
            </div>
          ) : (
            <p className="text-zinc-200 italic font-mono text-[11px] break-words">
              "{voiceState.interimTranscript || voiceState.transcript || 'Listening for commands...'}"
            </p>
          )}
        </div>
      )}

      {/* Voice Control Mic Toggle Button */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleToggleMic}
          className={`relative p-2.5 sm:px-3 sm:py-2 rounded-2xl border flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
            voiceState.isListening
              ? 'bg-gradient-to-r from-red-500 to-rose-600 border-red-400 text-white shadow-red-500/40 scale-105 animate-pulse ring-2 ring-red-400/50'
              : 'bg-[var(--surface-main)] hover:bg-[var(--surface-hover)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-cyan-400/40'
          }`}
          title={voiceState.isListening ? 'Stop Voice Control' : 'Start Voice Control'}
        >
          {voiceState.isListening ? (
            <>
              <Mic className="w-4 h-4 text-white animate-bounce" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Listening</span>
            </>
          ) : (
            <>
              <MicOff className="w-4 h-4 text-[var(--text-muted)] hover:text-cyan-400" />
              <span className="hidden sm:inline text-xs font-semibold text-[var(--text-muted)]">Voice</span>
            </>
          )}
        </button>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-white/5 transition-colors"
          title="Voice Control Guide"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Voice Commands Cheat Sheet Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--surface-main)]/95 backdrop-blur-2xl border border-white/15 p-6 shadow-2xl shadow-black/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Voice Commands Layer</h3>
                  <p className="text-xs text-[var(--text-muted)]">Hands-free playback controls via Web Speech</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="font-semibold text-white">"Play" / "Resume"</span>
                <span className="text-[var(--text-muted)]">Starts or resumes radio stream</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="font-semibold text-white">"Pause" / "Stop"</span>
                <span className="text-[var(--text-muted)]">Pauses active playback</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="font-semibold text-white">"Next Station" / "Skip"</span>
                <span className="text-[var(--text-muted)]">Switches to next station in list</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="font-semibold text-white">"Volume Up" / "Volume Down"</span>
                <span className="text-[var(--text-muted)]">Adjusts audio loudness ±15%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="font-semibold text-white">"Mute" / "Unmute"</span>
                <span className="text-[var(--text-muted)]">Toggles instant audio mute</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="font-semibold text-white">"Search [genre / name]"</span>
                <span className="text-[var(--text-muted)]">e.g. "Search Jazz", "Play Lofi"</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="font-semibold text-white">"Favorite" / "Bookmark"</span>
                <span className="text-[var(--text-muted)]">Saves current station to favorites</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="font-semibold text-white">"Sleep Timer"</span>
                <span className="text-[var(--text-muted)]">Opens sleep timer fade-out modal</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-black font-bold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
