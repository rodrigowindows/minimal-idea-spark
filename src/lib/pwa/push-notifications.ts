/**
 * Push notifications for PWA (requires service worker and permission).
 */

export async function isPushSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.requestPermission()
}

export async function showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.ready
  if (reg?.showNotification) {
    reg.showNotification(title, { icon: '/pwa-192x192.png', ...options })
  } else {
    new Notification(title, { icon: '/pwa-192x192.png', ...options })
  }
}

export async function subscribeToPush(_vapidPublicKey: string): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker?.ready
  if (!reg?.pushManager) return null
  try {
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _vapidPublicKey,
    })
  } catch {
    return null
  }
}
