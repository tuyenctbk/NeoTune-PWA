import React, { useState, useEffect } from 'react';
import { X, Heart, Coffee, ShieldCheck, CheckCircle2, Copy, ExternalLink, QrCode, Sparkles, CreditCard, DollarSign, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import { storageService } from '../../services/storageService';
import { haptics } from '../../utils/haptics';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'iap' | 'paypal' | 'kofi';
  triggerReason?: string;
}

export const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'iap',
  triggerReason
}) => {
  const [activeTab, setActiveTab] = useState<'iap' | 'paypal' | 'kofi'>(initialTab);
  const [isSupporter, setIsSupporter] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // PayPal Preset State
  const [paypalAmount, setPaypalAmount] = useState<number>(5);
  const [customPaypalAmount, setCustomPaypalAmount] = useState<string>('');
  const [paypalQrUrl, setPaypalQrUrl] = useState<string>('');

  // IAP Simulation State
  const [iapProcessing, setIapProcessing] = useState<boolean>(false);
  const [iapSuccess, setIapSuccess] = useState<boolean>(false);
  const [selectedIapTier, setSelectedIapTier] = useState<number>(4.99);

  const PAYPAL_USERNAME = 'tuyenphamvn';

  useEffect(() => {
    if (isOpen) {
      setIsSupporter(storageService.getIsSupporter());
      setActiveTab(initialTab);
      storageService.recordAutoPromptShown();
    }
  }, [isOpen, initialTab]);

  // Generate PayPal Live QR Code
  useEffect(() => {
    const finalAmt = customPaypalAmount && !isNaN(parseFloat(customPaypalAmount))
      ? parseFloat(customPaypalAmount)
      : paypalAmount;

    const paypalUrl = `https://paypal.me/${PAYPAL_USERNAME}/${finalAmt}`;
    QRCode.toDataURL(paypalUrl, { margin: 1, width: 220, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => setPaypalQrUrl(url))
      .catch(() => setPaypalQrUrl(''));
  }, [paypalAmount, customPaypalAmount]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    haptics.light();
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSimulateIAP = (price: number) => {
    setSelectedIapTier(price);
    setIapProcessing(true);
    haptics.selection();

    setTimeout(() => {
      setIapProcessing(false);
      setIapSuccess(true);
      storageService.setIsSupporter(true);
      setIsSupporter(true);
      haptics.success();
    }, 1200);
  };

  const currentPaypalUrl = `https://paypal.me/${PAYPAL_USERNAME}/${customPaypalAmount || paypalAmount}`;
  const kofiUrl = 'https://ko-fi.com/neotune';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative my-auto w-full max-w-lg rounded-3xl bg-[#12121e] border border-white/15 p-4 sm:p-6 shadow-2xl shadow-black/90 flex flex-col max-h-[90vh] text-white overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Heart className="w-5 h-5 text-white fill-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Support NeoTune</h3>
                {isSupporter && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                    Supporter
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60">100% Offline-First, Ad-Free & Independent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {triggerReason && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{triggerReason}</span>
          </div>
        )}

        {/* Channel Navigation Tabs */}
        <div className="mt-4 grid grid-cols-3 gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 shrink-0 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('iap'); haptics.selection(); }}
            className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'iap'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span className="text-[11px]">Google Play</span>
          </button>
          <button
            onClick={() => { setActiveTab('paypal'); haptics.selection(); }}
            className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'paypal'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-[11px]">PayPal</span>
          </button>
          <button
            onClick={() => { setActiveTab('kofi'); haptics.selection(); }}
            className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'kofi'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span className="text-[11px]">Ko-fi</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 text-xs space-y-4">
          
          {/* TAB 1: GOOGLE PLAY IAP */}
          {activeTab === 'iap' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Google Play Billing Client</span>
                </div>
                <p className="text-white/70 leading-relaxed text-[11px]">
                  Supports standard Google Pay 1-tap checkout. Completing any purchase permanently grants the <strong>Active Supporter Badge</strong> and suppresses promotional prompts across devices.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider block">Select Support Tier</label>
                
                {/* Tier 1 */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white text-sm">Tier 1 — Espresso Supporter</div>
                    <div className="text-white/60 text-[11px]">$0.99 one-time contribution</div>
                  </div>
                  <button
                    onClick={() => handleSimulateIAP(0.99)}
                    disabled={iapProcessing}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    $0.99
                  </button>
                </div>

                {/* Tier 2 */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 to-rose-500/15 border border-amber-500/30 hover:border-amber-500 transition-all flex items-center justify-between gap-3 relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="font-bold text-amber-200 text-sm flex items-center gap-1.5">
                      <span>Tier 2 — NeoTune Backer</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black text-[9px] font-extrabold uppercase">Popular</span>
                    </div>
                    <div className="text-white/70 text-[11px]">$4.99 one-time contribution</div>
                  </div>
                  <button
                    onClick={() => handleSimulateIAP(4.99)}
                    disabled={iapProcessing}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-300 hover:to-rose-300 text-black font-extrabold text-xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50 shadow-md shadow-amber-500/20"
                  >
                    $4.99
                  </button>
                </div>

                {/* Tier 3 */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-rose-500/40 transition-all flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white text-sm">Tier 3 — Lifetime Patron</div>
                    <div className="text-white/60 text-[11px]">$19.99 ultimate patron support</div>
                  </div>
                  <button
                    onClick={() => handleSimulateIAP(19.99)}
                    disabled={iapProcessing}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    $19.99
                  </button>
                </div>
              </div>

              {iapProcessing && (
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-center flex items-center justify-center gap-2 font-bold animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Connecting to Google Play Billing Service...</span>
                </div>
              )}

              {(iapSuccess || isSupporter) && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-[11px] leading-relaxed">
                    <strong className="text-emerald-300 block text-xs">Permanent Supporter Active!</strong>
                    Thank you! Prompts are permanently silenced and your Supporter Badge is active in the navigation header.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYPAL & LIVE QR CODE */}
          {activeTab === 'paypal' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                {paypalQrUrl ? (
                  <div className="p-2 bg-white rounded-2xl shrink-0 shadow-lg shadow-black/50">
                    <img src={paypalQrUrl} alt="PayPal QR Code" className="w-32 h-32 object-contain" />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 shrink-0">
                    <QrCode className="w-8 h-8" />
                  </div>
                )}
                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <div className="font-bold text-white text-sm">Scan or Tap to Donate</div>
                  <p className="text-white/60 text-[11px] leading-relaxed">
                    Scan this dynamic QR code with your phone camera or banking app, or select a preset amount below.
                  </p>
                  
                  {/* Preset buttons */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                    {[3, 5, 10].map(amt => (
                      <button
                        key={amt}
                        onClick={() => { setPaypalAmount(amt); setCustomPaypalAmount(''); haptics.selection(); }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          paypalAmount === amt && !customPaypalAmount
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom amount input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white/70">Custom Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter custom amount"
                    value={customPaypalAmount}
                    onChange={(e) => setCustomPaypalAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={currentPaypalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-blue-600/30"
                >
                  <span>Open PayPal (${customPaypalAmount || paypalAmount})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleCopy(currentPaypalUrl, 'paypal')}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey === 'paypal' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: KO-FI WEB PLATFORM */}
          {activeTab === 'kofi' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-400 text-black flex items-center justify-center font-extrabold text-lg shadow-md">
                    ☕
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">Buy a Coffee on Ko-fi</div>
                    <div className="text-white/60 text-[11px]">The ultimate indie developer tip jar platform</div>
                  </div>
                </div>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  Ko-fi lets open-source enthusiasts support developers with zero platform fees. Every coffee helps maintain high-speed global stream proxying and updates!
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={kofiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-cyan-500/20"
                >
                  <span>Visit Ko-fi Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleCopy(kofiUrl, 'kofi')}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey === 'kofi' ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50 shrink-0">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            100% Direct & Transparent
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
