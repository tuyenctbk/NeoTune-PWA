import React from 'react';
import { Music, Newspaper, Headphones, Zap, Guitar, Sparkles, Radio, Cloud, X } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface CategoryNavigationProps {
  tags: string[];
  activeTag: string;
  onSelectTag: (tag: string) => void;
  isRemoteTags?: boolean;
  className?: string;
}

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({
  tags,
  activeTag,
  onSelectTag,
  isRemoteTags,
  className = ''
}) => {
  const getTagIcon = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes('music') || t.includes('pop') || t.includes('jazz') || t.includes('classical')) return Music;
    if (t.includes('news')) return Newspaper;
    if (t.includes('talk') || t.includes('podcast')) return Headphones;
    if (t.includes('sport')) return Zap;
    if (t.includes('rock') || t.includes('metal') || t.includes('indie')) return Guitar;
    if (t.includes('electronic') || t.includes('dance') || t.includes('ambient') || t.includes('synth')) return Sparkles;
    return Radio;
  };

  return (
    <div className={`sticky top-[56px] sm:top-[64px] md:top-2 z-20 bg-[var(--bg-main)]/95 backdrop-blur-xl py-2.5 -mx-3 px-3 border-b border-white/5 shadow-md shadow-black/5 transition-all duration-300 space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-[10px] hidden sm:inline-block">Category & Genre Navigation</span>
          {activeTag !== 'All' && activeTag !== 'All Genres' && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onSelectTag('All');
              }}
              className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/20 font-medium transition-colors cursor-pointer"
            >
              <span>Clear Filter ({activeTag})</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {isRemoteTags && (
          <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-medium shrink-0">
            <Cloud className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Firebase Synced</span>
          </span>
        )}
      </div>

      {/* Horizontal Scroll Chip List */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
        {tags.map((tag) => {
          const isSelected = activeTag === tag || (tag === 'All' && activeTag === 'All Genres');
          const IconComp = getTagIcon(tag);

          return (
            <button
              key={`cat_chip_${tag}`}
              onClick={() => {
                triggerHaptic('selection');
                onSelectTag(tag === 'All' ? 'All' : tag);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-[var(--accent-primary)] text-black shadow-md shadow-[var(--accent-primary)]/20 scale-102 font-black ring-2 ring-white/20'
                  : 'bg-[#181824] border border-white/10 text-[var(--text-muted)] hover:text-white hover:bg-white/10'
              }`}
            >
              <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-black' : 'text-[var(--accent-primary)]'}`} />
              <span>{tag}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
