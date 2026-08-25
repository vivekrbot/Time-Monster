import { Platform } from 'react-native';

// End-of-timer tone, synthesized with Web Audio so there is no asset to ship.
//
// Two things make this reliable in a browser:
//   1. The AudioContext is created on the "Set Timer" tap — autoplay policy only
//      lets us make noise if the context traces back to a user gesture.
//   2. The tone is scheduled the moment the timer starts, for a point in the
//      future. Web Audio runs on its own thread, so it fires on time even when
//      the tab is backgrounded and setInterval has been throttled to ~1/min.
// The countdown tick still calls ensureRung() as a fallback for the cases where
// the browser suspended the context out from under us.

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

// Library of alert sounds. Every preset shares the same envelope/timing knobs
// below and differs only in which notes it plays, so the pre-scheduled,
// throttle-proof scheduling in scheduleChime/ensureRung applies unchanged to
// all of them. `classic` is byte-for-byte the arpeggio this app shipped with.
export type AlertSoundId = 'classic' | 'gentle' | 'alert' | 'rising' | 'pulse';

export const ALERT_SOUNDS: Record<AlertSoundId, { label: string; notes: number[] }> = {
  classic: { label: 'Classic', notes: [880, 1108.73, 1318.51] }, // A5 / C#6 / E6
  gentle: { label: 'Gentle', notes: [659.25, 783.99] }, // E5 / G5
  alert: { label: 'Alert', notes: [1046.5, 830.61, 1046.5] }, // C6 / G#5 / C6
  rising: { label: 'Rising', notes: [523.25, 659.25, 783.99, 987.77] }, // C5 -> B5
  pulse: { label: 'Pulse', notes: [987.77, 987.77, 987.77] }, // B5 repeated
};

export const ALERT_SOUND_IDS: AlertSoundId[] = ['classic', 'gentle', 'alert', 'rising', 'pulse'];

export const DEFAULT_ALERT_SOUND: AlertSoundId = 'classic';

const NOTE_GAP = 0.18; // seconds between notes of one arpeggio
const NOTE_LEN = 0.9; // seconds for a single note to decay to silence
const REPEATS = 3; // bursts per chained batch — see scheduleBatchFrom
const REPEAT_GAP = 0.6; // seconds of silence between arpeggios
const PEAK_GAIN = 0.25;

function notesFor(soundId: AlertSoundId): number[] {
  return ALERT_SOUNDS[soundId]?.notes ?? ALERT_SOUNDS[DEFAULT_ALERT_SOUND].notes;
}

let ctx: AudioContext | null = null;
let scheduled: OscillatorNode[] = [];
let scheduledAt = 0; // ctx.currentTime the ring is due at
let ringStarted = false;
let activeSoundId: AlertSoundId = DEFAULT_ALERT_SOUND; // last sound scheduleChime was told to use
let looping = false; // cleared by cancelChime() so a chained batch stops rescheduling

/**
 * Create/resume the AudioContext. Must be called from inside a user gesture
 * handler (the "Set Timer" press), otherwise the browser keeps it suspended.
 */
