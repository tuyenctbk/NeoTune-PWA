import React from 'react';
import { Download, X, Smartphone, Monitor, Tv, ChevronRight } from 'lucide-react';
import { DevicePlatform } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  platform: DevicePlatform;
  canPromptDirectly: boolean;
  onOpenModal: () => void;
  onDismiss: () => void;
  onDirectInstall: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  platform,
  canPromptDirectly,
  onOpenModal,
  onDismiss,
  onDirectInstall
}) => {
  const getDeviceIcon = () => {
    switch (platform) {
      case 'ios':
      case 'android':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'tv':
        return <Tv className="w-4 h-4 text-amber-400" />;
      default:
        return <Monitor className="w-4 h-4 text-sky-400" />;
    }
  };

  const getDeviceLabel = () => {
    switch (platform) {
      case 'ios':
        return 'Install on iPhone / iPad';
      case 'android':
        return 'Install Android App';
      case 'tv':
        return 'Pin to Smart TV';
      default:
        return 'Install Desktop App';
    }
  };

  return (
    <div
      id="pwa-install-banner"
      className="fixed bottom-24 sm:bottom-28 right-4 sm:right-6 z-40 max-w-sm w-[calc(100vw-2rem)] animate-slideUp"
    >
      <div className="p-3.5 rounded-2xl bg-[var(--surface-main)]/90 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/60 ring-1 ring-white/10 flex items-center justify-between gap-3">
        {/* Icon & Message */}
        <div
          onClick={onOpenModal}
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/25 to-sky-500/25 border border-white/15 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            {getDeviceIcon()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              <span>{getDeviceLabel()}</span>
              <ChevronRight className="w-3 h-3 text-[var(--accent-primary)] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-[11px] text-[var(--text-muted)] truncate">
              Lock screen controls & zero ads
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {canPromptDirectly ? (
            <button
              onClick={onDirectInstall}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-black text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          ) : (
            <button
              onClick={onOpenModal}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Guide</span>
            </button>
          )}

          <button
            onClick={onDismiss}
            title="Dismiss for 14 days"
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
