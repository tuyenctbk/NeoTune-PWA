import React, { useId } from 'react';

interface NeoTuneLogoProps {
  size?: number;
  className?: string;
  isPlaying?: boolean;
  showText?: boolean;
  subtitle?: string;
}

export const NeoTuneLogo: React.FC<NeoTuneLogoProps> = ({
  size = 36,
  className = '',
  isPlaying = false,
  showText = false,
  subtitle = 'Radio & Podcasts',
}) => {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '_');
  const bgId = `nl_bg_${reactId}`;
  const waveId = `nl_wv_${reactId}`;
  const barId = `nl_br_${reactId}`;

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div 
        style={{ width: size, height: size }}
        className="relative shrink-0 rounded-2xl overflow-hidden shadow-lg shadow-purple-950/60 ring-1 ring-white/10 flex items-center justify-center group"
      >
        <svg 
          viewBox="0 0 192 192" 
          width="100%" 
          height="100%" 
          className={`w-full h-full transition-transform duration-300 ${isPlaying ? 'scale-105' : 'group-hover:scale-105'}`}
        >
          <defs>
            {/* Background Dark Obsidian Radial Gradient */}
            <radialGradient id={bgId} cx="50%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#240E40" />
              <stop offset="60%" stopColor="#110521" />
              <stop offset="100%" stopColor="#07020E" />
            </radialGradient>

            {/* Vibrant Radio Wave Gradient (Cyan -> Violet -> Magenta) */}
            <linearGradient id={waveId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>

            {/* Vibrant Equalizer Bar Gradient (Violet -> Magenta -> Rose) */}
            <linearGradient id={barId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="50%" stopColor="#E879F9" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>
          </defs>

          {/* Squircle Dark Obsidian Canvas */}
          <rect width="192" height="192" rx="44" fill={`url(#${bgId})`} />

          {/* Inner Accent Specular Border */}
          <rect width="188" height="188" x="2" y="2" rx="42" fill="none" stroke={`url(#${waveId})`} strokeWidth="2" opacity="0.35" />

          {/* Radio Waves (Concentric Arches) */}
          <path 
            d="M 36 90 A 60 60 0 0 1 156 90" 
            fill="none" 
            stroke={`url(#${waveId})`} 
            strokeWidth="9" 
            strokeLinecap="round" 
            opacity={isPlaying ? '0.95' : '0.85'}
            className={isPlaying ? 'animate-pulse' : ''}
          />
          <path 
            d="M 53 90 A 43 43 0 0 1 139 90" 
            fill="none" 
            stroke={`url(#${waveId})`} 
            strokeWidth="9" 
            strokeLinecap="round" 
          />

          {/* 3 Equalizer Pillar Bars */}
          {/* Left Bar */}
          <rect 
            x="66" y="98" width="13" height="49" rx="6.5" 
            fill={`url(#${barId})`} 
            className={isPlaying ? 'animate-bounce' : ''}
            style={{ animationDuration: '1.2s', animationDelay: '0ms' }}
          />
          {/* Center Tall Bar */}
          <rect 
            x="89.5" y="77" width="13" height="70" rx="6.5" 
            fill={`url(#${barId})`} 
            className={isPlaying ? 'animate-bounce' : ''}
            style={{ animationDuration: '1.2s', animationDelay: '200ms' }}
          />
          {/* Right Bar */}
          <rect 
            x="113" y="98" width="13" height="49" rx="6.5" 
            fill={`url(#${barId})`} 
            className={isPlaying ? 'animate-bounce' : ''}
            style={{ animationDuration: '1.2s', animationDelay: '400ms' }}
          />

          {/* Glowing Transmitter Beacon Dot at Apex */}
          <circle cx="96" cy="47" r="8" fill="#00F0FF" className={isPlaying ? 'animate-ping' : ''} style={{ animationDuration: '2.5s', transformOrigin: '96px 47px' }} />
          <circle cx="96" cy="47" r="8" fill="#00F0FF" />
          <circle cx="96" cy="47" r="4" fill="#FFFFFF" />
        </svg>
      </div>

      {showText && (
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-base font-black tracking-tight text-white flex items-center">
              Neo<span className="text-cyan-400">Tune</span>
            </span>
            <span className="px-1.5 py-0.5 text-[8.5px] font-mono font-extrabold tracking-wider uppercase rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shadow-sm shadow-cyan-950/40">
              HD
            </span>
          </div>
          <span className="block text-[8px] uppercase font-bold tracking-widest text-[var(--accent-primary)] leading-none mt-1">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};
