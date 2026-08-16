import { useState, useEffect, useCallback } from 'react';

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

  // Detect platform & standalone mode
  useEffect(() => {
    try {
      // Check if already in standalone / installed mode
      let isStandaloneMode = false;
      if (typeof window !== 'undefined') {
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
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

  return {
    deferredPrompt,
    canPromptDirectly: Boolean(deferredPrompt),
    isInstalled,
    isDismissed,
    platform,
    promptInstall,
    dismissInstall,
    setIsDismissed
  };
}
