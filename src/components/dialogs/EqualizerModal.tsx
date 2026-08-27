import React, { useState, useEffect } from 'react';
import { X, Sliders, Zap, Check, Volume2, Sparkles, Wand2, Music2, Radio } from 'lucide-react';
import { audioEngine, EQ_PRESETS } from '../../services/audioEngine';
import { storageService } from '../../services/storageService';
import { triggerHaptic } from '../../utils/haptics';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const [selectedPreset, setSelectedPreset] = useState('Balanced');
  const [isBoosterActive, setIsBoosterActive] = useState(false);
  const [isVolumeBoostActive, setIsVolumeBoostActive] = useState(() => audioEngine.getState().normalizeAudio);
  const [isAutoEQEnabled, setIsAutoEQEnabled] = useState(() => storageService.getAutoEQEnabled());
  const [currentStation, setCurrentStation] = useState(audioEngine.getState().currentStation);

  const suggestion = audioEngine.getSuggestedEQPreset(currentStation);

  useEffect(() => {
    if (isOpen) {
      const current = storageService.getEQPreset();
      setSelectedPreset(current);
      setIsBoosterActive(current === 'Audio Booster');
      setIsVolumeBoostActive(audioEngine.getState().normalizeAudio);
      setIsAutoEQEnabled(storageService.getAutoEQEnabled());
      setCurrentStation(audioEngine.getState().currentStation);
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setIsVolumeBoostActive(state.normalizeAudio);
      setCurrentStation(state.currentStation);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleSelectPreset = (name: string) => {
    triggerHaptic('selection');
    setSelectedPreset(name);
    const booster = name === 'Audio Booster';
    setIsBoosterActive(booster);
    audioEngine.applyEQPreset(name, booster);
  };

  const handleApplySuggestion = () => {
    triggerHaptic('preset');
    handleSelectPreset(suggestion.preset);
  };

  const handleToggleAutoEQ = () => {
    triggerHaptic('light');
    const nextVal = !isAutoEQEnabled;
    setIsAutoEQEnabled(nextVal);
    storageService.setAutoEQEnabled(nextVal);
    if (nextVal && currentStation) {
      audioEngine.detectAndApplyAutoEQ(currentStation);
      setSelectedPreset(suggestion.preset);
    }
  };

  const handleToggleBooster = () => {
    triggerHaptic('light');
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
    triggerHaptic('light');
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

        <div className="overflow-y-auto flex-1 pr-1 overscroll-contain space-y-3.5 mt-3 sm:mt-4">
          {/* Smart Genre-Based EQ Suggestion Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-pink-500/10 border border-indigo-500/30 shadow-lg relative overflow-hidden space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 shrink-0">
                  <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                      Genre-Matched EQ Recommendation
                    </span>
                    {currentStation && (
                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 text-[10px] font-semibold truncate border border-indigo-400/30">
                        {currentStation.genre || 'Live Radio'}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5 truncate">
                    <span>Suggested:</span>
                    <span className="text-[var(--accent-primary)] font-black text-base">
                      {suggestion.preset}
                    </span>
                  </h4>
                </div>
              </div>

              <button
                onClick={handleApplySuggestion}
                disabled={selectedPreset === suggestion.preset}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedPreset === suggestion.preset
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                    : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-md shadow-indigo-500/30'
                }`}
              >
                {selectedPreset === suggestion.preset ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Applied</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Apply Preset</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-indigo-100/90 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
              {suggestion.reason}
            </p>

            {/* Auto-Match on Station Switch Toggle */}
            <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-indigo-300" />
                <span className="text-xs font-medium text-indigo-100">
                  Auto-switch EQ curve when changing stations
                </span>
              </div>
              <button
                onClick={handleToggleAutoEQ}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer shrink-0 ${
                  isAutoEQEnabled ? 'bg-indigo-500' : 'bg-white/10'
                }`}
                aria-label="Toggle Auto-EQ on station switch"
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${
                    isAutoEQEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

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
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5 block">
              Acoustic Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.keys(EQ_PRESETS).map((presetKey) => {
                const isSelected = selectedPreset === presetKey;
                const isSuggested = suggestion.preset === presetKey;
                return (
                  <button
                    key={presetKey}
                    onClick={() => handleSelectPreset(presetKey)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-sm'
                        : 'bg-white/5 border-transparent text-[var(--text-muted)] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate">{presetKey}</span>
                      {isSuggested && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" title="Recommended for current genre" />
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5-Band Visualizer Sliders */}
          <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
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
