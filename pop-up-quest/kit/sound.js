// pop-up-quest — paper sounds, synthesised (no files): a page rustle, a card pop, a two-note chime, a soft thud.
// Off until the reader turns it on (browsers need a gesture anyway).
export function createSound() {
  let ctx = null, on = false;
  const ensure = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
  function noise(dur, f0, f1, gain, q = .9) {
    const c = ensure(), n = Math.round(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) { const u = i / n; d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * u) ** .7 * (1 + .6 * Math.sin(u * 47)); }
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(f0, c.currentTime); bp.frequency.exponentialRampToValueAtTime(f1, c.currentTime + dur);
    g.gain.value = gain; src.connect(bp).connect(g).connect(c.destination); src.start();
  }
  function tone(freq, at, dur, gain, type = 'sine') {
    const c = ensure(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
    o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
  }
  return {
    enable(v) { on = v; if (v) ensure(); },
    turn() { if (on) noise(.55, 1800, 700, .35); },
    pop() { if (on) { tone(150, 0, .12, .25, 'triangle'); noise(.06, 3000, 2400, .18, 2); } },
    solve() { if (on) { tone(784, 0, .5, .14); tone(1175, .12, .7, .12); } },
    wrong() { if (on) tone(110, 0, .18, .25, 'triangle'); },
  };
}
