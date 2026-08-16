import React, { useState, useEffect } from 'react';
import { X, Sliders, Zap, Check, Volume2 } from 'lucide-react';
import { audioEngine, EQ_PRESETS } from '../../services/audioEngine';
import { storageService } from '../../services/storageService';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const [selectedPreset, setSelectedPreset] = useState('Balanced');
  const [isBoosterActive, setIsBoosterActive] = useState(false);
  const [isVolumeBoostActive, setIsVolumeBoostActive] = useState(() => audioEngine.getState().normalizeAudio);

  useEffect(() => {
    if (isOpen) {
      const current = storageService.getEQPreset();
      setSelectedPreset(current);
      setIsBoosterActive(current === 'Audio Booster');
      setIsVolumeBoostActive(audioEngine.getState().normalizeAudio);
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setIsVolumeBoostActive(state.normalizeAudio);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleSelectPreset = (name: string) => {
    setSelectedPreset(name);
    const booster = name === 'Audio Booster';
    setIsBoosterActive(booster);
    audioEngine.applyEQPreset(name, booster);
  };

  const handleToggleBooster = () => {
    const nextBooster = !isBoosterActive;
    setIsBoosterActive(nextBooster);
    if (nextBooster) {
      setSelectedPreset('Audio Booster');
      audioEngine.applyEQPreset('Audio Booster', true);
    } else {
      setSelectedPreset('Balanced');
      audioEngine.applyEQPreset('Balanced', false);
    }
  };

  const handleToggleVolumeBoost = () => {
    const nextVal = !isVolumeBoostActive;
    setIsVolumeBoostActive(nextVal);
    audioEngine.setNormalizeAudio(nextVal);
  };

  const currentPresetObj = EQ_PRESETS[selectedPreset] || EQ_PRESETS['Balanced'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative my-auto w-full max-w-lg h-auto max-h-[85vh] sm:max-h-[90vh] rounded-3xl bg-[#12121a] border border-white/20 p-4 sm:p-6 shadow-2xl shadow-black/95 flex flex-col">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Digital Equalizer & DSP</h3>
              <p className="text-xs text-[var(--text-muted)]">5-Band Parametric Filter & Preamp Limiter</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 ml-auto"
            aria-label="Close Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 overscroll-contain space-y-4 mt-3 sm:mt-4">
        {/* Volume Boost & Dynamic Compressor Toggle */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-cyan-500/15 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isVolumeBoostActive ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/30' : 'bg-white/10 text-emerald-300'}`}>
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                Volume Boost & Compressor
                {isVolumeBoostActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 font-bold border border-emerald-400/40">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Normalizes low-volume radio stations with dynamic compression without physical button adjustments
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleVolumeBoost}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              isVolumeBoostActive
                ? 'bg-emerald-400 text-black shadow-md shadow-emerald-400/40'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isVolumeBoostActive ? 'Enabled' : 'Enable'}
          </button>
        </div>

        {/* Audio Booster Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isBoosterActive ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30' : 'bg-white/10 text-amber-300'}`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                +6 dB Audio Booster
                {isBoosterActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40">ACTIVE</span>}
              </div>
              <p className="text-xs text-[var(--text-muted)]">Boost low-power streams with automatic peak limiter</p>
            </div>
          </div>
          <button
            onClick={handleToggleBooster}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isBoosterActive
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/40'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isBoosterActive ? 'Enabled' : 'Boost'}
          </button>
        </div>

        {/* Preset Selector Chips */}
        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5 block">
            Acoustic Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.keys(EQ_PRESETS).map((presetKey) => {
              const isSelected = selectedPreset === presetKey;
              return (
                <button
                  key={presetKey}
                  onClick={() => handleSelectPreset(presetKey)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-sm'
                      : 'bg-white/5 border-transparent text-[var(--text-muted)] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="truncate">{presetKey}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Band Visualizer Sliders */}
        <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-3 text-xs text-[var(--text-muted)]">
            <span>Bass Response</span>
            <span>Midrange Clarity</span>
            <span>Treble Air</span>
          </div>

          <div className="grid grid-cols-5 gap-2.5 text-center">
            {[
              { label: '60 Hz', val: currentPresetObj.band60Hz, name: 'Sub' },
              { label: '230 Hz', val: currentPresetObj.band230Hz, name: 'Bass' },
              { label: '910 Hz', val: currentPresetObj.band910Hz, name: 'Mids' },
              { label: '3.6 kHz', val: currentPresetObj.band3600Hz, name: 'High' },
              { label: '14 kHz', val: currentPresetObj.band14000Hz, name: 'Air' }
            ].map((band, idx) => {
              const heightPercent = ((band.val + 6) / 12) * 100;
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[11px] font-bold text-[var(--accent-primary)]">
                    {band.val > 0 ? `+${band.val}` : band.val} dB
                  </span>
                  <div className="relative w-2 h-20 bg-black/40 rounded-full overflow-hidden flex flex-col justify-end">
                    <div
                      className="w-full rounded-full transition-all duration-300"
                      style={{
                        height: `${Math.max(10, heightPercent)}%`,
                        background: 'linear-gradient(to top, var(--accent-primary), var(--accent-secondary))'
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--text-primary)]">{band.label}</span>
                  <span className="text-[9px] text-[var(--text-muted)]">{band.name}</span>
                </div>
              );
            })}
          </div>
        </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] text-black font-semibold text-xs hover:opacity-90 transition-opacity min-h-[44px] cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
