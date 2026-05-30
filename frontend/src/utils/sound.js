/**
 * Sound effects using Web Audio API — no external files needed.
 * Generates a satisfying cash-register / success sound on demand.
 */

let audioCtx = null;
const getCtx = () => {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return null; }
  }
  return audioCtx;
};

const isMuted = () => localStorage.getItem('sound_muted') === 'true';
export const setMuted = (v) => localStorage.setItem('sound_muted', String(v));
export const getMuted = () => isMuted();

/** Plays a sine tone with the given frequency, duration, and gain envelope. */
const beep = (freq, duration = 0.15, gain = 0.3, type = 'sine', startAt = 0) => {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime + startAt;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
};

/** Classic cash-register "cha-ching" — two ascending bell tones + sparkle. */
export const playCheckout = () => {
  if (isMuted()) return;
  // Bell-like double "ding"
  beep(1320, 0.18, 0.25, 'triangle', 0);     // E6
  beep(1760, 0.20, 0.22, 'triangle', 0.08);  // A6
  // Sparkle
  beep(2640, 0.10, 0.12, 'sine', 0.22);      // E7
  beep(3520, 0.10, 0.10, 'sine', 0.30);      // A7
};

/** Soft confirm bleep (e.g., adding to cart). */
export const playTap = () => {
  if (isMuted()) return;
  beep(880, 0.06, 0.10, 'sine');
};

/** Error/warning sound. */
export const playError = () => {
  if (isMuted()) return;
  beep(220, 0.12, 0.18, 'sawtooth', 0);
  beep(180, 0.18, 0.18, 'sawtooth', 0.10);
};

/** Celebratory upward arpeggio (e.g., cash close OK). */
export const playSuccess = () => {
  if (isMuted()) return;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((n, i) => beep(n, 0.18, 0.22, 'triangle', i * 0.10));
  beep(1568, 0.30, 0.18, 'sine', 0.50); // G6 sparkle
};
