/**
 * Synthesized ringtone generator using Web Audio API
 * Avoids broken external audio URLs or CORS issues.
 */

let audioCtx = null;
let ringtoneInterval = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a double-chime incoming ringtone cycle
 */
function playChime(ctx) {
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;

  // Tone 1: 520 Hz
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(520, now);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.18, now + 0.05);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.5);

  // Tone 2: 660 Hz
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(660, now + 0.15);
  gain2.gain.setValueAtTime(0, now + 0.15);
  gain2.gain.linearRampToValueAtTime(0.22, now + 0.2);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.7);
}

export function startRingtone() {
  stopRingtone();
  const ctx = getAudioContext();
  if (!ctx) return;

  playChime(ctx);
  ringtoneInterval = setInterval(() => {
    playChime(ctx);
  }, 2200);
}

export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}
