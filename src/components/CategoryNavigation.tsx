import React from 'react';
import { Music, Newspaper, Headphones, Zap, Guitar, Sparkles, Radio } from 'lucide-react';
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
    <div className={`sticky top-[56px] sm:top-[64px] md:top-2 z-20 bg-[var(--bg-main)]/95 backdrop-blur-xl py-2 -mx-3 px-3 border-b border-white/5 shadow-md shadow-black/5 transition-all duration-300 ${className}`}>
      {/* Horizontal Scroll Chip List */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
        {tags.map((tag) => {
          const isSelected = activeTag === tag || ((tag === 'All' || tag === 'All Genres') && (activeTag === 'All Genres' || activeTag === 'All'));
          const IconComp = getTagIcon(tag);

          const handleClick = () => {
            triggerHaptic('selection');
            if (isSelected && tag !== 'All' && tag !== 'All Genres') {
              // Clicked selected genre chip again -> toggle/unselect back to All Genres
              onSelectTag('All Genres');
            } else {
              onSelectTag(tag === 'All' ? 'All Genres' : tag);
            }
          };

          return (
            <button
              key={`cat_chip_${tag}`}
              onClick={handleClick}
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
