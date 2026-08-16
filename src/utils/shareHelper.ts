import { RadioStation, PodcastEpisode, PodcastShow } from '../types';
import { triggerHaptic } from './haptics';

export interface ShareDataPayload {
  title: string;
  text: string;
  url: string;
}

/**
 * Checks if the Web Share API is available and can share content
 */
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Creates share payload for a Radio Station
 */
export function createStationShareData(station: RadioStation): ShareDataPayload {
  const currentAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://neotune.app';
  const cleanGenre = station.genre ? `• ${station.genre}` : '';
  const cleanCountry = station.country ? `• ${station.country}` : '';
  
  return {
    title: `Listen to ${station.name} on NeoTune`,
    text: `Tune in to ${station.name} ${cleanGenre} ${cleanCountry} live on NeoTune Global Radio!`,
    url: `${currentAppUrl}?station=${encodeURIComponent(station.id)}&name=${encodeURIComponent(station.name)}`
  };
}

/**
 * Creates share payload for a Podcast Episode
 */
export function createPodcastEpisodeShareData(
  show: { name: string; genre?: string; imageUrl?: string },
  episode: PodcastEpisode
): ShareDataPayload {
  const currentAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://neotune.app';
  
  return {
    title: `${episode.title} - ${show.name}`,
    text: `Check out this episode "${episode.title}" from "${show.name}" on NeoTune Podcasts!`,
    url: `${currentAppUrl}?podcast=${encodeURIComponent(episode.showId)}&episode=${encodeURIComponent(episode.id)}`
  };
}

/**
 * Executes native Web Share with graceful fallback to Clipboard copy
 */
export async function shareContent(payload: ShareDataPayload): Promise<{ success: boolean; method: 'native' | 'clipboard'; message: string }> {
  triggerHaptic('selection');
  
  if (isWebShareSupported()) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url
      });
      triggerHaptic('success');
      return {
        success: true,
        method: 'native',
        message: 'Shared successfully!'
      };
    } catch (err: any) {
      // If user aborted or canceled share dialog, return cleanly without error
      if (err?.name === 'AbortError') {
        return {
          success: false,
          method: 'native',
          message: 'Share cancelled'
        };
      }
      // If native share failed for any other reason, proceed to clipboard fallback
      console.warn('Native share failed, falling back to clipboard copy:', err);
    }
  }

  // Fallback to Clipboard Copy
  try {
    const textToCopy = `${payload.title}\n${payload.text}\n${payload.url}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(textToCopy);
      triggerHaptic('success');
      return {
        success: true,
        method: 'clipboard',
        message: 'Link copied to clipboard!'
      };
    } else {
      // Legacy textarea fallback
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      triggerHaptic('success');
      return {
        success: true,
        method: 'clipboard',
        message: 'Link copied to clipboard!'
      };
    }
  } catch (copyErr) {
    console.error('Failed to copy share link:', copyErr);
    return {
      success: false,
      method: 'clipboard',
      message: 'Could not copy link'
    };
  }
}
