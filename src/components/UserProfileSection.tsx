import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Cloud,
  CheckCircle2,
  Camera,
  Save,
  LogOut,
  LogIn,
  Sparkles,
  Copy,
  Check,
  Radio,
  Bell,
  Heart,
  Shield,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { firebaseService } from '../services/firebaseService';
import { storageService } from '../services/storageService';
import { triggerHaptic } from '../utils/haptics';

interface UserProfileSectionProps {
  currentUser: UserProfile | null;
  onOpenAuth?: () => void;
}

const PRESET_AVATARS = [
  { id: 'synth', name: 'Cyber Synth', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160&auto=format&fit=crop&q=80' },
  { id: 'vinyl', name: 'Vinyl DJ', url: 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?w=160&auto=format&fit=crop&q=80' },
  { id: 'radio', name: 'Retro Broadcast', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=160&auto=format&fit=crop&q=80' },
  { id: 'studio', name: 'Studio Master', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160&auto=format&fit=crop&q=80' },
  { id: 'headphones', name: 'Neon Beat', url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=160&auto=format&fit=crop&q=80' },
  { id: 'lofi', name: 'Lo-Fi Chill', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=160&auto=format&fit=crop&q=80' }
];

export const UserProfileSection: React.FC<UserProfileSectionProps> = ({
  currentUser,
  onOpenAuth
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(currentUser);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isCustomUrlOpen, setIsCustomUrlOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedUid, setCopiedUid] = useState(false);
  const [conflict, setConflict] = useState<any | null>(null);
  const [resolving, setResolving] = useState(false);

  // Cloud sync stats
  const [favCount, setFavCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);

  // Subscribe to sync conflicts
  useEffect(() => {
    const unsubConflict = firebaseService.subscribeConflict((currentConflict) => {
      setConflict(currentConflict);
    });
    return () => {
      unsubConflict();
    };
  }, []);

  useEffect(() => {
    setProfile(currentUser);
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setPhotoURL(currentUser.photoURL || '');
    }
  }, [currentUser]);

  // Subscribe to real-time user profile doc from Firestore
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubProfile = firebaseService.subscribeUserProfile((updated) => {
      if (updated) {
        setProfile(updated);
        setDisplayName(updated.displayName || '');
        setPhotoURL(updated.photoURL || '');
      }
    });

    // Fetch stats
    firebaseService.fetchFavoritesFromCloud().then(favs => setFavCount(favs.length));
    firebaseService.getCloudRecentStations().then(recents => setRecentCount(recents.length));

    return () => {
      unsubProfile();
    };
  }, [currentUser?.uid]);

  const handleCopyUid = () => {
    if (profile?.uid) {
      navigator.clipboard.writeText(profile.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setErrorMsg('Display name cannot be empty');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      await firebaseService.updateUserProfile({
        displayName: trimmedName,
        photoURL: photoURL.trim()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseService.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-[var(--surface-main)]/90 to-[var(--accent-primary)]/10 backdrop-blur-xl border border-emerald-500/20 shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Cloud User Profile & Multi-Device Sync
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Guest Mode
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 max-w-xl">
                Sign in to customize your cross-platform avatar and display name, and seamlessly synchronize your favorite radio stations, 10 recent stations, and recurring alarms across Web, Android, iOS, and Desktop.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-400 to-teal-500 text-black hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Create Account</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                firebaseService.simulateConflict();
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 transition-all cursor-pointer flex items-center gap-1.5"
              title="Generate a dummy local vs cloud sync conflict to test manual version resolution"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Simulate Conflict</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentAvatarUrl = photoURL || profile?.photoURL || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160&auto=format&fit=crop&q=80';

  return (
    <div className="p-6 rounded-3xl bg-[var(--surface-main)]/80 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-6">
      {/* Header with Title & Sign Out */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--text-primary)]">User Profile & Cloud Sync</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Firestore Active
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Your profile data and preferences sync in real-time across all your logged-in devices
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Conflict Resolution UI */}
      {conflict && (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-[var(--text-primary)] space-y-4 shadow-xl shadow-amber-500/5 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-base font-bold text-amber-300">Sync Conflict Detected</h4>
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                Your local device preferences and cloud-synced profile have diverged. Choose which dataset to preserve. The selected copy will overwrite and synchronize with the other.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Local Copy column */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Option A: Local Device</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/10 text-[var(--text-muted)]">
                    On this device
                  </span>
                </div>
                <div className="mt-2.5 space-y-1">
                  <div className="text-sm font-extrabold text-[var(--accent-primary)]">
                    {conflict.localFavorites?.length || 0} Saved Stations
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">
                    {conflict.localFavorites && conflict.localFavorites.length > 0
                      ? conflict.localFavorites.slice(0, 3).map((s: any) => s.name).join(', ')
                      : 'No favorites'}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono pt-1">
                    Last Modified: {conflict.localUpdatedAt ? new Date(conflict.localUpdatedAt).toLocaleString() : 'Just now'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={resolving}
                onClick={async () => {
                  setResolving(true);
                  triggerHaptic('medium');
                  await firebaseService.resolveConflict('local');
                  setResolving(false);
                }}
                className="w-full mt-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                Keep Local Version
              </button>
            </div>

            {/* Cloud Copy column */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Option B: Cloud Storage</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    Live in Cloud
                  </span>
                </div>
                <div className="mt-2.5 space-y-1">
                  <div className="text-sm font-extrabold text-emerald-400">
                    {conflict.cloudFavorites?.length || 0} Saved Stations
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">
                    {conflict.cloudFavorites && conflict.cloudFavorites.length > 0
                      ? conflict.cloudFavorites.slice(0, 3).map((s: any) => s.name).join(', ')
                      : 'No favorites'}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono pt-1">
                    Last Sync: {conflict.cloudUpdatedAt ? new Date(conflict.cloudUpdatedAt).toLocaleString() : 'Unknown'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={resolving}
                onClick={async () => {
                  setResolving(true);
                  triggerHaptic('medium');
                  await firebaseService.resolveConflict('cloud');
                  setResolving(false);
                }}
                className="w-full mt-3 py-2 rounded-xl bg-emerald-500 text-black font-extrabold text-xs hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
              >
                Keep Cloud Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">Profile updated! Display name and avatar synced to Firestore.</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Edit Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Avatar Preview & Selection */}
          <div className="md:col-span-4 flex flex-col items-center text-center p-5 rounded-2xl bg-black/20 border border-white/5 space-y-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl overflow-hidden ring-4 ring-[var(--accent-primary)]/40 shadow-xl shadow-black/40 bg-zinc-900 flex items-center justify-center">
                <img
                  src={currentAvatarUrl}
                  alt={displayName || 'User Avatar'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-[var(--accent-primary)] text-black shadow-lg">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                {displayName || 'Anonymous Listener'}
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[200px]">
                {profile?.email}
              </p>
            </div>

            {/* Audiophile Avatar Presets */}
            <div className="w-full pt-2 border-t border-white/5">
              <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                Choose Avatar Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AVATARS.map((avatar) => {
                  const isSelected = photoURL === avatar.url;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setPhotoURL(avatar.url)}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all group ${
                        isSelected
                          ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30 scale-105'
                          : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                      }`}
                      title={avatar.name}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-[var(--accent-primary)]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Image URL Toggle */}
              <button
                type="button"
                onClick={() => setIsCustomUrlOpen(!isCustomUrlOpen)}
                className="mt-3 text-[11px] text-[var(--accent-primary)] hover:underline flex items-center justify-center gap-1 w-full"
              >
                <Camera className="w-3 h-3" />
                <span>{isCustomUrlOpen ? 'Hide Custom URL' : 'Or Use Custom Image URL'}</span>
              </button>

              {isCustomUrlOpen && (
                <div className="mt-2 text-left">
                  <input
                    type="url"
                    placeholder="https://example.com/my-photo.jpg"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Fields & Cloud Metadata */}
          <div className="md:col-span-8 space-y-4">
            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Display Name
              </label>
              <input
                type="text"
                maxLength={40}
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Neon Nomad, Alex River"
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
              />
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Email Address
              </label>
              <div className="px-4 py-3 rounded-2xl bg-black/20 border border-white/5 text-sm text-[var(--text-muted)] font-mono flex items-center justify-between">
                <span>{profile?.email || 'N/A'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-[var(--text-muted)] uppercase font-sans font-bold">
                  Verified Auth
                </span>
              </div>
            </div>

            {/* User UID */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Firestore User ID
              </label>
              <div className="px-4 py-2.5 rounded-2xl bg-black/20 border border-white/5 text-xs text-[var(--text-muted)] font-mono flex items-center justify-between gap-2">
                <span className="truncate">{profile?.uid}</span>
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Copy User ID"
                >
                  {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Cloud Sync Status Cards */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Synchronized Cloud Assets (Firestore)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    firebaseService.simulateConflict();
                  }}
                  className="text-[10px] font-bold text-amber-300 hover:text-amber-200 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Generate a dummy local vs cloud sync conflict to test manual version resolution"
                >
                  <AlertCircle className="w-3 h-3 animate-pulse" />
                  <span>Simulate Sync Conflict</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center">
                  <Heart className="w-4 h-4 text-rose-400 mb-1" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">{favCount}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Favorites</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center">
                  <Radio className="w-4 h-4 text-sky-400 mb-1" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">{recentCount}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Recent Stations</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center">
                  <Bell className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">Synced</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Alarms & DSP</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-2xl font-bold text-xs bg-[var(--accent-primary)] text-black hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-[var(--accent-primary)]/20 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Syncing with Firestore...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
