import React, { useState, useEffect } from 'react';
import { Coffee, Sparkles, X, Heart } from 'lucide-react';
import { storageService } from '../services/storageService';
import { haptics } from '../utils/haptics';

interface DonationPostOpCardProps {
  onOpenDonationModal: () => void;
  taskTitle?: string;
  onDismiss?: () => void;
}

export const DonationPostOpCard: React.FC<DonationPostOpCardProps> = ({
  onOpenDonationModal,
  taskTitle = 'Operation Completed!',
  onDismiss
}) => {
  const [isSupporter, setIsSupporter] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(true);

  useEffect(() => {
    setIsSupporter(storageService.getIsSupporter());
    const unsub = storageService.subscribeSupporter((sup) => setIsSupporter(sup));
    return () => unsub();
  }, []);

  if (isSupporter || !visible) return null;

  const handleSupport = () => {
    onOpenDonationModal();
    haptics.selection();
  };

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  return (
    <div className="w-full my-2 animate-fadeIn">
      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center shrink-0 font-bold shadow-md shadow-amber-400/20">
            <Coffee className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
              <span>{taskTitle}</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
            <p className="text-[11px] text-white/70">
              Saved your day? Consider buying the developer a coffee!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleSupport}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-md shadow-amber-400/20"
          >
            <Heart className="w-3 h-3 fill-current text-black" />
            <span>Support</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Dismiss task card"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
