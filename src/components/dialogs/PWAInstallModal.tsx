import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Smartphone,
  Monitor,
  Tv,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  Radio,
  Music2,
  Sliders,
  ExternalLink,
  Laptop,
  ChevronRight
} from 'lucide-react';
import { DevicePlatform } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: DevicePlatform;
  canPromptDirectly: boolean;
  onPromptInstall: () => Promise<'accepted' | 'dismissed' | 'manual_needed'>;
  isInstalled: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  platform: initialPlatform,
  canPromptDirectly,
  onPromptInstall,
  isInstalled
}) => {
  const [selectedTab, setSelectedTab] = useState<DevicePlatform>(initialPlatform);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Auto-detect and sync the selected tab with the user's current platform when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedTab(initialPlatform);
    }
  }, [isOpen, initialPlatform]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const res = await onPromptInstall();
    if (res === 'accepted') {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1800);
    }
  };

  return (
    <div
      id="pwa-install-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto"
    >
      <div className="relative my-auto w-full max-w-xl h-auto max-h-[85vh] sm:max-h-[90vh] rounded-3xl bg-[#12121a] border border-white/20 p-4 sm:p-7 shadow-2xl shadow-black/95 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-sky-500/20 border border-white/10 text-[var(--accent-primary)] shadow-md shrink-0">
              <Download className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Install NeoTune App</span>
                {isInstalled && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Installed
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Lightweight, ad-free standalone radio & podcast player
              </p>
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

        <div className="overflow-y-auto flex-1 pr-1 overscroll-contain mt-3 sm:mt-4 space-y-4">
        {/* Benefits Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
            <Radio className="w-5 h-5 text-[var(--accent-primary)] mb-1.5" />
            <span className="text-[11px] font-semibold text-[var(--text-primary)]">Background Play</span>
            <span className="text-[10px] text-[var(--text-muted)]">Lock screen controls</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
            <Sparkles className="w-5 h-5 text-purple-400 mb-1.5" />
            <span className="text-[11px] font-semibold text-[var(--text-primary)]">Zero Clutter</span>
            <span className="text-[10px] text-[var(--text-muted)]">Standalone window</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
            <Sliders className="w-5 h-5 text-amber-400 mb-1.5" />
            <span className="text-[11px] font-semibold text-[var(--text-primary)]">Hardware Keys</span>
            <span className="text-[10px] text-[var(--text-muted)]">Media keys & Bluetooth</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
            <Tv className="w-5 h-5 text-sky-400 mb-1.5" />
            <span className="text-[11px] font-semibold text-[var(--text-primary)]">TV & Remote</span>
            <span className="text-[10px] text-[var(--text-muted)]">10-foot D-Pad UI</span>
          </div>
        </div>

        {/* Dynamic Platform-Specific Detected Spotlight Banner */}
        {!isInstalled && (
          <div className="mb-4">
            {initialPlatform === 'android' && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent border border-emerald-500/35 shadow-lg shadow-black/20 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Smartphone className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                        Platform Detected: Android
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-2">Get NeoTune on Google Play Store</h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                      For the best background streaming experience, lock-screen notification drawer controls, and quick-launch widgets, get our native Android app!
                    </p>
                    <div className="mt-3.5 flex flex-col sm:flex-row gap-2.5">
                      <a
                        href="https://play.google.com/store/apps/details?id=com.neotune.radio&hl=en-US"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/15 cursor-pointer"
                      >
                        <span>Download Official Android App</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => setSelectedTab('android')}
                        className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer"
                      >
                        Or View Web PWA Guide
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {initialPlatform === 'ios' && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/15 via-blue-500/5 to-transparent border border-sky-500/35 shadow-lg shadow-black/20 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                    <Smartphone className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20 shrink-0">
                        Platform Detected: iOS (Apple Safari)
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-2">Add NeoTune to your Home Screen</h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                      Apple devices do not support automatic 1-click install buttons, but you can add NeoTune to your home screen using the Safari Share menu in under 5 seconds.
                    </p>
                    <div className="mt-3">
                      <button
                        onClick={() => setSelectedTab('ios')}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-sky-500/15 cursor-pointer"
                      >
                        <span>Show iOS Safari Instructions</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {initialPlatform === 'tv' && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-yellow-500/5 to-transparent border border-amber-500/35 shadow-lg shadow-black/20 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    <Tv className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                        Platform Detected: Smart TV
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-2">Activate living room visualizer</h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                      Optimize the NeoTune audio streaming player for TV web browsers. Enable directional remote keyboard control easily.
                    </p>
                    <div className="mt-3">
                      <button
                        onClick={() => setSelectedTab('tv')}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-amber-500/15 cursor-pointer"
                      >
                        <span>Show TV Setup Instructions</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {initialPlatform === 'pc' && !canPromptDirectly && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/15 via-indigo-500/5 to-transparent border border-purple-500/35 shadow-lg shadow-black/20 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                    <Laptop className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20 shrink-0">
                        Platform Detected: Desktop Computer
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-2">Install NeoTune Desktop App</h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                      Launch NeoTune in its own window directly from your Dock or Taskbar with physical media player key support.
                    </p>
                    <div className="mt-3">
                      <button
                        onClick={() => setSelectedTab('pc')}
                        className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-black text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-purple-500/15 cursor-pointer"
                      >
                        <span>Show PC / Mac Instructions</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Direct Install CTA (if browser supports beforeinstallprompt) */}
        {canPromptDirectly && !isInstalled && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-purple-600/20 via-pink-600/15 to-sky-600/20 border border-[var(--accent-primary)]/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] text-black flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Instant One-Click Install</div>
                <div className="text-xs text-white/70">Your browser is ready to install NeoTune directly</div>
              </div>
            </div>

            <button
              onClick={handleInstallClick}
              disabled={installSuccess}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-black font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
            >
              {installSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Installed!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Install Now</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Platform Selection Tabs */}
        <div className="space-y-3 flex-1">
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Step-by-Step Device Guide
          </div>

          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/5">
            <button
              onClick={() => setSelectedTab('pc')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                selectedTab === 'pc'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PC / Mac</span>
              <span className="sm:hidden">PC</span>
            </button>

            <button
              onClick={() => setSelectedTab('android')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                selectedTab === 'android'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Android</span>
            </button>

            <button
              onClick={() => setSelectedTab('ios')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                selectedTab === 'ios'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span>iOS / Safari</span>
            </button>

            <button
              onClick={() => setSelectedTab('tv')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                selectedTab === 'tv'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              <span>Smart TV</span>
            </button>
          </div>

          {/* Tab 1: PC / Mac Desktop Instructions */}
          {selectedTab === 'pc' && (
            <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/5 space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Laptop className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Installing on Windows, macOS, Linux or Chromebook</span>
              </div>
              <ol className="space-y-3 text-xs text-[var(--text-muted)]">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <span>Look at the right side of your browser URL address bar for the <strong className="text-white">Install App</strong> icon (or click the three-dot menu <span className="text-white font-mono">⋮</span>).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <span>Select <strong className="text-white">"Install NeoTune"</strong> or <strong className="text-white">"Create Shortcut"</strong> (check <em>Open as Window</em>).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <span>On <strong className="text-white">macOS Safari</strong> (Sonoma+): Click <strong className="text-white">File</strong> in top menu bar &rarr; <strong className="text-white">"Add to Dock"</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                  <span>Pin NeoTune to your Taskbar or Dock for instant 1-click access to global radio with physical keyboard media keys!</span>
                </li>
              </ol>
            </div>
          )}

          {/* Tab 2: Android Instructions */}
          {selectedTab === 'android' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Highlighted Play Store Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/25 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                    <Smartphone className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">RECOMMENDED</div>
                    <h4 className="text-sm font-bold text-white">NeoTune Android App</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      Install the native NeoTune app from the Google Play Store for background playback stability, Android widgets, and auto-resume.
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <a
                    href="https://play.google.com/store/apps/details?id=com.neotune.radio&hl=en-US"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    <span>Get it on Google Play Store</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Alternative PWA Install Guide */}
              <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/5 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-sky-400" />
                  <span>Alternative: Install Web App (PWA)</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  To install directly via your mobile browser (Chrome / Samsung Internet / Brave):
                </p>
                <ol className="space-y-2.5 text-xs text-[var(--text-muted)]">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                    <span>Tap the three dots <span className="text-white font-mono">⋮</span> at the top/bottom right of your browser.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                    <span>Tap <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.</span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Tab 3: iOS Instructions */}
          {selectedTab === 'ios' && (
            <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/5 space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Smartphone className="w-4 h-4 text-sky-400" />
                <span>Adding to Home Screen on iPhone & iPad</span>
              </div>
              
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200 leading-relaxed">
                <strong>Note for iOS users:</strong> Apple Safari is required for standalone Home Screen apps. If you are currently in Chrome or an in-app browser (e.g. Facebook, Instagram, Zalo), please open this page in <strong>Safari</strong> first.
              </div>

              <ol className="space-y-3 text-xs text-[var(--text-muted)]">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <div className="flex-1">
                    <span>In <strong>Safari</strong>, tap the <strong className="text-white inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 text-sky-400" /> Share button</strong></span>
                    <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">(located in the bottom navigation bar on iPhone, or top right on iPad).</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <div className="flex-1">
                    <span>Scroll down the share sheet and tap <strong className="text-white inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-sky-400" /> Add to Home Screen</strong></span>
                    <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">(or <em>"Thêm vào Màn hình chính"</em> in Vietnamese).</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <div className="flex-1">
                    <span>Tap <strong className="text-white">"Add"</strong> (or <em>"Thêm"</em>) in the top right corner.</span>
                    <span className="block text-[11px] text-emerald-400 mt-0.5 font-medium">NeoTune will now open in full-screen standalone mode with background playback and lock-screen media controls!</span>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* Tab 4: Smart TV Instructions */}
          {selectedTab === 'tv' && (
            <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/5 space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Tv className="w-4 h-4 text-amber-400" />
                <span>Using NeoTune on Smart TV & Android TV</span>
              </div>
              <ol className="space-y-3 text-xs text-[var(--text-muted)]">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <span>Bookmark or pin this URL in your TV browser (e.g. TV Bro, Amazon Silk, Chrome, Samsung Tizen, LG webOS).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <span>Turn ON <strong className="text-white">TV D-Pad Mode</strong> in the top navigation bar for 10-foot remote navigation.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <span>Press <strong className="text-white font-mono">[F11]</strong> or use browser full-screen for an uninterrupted living-room audio visualizer.</span>
                </li>
              </ol>
            </div>
          )}
        </div>

        </div>

        {/* Footer actions */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-[var(--text-muted)]">
            NeoTune PWA • Version 1.4.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer min-h-[44px] flex items-center justify-center"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
