import React, { useState, useEffect } from 'react';
import { Heart, X, Sparkles, Coffee } from 'lucide-react';
import { storageService } from '../services/storageService';
import { haptics } from '../utils/haptics';

interface DonationBannerProps {
  onOpenDonationModal: () => void;
}

export const DonationBanner: React.FC<DonationBannerProps> = ({ onOpenDonationModal }) => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    // Check satisfaction logic from storage engine
    const checkVisibility = () => {
      setVisible(storageService.shouldShowHomeDonationBanner());
    };
    checkVisibility();

    // Subscribe to supporter state change
    const unsubscribe = storageService.subscribeSupporter((isSupporter) => {
      if (isSupporter) setVisible(false);
    });

    return () => unsubscribe();
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    storageService.dismissDonationBanner();
    setVisible(false);
    haptics.light();
  };

  const handleSupport = () => {
    onOpenDonationModal();
    haptics.selection();
  };

  return (
    <div className="w-full my-3 animate-fadeIn">
      <div className="relative rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-rose-500/15 border border-amber-500/30 p-3.5 sm:p-4 shadow-lg shadow-black/40 flex flex-col sm:flex-row items-center justify-between gap-3 overflow-hidden backdrop-blur-md">
        
        {/* Glow decoration */}
        <div className="absolute -top-10 -left-10 w-28 h-28 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10 text-center sm:text-left">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-bold shrink-0 shadow-md shadow-amber-500/30">
            <Coffee className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 font-bold text-white text-xs sm:text-sm">
              <span>Enjoying NeoTune Radio & Podcasts?</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-[11px] text-white/70 leading-relaxed mt-0.5">
              Support independent development to keep 50,000+ streams fast, clean, and 100% ad-free!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={handleSupport}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-300 hover:to-rose-300 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Heart className="w-3.5 h-3.5 fill-current text-black" />
            <span>Support App</span>
          </button>
          
          <button
            onClick={handleDismiss}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Dismiss banner"
            title="Silence prompt for 14 days"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
