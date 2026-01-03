import { useEffect, useState } from 'react';
import { isElectronEnv } from '../services/NotificationService';

export function useElectron() {
  // Initialize with actual value to prevent flash of wrong state
  const [isElectron, setIsElectron] = useState(() => {
    const detected = isElectronEnv();
    console.log('[useElectron] Initial state - isElectron:', detected, 'window.electron:', window.electron, 'window.isElectron:', window.isElectron);
    return detected;
  });

  useEffect(() => {
    const detected = isElectronEnv();
    console.log('[useElectron] useEffect - isElectron:', detected, 'window.electron:', window.electron, 'window.isElectron:', window.isElectron);
    setIsElectron(detected);
  }, []);

  return isElectron;
}

export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Check URL params for splash screen
    const params = new URLSearchParams(window.location.search);
    const splash = params.get('splash');
    if (splash === 'true') {
      setShowSplash(true);
    }
  }, []);

  return { showSplash, setShowSplash };
}
