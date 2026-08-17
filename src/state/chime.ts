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

const NOTES = [880, 1108.73, 1318.51]; // A5 / C#6 / E6
const NOTE_GAP = 0.18; // seconds between notes of one arpeggio
const NOTE_LEN = 0.9; // seconds for a single note to decay to silence
const REPEATS = 3;
const REPEAT_GAP = 0.6; // seconds of silence between arpeggios
const PEAK_GAIN = 0.25;

const BURST_LEN = (NOTES.length - 1) * NOTE_GAP + NOTE_LEN;
const REPEAT_PERIOD = BURST_LEN + REPEAT_GAP;

let ctx: AudioContext | null = null;
let scheduled: OscillatorNode[] = [];
let scheduledAt = 0; // ctx.currentTime the ring is due at
let ringStarted = false;

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

/** Schedule the chime `delaySeconds` from now. Replaces any pending chime. */
export function scheduleChime(delaySeconds: number) {
  cancelChime();
  if (!isWeb || !ctx) return;

  const t0 = ctx.currentTime + Math.max(0, delaySeconds);
  scheduledAt = t0;
  ringStarted = false;

  for (let repeat = 0; repeat < REPEATS; repeat += 1) {
    const burstStart = t0 + repeat * REPEAT_PERIOD;
    NOTES.forEach((freq, i) => {
      scheduled.push(voice(ctx!, freq, burstStart + i * NOTE_GAP));
    });
  }

  // First note finishing is our proof the ring actually happened.
  const first = scheduled[0];
  if (first) first.onended = () => { ringStarted = true; };
}

/** Silence a pending or playing chime. */
export function cancelChime() {
  for (const osc of scheduled) {
    osc.onended = null; // stop() would otherwise fire it and set ringStarted
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
