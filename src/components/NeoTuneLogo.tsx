import React from 'react';

interface NeoTuneLogoProps {
  size?: number;
  className?: string;
  isPlaying?: boolean;
  showText?: boolean;
}

export const NeoTuneLogo: React.FC<NeoTuneLogoProps> = ({
  size = 36,
  className = '',
  isPlaying = false,
  showText = false,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div 
        style={{ width: size, height: size }}
        className="relative shrink-0 rounded-xl overflow-hidden p-0.5 bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-white/15 shadow-inner flex items-center justify-center group"
      >
        <svg 
          viewBox="0 0 192 192" 
          width="100%" 
          height="100%" 
          className={`w-full h-full transition-transform duration-300 ${isPlaying ? 'scale-105' : 'group-hover:scale-105'}`}
        >
          <defs>
            <radialGradient id="logoBg" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#1e1136"/>
              <stop offset="60%" stopColor="#0c0614"/>
              <stop offset="100%" stopColor="#050208"/>
            </radialGradient>
            <linearGradient id="logoNeon" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff"/>
              <stop offset="35%" stopColor="#7000ff"/>
              <stop offset="70%" stopColor="#ff007b"/>
              <stop offset="100%" stopColor="#ff9900"/>
            </linearGradient>
            <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="192" height="192" rx="42" fill="url(#logoBg)"/>
          
          <g filter="url(#logoGlow)">
            {/* Waves */}
            <path 
              d="M44 78 A 58 58 0 0 1 148 78" 
              fill="none" 
              stroke="url(#logoNeon)" 
              strokeWidth="6" 
              strokeLinecap="round" 
              className={isPlaying ? 'animate-pulse' : ''}
              opacity="0.65"
            />
            <path 
              d="M60 90 A 40 40 0 0 1 132 90" 
              fill="none" 
              stroke="url(#logoNeon)" 
              strokeWidth="6" 
              strokeLinecap="round" 
              opacity="0.9"
            />

            {/* Pulsing Central Soundbars */}
            <rect x="68" y="104" width="8" height="42" rx="4" fill="url(#logoNeon)" className={isPlaying ? 'animate-bounce' : ''} style={{ animationDelay: '0ms' }} />
            <rect x="82" y="93" width="8" height="53" rx="4" fill="url(#logoNeon)" className={isPlaying ? 'animate-bounce' : ''} style={{ animationDelay: '150ms' }} />
            <rect x="96" y="82" width="8" height="64" rx="4" fill="url(#logoNeon)" className={isPlaying ? 'animate-bounce' : ''} style={{ animationDelay: '300ms' }} />
            <rect x="110" y="93" width="8" height="53" rx="4" fill="url(#logoNeon)" className={isPlaying ? 'animate-bounce' : ''} style={{ animationDelay: '150ms' }} />
            <rect x="124" y="104" width="8" height="42" rx="4" fill="url(#logoNeon)" className={isPlaying ? 'animate-bounce' : ''} style={{ animationDelay: '0ms' }} />

            {/* Broadcast Beacon */}
            <circle cx="96" cy="56" r="6" fill="#00f0ff" className={isPlaying ? 'animate-ping' : ''} style={{ animationDuration: '2s' }} />
            <circle cx="96" cy="56" r="3.5" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
              NeoTune
            </span>
            <span className="px-1.5 py-0.2 text-[8px] font-mono font-bold tracking-widest uppercase rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
              HD
            </span>
          </div>
          <span className="block text-[8px] uppercase font-bold tracking-widest text-[var(--accent-primary)] leading-none mt-0.5">
            Global Live Radio
          </span>
        </div>
      )}
    </div>
  );
};
