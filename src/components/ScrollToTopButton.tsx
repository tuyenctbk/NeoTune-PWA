import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling down more than two screen heights
      const twoScreenHeights = (window.innerHeight || 800) * 2;
      const currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
      setIsVisible(currentScroll > twoScreenHeights);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    if (document.documentElement) {
      document.documentElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-24 right-5 z-40 p-3.5 rounded-full bg-[var(--accent-primary)] text-black shadow-2xl shadow-black/80 hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/20 flex items-center justify-center group animate-fadeIn"
      aria-label="Scroll to Top"
      title="Scroll back to category filters and search bar"
    >
      <ArrowUp className="w-5 h-5 stroke-[2.5] group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
};
