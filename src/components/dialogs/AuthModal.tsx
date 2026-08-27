import React, { useState } from 'react';
import { X, Check, AlertCircle, Cloud, LogOut } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProviderLogin = async (
    providerName: string,
    loginFn: () => Promise<UserProfile | null>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const user = await loginFn();
      if (user) {
        setSuccessMsg(`Welcome, ${user.displayName || 'User'}! Cloud sync active.`);
        onLoginSuccess?.(user);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || `${providerName} sign in failed`);
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
                Connect via Social Networks to sync across devices
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
          /* Top Social Networks Sign In Options */
          <div className="mt-2 space-y-3">
            <div className="text-xs font-semibold text-zinc-400 text-center mb-1">
              Choose your social network to sign in
            </div>

            {/* Google 1-Click Login Button */}
            <button
              onClick={() => handleProviderLogin('Google', () => firebaseService.signInWithGoogle())}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white text-zinc-900 hover:bg-slate-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-lg shadow-white/10 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

            {/* Apple 1-Click Login Button */}
            <button
              onClick={() => handleProviderLogin('Apple', () => firebaseService.signInWithApple())}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-black hover:bg-zinc-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-3 border border-white/20 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.68-.82 1.13-1.97.99-3.12-1 .04-2.22.67-2.92 1.49-.63.73-1.18 1.91-1.03 3.04 1.12.09 2.28-.59 2.96-1.41z" />
              </svg>
              <span>Continue with Apple</span>
            </button>

            {/* Top 10 Social Networks Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {/* X / Twitter */}
              <button
                onClick={() => handleProviderLogin('X', () => firebaseService.signInWithTwitter())}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-black hover:bg-zinc-900 text-white font-semibold text-xs flex items-center justify-start gap-2 border border-white/15 transition-all cursor-pointer"
                title="Sign in with X"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="truncate">X (Twitter)</span>
              </button>

              {/* Facebook */}
              <button
                onClick={() => handleProviderLogin('Facebook', () => firebaseService.signInWithFacebook())}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold text-xs flex items-center justify-start gap-2 border border-white/10 transition-all cursor-pointer"
                title="Sign in with Facebook"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="truncate">Facebook</span>
              </button>

              {/* GitHub */}
              <button
                onClick={() => handleProviderLogin('GitHub', () => firebaseService.signInWithGithub())}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-[#24292e] hover:bg-[#2f363d] text-white font-semibold text-xs flex items-center justify-start gap-2 border border-white/10 transition-all cursor-pointer"
                title="Sign in with GitHub"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span className="truncate">GitHub</span>
              </button>

              {/* Microsoft */}
              <button
                onClick={() => handleProviderLogin('Microsoft', () => firebaseService.signInWithMicrosoft())}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-[#2f2f2f] hover:bg-[#3d3d3d] text-white font-semibold text-xs flex items-center justify-start gap-2 border border-white/10 transition-all cursor-pointer"
                title="Sign in with Microsoft"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                <span className="truncate">Microsoft</span>
              </button>

              {/* LinkedIn */}
              <button
                onClick={() => handleProviderLogin('LinkedIn', () => firebaseService.signInWithLinkedIn())}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-[#0A66C2] hover:bg-[#084e96] text-white font-semibold text-xs flex items-center justify-start gap-2 border border-white/10 transition-all cursor-pointer"
                title="Sign in with LinkedIn"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                <span className="truncate">LinkedIn</span>
              </button>

              {/* Spotify */}
              <button
                onClick={() => handleProviderLogin('Spotify', () => firebaseService.signInWithSpotify())}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-[#1DB954] hover:bg-[#1aa34a] text-black font-bold text-xs flex items-center justify-start gap-2 transition-all cursor-pointer"
                title="Sign in with Spotify"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.341c-.219.359-.693.475-1.053.256-2.887-1.763-6.521-2.163-10.801-1.183-.41.094-.813-.162-.906-.572-.094-.41.162-.813.572-.906 4.686-1.071 8.685-.615 11.932 1.362.359.219.475.693.256 1.043zm1.476-3.278c-.276.449-.868.591-1.317.316-3.302-2.029-8.337-2.618-12.245-1.431-.502.152-1.037-.132-1.189-.634-.152-.502.132-1.037.634-1.189 4.464-1.355 10.015-.705 13.799 1.621.449.276.592.868.318 1.317zm.126-3.414c-3.958-2.351-10.485-2.568-14.269-1.42-.607.184-1.248-.168-1.432-.775-.184-.607.168-1.248.775-1.432 4.341-1.317 11.537-1.062 16.084 1.637.546.324.726 1.033.402 1.579-.324.545-1.033.726-1.56.401z"/>
                </svg>
                <span className="truncate">Spotify</span>
              </button>

              {/* Discord */}
              <button
                onClick={() => handleProviderLogin('Discord', () => firebaseService.signInWithDiscord())}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold text-xs flex items-center justify-start gap-2 border border-white/10 transition-all cursor-pointer"
                title="Sign in with Discord"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span className="truncate">Discord</span>
              </button>

              {/* Twitch */}
              <button
                onClick={() => handleProviderLogin('Twitch', () => firebaseService.signInWithTwitch())}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-[#9146FF] hover:bg-[#7d26ff] text-white font-semibold text-xs flex items-center justify-start gap-2 border border-white/10 transition-all cursor-pointer"
                title="Sign in with Twitch"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M11.571 1.429L1.429 4.286v14.286h4.286v4.286l4.286-4.286h3.571L22.571 9.714V1.429H11.571zm9.286 7.143l-3.571 3.571h-3.571l-2.857 2.857v-2.857H7.143V2.857h13.714v5.715zM17.857 5.714h-2.143v5.714h2.143V5.714zm-5.714 0h-2.143v5.714h2.143V5.714z"/>
                </svg>
                <span className="truncate">Twitch</span>
              </button>

              {/* Yahoo */}
              <button
                onClick={() => handleProviderLogin('Yahoo', () => firebaseService.signInWithYahoo())}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-[#6001d2] hover:bg-[#5000b5] text-white font-semibold text-xs flex items-center justify-start gap-2 border border-white/10 transition-all cursor-pointer"
                title="Sign in with Yahoo"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12zm2.933-17.6l2.133 4.2h-2.8l-1.067-2.333L12.133 10.6H9.333l2.134-4.2H8.667L5.6 13.8h2.8l.933-2.1h5.334l.933 2.1h2.8L14.933 6.4z"/>
                </svg>
                <span className="truncate">Yahoo</span>
              </button>

              {/* Reddit */}
              <button
                onClick={() => handleProviderLogin('Reddit', () => firebaseService.signInWithReddit())}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-[#FF4500] hover:bg-[#e03d00] text-white font-semibold text-xs flex items-center justify-start gap-2 border border-white/10 transition-all cursor-pointer"
                title="Sign in with Reddit"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.056 1.601a5.352 5.352 0 0 1 .052.716c0 3.6-4.225 6.522-9.438 6.522-5.213 0-9.438-2.922-9.438-6.522 0-.236.02-.472.052-.716a1.734 1.734 0 0 1-1.056-1.601c0-.968.786-1.754 1.754-1.754.477 0 .899.182 1.207.491 1.194-.856 2.85-1.418 4.674-1.488l.966-4.526a.375.375 0 0 1 .442-.29l3.181.67c.182-.294.516-.492.898-.492z"/>
                </svg>
                <span className="truncate">Reddit</span>
              </button>
            </div>

            {error && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