export function unlockAudio() {
  if (!isWeb) return;
  try {
    if (!ctx) {
      const AudioCtor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      ctx = new AudioCtor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function voice(audio: AudioContext, freq: number, start: number) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = 'sine';
  osc.frequency.value = freq;

  // Exponential attack/decay — a bare start/stop clicks instead of chiming.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + NOTE_LEN);

  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + NOTE_LEN + 0.05);
  return osc;
}

// Oscillator nodes are one-shot, so "loop until stopped" is a chain of finite
// batches: each batch's last note reschedules the next one from its own
// onended, and only while `looping` is still true. Every individual note is
// still pre-scheduled with an absolute AudioContext time via voice(), so
// playback within a batch keeps the same tab-throttle-proof guarantee as
// before — only the decision to queue the *next* batch depends on a JS
// callback, which is a small, self-healing gap rather than the whole timing
// mechanism. `notes`/`repeatPeriod` are passed in rather than read from a
// module constant because they now vary per alert sound (SID-18).
function scheduleBatchFrom(startAt: number, notes: number[], repeatPeriod: number) {
  let lastNote: OscillatorNode | null = null;

  for (let repeat = 0; repeat < REPEATS; repeat += 1) {
    const burstStart = startAt + repeat * repeatPeriod;
    notes.forEach((freq, i) => {
      const note = voice(ctx!, freq, burstStart + i * NOTE_GAP);
      scheduled.push(note);
      lastNote = note;
    });
  }

  const batchEnd = startAt + REPEATS * repeatPeriod;
  if (lastNote) {
    (lastNote as OscillatorNode).onended = () => {
      if (looping) scheduleBatchFrom(Math.max(batchEnd, ctx!.currentTime), notes, repeatPeriod);
    };
  }
}

/**
 * Schedule the chime `delaySeconds` from now, looping until cancelChime().
 * `soundId` defaults to whichever sound was last scheduled (or `classic` on
 * a fresh load), so ensureRung's re-ring keeps using the same sound.
 */
export function scheduleChime(delaySeconds: number, soundId: AlertSoundId = activeSoundId) {
  cancelChime();
  activeSoundId = soundId;
  if (!isWeb || !ctx) return;

  const notes = notesFor(soundId);
  const burstLen = (notes.length - 1) * NOTE_GAP + NOTE_LEN;
  const repeatPeriod = burstLen + REPEAT_GAP;

  const t0 = ctx.currentTime + Math.max(0, delaySeconds);
  scheduledAt = t0;
  ringStarted = false;
  looping = true;

  scheduleBatchFrom(t0, notes, repeatPeriod);

  // First note finishing is our proof the ring actually happened.
  const first = scheduled[0];
  if (first) first.onended = () => { ringStarted = true; };
}

/**
 * Plays `soundId` once, immediately, for a picker preview. Independent of the
 * pending-chime bookkeeping above (`scheduled`/`cancelChime`), so it can never
 * clip or replace a chime already scheduled for a running timer.
 */
export function previewChime(soundId: AlertSoundId): number {
  unlockAudio(); // the picker tap is itself a user gesture
  if (!isWeb || !ctx) return 0;

  const notes = notesFor(soundId);
  const start = ctx.currentTime + 0.02;
  notes.forEach((freq, i) => voice(ctx!, freq, start + i * NOTE_GAP));
  return (notes.length - 1) * NOTE_GAP + NOTE_LEN; // seconds, for a UI "playing" timeout
}

/** Silence a pending or playing chime, and stop it from rescheduling itself. */
export function cancelChime() {
  looping = false;
  for (const osc of scheduled) {
    osc.onended = null; // stop() would otherwise fire it and reschedule/set ringStarted
    try {
      osc.stop();
    } catch {
      // already stopped
    }
    osc.disconnect();
  }
  scheduled = [];
}

/**
 * Called when the countdown hits zero. Trusts the pre-scheduled chime when it
 * is on time or has already played; otherwise rings immediately.
 */
export function ensureRung() {
  if (!isWeb) return;
  if (ringStarted) return; // already played (throttled tick arriving late)

  unlockAudio(); // context may have been suspended while we waited
  if (!ctx) return;

  const drift = ctx.currentTime - scheduledAt;
  const onTime = scheduled.length > 0 && ctx.state === 'running' && Math.abs(drift) <= 1.5;
  if (onTime) return;

  scheduleChime(0);
}

// --- Tab title flash -------------------------------------------------------
// Catches the user whose tab is muted or in the background. Background tabs
// throttle timers, so the title is set once up front and the interval is just
// a bonus blink for windows that are visible but unfocused.

const FLASH_MESSAGE = "⏰ Time's up!";

let flashTimer: ReturnType<typeof setInterval> | null = null;
let originalTitle = '';

export function startTitleFlash() {
  if (!isWeb || typeof document === 'undefined') return;
  if (flashTimer !== null) return;
  if (typeof document.hasFocus === 'function' && document.hasFocus()) return;

  originalTitle = document.title;
  document.title = FLASH_MESSAGE;

  let showingMessage = true;
  flashTimer = setInterval(() => {
    showingMessage = !showingMessage;
    document.title = showingMessage ? FLASH_MESSAGE : originalTitle;
  }, 900);

  window.addEventListener('focus', stopTitleFlash);
  document.addEventListener('visibilitychange', handleVisibility);
}

function handleVisibility() {
  if (!document.hidden) stopTitleFlash();
}

export function stopTitleFlash() {
  if (!isWeb || typeof document === 'undefined') return;
  if (flashTimer === null) return;

  clearInterval(flashTimer);
  flashTimer = null;
  document.title = originalTitle;

  window.removeEventListener('focus', stopTitleFlash);
  document.removeEventListener('visibilitychange', handleVisibility);
}
