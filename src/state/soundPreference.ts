import { Platform } from 'react-native';
import { ALERT_SOUNDS, DEFAULT_ALERT_SOUND, type AlertSoundId } from './chime';

// Remembers the user's alert-sound choice across visits. localStorage can
// throw (private browsing, quota, disabled storage) or simply not exist on
// native platforms, so every read/write here is wrapped and degrades
// silently to the default sound rather than erroring.

const STORAGE_KEY = 'time-monster:alert-sound';
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

function isAlertSoundId(value: unknown): value is AlertSoundId {
  return typeof value === 'string' && value in ALERT_SOUNDS;
}

export function loadSoundPreference(): AlertSoundId {
  if (!isWeb) return DEFAULT_ALERT_SOUND;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isAlertSoundId(stored) ? stored : DEFAULT_ALERT_SOUND;
  } catch {
    return DEFAULT_ALERT_SOUND;
  }
}

export function saveSoundPreference(soundId: AlertSoundId): void {
  if (!isWeb) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, soundId);
  } catch {
    // storage unavailable (private mode, quota, disabled) — selection just won't persist
  }
}
