import React, { useState, useEffect } from 'react';
import { X, Star, Share2, Copy, Check, Heart, ExternalLink, Coffee, MessageSquare, QrCode, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { storageService } from '../../services/storageService';
import { firebaseService } from '../../services/firebaseService';
import { RadioStation } from '../../types';
import { triggerHaptic } from '../../utils/haptics';

interface ShareAndRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  station?: RadioStation | null;
  mode?: 'rate' | 'share' | 'donate';
}

export const ShareAndRateModal: React.FC<ShareAndRateModalProps> = ({
  isOpen,
  onClose,
  station,
  mode: initialMode = 'share'
}) => {
  const [activeTab, setActiveTab] = useState<'rate' | 'share' | 'donate'>(initialMode);
  const [rating, setRating] = useState(5);
  const [copied, setCopied] = useState(false);
  const [copiedPaypal, setCopiedPaypal] = useState(false);
  const [ratedDone, setRatedDone] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const deepLinkUrl = station
    ? `${window.location.origin}${window.location.pathname}?stationId=${encodeURIComponent(station.id)}`
    : window.location.href;
  const streamUrlToShare = deepLinkUrl;
  const shareTitle = station ? `${station.name} on NeoTune` : 'NeoTune Global Live Radio & Podcasts';

  useEffect(() => {
    if (isOpen && activeTab === 'share') {
      const targetText = streamUrlToShare;
      QRCode.toDataURL(targetText, {
        width: 240,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.warn('Failed to generate station QR code:', err));
    }
  }, [isOpen, activeTab, streamUrlToShare]);

  if (!isOpen) return null;

  const PAYPAL_URL = 'https://paypal.me/tuyenphamvn';

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    triggerHaptic('light');
    if (station) {
      firebaseService.trackStationShare(station);
    }
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${station ? station.name.replace(/[^a-z0-9]/gi, '_') : 'neotune'}_qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRateSubmit = () => {
    const stats = storageService.getUserStats();
    stats.hasRated = true;
    storageService.saveUserStats(stats);
    setRatedDone(true);
    setTimeout(() => {
      onClose();
    }, 1400);
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(streamUrlToShare);
      setCopied(true);
      if (station) {
        firebaseService.trackStationShare(station);
      }
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleCopyPaypal = () => {
    try {
      navigator.clipboard.writeText(PAYPAL_URL);
      setCopiedPaypal(true);
      setTimeout(() => setCopiedPaypal(false), 2000);
    } catch {}
  };

  const handleOpenPaypal = (amount?: number) => {
    const url = amount ? `https://paypal.me/tuyenphamvn/${amount}USD` : PAYPAL_URL;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (station) {
      firebaseService.trackStationShare(station);
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Listen to ${station ? station.name : 'thousands of live radio stations'} worldwide with NeoTune!`,
          url: streamUrlToShare
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative my-auto w-full max-w-md h-auto max-h-[85vh] sm:max-h-[90vh] rounded-3xl bg-[#12121a] border border-white/20 p-4 sm:p-6 shadow-2xl shadow-black/95 flex flex-col">
        
        {/* Header with Tab Navigation */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] shrink-0 gap-2">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('share')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'share'
                  ? 'bg-[var(--accent-primary)] text-black shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={() => setActiveTab('rate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'rate'
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Feedback</span>
            </button>
            <button
              onClick={() => setActiveTab('donate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'donate'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Support</span>
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="p-2.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 ml-auto"
            aria-label="Close Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 overscroll-contain mt-3 sm:mt-4 space-y-4">
        {/* Tab 1: Share */}
        {activeTab === 'share' && (
          <div className="mt-4 space-y-3.5">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {station ? 'Share Radio Station' : 'Share NeoTune'}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Share direct high-fidelity stream link or scan QR code
              </p>
            </div>

            {station && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                <img
                  src={station.imageUrl}
                  alt={station.name}
                  className="w-11 h-11 rounded-lg object-cover bg-black/40"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[var(--text-primary)] truncate">{station.name}</div>
                  <div className="text-xs text-[var(--text-muted)] truncate">{station.genre} • {station.country}</div>
                </div>
              </div>
            )}

            {/* QR Code Quick Sync Card */}
            {qrDataUrl && (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-white shadow-lg shadow-black/40 ring-1 ring-black/10">
                  <img src={qrDataUrl} alt="Station QR Code" className="w-36 h-36 rounded-lg object-contain" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                  <QrCode className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>Scan with phone camera to listen on physical device</span>
                </div>
                <button
                  onClick={handleDownloadQr}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Save QR Image</span>
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={streamUrlToShare}
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-[var(--text-muted)] focus:outline-none truncate"
              />
              <button
                onClick={() => {
                  triggerHaptic('light');
                  handleCopyLink();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 cursor-pointer transition-all duration-300 ${
                  copied
                    ? 'text-green-400 bg-green-500/10 scale-105'
                    : 'text-white bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                  <span className={`absolute transition-all duration-300 ${copied ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}>
                    <Copy className="w-3.5 h-3.5" />
                  </span>
                  <span className={`absolute transition-all duration-300 ${copied ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`}>
                    <Check className="w-3.5 h-3.5 text-green-400 font-bold" />
                  </span>
                </div>
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                triggerHaptic('medium');
                handleNativeShare();
              }}
              className="w-full py-2.5 rounded-xl bg-[var(--accent-primary)] text-black font-semibold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[var(--accent-primary)]/20"
            >
              <Share2 className="w-4 h-4" />
              Share via System Web Share
            </button>

            {/* Direct Social System Share Links */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Listen to ${station ? station.name : 'NeoTune Radio'} live stream: ${streamUrlToShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => station && firebaseService.trackStationShare(station)}
                className="py-2 px-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(streamUrlToShare)}&text=${encodeURIComponent(`Listen to ${station ? station.name : 'NeoTune Radio'}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => station && firebaseService.trackStationShare(station)}
                className="py-2 px-2 rounded-xl bg-[#229ED9]/20 hover:bg-[#229ED9]/30 text-[#229ED9] border border-[#229ED9]/30 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Telegram</span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`Check out ${station ? station.name : 'NeoTune Radio'} live stream:\n${streamUrlToShare}`)}`}
                onClick={() => station && firebaseService.trackStationShare(station)}
                className="py-2 px-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Email</span>
              </a>
            </div>
          </div>
        )}

        {/* Tab 2: Feedback / Rate */}
        {activeTab === 'rate' && (
          <div className="mt-4 text-center">
            {ratedDone ? (
              <div className="py-6 space-y-2">
                <div className="inline-flex p-3 rounded-full bg-green-500/20 text-green-400">
                  <Check className="w-8 h-8" />
                </div>
                <div className="text-base font-bold text-[var(--text-primary)]">Thank you for your review!</div>
                <p className="text-xs text-[var(--text-muted)]">Your feedback helps refine audio presets and station catalogs.</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Rate Your Experience</h3>
                  <p className="text-xs text-[var(--text-muted)]">How is your global radio & podcast streaming experience?</p>
                </div>

                <div className="flex justify-center gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-2 text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating ? 'fill-amber-400 text-amber-400' : 'text-white/20'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto mb-5">
                  {rating === 5 ? '🌟 Outstanding high-bitrate streaming with zero audio ads!' : 'We are constantly improving audio quality & reliability.'}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-white font-medium text-xs hover:bg-white/10"
                  >
                    Maybe Later
                  </button>
                  <button
                    onClick={handleRateSubmit}
                    className="flex-1 py-2.5 rounded-xl bg-amber-400 text-black font-semibold text-xs hover:bg-amber-300 transition-colors"
                  >
                    Submit {rating} Stars
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 3: Support / Donate (PayPal) */}
        {activeTab === 'donate' && (
          <div className="mt-4 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  Support NeoTune Creator
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-semibold">
                    PayPal
                  </span>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">Keep radio relays fast and free for everyone</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              NeoTune operates without intrusive ads. If you enjoy the 50,000+ stations, consider sending a coffee tip via PayPal to support server infrastructure!
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleOpenPaypal(3)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/40 text-center transition-all group"
              >
                <div className="text-xs font-bold text-amber-300">$3.00</div>
                <div className="text-[10px] text-[var(--text-muted)]">☕ Coffee</div>
              </button>

              <button
                onClick={() => handleOpenPaypal(5)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/40 text-center transition-all group"
              >
                <div className="text-xs font-bold text-amber-300">$5.00</div>
                <div className="text-[10px] text-[var(--text-muted)]">🥐 Treat</div>
              </button>

              <button
                onClick={() => handleOpenPaypal(10)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/40 text-center transition-all group"
              >
                <div className="text-xs font-bold text-amber-300">$10.00</div>
                <div className="text-[10px] text-[var(--text-muted)]">🚀 Boost</div>
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleOpenPaypal()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
              >
                <span>Donate on PayPal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopyPaypal}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 shrink-0 cursor-pointer ${
                  copiedPaypal
                    ? 'text-green-400 bg-green-500/10 border-green-500/30 scale-105'
                    : 'text-[var(--text-primary)] bg-white/5 hover:bg-white/10 border-white/10'
                }`}
              >
                <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                  <span className={`absolute transition-all duration-300 ${copiedPaypal ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}>
                    <Copy className="w-3.5 h-3.5" />
                  </span>
                  <span className={`absolute transition-all duration-300 ${copiedPaypal ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`}>
                    <Check className="w-3.5 h-3.5 text-green-400 font-bold" />
                  </span>
                </div>
                <span>{copiedPaypal ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
