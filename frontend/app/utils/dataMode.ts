/**
 * Data Mode Utility
 * Manages Demo/Live mode for the application
 */

export type DataMode = 'demo' | 'live';

/**
 * Get the current data mode from localStorage
 */
export function getDataMode(): DataMode {
  if (typeof window === 'undefined') {
    return 'demo'; // Default to demo during SSR
  }
  
  const settings = localStorage.getItem('userSettings');
  if (settings) {
    try {
      const parsed = JSON.parse(settings);
      return parsed.dataMode || 'demo';
    } catch (e) {
      return 'demo';
    }
  }
  
  return 'demo';
}

/**
 * Set the data mode in localStorage
 */
export function setDataMode(mode: DataMode): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  const settings = localStorage.getItem('userSettings');
  let settingsObj = {};
  
  if (settings) {
    try {
      settingsObj = JSON.parse(settings);
    } catch (e) {
      settingsObj = {};
    }
  }
  
  settingsObj = { ...settingsObj, dataMode: mode };
  localStorage.setItem('userSettings', JSON.stringify(settingsObj));
}

/**
 * Check if currently in demo mode
 */
export function isDemoMode(): boolean {
  return getDataMode() === 'demo';
}

/**
 * Check if currently in live mode
 */
export function isLiveMode(): boolean {
  return getDataMode() === 'live';
}

