import React from 'react';
import { Radio, Play, X, Laptop } from 'lucide-react';
import { ActivePlaybackSession } from '../types';

interface ResumeDeviceBannerProps {
  session: ActivePlaybackSession;
  onResume: () => void;
  onDismiss: () => void;
}

export const ResumeDeviceBanner: React.FC<ResumeDeviceBannerProps> = ({
  session,
  onResume,
  onDismiss
}) => {
  if (!session || !session.station) return null;

  return (
    <div className="relative z-30 mb-5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-600/95 via-purple-600/95 to-pink-600/95 text-white backdrop-blur-xl border border-white/20 shadow-xl shadow-indigo-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 overflow-hidden">
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className="p-2.5 rounded-xl bg-white/15 text-amber-300 shrink-0 border border-white/20 shadow-inner mt-0.5 sm:mt-0">
          <Radio className="w-5 h-5 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-black/30 px-2 py-0.5 rounded-full border border-amber-300/30 flex items-center gap-1 shrink-0 max-w-full truncate">
              <Laptop className="w-3 h-3 text-amber-300 shrink-0" />
              <span className="truncate">Resume from {session.deviceName}</span>
            </span>
            <span className="text-[10px] text-white/80 font-medium hidden xs:inline">
              Cloud Active
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold truncate mt-1 text-white">
            <span className="text-white/80 font-normal">Now Playing: </span>
            <span className="underline decoration-amber-300 decoration-2 font-black">{session.station.name}</span>
            {session.station.genre && (
              <span className="text-[11px] text-white/80 font-normal ml-1.5 hidden sm:inline">
                ({session.station.genre})
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t border-white/10 sm:border-t-0">
        <button
          onClick={onResume}
          className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-xl bg-white text-indigo-950 hover:bg-amber-300 transition-all font-black text-xs shadow-md shadow-black/20 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 min-h-[40px]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Resume Here</span>
        </button>
        <button
          onClick={onDismiss}
          className="p-2.5 sm:p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
