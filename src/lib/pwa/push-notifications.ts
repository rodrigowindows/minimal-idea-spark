/**
 * Push notifications for PWA: permission, local notifications, push subscription,
 * scheduled notifications, and notification categories.
 */

const NOTIFICATION_PREFS_KEY = 'canvas_notification_prefs';

/* ─── Types ─── */
export interface NotificationPreferences {
  enabled: boolean;
  categories: {
    reminders: boolean;
    deepWork: boolean;
    achievements: boolean;
    journal: boolean;
    calendar: boolean;
  };
}

export interface ScheduledNotification {
  id: string;
  title: string;
  options: NotificationOptions;
  scheduledAt: number; // timestamp ms
}

const defaultPrefs: NotificationPreferences = {
  enabled: true,
  categories: {
    reminders: true,
    deepWork: true,
    achievements: true,
    journal: true,
    calendar: true,
  },
};

/* ─── Support checks ─── */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

/* ─── Preferences ─── */
export function getNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : defaultPrefs;
  } catch {
    return defaultPrefs;
  }
}

export function saveNotificationPreferences(prefs: Partial<NotificationPreferences>): void {
  const current = getNotificationPreferences();
  const merged = { ...current, ...prefs };
  if (prefs.categories) {
    merged.categories = { ...current.categories, ...prefs.categories };
  }
  localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(merged));
}

/* ─── Show local notification via Service Worker ─── */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions & { category?: keyof NotificationPreferences['categories'] }
): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const prefs = getNotificationPreferences();
  if (!prefs.enabled) return;
  if (options?.category && !prefs.categories[options.category]) return;

  const reg = await navigator.serviceWorker?.ready;
  const notifOptions: NotificationOptions = {
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    ...options,
  };

  if (reg?.showNotification) {
    reg.showNotification(title, notifOptions);
  } else {
    new Notification(title, notifOptions);
  }
}

/* ─── Push subscription ─── */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker?.ready;
  if (!reg?.pushManager) return null;
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  } catch {
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const reg = await navigator.serviceWorker?.ready;
  if (!reg?.pushManager) return false;
  try {
    const sub = await reg.pushManager.getSubscription();
    if (sub) return sub.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker?.ready;
  if (!reg?.pushManager) return null;
  return reg.pushManager.getSubscription();
}

/* ─── Scheduled notifications (client-side with setTimeout) ─── */
const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();
const SCHEDULED_KEY = 'canvas_scheduled_notifications';

function loadScheduled(): ScheduledNotification[] {
  try {
    const raw = localStorage.getItem(SCHEDULED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveScheduled(list: ScheduledNotification[]) {
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(list));
}

export function scheduleNotification(
  title: string,
  options: NotificationOptions,
  delayMs: number
): string {
  const id = `sn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const scheduledAt = Date.now() + delayMs;

  const list = loadScheduled();
  list.push({ id, title, options, scheduledAt });
  saveScheduled(list);

  const timer = setTimeout(() => {
    showLocalNotification(title, options);
    cancelScheduledNotification(id);
  }, delayMs);

  scheduledTimers.set(id, timer);
  return id;
}

export function cancelScheduledNotification(id: string): void {
  const timer = scheduledTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    scheduledTimers.delete(id);
  }
  const list = loadScheduled().filter((n) => n.id !== id);
  saveScheduled(list);
}

export function restoreScheduledNotifications(): void {
  const now = Date.now();
  const list = loadScheduled();
  const remaining: ScheduledNotification[] = [];

  for (const item of list) {
    const delay = item.scheduledAt - now;
    if (delay > 0) {
      const timer = setTimeout(() => {
        showLocalNotification(item.title, item.options);
        cancelScheduledNotification(item.id);
      }, delay);
      scheduledTimers.set(item.id, timer);
      remaining.push(item);
    }
    // Expired ones are silently dropped
  }

  saveScheduled(remaining);
}

/* ─── Convenience notification helpers ─── */
export function notifyDeepWorkComplete(minutes: number): void {
  showLocalNotification('Deep Work Complete!', {
    body: `Great focus session! You completed ${minutes} minutes of deep work.`,
    tag: 'deep-work',
    category: 'deepWork',
  } as any);
}

export function notifyJournalReminder(): void {
  showLocalNotification('Time to Journal', {
    body: 'Take a moment to reflect on your day.',
    tag: 'journal-reminder',
    category: 'journal',
  } as any);
}

export function notifyAchievement(name: string): void {
  showLocalNotification('Achievement Unlocked!', {
    body: name,
    tag: 'achievement',
    category: 'achievements',
  } as any);
}

export function notifyCalendarEvent(eventTitle: string, startTime: string): void {
  showLocalNotification('Upcoming Event', {
    body: `${eventTitle} starts at ${startTime}`,
    tag: 'calendar-event',
    category: 'calendar',
  } as any);
}

/* ─── Utility ─── */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
