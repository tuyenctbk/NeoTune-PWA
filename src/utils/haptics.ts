import { storageService } from '../services/storageService';

/**
 * Native Web Vibration API helper for subtle haptic feedback on supported mobile & tablet devices.
 * Enhances tactile feedback when playing, pausing, switching radio stations, or toggling favorites.
 */
export type HapticType = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'double' 
  | 'selection' 
  | 'swipe' 
  | 'favorite' 
  | 'station_change' 
  | 'play' 
  | 'pause'
  | 'success'
  | 'error'
  | 'alarm';

export function isHapticsSupported(): boolean {
  return typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function';
}

export function triggerHaptic(type: HapticType = 'light'): void {
  if (!isHapticsSupported()) return;
  if (!storageService.getHapticsEnabled()) return;

  try {
    switch (type) {
      case 'light':
      case 'selection':
        navigator.vibrate(8);
        break;
      case 'swipe':
        navigator.vibrate(12);
        break;
      case 'play':
        navigator.vibrate(15);
        break;
      case 'pause':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(25);
        break;
      case 'station_change':
        // Crisp double tap pattern when hopping radio channels
        navigator.vibrate([14, 25, 14]);
        break;
      case 'favorite':
        // Heartbeat rhythmic pulse
        navigator.vibrate([16, 40, 22]);
        break;
      case 'heavy':
        navigator.vibrate(40);
        break;
      case 'double':
        navigator.vibrate([15, 30, 15]);
        break;
      case 'success':
        navigator.vibrate([12, 30, 20]);
        break;
      case 'error':
        navigator.vibrate([35, 40, 35, 40, 35]);
        break;
      case 'alarm':
        // Pulsing attention-grabbing feedback
        navigator.vibrate([300, 150, 300, 150, 300]);
        break;
      default:
        navigator.vibrate(12);
    }
  } catch {
    // Gracefully handle browser policy / user permission restrictions
  }
}
