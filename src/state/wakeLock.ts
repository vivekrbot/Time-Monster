import { Platform } from 'react-native';

// Keeps the phone screen from sleeping while a timer is running.
//
// The Wake Lock API releases its lock on its own the moment the tab is hidden (per spec) — this
// module's job is to re-acquire it when the tab becomes visible again, for as long as a timer
// still wants the screen held awake. Unsupported browsers (notably iOS Safari) are a silent no-op:
// this is a reliability enhancement, not a requirement the app depends on.

const isWeb = Platform.OS === 'web' && typeof navigator !== 'undefined';

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
};
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
};

let sentinel: WakeLockSentinelLike | null = null;
let held = false; // true while a timer wants the screen kept awake

async function acquire() {
  if (!isWeb) return;
  const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
  if (!wakeLock) return;
  try {
    const acquired = await wakeLock.request('screen');
    if (!held) {
      // released while the request was in flight — don't hang on to it
      void acquired.release();
      return;
    }
    sentinel = acquired;
    acquired.addEventListener('release', () => {
      // A stale lock's release event must not clear a newer one: on a fast stop/restart the old
      // lock can settle after the new one is already held.
      if (sentinel === acquired) sentinel = null;
    });
  } catch {
    // Denied, unsupported, or the document isn't visible yet — fine, silent no-op.
    sentinel = null;
  }
}

function handleVisibilityChange() {
  if (held && document.visibilityState === 'visible' && !sentinel) {
    void acquire();
  }
}

/** Ask to keep the screen awake. Call when a timer starts. Safe to call repeatedly. */
export function requestWakeLock() {
  if (!isWeb || held) return;
  held = true;
  document.addEventListener('visibilitychange', handleVisibilityChange);
  void acquire();
}

/** Stop keeping the screen awake. Call on completion, early stop, or leaving the Timer screen. */
export function releaseWakeLock() {
  if (!isWeb || !held) return;
  held = false;
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (sentinel) {
    const current = sentinel;
    sentinel = null;
    void current.release();
  }
}
