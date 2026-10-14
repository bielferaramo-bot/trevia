// Synthesizes a loud, high-impact Uber-style incoming dispatch chime using Web Audio API
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playDispatchAlert() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Trigger physical phone vibration if available
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 450]);
    }

    const now = ctx.currentTime;

    // Dual-tone high-impact dispatch chime sequence (3 quick pulses)
    const tones = [
      { freq1: 659.25, freq2: 880.00, start: 0.00, dur: 0.16 }, // E5 -> A5
      { freq1: 880.00, freq2: 1174.66, start: 0.18, dur: 0.22 }, // A5 -> D6
      { freq1: 659.25, freq2: 880.00, start: 0.45, dur: 0.16 },
      { freq1: 880.00, freq2: 1174.66, start: 0.63, dur: 0.25 }
    ];

    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // Rich, audible harmonic sound
      osc.frequency.setValueAtTime(t.freq1, now + t.start);
      osc.frequency.exponentialRampToValueAtTime(t.freq2, now + t.start + t.dur * 0.7);

      gain.gain.setValueAtTime(0.001, now + t.start);
      gain.gain.exponentialRampToValueAtTime(0.7, now + t.start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t.start + t.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t.start);
      osc.stop(now + t.start + t.dur);
    });
  } catch (err) {
    console.warn('Não foi possível tocar o áudio de alerta:', err);
  }
}
