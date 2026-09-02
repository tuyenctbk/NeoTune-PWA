import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';

export type DevicePlatform = 'ios' | 'android' | 'pc' | 'tv';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY_DISMISSED = 'neotune_pwa_dismissed_until';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [platform, setPlatform] = useState<DevicePlatform>('pc');
  const [isSmartPromptEligible, setIsSmartPromptEligible] = useState<boolean>(false);

  // Detect platform & standalone mode
  useEffect(() => {
    try {
      // Check if running as Capacitor native app, standalone PWA, or native webview wrapper
      let isStandaloneMode = false;
      if (typeof window !== 'undefined') {
        const isCapacitor = !!(window as any).Capacitor ||
          window.location.protocol === 'file:' ||
          (window.location.hostname === 'localhost' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

        if (isCapacitor) {
          isStandaloneMode = true;
        } else if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
          isStandaloneMode = true;
        } else if ((window.navigator as unknown as { standalone?: boolean })?.standalone === true) {
          isStandaloneMode = true;
        } else if (document?.referrer && typeof document.referrer === 'string' && document.referrer.includes('android-app://')) {
          isStandaloneMode = true;
        }
      }

      setIsInstalled(isStandaloneMode);

      // Detect device type
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
      const isTV =
        ua.includes('smart-tv') ||
        ua.includes('googletv') ||
        ua.includes('appletv') ||
        ua.includes('android tv') ||
        ua.includes('tizen') ||
        ua.includes('webos') ||
        ua.includes('hbbtv');

      const isIOSDevice =
        /iphone|ipad|ipod/.test(ua) ||
        (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroidDevice = ua.includes('android');

      if (isTV) {
        setPlatform('tv');
      } else if (isIOSDevice) {
        setPlatform('ios');
      } else if (isAndroidDevice) {
        setPlatform('android');
      } else {
        setPlatform('pc');
      }

      // Check dismissal persistence
      try {
        const dismissedUntil = localStorage.getItem(STORAGE_KEY_DISMISSED);
        if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
          setIsDismissed(true);
        }
      } catch (e) {
        // Ignore localStorage access errors
      }
    } catch (e) {
      console.log('PWA detection fallback:', e);
    }
  }, []);

  // Listen for beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.removeItem(STORAGE_KEY_DISMISSED);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger installation
  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'manual_needed'> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return 'accepted';
        } else {
          // User declined prompt
          dismissInstall(7);
          return 'dismissed';
        }
      } catch (err) {
        console.error('Error invoking PWA install prompt:', err);
        return 'manual_needed';
      }
    }
    return 'manual_needed';
  }, [deferredPrompt]);

  // Dismiss prompt for X days
  const dismissInstall = useCallback((days = 14) => {
    const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY_DISMISSED, expiry.toString());
    setIsDismissed(true);
  }, []);

  // Calculate smart engagement milestones for PWA prompt
  useEffect(() => {
    const checkSmartEligibility = () => {
      try {
        const stats = storageService.getUserStats();
        
        // Smart conditions:
        const hasEnoughSessions = stats.sessionCount >= 2;
        const hasListenedEnough = stats.totalListeningTimeSec >= 40;
        const hasAddedFavorites = stats.favoritesAddedCount >= 1;
        const hasSpentEnoughTime = Date.now() - stats.firstLaunchTimestamp >= 120000; // 2 mins

        // Eligible if they have shown genuine interest through any key action or milestone
        setIsSmartPromptEligible(
          hasEnoughSessions || 
          hasListenedEnough || 
          hasAddedFavorites || 
          hasSpentEnoughTime
        );
      } catch (e) {
        setIsSmartPromptEligible(false);
      }
    };

    // Run check immediately
    checkSmartEligibility();

    // Check periodically in the background (e.g. as listening time builds up)
    const interval = setInterval(checkSmartEligibility, 8000);

    // Subscribe to favorites additions to trigger instantly
    const unsubFavs = storageService.subscribe(() => {
      checkSmartEligibility();
    });

    return () => {
      clearInterval(interval);
      unsubFavs();
    };
  }, []);

  return {
    deferredPrompt,
    canPromptDirectly: Boolean(deferredPrompt),
    isInstalled,
    isDismissed,
    isSmartPromptEligible,
    platform,
    promptInstall,
    dismissInstall,
    setIsDismissed
  };
}
