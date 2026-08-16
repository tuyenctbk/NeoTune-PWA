import React, { useState, useEffect } from 'react';
import { X, Wifi, Activity, Cpu, RefreshCw, Smartphone, ShieldCheck, Zap, Gauge } from 'lucide-react';
import { apiService } from '../../services/apiService';
import { storageService } from '../../services/storageService';
import { audioEngine } from '../../services/audioEngine';
import { RemoteConfig } from '../../types';

interface NetworkConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkConfigModal: React.FC<NetworkConfigModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<RemoteConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionType, setConnectionType] = useState('Wi-Fi (HD Streaming)');
  const [dataSaverBitrate, setDataSaverBitrate] = useState<string>(() => storageService.getDataSaverBitrate());

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setDataSaverBitrate(storageService.getDataSaverBitrate());
      apiService.getRemoteConfig().then((cfg) => {
        setConfig(cfg);
        setLoading(false);
      });

      if ('connection' in navigator) {
        const conn: any = (navigator as any).connection;
        if (conn) {
          if (conn.type === 'cellular') setConnectionType('Cellular (Balanced Adaptive)');
          else if (conn.effectiveType === '4g') setConnectionType('High-Speed 4G/5G');
          else if (conn.effectiveType === '3g' || conn.effectiveType === '2g') setConnectionType('Metered / Saver Mode');
        }
      }
    }
  }, [isOpen]);

  const handleBitrateChange = (bitrate: string) => {
    setDataSaverBitrate(bitrate);
    audioEngine.setDataSaverBitrate(bitrate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative my-auto w-full max-w-md h-auto max-h-[85vh] sm:max-h-[90vh] rounded-3xl bg-[#12121a] border border-white/20 p-4 sm:p-6 shadow-2xl shadow-black/95 flex flex-col">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Network & Stream Bitrate</h3>
              <p className="text-xs text-[var(--text-muted)]">Data saver, adaptive buffers & stream relay</p>
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

        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2 flex-1">
            <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent-primary)]" />
            <span>Connecting to NeoTune Gateway...</span>
          </div>
        ) : (
          <div className="mt-4 space-y-3.5 overflow-y-auto flex-1 pr-1 overscroll-contain">
            {/* Live Network State Badge */}
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wifi className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-xs text-cyan-300 font-semibold">Active Audio Pipe</div>
                  <div className="text-sm font-bold text-[var(--text-primary)]">{connectionType}</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-mono font-bold">
                {dataSaverBitrate === 'auto' ? 'LOSSLESS' : `${dataSaverBitrate} KBPS SAVER`}
              </span>
            </div>

            {/* Force Low Bitrate Stream / Data Saver Setting */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">Stream Bitrate & Data Saver</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {dataSaverBitrate === 'auto' ? 'Auto High Quality' : `Cap: ${dataSaverBitrate} kbps`}
                </span>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Limit audio bandwidth for metered mobile data plans. High bitrate streams will be automatically transcoded by the relay proxy.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleBitrateChange('auto')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    dataSaverBitrate === 'auto'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-sm'
                      : 'bg-black/20 border-white/5 text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold text-white">Auto (Full Quality)</div>
                  <div className="text-[10px] opacity-70 mt-0.5">Original stream bitrate</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleBitrateChange('128')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    dataSaverBitrate === '128'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-sm'
                      : 'bg-black/20 border-white/5 text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold text-white">128 kbps</div>
                  <div className="text-[10px] opacity-70 mt-0.5">Standard (~57 MB/hr)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleBitrateChange('64')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    dataSaverBitrate === '64'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-sm'
                      : 'bg-black/20 border-white/5 text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold text-emerald-300">64 kbps (Saver)</div>
                  <div className="text-[10px] opacity-70 mt-0.5">Mobile data (~28 MB/hr)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleBitrateChange('32')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    dataSaverBitrate === '32'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-sm'
                      : 'bg-black/20 border-white/5 text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold text-white">32 kbps (Ultra Low)</div>
                  <div className="text-[10px] opacity-70 mt-0.5">2G / Low coverage (~14 MB/hr)</div>
                </button>
              </div>
            </div>

            {/* Buffer Telemetry */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Min Audio Buffer</div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1">
                  {config?.min_buffer_ms_cellular ? `${config.min_buffer_ms_cellular / 1000}s` : '15s'}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">Anti-jitter dynamic burst</div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Max Audio Buffer</div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1">
                  {config?.max_buffer_ms_cellular ? `${config.max_buffer_ms_cellular / 1000}s` : '45s'}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">Sub-second recovery pool</div>
              </div>
            </div>

            {/* Remote Config Details */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Client Core Version:</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{config?.latest_version_name || '3.1.0'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Auto Adaptive Bitrate:</span>
                <span className="text-green-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Enabled
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Ad-Free Stream Mode:</span>
                <span className="text-[var(--accent-primary)] font-semibold">100% Uninterrupted</span>
              </div>
              {config?.update_notes && (
                <div className="pt-2 border-t border-white/5 text-[11px] text-[var(--text-muted)] leading-relaxed">
                  <strong className="text-[var(--text-primary)]">Release Notes:</strong> {config.update_notes}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
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
