import { useState, useEffect, useCallback } from 'react';
import {
  getConnectivityStatus,
  onConnectivityChange,
  getQueueSize,
  startConnectivityPolling,
  type ConnectivityStatus,
} from '@/lib/pwa/offline-manager';
import { restoreScheduledNotifications } from '@/lib/pwa/push-notifications';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [connectivity, setConnectivity] = useState<ConnectivityStatus>(getConnectivityStatus);
  const [pendingActions, setPendingActions] = useState(getQueueSize);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Connectivity tracking
    const unsubConnectivity = onConnectivityChange((status) => {
      setConnectivity(status);
      setPendingActions(getQueueSize());
    });

    // Periodic connectivity polling for flaky connections
    const stopPolling = startConnectivityPolling(30000);

    // Install prompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // Check if already installed
    const mqStandalone = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mqStandalone.matches || (navigator as any).standalone === true);
    const handleDisplayChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mqStandalone.addEventListener('change', handleDisplayChange);

    // App installed event
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('appinstalled', handleInstalled);

    // SW update detection
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });
    }

    // Restore scheduled notifications
    restoreScheduledNotifications();

    // Refresh pending count periodically
    const interval = setInterval(() => setPendingActions(getQueueSize()), 5000);

    return () => {
      unsubConnectivity();
      stopPolling();
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      mqStandalone.removeEventListener('change', handleDisplayChange);
      window.removeEventListener('appinstalled', handleInstalled);
      clearInterval(interval);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
    return outcome === 'accepted';
  }, [installPrompt]);

  const applyUpdate = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
      window.location.reload();
    }
  }, []);

  return {
    connectivity,
    isOnline: connectivity === 'online',
    isOffline: connectivity === 'offline',
    pendingActions,
    canInstall: !!installPrompt,
    isInstalled,
    promptInstall,
    updateAvailable,
    applyUpdate,
  };
}
