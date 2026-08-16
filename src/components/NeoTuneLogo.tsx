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
        className="relative shrink-0 rounded-xl overflow-hidden p-[1px] bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 shadow-md shadow-purple-950/50 flex items-center justify-center group"
      >
        <svg 
          viewBox="0 0 192 192" 
          width="100%" 
          height="100%" 
          className={`w-full h-full transition-transform duration-300 ${isPlaying ? 'scale-105' : 'group-hover:scale-105'}`}
        >
          <defs>
            {/* Background Radial Gradient */}
            <radialGradient id="neoLogoBg" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#2A1448" />
              <stop offset="60%" stopColor="#120722" />
              <stop offset="100%" stopColor="#080212" />
            </radialGradient>

            {/* Vibrant High-Contrast Gradient for Waves & Soundbars */}
            <linearGradient id="neoLogoNeon" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="45%" stopColor="#A855F7" />
              <stop offset="85%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            {/* Subtle Sharp Glow Effect */}
            <filter id="sharpGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Squircle Dark Canvas */}
          <rect width="192" height="192" rx="44" fill="url(#neoLogoBg)" />

          {/* Inner Ambient Glow Ring */}
          <rect width="188" height="188" x="2" y="2" rx="42" fill="none" stroke="url(#neoLogoNeon)" strokeWidth="2" opacity="0.35" />

          {/* Core Graphic Group */}
          <g filter="url(#sharpGlow)">
            {/* Arcing Radio Waves */}
            <path 
              d="M 38 72 A 62 62 0 0 1 154 72" 
              fill="none" 
              stroke="url(#neoLogoNeon)" 
              strokeWidth="7" 
              strokeLinecap="round" 
              className={isPlaying ? 'animate-pulse' : ''}
              opacity="0.75"
            />
            <path 
              d="M 54 86 A 46 46 0 0 1 138 86" 
              fill="none" 
              stroke="url(#neoLogoNeon)" 
              strokeWidth="7" 
              strokeLinecap="round" 
              opacity="0.95"
            />

            {/* Central Sound Equalizer Bars */}
            <rect 
              x="62" y="104" width="10" height="42" rx="5" 
              fill="url(#neoLogoNeon)" 
              className={isPlaying ? 'animate-bounce' : ''} 
              style={{ animationDelay: '0ms' }} 
            />
            <rect 
              x="79" y="93" width="10" height="53" rx="5" 
              fill="url(#neoLogoNeon)" 
              className={isPlaying ? 'animate-bounce' : ''} 
              style={{ animationDelay: '150ms' }} 
            />
            <rect 
              x="96" y="80" width="10" height="66" rx="5" 
              fill="url(#neoLogoNeon)" 
              className={isPlaying ? 'animate-bounce' : ''} 
              style={{ animationDelay: '300ms' }} 
            />
            <rect 
              x="113" y="93" width="10" height="53" rx="5" 
              fill="url(#neoLogoNeon)" 
              className={isPlaying ? 'animate-bounce' : ''} 
              style={{ animationDelay: '150ms' }} 
            />
            <rect 
              x="130" y="104" width="10" height="42" rx="5" 
              fill="url(#neoLogoNeon)" 
              className={isPlaying ? 'animate-bounce' : ''} 
              style={{ animationDelay: '0ms' }} 
            />

            {/* Radio Beacon Top Signal Indicator */}
            <circle cx="96" cy="50" r="7" fill="#00F0FF" className={isPlaying ? 'animate-ping' : ''} style={{ animationDuration: '2s' }} />
            <circle cx="96" cy="50" r="4" fill="#FFFFFF" />
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

