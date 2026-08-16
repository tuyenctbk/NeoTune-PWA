import React, { useState } from 'react';
import { X, Shield, Filter, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { storageService } from '../../services/storageService';
import { FilterConfig } from '../../types';

interface FilterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterChange: (config: FilterConfig) => void;
}

export const FilterManagerModal: React.FC<FilterManagerModalProps> = ({ isOpen, onClose, onFilterChange }) => {
  const [config, setConfig] = useState<FilterConfig>(() => storageService.getFilterConfig());
  const [newKeyword, setNewKeyword] = useState('');

  if (!isOpen) return null;

  const handleToggle = (key: keyof Pick<FilterConfig, 'filterAdultContent' | 'filterPoliticsContent' | 'filterReligiousContent' | 'filterBrokenStreams'>) => {
    const updated = { ...config, [key]: !config[key] };
    setConfig(updated);
    storageService.saveFilterConfig(updated);
    onFilterChange(updated);
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    const kw = newKeyword.trim().toLowerCase();
    if (!config.customBlockedKeywords.includes(kw)) {
      const updated = {
        ...config,
        customBlockedKeywords: [...config.customBlockedKeywords, kw]
      };
      setConfig(updated);
      storageService.saveFilterConfig(updated);
      onFilterChange(updated);
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    const updated = {
      ...config,
      customBlockedKeywords: config.customBlockedKeywords.filter(k => k !== kw)
    };
    setConfig(updated);
    storageService.saveFilterConfig(updated);
    onFilterChange(updated);
  };

  const handleUnblockStation = (id: string) => {
    const updated = {
      ...config,
      blockedStationIds: config.blockedStationIds.filter(sid => sid !== id)
    };
    setConfig(updated);
    storageService.saveFilterConfig(updated);
    onFilterChange(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative my-auto w-full max-w-lg h-auto max-h-[85vh] sm:max-h-[88vh] rounded-3xl bg-[#12121a] border border-white/20 p-4 sm:p-6 shadow-2xl shadow-black/95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Content Moderation</h3>
              <p className="text-xs text-[var(--text-muted)]">Customize stream safety & blocked filters</p>
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

        <div className="mt-4 overflow-y-auto pr-1 space-y-4 flex-1">
          {/* Automated Toggles */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
              Automated Content Filters
            </label>

            {[
              {
                id: 'filterAdultContent' as const,
                title: 'Filter Adult / Explicit Content (18+)',
                desc: 'Hides stations tagged with erotic, adult, or explicit labels',
                checked: config.filterAdultContent
              },
              {
                id: 'filterBrokenStreams' as const,
                title: 'Hide Broken & Offline Streams',
                desc: 'Automatically filters stations failing health check ping tests',
                checked: config.filterBrokenStreams
              },
              {
                id: 'filterPoliticsContent' as const,
                title: 'Demote Political & Election Talk',
                desc: 'Deprioritizes intense political discourse from top search results',
                checked: config.filterPoliticsContent
              },
              {
                id: 'filterReligiousContent' as const,
                title: 'Filter Religious & Sermon Channels',
                desc: 'Hides church, religious or devotional talk stations',
                checked: config.filterReligiousContent
              }
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggle(item.id)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-colors"
              >
                <div className="pr-4">
                  <div className="text-sm font-medium text-[var(--text-primary)]">{item.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{item.desc}</div>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                    item.checked ? 'bg-[var(--accent-primary)] text-black' : 'bg-white/10 text-transparent'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>

          {/* Custom Blocked Keywords */}
          <div className="pt-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">
              Custom Blocked Keywords / Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. sports, commentary, adverts"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-black font-semibold text-xs hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {/* Keyword Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {config.customBlockedKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-xs text-[var(--text-primary)]"
                >
                  <span>{kw}</span>
                  <button
                    onClick={() => handleRemoveKeyword(kw)}
                    className="text-[var(--text-muted)] hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {config.customBlockedKeywords.length === 0 && (
                <span className="text-xs text-[var(--text-muted)] italic">No custom blocked keywords added.</span>
              )}
            </div>
          </div>

          {/* Blocked Stations Management */}
          {config.blockedStationIds.length > 0 && (
            <div className="pt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">
                Manually Blocked Stations ({config.blockedStationIds.length})
              </label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {config.blockedStationIds.map((sid) => (
                  <div
                    key={sid}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300"
                  >
                    <span className="truncate font-mono">{sid}</span>
                    <button
                      onClick={() => handleUnblockStation(sid)}
                      className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-white text-[10px] font-semibold"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] text-black font-semibold text-xs hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
