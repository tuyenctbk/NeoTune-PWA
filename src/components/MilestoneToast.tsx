import React from 'react';
import { Award, Sparkles, Heart, X } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface MilestoneToastProps {
  milestone: 10 | 25 | 50 | null;
  onClose: () => void;
  onOpenDonationModal: () => void;
}

export const MilestoneToast: React.FC<MilestoneToastProps> = ({
  milestone,
  onClose,
  onOpenDonationModal
}) => {
  if (!milestone) return null;

  const messages = {
    10: "🎉 You've completed 10 core tasks! Consider supporting independent development.",
    25: "🌟 25 Tasks Completed! Thanks for using NeoTune. Help us stay ad-free!",
    50: "👑 50 Core Tasks Completed! You're a true power user! Consider becoming a supporter."
  };

  const handleSupport = () => {
    onClose();
    onOpenDonationModal();
    haptics.selection();
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 max-w-sm w-auto animate-bounceIn">
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/90 to-rose-600/90 text-white shadow-2xl shadow-black/80 border border-white/20 backdrop-blur-md flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Award className="w-6 h-6 text-amber-300 animate-spin-slow" />
        </div>

        <div className="flex-1 min-w-0 text-xs">
          <div className="font-extrabold flex items-center gap-1.5 text-amber-200">
            <span>Milestone Unlocked!</span>
            <Sparkles className="w-3.5 h-3.5 fill-current" />
          </div>
          <p className="text-[11px] text-white/90 leading-tight mt-0.5">
            {messages[milestone]}
          </p>
          <button
            onClick={handleSupport}
            className="mt-2 px-3 py-1 rounded-lg bg-white text-black font-extrabold text-[11px] hover:bg-amber-200 transition-transform active:scale-95 flex items-center gap-1 cursor-pointer shadow-md"
          >
            <Heart className="w-3 h-3 fill-current text-rose-500" />
            <span>Support NeoTune</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="Close Toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
