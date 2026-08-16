/**
 * Dynamic PWA Meta Theme-Color Helper
 * Updates <meta name="theme-color"> dynamically based on the active radio station's
 * genre, dominant visual color, or active UI theme for an immersive mobile status bar experience.
 */

const GENRE_COLOR_MAP: Record<string, string> = {
  jazz: '#1e1b4b',       // Deep Indigo
  ambient: '#030712',    // Obsidian Night
  chill: '#0f172a',      // Slate Midnight
  lofi: '#2e1065',       // Deep Violet
  rock: '#450a0a',       // Crimson Deep
  metal: '#2d0607',      // Dark Maroon
  pop: '#3b0764',        // Deep Purple
  electronic: '#172554', // Sapphire Blue
  dance: '#1e293b',      // Dark Slate
  news: '#064e3b',       // Deep Emerald
  talk: '#0f291e',       // Dark Mint
  sports: '#365314',     // Dark Lime
  classical: '#422006',  // Amber Bronze
  reggae: '#14532d',     // Forest Green
  country: '#78350f',    // Deep Saddle
  hiphop: '#312e81',     // Midnight Indigo
  latin: '#701a75',      // Fuchsia Dark
  world: '#065f46',      // Dark Teal
};

export function getStationColor(genre?: string): string {
  if (!genre) return '#0A050E';
  const lower = genre.toLowerCase();
  for (const [key, color] of Object.entries(GENRE_COLOR_MAP)) {
    if (lower.includes(key)) return color;
  }
  return '#0A050E';
}

export function updateMetaThemeColor(colorHex: string): void {
  if (typeof document === 'undefined') return;

  try {
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = colorHex;

    // Update iOS Safari Status Bar Style
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement | null;
    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(appleMeta);
    }
    appleMeta.content = 'black-translucent';
  } catch (e) {
    console.warn('Failed to update meta theme-color:', e);
  }
}
