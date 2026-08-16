import React, { useState, useMemo } from 'react';
import { X, Search, Globe, Radio } from 'lucide-react';
import { CountryInfo } from '../../types';

interface CountryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  countries: CountryInfo[];
  selectedCountry: string;
  onSelectCountry: (countryName: string, countryCode: string) => void;
}

export const CountryPickerModal: React.FC<CountryPickerModalProps> = ({
  isOpen,
  onClose,
  countries,
  selectedCountry,
  onSelectCountry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    const q = searchQuery.toLowerCase().trim();
    return countries.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countries, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative my-auto w-full max-w-lg h-auto max-h-[85vh] sm:max-h-[88vh] rounded-3xl bg-[#12121a] border border-white/20 p-4 sm:p-6 shadow-2xl shadow-black/95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Select Country / Territory</h3>
              <p className="text-xs text-[var(--text-muted)]">Browse global stations by geographical origin</p>
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

        {/* Search Field */}
        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search 200+ countries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
          />
        </div>

        {/* Global Reset Button */}
        <div className="mt-3">
          <button
            onClick={() => {
              onSelectCountry('', '');
              onClose();
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
              !selectedCountry
                ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'bg-white/5 border-white/5 text-[var(--text-primary)] hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🌐</span>
              <span className="font-semibold text-sm">All Countries (Global Feed)</span>
            </div>
            <span className="text-xs text-[var(--text-muted)]">50,000+ stations</span>
          </button>
        </div>

        {/* Scrollable Countries List */}
        <div className="mt-3 overflow-y-auto flex-1 pr-1 space-y-1.5 min-h-[300px]">
          {filteredCountries.map((c) => {
            const isSelected = selectedCountry.toLowerCase() === c.name.toLowerCase();
            return (
              <button
                key={c.code || c.name}
                onClick={() => {
                  onSelectCountry(c.name, c.code);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--accent-primary)] font-semibold'
                    : 'bg-white/5 border-transparent text-[var(--text-primary)] hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.flag}</span>
                  <div>
                    <div className="text-sm font-medium leading-tight">{c.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)] font-mono">{c.code}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <Radio className="w-3 h-3" />
                  <span>{c.stationCount.toLocaleString()}</span>
                </div>
              </button>
            );
          })}
          {filteredCountries.length === 0 && (
            <div className="text-center py-10 text-xs text-[var(--text-muted)]">
              No matching countries found for "{searchQuery}"
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 text-white font-medium text-xs hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
