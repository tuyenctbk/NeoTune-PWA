import React from 'react';
import { X, Info, Heart, Radio, Disc3, ShieldCheck, ExternalLink, Coffee } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative my-auto w-full max-w-md h-auto max-h-[85vh] sm:max-h-[90vh] rounded-3xl bg-[#12121a] border border-white/20 p-4 sm:p-6 shadow-2xl shadow-black/95 flex flex-col">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shrink-0">
              <Disc3 className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">NeoTune Audio Hub</h3>
              <p className="text-xs text-[var(--text-muted)]">Cross-Platform Global Radio & Podcast Streamer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 ml-auto"
            aria-label="Close Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5 text-xs text-[var(--text-muted)] leading-relaxed overflow-y-auto flex-1 pr-1 overscroll-contain">
          <p>
            <strong className="text-[var(--text-primary)]">NeoTune</strong> connects you to over <strong className="text-[var(--accent-primary)]">50,000+ live radio broadcasts</strong> across 200+ countries, combined with global podcast feeds via Apple iTunes.
          </p>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <div className="text-[11px] uppercase tracking-wider font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Community & API Attributions
            </div>
            <div>
              • <strong>Radio-Browser.info:</strong> High-availability community-driven radio station directory.
            </div>
            <div>
              • <strong>Apple iTunes Search API:</strong> Universal podcast catalog and RSS enclosures.
            </div>
            <div>
              • <strong>Web Audio DSP Engine:</strong> Parametric 5-band biquad filtering with dynamic preamp boost & real-time 8-band FFT.
            </div>
          </div>

          {/* Donation attribution */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[11px] text-[var(--text-primary)]">Love using NeoTune? Support creator on PayPal</span>
            </div>
            <a
              href="https://paypal.me/tuyenphamvn"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-amber-400 text-black font-bold text-[11px] hover:bg-amber-300 transition-colors flex items-center gap-1 shrink-0"
            >
              <span>Donate</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
            <span>Version: <strong className="text-[var(--text-primary)]">3.1.0 (Universal)</strong></span>
            <span className="flex items-center gap-1 text-[var(--accent-secondary)]">
              Crafted with <Heart className="w-3 h-3 fill-current text-rose-500" /> for music lovers
            </span>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] text-black font-semibold text-xs hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
