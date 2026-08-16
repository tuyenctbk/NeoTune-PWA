import { audioEngine } from './audioEngine';
import { storageService } from './storageService';
import { RadioStation } from '../types';

export type VoiceCommandType =
  | 'play'
  | 'pause'
  | 'next'
  | 'previous'
  | 'volume_up'
  | 'volume_down'
  | 'mute'
  | 'unmute'
  | 'search'
  | 'favorite'
  | 'sleep_timer'
  | 'unknown';

export interface VoiceRecognitionState {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  lastCommand: {
    type: VoiceCommandType;
    text: string;
    target?: string;
    timestamp: number;
  } | null;
  errorMessage: string | null;
}

type VoiceCallback = (state: VoiceRecognitionState) => void;

class VoiceControlService {
  private recognition: any = null;
  private isListening = false;
  private transcript = '';
  private interimTranscript = '';
  private lastCommand: VoiceRecognitionState['lastCommand'] = null;
  private errorMessage: string | null = null;
  private listeners: Set<VoiceCallback> = new Set();
  private onStationChangeHandler?: (action: 'next' | 'prev') => void;
  private onSearchHandler?: (query: string) => void;
  private onToggleFavoriteHandler?: () => void;
  private onOpenSleepTimerHandler?: () => void;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.errorMessage = 'Web Speech API is not supported in this browser.';
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.errorMessage = null;
        this.notify();
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += trans;
          } else {
            interim += trans;
          }
        }

        this.interimTranscript = interim;
        if (final) {
          this.transcript = final.trim();
          this.processCommand(final.trim().toLowerCase());
        }
        this.notify();
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Normal timeout when quiet, ignore
          return;
        }
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          this.errorMessage = 'Microphone permission denied. Please allow microphone access.';
          this.isListening = false;
        } else if (event.error === 'network') {
          this.errorMessage = 'Network connection error for speech recognition.';
        }
        this.notify();
      };

      this.recognition.onend = () => {
        // If we want to stay listening continuously, restart if still active
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch {
            this.isListening = false;
            this.notify();
          }
        } else {
          this.isListening = false;
          this.notify();
        }
      };
    } catch (e: any) {
      console.warn('Failed to initialize speech recognition:', e);
      this.errorMessage = e.message || 'Speech initialization error';
    }
  }

  public registerHandlers(handlers: {
    onStationChange?: (action: 'next' | 'prev') => void;
    onSearch?: (query: string) => void;
    onToggleFavorite?: () => void;
    onOpenSleepTimer?: () => void;
  }) {
    if (handlers.onStationChange) this.onStationChangeHandler = handlers.onStationChange;
    if (handlers.onSearch) this.onSearchHandler = handlers.onSearch;
    if (handlers.onToggleFavorite) this.onToggleFavoriteHandler = handlers.onToggleFavorite;
    if (handlers.onOpenSleepTimer) this.onOpenSleepTimerHandler = handlers.onOpenSleepTimer;
  }

  public startListening() {
    if (!this.recognition) {
      this.initRecognition();
    }
    if (!this.recognition) {
      this.errorMessage = 'Speech Recognition is not available in your browser.';
      this.notify();
      return;
    }

    try {
      this.isListening = true;
      this.errorMessage = null;
      this.recognition.start();
      this.speakFeedback('Voice control active');
    } catch (e: any) {
      // Already running
      this.isListening = true;
    }
    this.notify();
  }

  public stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.notify();
  }

  public toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  public getState(): VoiceRecognitionState {
    const isSupported =
      typeof window !== 'undefined' &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    return {
      isSupported,
      isListening: this.isListening,
      transcript: this.transcript,
      interimTranscript: this.interimTranscript,
      lastCommand: this.lastCommand,
      errorMessage: this.errorMessage,
    };
  }

  public subscribe(cb: VoiceCallback): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }

  private speakFeedback(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 0.6;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  private processCommand(rawText: string) {
    const text = rawText.toLowerCase().trim();

    // 1. Play / Resume Commands
    if (
      text === 'play' ||
      text === 'resume' ||
      text === 'start' ||
      text === 'unpause' ||
      text === 'play radio' ||
      text === 'continue'
    ) {
      audioEngine.resume();
      this.recordCommand('play', rawText);
      this.speakFeedback('Playing radio');
      return;
    }

    // 2. Pause / Stop Commands
    if (
      text === 'pause' ||
      text === 'stop' ||
      text === 'halt' ||
      text === 'quiet' ||
      text === 'shut up' ||
      text === 'pause radio'
    ) {
      audioEngine.pause();
      this.recordCommand('pause', rawText);
      this.speakFeedback('Paused');
      return;
    }

    // 3. Next Station / Skip Commands
    if (
      text.includes('next') ||
      text.includes('skip') ||
      text.includes('next station') ||
      text.includes('change station')
    ) {
      if (this.onStationChangeHandler) {
        this.onStationChangeHandler('next');
      }
      this.recordCommand('next', rawText);
      this.speakFeedback('Next station');
      return;
    }

    // 4. Previous Station Commands
    if (
      text.includes('previous') ||
      text.includes('prev') ||
      text.includes('go back') ||
      text.includes('previous station') ||
      text.includes('last station')
    ) {
      if (this.onStationChangeHandler) {
        this.onStationChangeHandler('prev');
      }
      this.recordCommand('previous', rawText);
      this.speakFeedback('Previous station');
      return;
    }

    // 5. Volume Up Commands
    if (
      text.includes('volume up') ||
      text.includes('louder') ||
      text.includes('turn up') ||
      text.includes('increase volume') ||
      text.includes('more volume')
    ) {
      const currentVol = audioEngine.getVolume();
      const newVol = Math.min(1, currentVol + 0.15);
      audioEngine.setVolume(newVol);
      this.recordCommand('volume_up', rawText);
      this.speakFeedback(`Volume ${Math.round(newVol * 100)} percent`);
      return;
    }

    // 6. Volume Down Commands
    if (
      text.includes('volume down') ||
      text.includes('quieter') ||
      text.includes('softer') ||
      text.includes('turn down') ||
      text.includes('lower volume') ||
      text.includes('decrease volume') ||
      text.includes('less volume')
    ) {
      const currentVol = audioEngine.getVolume();
      const newVol = Math.max(0, currentVol - 0.15);
      audioEngine.setVolume(newVol);
      this.recordCommand('volume_down', rawText);
      this.speakFeedback(`Volume ${Math.round(newVol * 100)} percent`);
      return;
    }

    // 7. Mute Command
    if (text === 'mute' || text === 'silence') {
      audioEngine.setMuted(true);
      this.recordCommand('mute', rawText);
      this.speakFeedback('Muted');
      return;
    }

    // 8. Unmute Command
    if (text === 'unmute' || text === 'sound on') {
      audioEngine.setMuted(false);
      this.recordCommand('unmute', rawText);
      this.speakFeedback('Unmuted');
      return;
    }

    // 9. Favorite / Bookmark Command
    if (
      text.includes('favorite') ||
      text.includes('like') ||
      text.includes('bookmark') ||
      text.includes('save station')
    ) {
      if (this.onToggleFavoriteHandler) {
        this.onToggleFavoriteHandler();
      }
      this.recordCommand('favorite', rawText);
      this.speakFeedback('Station saved to favorites');
      return;
    }

    // 10. Sleep Timer Command
    if (text.includes('sleep timer') || text.includes('set timer') || text.includes('bedtime')) {
      if (this.onOpenSleepTimerHandler) {
        this.onOpenSleepTimerHandler();
      }
      this.recordCommand('sleep_timer', rawText);
      this.speakFeedback('Opening sleep timer');
      return;
    }

    // 11. Search / Direct Tune Command (e.g. "search jazz", "play lofi", "find electronic")
    const searchMatch = text.match(/(?:search|find|play|tune into|tune to)\s+(.+)/i);
    if (searchMatch && searchMatch[1]) {
      const query = searchMatch[1].trim();
      if (query && !['station', 'radio', 'music', 'it', 'now'].includes(query)) {
        if (this.onSearchHandler) {
          this.onSearchHandler(query);
        }
        this.recordCommand('search', rawText, query);
        this.speakFeedback(`Searching for ${query}`);
        return;
      }
    }

    // Unknown command
    this.recordCommand('unknown', rawText);
  }

  private recordCommand(type: VoiceCommandType, text: string, target?: string) {
    this.lastCommand = {
      type,
      text,
      target,
      timestamp: Date.now(),
    };
    this.notify();
  }
}

export const voiceControlService = new VoiceControlService();
