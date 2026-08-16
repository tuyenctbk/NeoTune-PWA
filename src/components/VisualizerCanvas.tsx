import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../services/audioEngine';
import { storageService } from '../services/storageService';
import { VisualizerSkin } from '../types';

interface VisualizerCanvasProps {
  height?: number;
  barCount?: 8 | 16 | 32;
  colorScheme?: 'neon' | 'gold' | 'crimson' | 'mono';
  skin?: VisualizerSkin;
  interactive?: boolean;
  className?: string;
  showLabels?: boolean;
}

const BAND_LABELS = ['Sub-Bass', 'Bass', 'Low-Mids', 'Mids', 'High-Mids', 'Presence', 'Brilliance', 'Air'];
const CYCLING_SKINS: VisualizerSkin[] = ['bars', 'circular', 'waveform', 'dots'];

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  height = 80,
  barCount = 8,
  colorScheme = 'neon',
  skin,
  className = '',
  showLabels = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const peaksRef = useRef<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);

  const [activeSkin, setActiveSkin] = useState<VisualizerSkin>(() => skin || storageService.getVisualizerSkin());
  const [dynamicIndex, setDynamicIndex] = useState<number>(0);
  const [currentGenre, setCurrentGenre] = useState<string>('');
  const colorsRef = useRef<{ c1: string; c2: string; c3: string; glow: string }>({ c1: '#00F0FF', c2: '#A855F7', c3: '#EC4899', glow: 'rgba(0,240,255,0.5)' });

  // Compute and update theme colors on mount and periodically/when colorScheme changes
  useEffect(() => {
    const updateColors = () => {
      let scheme = colorScheme;
      const savedScheme = storageService.getVisualizerColorScheme();
      
      if (savedScheme && savedScheme !== 'sync') {
        scheme = savedScheme as any;
      } else {
        const activeTheme = storageService.getTheme();
        if (activeTheme === 'cyberpunk') {
          scheme = 'neon';
        } else if (activeTheme === 'jazz') {
          scheme = 'gold';
        } else if (activeTheme === 'rock') {
          scheme = 'crimson';
        } else if (activeTheme === 'oled') {
          scheme = 'mono';
        } else {
          colorsRef.current = { c1: '#38BDF8', c2: '#818CF8', c3: '#34D399', glow: 'rgba(56,189,248,0.5)' };
          return;
        }
      }

      if (scheme === 'gold') {
        colorsRef.current = { c1: '#F5E6CA', c2: '#E5A93C', c3: '#92400E', glow: 'rgba(229,169,60,0.5)' };
      } else if (scheme === 'crimson') {
        colorsRef.current = { c1: '#FFAC1C', c2: '#FF1E56', c3: '#991B1B', glow: 'rgba(255,30,86,0.5)' };
      } else if (scheme === 'mono') {
        colorsRef.current = { c1: '#FFFFFF', c2: '#A1A1AA', c3: '#3F3F46', glow: 'rgba(255,255,255,0.3)' };
      } else {
        colorsRef.current = { c1: '#00F0FF', c2: '#A855F7', c3: '#EC4899', glow: 'rgba(0,240,255,0.5)' };
      }
    };

    updateColors();
    const interval = setInterval(updateColors, 2000);
    return () => clearInterval(interval);
  }, [colorScheme]);

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setCurrentGenre(state.currentStation?.genre || '');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (skin) {
      setActiveSkin(skin);
    } else {
      setActiveSkin(storageService.getVisualizerSkin());
    }
  }, [skin]);

  // Dynamic cycling timer during playback
  useEffect(() => {
    if (activeSkin !== 'dynamic') return;

    const intervalSec = storageService.getVisualizerCycleInterval();
    const timer = setInterval(() => {
      setDynamicIndex((prev) => (prev + 1) % CYCLING_SKINS.length);
    }, Math.max(3, intervalSec) * 1000);

    return () => clearInterval(timer);
  }, [activeSkin]);

  let effectiveSkin: VisualizerSkin = activeSkin === 'dynamic' ? CYCLING_SKINS[dynamicIndex] : activeSkin;

  if (effectiveSkin === 'auto') {
    let genreMatchedSkin: VisualizerSkin | null = null;
    if (currentGenre) {
      const g = currentGenre.toLowerCase();
      if (g.includes('rock') || g.includes('metal') || g.includes('alternative') || g.includes('indie')) {
        genreMatchedSkin = 'bars';
      } else if (g.includes('electronic') || g.includes('dance') || g.includes('house') || g.includes('techno') || g.includes('edm') || g.includes('club') || g.includes('synth')) {
        genreMatchedSkin = 'circular';
      } else if (g.includes('jazz') || g.includes('blues') || g.includes('soul') || g.includes('classical') || g.includes('acoustic') || g.includes('ambient') || g.includes('relax') || g.includes('chill')) {
        genreMatchedSkin = 'waveform';
      } else if (g.includes('pop') || g.includes('rap') || g.includes('hip hop') || g.includes('rnb') || g.includes('reggae') || g.includes('disco')) {
        genreMatchedSkin = 'dots';
      }
    }

    if (genreMatchedSkin) {
      effectiveSkin = genreMatchedSkin;
    } else {
      const currentTheme = storageService.getTheme() as string;
      if (currentTheme === 'rock' || currentTheme === 'cyberpunk') {
        effectiveSkin = 'bars';
      } else if (currentTheme === 'jazz' || currentTheme === 'retro' || currentTheme === 'vintage') {
        effectiveSkin = 'waveform';
      } else if (currentTheme === 'oled' || currentTheme === 'neon' || currentTheme === 'synthwave') {
        effectiveSkin = 'circular';
      } else if (currentTheme === 'frosted-glass' || currentTheme === 'minimal' || currentTheme === 'clean') {
        effectiveSkin = 'dots';
      } else {
        effectiveSkin = 'bars';
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastDrawTime = 0;

    const render = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(render);

      const isBatterySaver = audioEngine.isBatterySavingActive();
      // In Battery Saver mode, lower refresh rate to 18-20 FPS (~55ms interval) to save CPU/GPU power
      const targetFpsInterval = isBatterySaver ? 55 : 1000 / 60;

      if (time - lastDrawTime < targetFpsInterval) return;
      lastDrawTime = time;

      const state = audioEngine.getState();
      const intensity = state.visualizerIntensity ?? 1.0;
      const timeWithSpeed = time * intensity;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const energies = audioEngine.getVisualizerEnergy(); // 8 bands normalized [0..1]
      const totalWidth = Math.max(10, rect.width);
      const totalHeight = Math.max(10, rect.height - (showLabels ? 16 : 0));
      const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;

      const colors = colorsRef.current;

      // ===========================
      // SKIN 1: BARS
      // ===========================
      if (effectiveSkin === 'bars') {
        const count = barCount === 8 ? 8 : (barCount === 16 ? 16 : 8);
        const gap = Math.max(2, Math.min(6, totalWidth / (count * 4)));
        const barWidth = Math.max(1, (totalWidth - (count - 1) * gap) / count);

        for (let i = 0; i < count; i++) {
          const energyIndex = i % 8;
          const energy = energies[energyIndex] || 0.05;
          const barHeight = Math.max(4, Math.min(totalHeight, energy * (totalHeight - 8)));
          const x = i * (barWidth + gap);
          const y = Math.max(0, totalHeight - barHeight);

          // Peak drop decay
          if (energy > (peaksRef.current[i] || 0)) {
            peaksRef.current[i] = energy;
          } else {
            peaksRef.current[i] = Math.max(0, (peaksRef.current[i] || 0) - 0.015);
          }
          const peakY = totalHeight - Math.max(4, (peaksRef.current[i] || 0) * (totalHeight - 8));

          const gradient = ctx.createLinearGradient(0, y, 0, totalHeight);
          gradient.addColorStop(0, colors.c1);
          gradient.addColorStop(0.5, colors.c2);
          gradient.addColorStop(1, colors.c3);

          ctx.fillStyle = gradient;
          const radius = Math.max(0, Math.min(barWidth / 2, 4));
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 1, 1]);
          } else {
            ctx.rect(x, y, barWidth, barHeight);
          }
          ctx.fill();

          ctx.fillStyle = colors.c1;
          ctx.fillRect(x, Math.max(0, peakY - 3), barWidth, 2);

          if (showLabels && i < 8) {
            ctx.fillStyle = '#64748B';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(BAND_LABELS[i].substring(0, 3).toUpperCase(), x + barWidth / 2, totalHeight + 12);
          }
        }
      }
      // ===========================
      // SKIN 2: CIRCULAR / RADAR
      // ===========================
      else if (effectiveSkin === 'circular') {
        const centerX = totalWidth / 2;
        const centerY = totalHeight / 2;
        const maxRadius = Math.min(centerX, centerY) * 0.9;

        // Central Orb
        const orbRadius = Math.max(4, 8 + avgEnergy * 12);
        const orbGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius);
        orbGradient.addColorStop(0, colors.c1);
        orbGradient.addColorStop(1, colors.c2);
        ctx.fillStyle = orbGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
        ctx.fill();

        // Radiating Radar Rings
        const ringCount = 5;
        for (let r = 1; r <= ringCount; r++) {
          const baseR = (maxRadius / ringCount) * r;
          const energy = energies[(r * 2) % 8] || 0.05;
          const dynamicR = baseR + energy * 8;

          ctx.strokeStyle = r % 2 === 0 ? colors.c2 : colors.c1;
          ctx.lineWidth = Math.max(1, energy * 2.5);
          ctx.globalAlpha = Math.max(0.15, Math.min(0.85, 0.3 + energy * 0.6));
          ctx.beginPath();
          ctx.arc(centerX, centerY, dynamicR, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Radar Needle / Sweep Beam
        const angle = (timeWithSpeed / 1000) % (Math.PI * 2);
        ctx.strokeStyle = colors.c1;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * maxRadius, centerY + Math.sin(angle) * maxRadius);
        ctx.stroke();
      }
      // ===========================
      // SKIN 3: WAVEFORM
      // ===========================
      else if (effectiveSkin === 'waveform') {
        const centerY = totalHeight / 2;
        const points = 16;
        const step = totalWidth / (points - 1);

        // Smooth wave path
        ctx.beginPath();
        ctx.moveTo(0, centerY);

        for (let i = 0; i < points; i++) {
          const energy = energies[i % 8] || 0.05;
          const offset = Math.sin((i / 2) + timeWithSpeed / 200) * (energy * (totalHeight * 0.42));
          const x = i * step;
          const y = centerY + offset;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = (i - 1) * step;
            const prevEnergy = energies[(i - 1) % 8] || 0.05;
            const prevY = centerY + Math.sin(((i - 1) / 2) + timeWithSpeed / 200) * (prevEnergy * (totalHeight * 0.42));
            const midX = (prevX + x) / 2;
            const midY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, midX, midY);
          }
        }

        const gradient = ctx.createLinearGradient(0, 0, totalWidth, 0);
        gradient.addColorStop(0, colors.c1);
        gradient.addColorStop(0.5, colors.c2);
        gradient.addColorStop(1, colors.c3);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = Math.max(2, 3 + avgEnergy * 3);
        ctx.stroke();

        // Mirrored bottom wave ribbon
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        for (let i = 0; i < points; i++) {
          const energy = energies[(points - i) % 8] || 0.05;
          const offset = -Math.sin((i / 2) + timeWithSpeed / 220) * (energy * (totalHeight * 0.35));
          const x = i * step;
          const y = centerY + offset;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = colors.c2;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // ===========================
      // SKIN 4: DOTS / MATRIX
      // ===========================
      else if (effectiveSkin === 'dots') {
        const cols = 12;
        const rows = 6;
        const colWidth = totalWidth / cols;
        const rowHeight = totalHeight / rows;
        const dotRadius = Math.max(1.5, Math.min(rowHeight, colWidth) * 0.28);

        for (let c = 0; c < cols; c++) {
          const energy = energies[c % 8] || 0.05;
          const activeRows = Math.round(energy * rows);

          for (let r = 0; r < rows; r++) {
            const rowIndexFromBottom = rows - 1 - r;
            const isLit = rowIndexFromBottom < activeRows;
            const x = c * colWidth + colWidth / 2;
            const y = r * rowHeight + rowHeight / 2;

            ctx.beginPath();
            ctx.arc(x, y, isLit ? dotRadius * 1.2 : dotRadius * 0.8, 0, Math.PI * 2);
            if (isLit) {
              ctx.fillStyle = r < 2 ? colors.c3 : r < 4 ? colors.c2 : colors.c1;
              ctx.globalAlpha = 0.95;
            } else {
              ctx.fillStyle = 'rgba(255,255,255,0.12)';
              ctx.globalAlpha = 0.4;
            }
            ctx.fill();
          }
        }
      }

      ctx.restore();
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [barCount, colorScheme, showLabels, effectiveSkin]);

  return (
    <div className={`relative w-full ${className}`} style={{ height: `${height}px` }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: '100%', height: `${height}px` }}
      />
    </div>
  );
};
