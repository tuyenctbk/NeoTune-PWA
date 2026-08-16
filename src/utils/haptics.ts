/**
 * Mobile Native Haptics & Vibration Utility
 * Provides subtle tactile feedback for mobile touch interactions
 */

export type HapticType = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'selection' 
  | 'success' 
  | 'warning' 
  | 'error'
  | 'play'
  | 'pause'
  | 'station_change'
  | 'favorite'
  | 'swipe'
  | 'alarm'
  | (string & {});

/**
 * Main triggerHaptic helper used across UI components
 */
export const triggerHaptic = (type: HapticType = 'light') => {
  if (typeof window === 'undefined' || !('navigator' in window) || !('vibrate' in navigator)) {
    return;
  }

  try {
    switch (type) {
      case 'light':
      case 'selection':
      case 'swipe':
        navigator.vibrate(8);
        break;
      case 'medium':
      case 'play':
      case 'pause':
      case 'station_change':
        navigator.vibrate(18);
        break;
      case 'heavy':
      case 'favorite':
        navigator.vibrate(30);
        break;
      case 'success':
        navigator.vibrate([12, 40, 12]);
        break;
      case 'warning':
        navigator.vibrate([25, 30, 25]);
        break;
      case 'alarm':
      case 'error':
        navigator.vibrate([40, 30, 40, 30]);
        break;
      default:
        navigator.vibrate(10);
    }
  } catch {
    // Graceful fallback if vibrate permissions are restricted
  }
};

export const haptics = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  selection: () => triggerHaptic('selection'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
};
