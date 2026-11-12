// Motor de audio del «Mundo»: Web Audio, cero archivos, cero peso. Los sonidos son recetas de la
// skin de cada cartucho (`SoundBank`); aquí sólo viven el contexto, el volumen y las reglas.
//
// - El contexto de audio se crea hasta el primer gesto de la persona (política de autoplay).
// - Volumen bajo y un compresor al final, para que varios saludos juntos no saturen.
// - Nunca suena igual dos veces seguidas: tres afinaciones que se alternan.

import type { SoundBank } from "./cartridge";

const MASTER = 0.25;
/** Lo que hacen otras naves suena más bajito, para que quince personas no sean una feria. */
const OTHERS = 0.35;
const DETUNE = [0, 45, -35]; // cents

export type Sound = {
  /** Llamar dentro de un gesto (clic, toque, tecla): ahí se permite arrancar el audio. */
  unlock: () => void;
  setEnabled: (on: boolean) => void;
  play: (name: string, opts?: { other?: boolean }) => void;
  destroy: () => void;
};

export function createSound(enabled: boolean, bank: SoundBank): Sound {
  let on = enabled;
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;
  let turn = 0;
  const lastAt: Record<string, number> = {};

  function ensure() {
    if (ctx || !on) return;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -14; limiter.knee.value = 6; limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.12;
      out = ctx.createGain(); out.gain.value = MASTER;
      out.connect(limiter); limiter.connect(ctx.destination);
    } catch {
      ctx = null; out = null; // sin audio: el Mundo sigue igual
    }
  }

  /** Una nota: oscilador con envolvente corta y, si se pide, barrido de tono. */
  function tone(c: AudioContext, dest: AudioNode, o: { type: OscillatorType; from: number; to?: number; at?: number; dur: number; gain: number; cents: number }) {
    const t0 = c.currentTime + (o.at ?? 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type; osc.detune.value = o.cents;
    osc.frequency.setValueAtTime(o.from, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g); g.connect(dest);
    osc.start(t0); osc.stop(t0 + o.dur + 0.02);
  }
  /** Soplido: ruido filtrado que sube y se apaga (el impulso de la nave). */
  function whoosh(c: AudioContext, dest: AudioNode, dur: number, gain: number, cents: number, from = 380, to = 1500) {
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.4; f.detune.value = cents;
    f.frequency.setValueAtTime(from, c.currentTime); f.frequency.exponentialRampToValueAtTime(to, c.currentTime + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(gain, c.currentTime + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start();
  }

  return {
    unlock() {
      if (!on) return;
      ensure();
      if (ctx?.state === "suspended") void ctx.resume().catch(() => {});
    },
    setEnabled(next) {
      on = next;
      if (!on && ctx?.state === "running") void ctx.suspend().catch(() => {});
    },
    play(name, opts) {
      const recipe = bank[name];
      if (!recipe || !on || !ctx || !out || ctx.state !== "running") return; // sin receta, bloqueado o apagado: silencio, sin errores
      const now = performance.now();
      if (now - (lastAt[name] ?? 0) < 90) return; // sin ráfagas del mismo sonido
      lastAt[name] = now;
      const cents = DETUNE[turn++ % DETUNE.length];
      let dest: AudioNode = out;
      if (opts?.other) { const g = ctx.createGain(); g.gain.value = OTHERS; g.connect(out); dest = g; }
      const c = ctx;
      try {
        recipe({ ctx: c, dest, cents, tone: (o) => tone(c, dest, { ...o, cents }), whoosh: (dur, gain, from, to) => whoosh(c, dest, dur, gain, cents, from, to) });
      } catch {
        // Un nodo que no arranca no debe tirar el Mundo.
      }
    },
    destroy() {
      on = false;
      void ctx?.close().catch(() => {});
      ctx = null; out = null;
    },
  };
}
