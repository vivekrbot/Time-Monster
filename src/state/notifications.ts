import { Platform } from 'react-native';

// Wraps the browser Notification API. Additive to the existing chime +
// tab-title-flash alert path (chime.ts) — never a replacement, and every
// function here degrades to a silent no-op on an unsupported browser or a
// denied/not-yet-granted permission, so the fallback is always what actually
// carries the alert on iOS Safari and anywhere else this API is missing.

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

export type NotifyPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function isNotificationSupported(): boolean {
  return isWeb && typeof Notification !== 'undefined';
}

export function getNotificationPermission(): NotifyPermission {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Must be called from inside a direct user gesture (the toggle's own tap) —
 * never on page load. If permission was already granted or denied, the
 * browser resolves this immediately without showing a prompt.
 */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return getNotificationPermission();
  }
}

/**
 * Fires a completion notification if permission is granted and the tab is
 * not focused — mirrors the same focus check startTitleFlash() already uses,
 * so a focused tab never gets both a flash and a system notification. Silent
 * no-op otherwise; the caller does not need to guard this itself.
 */
export function showTimerNotification(minutes: number) {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;
  if (typeof document !== 'undefined' && typeof document.hasFocus === 'function' && document.hasFocus()) return;

  try {
    new Notification('Time Monster', { body: `Your ${minutes}-minute timer is done.` });
  } catch {
    // Never let a notification failure take down the rest of the completion path.
  }
}
