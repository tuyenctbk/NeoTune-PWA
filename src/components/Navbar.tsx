import React, { useState, useEffect } from 'react';
import { 
  Radio, Mic, Heart, Settings, Plus, Sliders, Moon, Car, Tv, Palette, Shield, 
  Sparkles, Disc3, Download, Smartphone, Monitor, User, Cloud, CloudOff, 
  RefreshCw, CheckCircle2, Search, AlertTriangle, ChevronLeft, ChevronRight, Menu,
  Globe, Check
} from 'lucide-react';
import { AppView, ThemeType, UserProfile, SyncStatusInfo } from '../types';
import { DevicePlatform } from '../hooks/usePWAInstall';
import { firebaseService } from '../services/firebaseService';
import { VoiceControlWidget } from './VoiceControlWidget';
import { NeoTuneLogo } from './NeoTuneLogo';
import { triggerHaptic } from '../utils/haptics';
import { useTranslation } from '../services/i18n';

interface NavbarProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  currentTheme: ThemeType;
  onSelectTheme: (theme: ThemeType) => void;
  onOpenAddStation: () => void;
  onOpenEQ: () => void;
  onOpenSleepTimer: () => void;
  onOpenCarMode: () => void;
  onOpenScreensaver: () => void;
  isTVMode: boolean;
  onToggleTVMode: () => void;
  onOpenInstallModal?: () => void;
  isInstalled?: boolean;
  platform?: DevicePlatform;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  currentTheme,
  onSelectTheme,
  onOpenAddStation,
  onOpenEQ,
  onOpenSleepTimer,
  onOpenCarMode,
  onOpenScreensaver,
  isTVMode,
  onToggleTVMode,
  onOpenInstallModal,
  isInstalled = false,
  platform = 'pc',
  currentUser = null,
  onOpenAuth,
  onOpenSearch,
}) => {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [langFilter, setLangFilter] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(firebaseService.getSyncStatus());
  const [showSyncTooltip, setShowSyncTooltip] = useState(false);
  
  const { t, language, setLanguage, languages, languageMeta } = useTranslation();

  // Collapsible sidebar state initialized from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('neotune_sidebar_collapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const unsub = firebaseService.subscribeSyncStatus((st) => {
      setSyncStatus(st);
    });
    return unsub;
  }, []);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    await firebaseService.triggerSyncNow();
  };

  const toggleCollapse = () => {
    triggerHaptic('medium');
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('neotune_sidebar_collapsed', String(nextVal));
    }
    // Dispatch a window event to trigger canvas resizing or list grid adjustments
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  };

  const THEMES: { id: ThemeType; name: string; color: string }[] = [
    { id: 'frosted-glass', name: 'Frosted Glass (Default)', color: 'bg-purple-400' },
    { id: 'cyberpunk', name: 'Cyberpunk Neon', color: 'bg-cyan-400' },
    { id: 'jazz', name: 'Vintage Jazz', color: 'bg-amber-400' },
    { id: 'rock', name: 'Electric Rock', color: 'bg-rose-500' },
    { id: 'oled', name: 'Pure Dark OLED', color: 'bg-white' },
  ];

  const NAV_TABS = [
    { id: 'radio' as const, label: t('nav_radio', 'Radio'), icon: Radio },
    { id: 'podcasts' as const, label: t('nav_podcasts', 'Podcasts'), icon: Mic },
    { id: 'favorites' as const, label: t('nav_favorites', 'Favorites'), icon: Heart },
    { id: 'settings' as const, label: t('nav_settings', 'Settings'), icon: Settings },
  ];

  const filteredLanguages = languages.filter(l => 
    l.name.toLowerCase().includes(langFilter.toLowerCase()) || 
    l.nativeName.toLowerCase().includes(langFilter.toLowerCase()) ||
    l.code.toLowerCase().includes(langFilter.toLowerCase())
  );

  return (
    <>
      {/* ----------------- SIDEBAR: Visible on Desktop & Tablet (md and above) ----------------- */}
      <aside 
        id="neotune-sidebar"
        className={`hidden md:flex flex-col h-screen sticky top-0 bg-[var(--surface-main)]/90 backdrop-blur-2xl border-r border-[var(--border-color)] transition-all duration-300 z-30 shrink-0 ${
          isCollapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {/* Sidebar Header: Brand Info & Collapse Trigger */}
        <div className={`p-4 border-b border-[var(--border-color)] flex items-center justify-between gap-2 h-16 shrink-0`}>
          {!isCollapsed && (
            <div 
              onClick={() => onSelectView('radio')}
              className="cursor-pointer select-none"
            >
              <NeoTuneLogo size={36} showText={true} />
            </div>
          )}

          {isCollapsed && (
            <div 
              onClick={() => onSelectView('radio')}
              className="mx-auto cursor-pointer hover:scale-105 transition-transform"
              title="NeoTune Live Hub"
            >
              <NeoTuneLogo size={36} showText={false} />
            </div>
          )}

          {/* Collapse Toggle Button */}
          <button
            onClick={toggleCollapse}
            className={`p-1.5 rounded-xl hover:bg-white/10 border border-white/5 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer shrink-0 ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Body Scroll Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-5">
          
          {/* Quick Search Widget */}
          <div>
            {isCollapsed ? (
              <button
                onClick={onOpenSearch}
                className="w-11 h-11 mx-auto flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-[var(--accent-primary)] border border-white/10 transition-colors cursor-pointer"
                title="Global Search (Ctrl+K)"
              >
                <Search className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onOpenSearch}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[var(--text-muted)] hover:text-white transition-all cursor-pointer text-left"
                title="Global Search (Ctrl+K)"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Quick Search...</span>
                </div>
                <kbd className="px-1.5 py-0.5 bg-black/40 text-[9px] text-zinc-500 font-mono rounded border border-white/5">⌘K</kbd>
              </button>
            )}
          </div>

          {/* Primary View Navigation Tabs */}
          <div className="space-y-1">
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                Navigation
              </span>
            )}
            <nav className="space-y-1 flex flex-col">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentView === tab.id;
                return (
                  <button
                    key={`side_tab_${tab.id}`}
                    onClick={() => {
                      triggerHaptic('selection');
                      onSelectView(tab.id);
                    }}
                    className={`flex items-center gap-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer h-11 ${
                      isCollapsed ? 'justify-center w-11 mx-auto px-0' : 'px-3.5 w-full'
                    } ${
                      isActive
                        ? 'bg-[var(--accent-primary)] text-black shadow-md shadow-[var(--accent-primary)]/20 font-black scale-102'
                        : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                    }`}
                    title={tab.label}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{tab.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Controls Section */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                Display Modes
              </span>
            )}
            <div className={`flex flex-col gap-1.5 ${isCollapsed ? 'items-center' : ''}`}>
              
              {/* Palette Selector */}
              <div className="relative w-full flex justify-center">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setShowThemeMenu(!showThemeMenu);
                    setShowLangMenu(false);
                  }}
                  className={`flex items-center gap-3.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-all cursor-pointer h-11 ${
                    isCollapsed ? 'justify-center w-11 px-0' : 'px-3.5 w-full'
                  }`}
                  title="Change Theme Palette"
                >
                  <Palette className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  {!isCollapsed && <span className="truncate">Color Palette</span>}
                </button>

                {showThemeMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowThemeMenu(false)} />
                    <div 
                      className={`absolute z-50 w-56 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] p-2.5 shadow-2xl shadow-black/95 space-y-1.5 text-xs backdrop-blur-3xl animate-fadeIn ${
                        isCollapsed ? 'left-14 top-0' : 'left-full top-0 ml-2'
                      }`}
                    >
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Color Palette
                      </div>
                      {THEMES.map((t) => (
                        <button
                          key={`side_theme_${t.id}`}
                          onClick={() => {
                            triggerHaptic('selection');
                            onSelectTheme(t.id);
                            setShowThemeMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-3 sm:py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                            currentTheme === t.id
                              ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold'
                              : 'text-[var(--text-primary)] hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                            <span>{t.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Language Switcher Selector */}
              <div className="relative w-full flex justify-center">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setShowLangMenu(!showLangMenu);
                    setShowThemeMenu(false);
                  }}
                  className={`flex items-center gap-3.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-all cursor-pointer h-11 ${
                    isCollapsed ? 'justify-center w-11 px-0' : 'px-3.5 w-full'
                  }`}
                  title={`${t('language_selection', 'Language & Region')}: ${languageMeta.nativeName}`}
                >
                  <span className="text-base shrink-0 leading-none">{languageMeta.flag || '🌐'}</span>
                  {!isCollapsed && (
                    <div className="flex items-center justify-between w-full min-w-0 pr-1">
                      <span className="truncate">{languageMeta.nativeName}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-[var(--accent-primary)] border border-white/10">
                        {language}
                      </span>
                    </div>
                  )}
                </button>

                {showLangMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                    <div 
                      className={`absolute z-50 w-64 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] p-2.5 shadow-2xl shadow-black/95 space-y-2 text-xs backdrop-blur-3xl animate-fadeIn ${
                        isCollapsed ? 'left-14 top-0' : 'left-full top-0 ml-2'
                      }`}
                    >
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                        <span>{t('language_selection', 'Language')}</span>
                        <span className="text-[9px] text-[var(--accent-primary)]">{languages.length} global</span>
                      </div>
                      
                      <div className="px-1">
                        <input
                          type="text"
                          value={langFilter}
                          onChange={(e) => setLangFilter(e.target.value)}
                          placeholder="Search languages..."
                          className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent-primary)]"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1 pr-1">
                        {filteredLanguages.map((l) => (
                          <button
                            key={`side_lang_${l.code}`}
                            onClick={() => {
                              triggerHaptic('selection');
                              setLanguage(l.code);
                              setShowLangMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                              language === l.code
                                ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold'
                                : 'text-[var(--text-primary)] hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base">{l.flag}</span>
                              <span className="truncate">{l.nativeName}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">({l.code})</span>
                            </div>
                            {language === l.code && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Car Mode Trigger */}
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenCarMode();
                }}
                className={`flex items-center gap-3.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-all cursor-pointer h-11 ${
                  isCollapsed ? 'justify-center w-11 px-0' : 'px-3.5 w-full'
                }`}
                title="Enable Car Driving Mode"
              >
                <Car className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                {!isCollapsed && <span className="truncate">Car Mode</span>}
              </button>

              {/* Ambient Screensaver */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onOpenScreensaver();
                }}
                className={`flex items-center gap-3.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-all cursor-pointer h-11 ${
                  isCollapsed ? 'justify-center w-11 px-0' : 'px-3.5 w-full'
                }`}
                title="Ambient Screensaver"
              >
                <Moon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                {!isCollapsed && <span className="truncate">Screensaver</span>}
              </button>

              {/* TV Mode */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onToggleTVMode();
                }}
                className={`flex items-center gap-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer h-11 ${
                  isCollapsed ? 'justify-center w-11 px-0' : 'px-3.5 w-full'
                } ${
                  isTVMode 
                    ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/20' 
                    : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                }`}
                title="TV 10-Foot Focus UI"
              >
                <Tv className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">TV Interface</span>}
              </button>

              {/* Equalizer */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onOpenEQ();
                }}
                className={`flex items-center gap-3.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-all cursor-pointer h-11 ${
                  isCollapsed ? 'justify-center w-11 px-0' : 'px-3.5 w-full'
                }`}
                title="EQ & Acoustics Mixer"
              >
                <Sliders className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                {!isCollapsed && <span className="truncate">Acoustics EQ</span>}
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            {/* Custom Stream adding */}
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenAddStation();
              }}
              className={`flex items-center gap-3.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer h-11 ${
                isCollapsed ? 'justify-center w-11 px-0' : 'px-3.5 w-full border border-white/5'
              }`}
              title="Add Custom Direct Radio URL"
            >
              <Plus className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
              {!isCollapsed && <span className="truncate text-[11px]">Add Custom Stream</span>}
            </button>

            {/* PWA Install Button */}
            {onOpenInstallModal && !isInstalled && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onOpenInstallModal();
                }}
                className={`flex items-center gap-3.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500/15 to-sky-500/15 hover:from-purple-500/25 hover:to-sky-500/25 border border-white/5 text-white transition-all cursor-pointer h-11 ${
                  isCollapsed ? 'justify-center w-11 px-0' : 'px-3.5 w-full'
                }`}
                title="Install Desktop Client"
              >
                <Download className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                {!isCollapsed && <span className="truncate text-[11px]">Install Client</span>}
              </button>
            )}
          </div>

          {/* Voice hands-free panel */}
          {!isCollapsed && (
            <div className="pt-2 border-t border-white/5">
              <VoiceControlWidget onOpenSleepTimer={onOpenSleepTimer} />
            </div>
          )}

        </div>

        {/* Sidebar Footer: Accounts & Firestore status */}
        <div className="p-3 border-t border-[var(--border-color)] space-y-3 bg-black/10 shrink-0">
          
          {/* Firestore indicator */}
          {!isCollapsed ? (
            <div className="relative">
              <button
                onClick={handleManualSync}
                onMouseEnter={() => setShowSyncTooltip(true)}
                onMouseLeave={() => setShowSyncTooltip(false)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                  syncStatus.state === 'syncing'
                    ? 'bg-sky-500/10 border-sky-500/25 text-sky-300'
                    : syncStatus.state === 'synced'
                    ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15'
                    : syncStatus.state === 'error'
                    ? 'bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/15'
                    : 'bg-white/5 border-white/10 text-[var(--text-muted)]'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {syncStatus.state === 'syncing' ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                  ) : syncStatus.state === 'synced' ? (
                    <Cloud className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <CloudOff className="w-3 h-3 text-amber-400" />
                  )}
                  <span className="truncate capitalize">{syncStatus.state === 'synced' ? 'Cloud Locked' : syncStatus.state}</span>
                </div>
                <span className="text-[9px] opacity-60">Sync</span>
              </button>

              {showSyncTooltip && (
                <div className="absolute left-full bottom-1 ml-2 z-50 w-60 p-2.5 rounded-xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-md text-[10px] text-slate-200 pointer-events-none">
                  <div className="font-semibold text-white mb-0.5 flex items-center justify-between">
                    <span>Firestore Sync Engine</span>
                  </div>
                  <p className="text-slate-300 text-[10px] leading-relaxed">{syncStatus.message}</p>
                  <p className="text-[9px] text-slate-400 mt-1">Tap to trigger manual sweep</p>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleManualSync}
              className={`w-11 h-11 mx-auto flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
                syncStatus.state === 'synced' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-[var(--text-muted)]'
              }`}
              title={`Cloud Sync Status: ${syncStatus.state}. Click to trigger manual sweep.`}
            >
              <Cloud className="w-4 h-4" />
            </button>
          )}

          {/* User Sign-In Profile */}
          {onOpenAuth && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenAuth();
              }}
              className={`flex items-center rounded-xl border text-xs font-semibold transition-all cursor-pointer h-11 w-full ${
                isCollapsed ? 'justify-center p-0' : 'px-3 py-1.5'
              } ${
                currentUser
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-white/5 border-white/10 text-[var(--text-primary)] hover:bg-white/10'
              }`}
              title={currentUser ? `Cloud profile active: ${currentUser.displayName || currentUser.email}` : "Sign in to activate Cloud Sync"}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Avatar"
                    referrerPolicy="no-referrer"
                    className="w-5.5 h-5.5 rounded-full object-cover border border-emerald-400 shrink-0"
                  />
                ) : currentUser ? (
                  <div className="w-5.5 h-5.5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-500/20">
                    {currentUser.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                ) : (
                  <User className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                )}
                {!isCollapsed && (
                  <span className="truncate text-xs font-bold">
                    {currentUser ? currentUser.displayName?.split(' ')[0] || 'Account' : 'Sync Profile'}
                  </span>
                )}
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* ----------------- COMPACT TOP HEADER: Visible on Mobile & Tablet (< md screens) ----------------- */}
      <header className="md:hidden sticky top-0 z-30 w-full bg-[var(--surface-main)]/90 backdrop-blur-2xl border-b border-[var(--border-color)] shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left Logo */}
          <div 
            onClick={() => onSelectView('radio')}
            className="cursor-pointer select-none"
          >
            <NeoTuneLogo size={32} showText={true} />
          </div>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Search */}
            <button
              onClick={onOpenSearch}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] hover:bg-white/10 transition-colors"
              title="Global Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick Language */}
            <div className="relative">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowLangMenu(!showLangMenu);
                  setShowThemeMenu(false);
                }}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                title={`${t('language_selection', 'Language')}: ${languageMeta.nativeName}`}
              >
                <span className="text-sm">{languageMeta.flag || '🌐'}</span>
              </button>

              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                  <div className="absolute right-0 top-11 z-50 w-60 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] p-2.5 shadow-2xl space-y-2 text-xs backdrop-blur-3xl animate-fadeIn">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                      <span>{t('language_selection', 'Language')}</span>
                      <span className="text-[9px] text-[var(--accent-primary)]">{languages.length}</span>
                    </div>

                    <div className="px-1">
                      <input
                        type="text"
                        value={langFilter}
                        onChange={(e) => setLangFilter(e.target.value)}
                        placeholder="Search languages..."
                        className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent-primary)]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1">
                      {filteredLanguages.map((l) => (
                        <button
                          key={`mob_lang_${l.code}`}
                          onClick={() => {
                            triggerHaptic('selection');
                            setLanguage(l.code);
                            setShowLangMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                            language === l.code
                              ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold'
                              : 'text-[var(--text-primary)] hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{l.flag}</span>
                            <span className="truncate">{l.nativeName}</span>
                          </div>
                          {language === l.code && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Palette */}
            <div className="relative">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowThemeMenu(!showThemeMenu);
                }}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                title="Change Color Palette"
              >
                <Palette className="w-4 h-4 text-[var(--accent-primary)]" />
              </button>

              {showThemeMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowThemeMenu(false)} />
                  <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] p-2.5 shadow-2xl space-y-1.5 text-xs backdrop-blur-3xl animate-fadeIn">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Color Palette
                    </div>
                    {THEMES.map((t) => (
                      <button
                        key={`top_theme_${t.id}`}
                        onClick={() => {
                          triggerHaptic('selection');
                          onSelectTheme(t.id);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-3 sm:py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                          currentTheme === t.id
                            ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold'
                            : 'text-[var(--text-primary)] hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                          <span>{t.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sleep Timer & Screensaver trigger */}
            <button
              onClick={onOpenScreensaver}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
              title="Ambient Screensaver"
            >
              <Moon className="w-4 h-4" />
            </button>

            {/* Auth Sign-In */}
            {onOpenAuth && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onOpenAuth();
                }}
                className={`p-1 border rounded-xl flex items-center justify-center shrink-0 w-8 h-8 ${
                  currentUser ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-white'
                }`}
              >
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Avatar"
                    referrerPolicy="no-referrer"
                    className="w-5.5 h-5.5 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-[var(--accent-primary)]" />
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ----------------- MOBILE BOTTOM NAV: Visible on Mobile & Tablet (< md screens) ----------------- */}
      <nav 
        id="neotune-mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[var(--surface-main)]/95 backdrop-blur-2xl border-t border-[var(--border-color)] px-2 py-1 shadow-2xl shadow-black flex items-center justify-around"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}
      >
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;
          return (
            <button
              key={`mobile_nav_${tab.id}`}
              onClick={() => {
                triggerHaptic('selection');
                onSelectView(tab.id);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
                isActive
                  ? 'text-[var(--accent-primary)] font-black animate-pulse'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-[var(--accent-primary)]/20 shadow-sm scale-110' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-[var(--accent-primary)]' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
