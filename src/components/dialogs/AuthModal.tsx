import React, { useState } from 'react';
import { X, LogIn, Mail, Lock, User, Check, AlertCircle, Sparkles, Cloud, RefreshCw, LogOut, Shield } from 'lucide-react';
import { firebaseService } from '../../services/firebaseService';
import { UserProfile } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess?: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await firebaseService.signInWithGoogle();
      if (user) {
        setSuccessMsg(`Welcome, ${user.displayName || 'Audiophile'}! Cloud sync active.`);
        onLoginSuccess?.(user);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await firebaseService.signInWithGithub();
      if (user) {
        setSuccessMsg(`Welcome, ${user.displayName || 'Developer'}! Cloud sync active.`);
        onLoginSuccess?.(user);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'GitHub sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTwitterLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await firebaseService.signInWithTwitter();
      if (user) {
        setSuccessMsg(`Welcome, ${user.displayName || 'User'}! Cloud sync active.`);
        onLoginSuccess?.(user);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Twitter sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in both email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let user: UserProfile | null = null;
      if (mode === 'signin') {
        user = await firebaseService.signInWithEmail(email, password);
      } else {
        user = await firebaseService.signUpWithEmail(email, password, name.trim());
      }

      if (user) {
        setSuccessMsg(mode === 'signin' ? 'Signed in successfully!' : 'Account created! Cloud sync enabled.');
        onLoginSuccess?.(user);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await firebaseService.logout();
      setSuccessMsg('Logged out successfully.');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Logout failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative my-auto w-full max-w-md h-auto max-h-[85vh] sm:max-h-[90vh] rounded-3xl bg-[#12121a] border border-white/20 p-4 sm:p-7 shadow-2xl shadow-black/95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-tr from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] shadow-sm shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                {currentUser ? 'NeoTune Cloud Account' : 'Sign in to NeoTune'}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Sync favorites, alarms & audio EQ across all devices
              </p>
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

        <div className="overflow-y-auto flex-1 pr-1 overscroll-contain mt-4">
        {/* If Already Logged In */}
        {currentUser ? (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3.5">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[var(--accent-primary)]"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/40 text-[var(--accent-primary)] flex items-center justify-center font-bold text-lg">
                  {currentUser.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                  {currentUser.displayName || 'NeoTune Member'}
                </div>
                <div className="text-xs text-[var(--text-muted)] truncate">{currentUser.email}</div>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Cloud Sync Active (Firestore)</span>
                </div>
              </div>
            </div>

            {/* Cloud Features List */}
            <div className="space-y-2 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Favorites & custom stations synced automatically</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Audio EQ settings & themes preserved cross-platform</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Recurring wake-up radio alarms stored in cloud</span>
              </div>
            </div>

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Sign Out Button */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{loading ? 'Signing out...' : 'Sign Out of Account'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <div className="mt-5 space-y-4">
            {/* Social Logins */}
            <div className="space-y-2">
              {/* Google 1-Click Login Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-zinc-900 hover:bg-slate-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-lg shadow-white/10 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* GitHub Provider */}
                <button
                  onClick={handleGithubLogin}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-[#24292e] hover:bg-[#2f363d] text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>GitHub</span>
                </button>

                {/* Twitter Provider */}
                <button
                  onClick={handleTwitterLogin}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z" />
                  </svg>
                  <span>Twitter / X</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                Or with Email
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-black/30 border border-white/5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); }}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-[var(--accent-primary)] text-black shadow-md'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); }}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-[var(--accent-primary)] text-black shadow-md'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <label className="text-[11px] font-semibold uppercase text-[var(--text-muted)] mb-1 block">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Alex"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold uppercase text-[var(--text-muted)] mb-1 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase text-[var(--text-muted)] mb-1 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] hover:opacity-95 text-black font-bold text-xs shadow-lg shadow-black/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
