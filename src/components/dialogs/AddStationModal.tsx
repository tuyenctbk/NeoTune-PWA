import React, { useState } from 'react';
import { X, PlusCircle, Radio, Play, Check, AlertCircle, QrCode, Upload, Copy, Wand2, Sparkles } from 'lucide-react';
import { storageService } from '../../services/storageService';
import { audioEngine } from '../../services/audioEngine';
import { RadioStation } from '../../types';

interface AddStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStationAdded: (station: RadioStation) => void;
}

export const AddStationModal: React.FC<AddStationModalProps> = ({ isOpen, onClose, onStationAdded }) => {
  const [name, setName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [genre, setGenre] = useState('Custom Stream');
  const [country, setCountry] = useState('Global');
  const [imageUrl, setImageUrl] = useState('');
  const [bitrate, setBitrate] = useState('128 kbps');
  const [codec, setCodec] = useState('MP3');
  const [customTagsInput, setCustomTagsInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showQRUrl, setShowQRUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);

  if (!isOpen) return null;

  const handleAutoFetchMetadata = async () => {
    if (!streamUrl.trim()) {
      setErrorMsg('Please enter a stream URL first');
      return;
    }
    setErrorMsg('');
    setFetchingMetadata(true);
    try {
      const urlObj = new URL(streamUrl.trim());
      const domain = urlObj.hostname.replace(/^www\./, '');
      
      // 1. Guess Station Name if empty
      let finalName = name.trim();
      if (!finalName) {
        let guessedName = '';
        // Try to get name from path (e.g. /groovesalad-128-mp3)
        const pathParts = urlObj.pathname.split('/').filter(p => p && !p.endsWith('.mp3') && !p.endsWith('.pls') && !p.endsWith('.m3u8') && !p.endsWith('.aac'));
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          guessedName = lastPart
            .replace(/[-_]/g, ' ')
            .replace(/\d+/, '') // remove bitrates
            .trim()
            .replace(/\b\w/g, c => c.toUpperCase());
        }
        
        const domainName = domain.split('.')[0].replace(/\b\w/g, c => c.toUpperCase());
        if (guessedName) {
          finalName = `${domainName} - ${guessedName}`;
        } else {
          finalName = domainName;
        }
        setName(finalName);
      }

      // 2. Guess Genre from URL if empty
      if (!genre.trim() || genre === 'Custom Stream') {
        const g = streamUrl.toLowerCase();
        let guessedGenre = 'Custom Stream';
        if (g.includes('jazz')) guessedGenre = 'Jazz';
        else if (g.includes('rock')) guessedGenre = 'Rock';
        else if (g.includes('pop')) guessedGenre = 'Pop';
        else if (g.includes('chill') || g.includes('lofi') || g.includes('ambient')) guessedGenre = 'Ambient';
        else if (g.includes('dance') || g.includes('electronic') || g.includes('house') || g.includes('club') || g.includes('synth')) guessedGenre = 'Electronic';
        else if (g.includes('news')) guessedGenre = 'News';
        else if (g.includes('classic')) guessedGenre = 'Classical';
        setGenre(guessedGenre);
      }

      // 3. Fetch Logo Icon from logo services (Clearbit / Google favicon)
      const clearbitUrl = `https://logo.clearbit.com/${domain}`;
      const googleFaviconUrl = `https://www.google.com/s2/favicons?sz=256&domain=${domain}`;
      
      const testImg = new Image();
      testImg.onload = () => {
        setImageUrl(clearbitUrl);
        setFetchingMetadata(false);
      };
      testImg.onerror = () => {
        setImageUrl(googleFaviconUrl);
        setFetchingMetadata(false);
      };
      testImg.src = clearbitUrl;

    } catch (e) {
      setErrorMsg('Could not parse domain for auto-fetch. Please check the URL format.');
      setFetchingMetadata(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (PNG, JPG, WEBP, etc.)');
      return;
    }
    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleGenerateQRCode = () => {
    if (!name.trim()) {
      setErrorMsg('Please enter a station name first');
      return;
    }
    if (!streamUrl.trim()) {
      setErrorMsg('Please enter a stream URL first');
      return;
    }
    setErrorMsg('');

    const tagsArray = customTagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const stationData = {
      name: name.trim(),
      streamUrl: streamUrl.trim(),
      genre: genre.trim() || 'Custom Stream',
      country: country.trim() || 'Global',
      imageUrl: imageUrl.trim() || '',
      customTags: tagsArray
    };

    const importUrl = `${window.location.origin}${window.location.pathname}?import_station=${encodeURIComponent(JSON.stringify(stationData))}`;
    setShowQRUrl(importUrl);
  };

  const handleTestStream = async () => {
    if (!streamUrl.trim()) {
      setErrorMsg('Please enter a stream URL first');
      return;
    }
    setErrorMsg('');
    setTesting(true);
    setTestSuccess(null);

    try {
      const tempAudio = new Audio(streamUrl);
      tempAudio.volume = 0.5;
      const playPromise = tempAudio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        setTestSuccess(true);
        setTimeout(() => {
          tempAudio.pause();
        }, 2000);
      }
    } catch {
      setTestSuccess(false);
      setErrorMsg('Could not establish audio stream. Check URL or HTTPS/HTTP.');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveStation = () => {
    if (!name.trim()) {
      setErrorMsg('Please enter a station name');
      return;
    }
    if (!streamUrl.trim()) {
      setErrorMsg('Please enter a stream URL');
      return;
    }

    const tagsArray = customTagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const newStation: RadioStation = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      genre: genre.trim() || 'Custom Stream',
      country: country.trim() || 'Global',
      streamUrl: streamUrl.trim(),
      imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
      bitrate: bitrate || '128 kbps',
      codec: codec || 'MP3',
      isFavorite: true,
      isCustom: true,
      customTags: tagsArray,
      lastListenedTimestamp: Date.now()
    };

    storageService.addCustomStation(newStation);
    storageService.toggleFavorite(newStation);
    onStationAdded(newStation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative my-auto w-full max-w-md h-auto max-h-[85vh] sm:max-h-[90vh] rounded-3xl bg-[#12121a] border border-white/20 p-4 sm:p-6 shadow-2xl shadow-black/95 flex flex-col">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shrink-0">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Add Custom Station</h3>
              <p className="text-xs text-[var(--text-muted)]">Add any Icecast, SHOUTcast, or HLS stream</p>
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

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-4 space-y-3.5 overflow-y-auto flex-1 pr-1 overscroll-contain">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Station Name *</label>
            <input
              type="text"
              placeholder="e.g. My Favorite Chillout FM"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Stream URL (Direct, PLS, M3U8) *</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://stream.example.com/live.mp3"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleAutoFetchMetadata}
                disabled={fetchingMetadata}
                className="px-3 py-2 rounded-xl bg-indigo-500/15 text-indigo-200 border border-indigo-500/20 text-xs font-semibold hover:bg-indigo-500/25 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                title="Automatically fetch logo, name, and genre from stream domain"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {fetchingMetadata ? 'Fetching...' : 'Auto-fetch'}
              </button>
              <button
                type="button"
                onClick={handleTestStream}
                disabled={testing}
                className="px-3 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white hover:bg-white/20 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                {testing ? 'Testing...' : 'Test'}
              </button>
            </div>
            {testSuccess === true && (
              <div className="text-[11px] text-green-400 mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Stream verified and playable!
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Genre / Tag</label>
              <input
                type="text"
                placeholder="e.g. Synthwave"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Country</label>
              <input
                type="text"
                placeholder="e.g. United States"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
          </div>

          {/* Custom Artwork File Dropzone and URL Input */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Cover Artwork / Logo (Optional)</label>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => document.getElementById('artwork-file-input')?.click()}
              className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                isDragOver
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                  : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
              }`}
            >
              <input
                id="artwork-file-input"
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              {imageUrl ? (
                <div className="flex items-center gap-3 w-full">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover border border-white/15"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-white truncate block">Artwork selected</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageUrl('');
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-medium"
                    >
                      Remove / Clear
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-[var(--text-muted)]" />
                  <div className="text-center">
                    <span className="text-xs font-bold text-white block">Drag & drop artwork here, or browse</span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Accepts image files or paste URL below</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-2">
              <input
                type="url"
                placeholder="Or paste artwork URL (e.g. https://example.com/logo.png)"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Custom Tags (Comma separated)</label>
            <input
              type="text"
              placeholder="e.g. Chill, Late Night, Lo-Fi"
              value={customTagsInput}
              onChange={(e) => setCustomTagsInput(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleGenerateQRCode}
            className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-500/30 font-semibold text-xs hover:bg-purple-500/35 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Generate QR Code</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 text-white font-medium text-xs hover:bg-white/20 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveStation}
              className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] text-black font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              Save & Add to Favorites
            </button>
          </div>
        </div>

        {/* QR Code Scannable Overlay dialog container */}
        {showQRUrl && (
          <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 text-center animate-fadeIn rounded-none sm:rounded-3xl">
            <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-3">
              <QrCode className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Scan & Share Station</h3>
            <p className="text-[11px] text-[var(--text-muted)] max-w-xs mb-5">
              Scan this QR code with any smartphone camera to instantly import, open, and play your custom station!
            </p>

            <div className="p-4 bg-white rounded-2xl shadow-xl shadow-black mb-5">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(showQRUrl)}`}
                alt="Station QR Code"
                className="w-48 h-48 block"
              />
            </div>

            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(showQRUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="w-full py-2.5 rounded-xl bg-purple-500/25 text-purple-200 hover:bg-purple-500/35 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'Copied Share Link!' : 'Copy Share Link'}</span>
              </button>
              <button
                onClick={() => setShowQRUrl(null)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
              >
                Go Back / Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
