// Soniditos del «Mundo», sintetizados con Web Audio: cero archivos, cero peso. Cada sonido dura lo
// que dura su movimiento (≤ 400 ms) y siempre tiene su señal visual: nada depende sólo del oído.
//
// - El contexto de audio se crea hasta el primer gesto de la persona (política de autoplay).
// - Volumen bajo y un compresor al final, para que varios saludos juntos no saturen.
// - Nunca suena igual dos veces seguidas: tres afinaciones que se alternan.

export type SoundName = "thrust" | "arrive" | "waveOut" | "waveIn" | "sit" | "stand" | "expand" | "collapse" | "pick" | "shoot" | "shootTriple" | "shootRay" | "shootWave" | "shootSeeker" | "shootBounce" | "shootBomb" | "blast" | "boom" | "warp" | "pickup" | "msg" | "nudge";

const MASTER = 0.25;
/** Lo que hacen otras naves suena más bajito, para que quince personas no sean una feria. */
const OTHERS = 0.35;
const DETUNE = [0, 45, -35]; // cents

export type Sound = {
  /** Llamar dentro de un gesto (clic, toque, tecla): ahí se permite arrancar el audio. */
  unlock: () => void;
  setEnabled: (on: boolean) => void;
  play: (name: SoundName, opts?: { other?: boolean }) => void;
  destroy: () => void;
};

export function createSound(enabled: boolean): Sound {
  let on = enabled;
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;
  let turn = 0;
  const lastAt: Partial<Record<SoundName, number>> = {};

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
      if (!on || !ctx || !out || ctx.state !== "running") return; // bloqueado o apagado: silencio, sin errores
      const now = performance.now();
      if (now - (lastAt[name] ?? 0) < 90) return; // sin ráfagas del mismo sonido
      lastAt[name] = now;
      const cents = DETUNE[turn++ % DETUNE.length];
      let dest: AudioNode = out;
      if (opts?.other) { const g = ctx.createGain(); g.gain.value = OTHERS; g.connect(out); dest = g; }
      const c = ctx;
      try {
        switch (name) {
          case "thrust": whoosh(c, dest, 0.26, 0.5, cents); break;
          case "arrive": tone(c, dest, { type: "sine", from: 560, to: 300, dur: 0.14, gain: 0.7, cents }); break;
          case "waveOut": // dos notas hacia arriba
            tone(c, dest, { type: "triangle", from: 660, dur: 0.1, gain: 0.6, cents });
            tone(c, dest, { type: "triangle", from: 880, at: 0.09, dur: 0.14, gain: 0.6, cents }); break;
          case "waveIn": // otra pareja, más aguda y redonda: te saludaron a ti
            tone(c, dest, { type: "sine", from: 988, dur: 0.1, gain: 0.6, cents });
            tone(c, dest, { type: "sine", from: 1319, at: 0.1, dur: 0.18, gain: 0.6, cents }); break;
          case "sit": tone(c, dest, { type: "sine", from: 240, to: 130, dur: 0.18, gain: 0.8, cents }); break;
          case "stand": tone(c, dest, { type: "sine", from: 150, to: 280, dur: 0.16, gain: 0.7, cents }); break;
          case "expand": tone(c, dest, { type: "triangle", from: 300, to: 640, dur: 0.22, gain: 0.5, cents }); break;
          case "collapse": tone(c, dest, { type: "triangle", from: 640, to: 300, dur: 0.22, gain: 0.5, cents }); break;
          case "nudge": tone(c, dest, { type: "sine", from: 210, to: 150, dur: 0.11, gain: 0.4, cents }); break; // toquecito grave y corto
          case "msg": tone(c, dest, { type: "sine", from: 520, to: 700, dur: 0.12, gain: 0.32, cents }); break; // gotita suave: alguien escribió
          case "pick": tone(c, dest, { type: "square", from: 1040, dur: 0.05, gain: 0.22, cents }); break;
          case "shoot": // «piu» corto que cae, con un soplido encima
            tone(c, dest, { type: "triangle", from: 1250, to: 360, dur: 0.14, gain: 0.5, cents });
            whoosh(c, dest, 0.12, 0.18, cents); break;
          case "shootTriple": // tres «piu» escalonados
            for (let k = 0; k < 3; k++) tone(c, dest, { type: "triangle", from: 1150 + k * 160, to: 380, at: k * 0.045, dur: 0.12, gain: 0.36, cents });
            break;
          case "shootRay": // zumbido largo que cae
            tone(c, dest, { type: "sawtooth", from: 1700, to: 240, dur: 0.3, gain: 0.22, cents });
            tone(c, dest, { type: "sine", from: 850, to: 120, dur: 0.3, gain: 0.4, cents }); break;
          case "shootWave": // soplido grave que se abre, lo que dura el aro
            whoosh(c, dest, 0.4, 0.4, cents);
            tone(c, dest, { type: "sine", from: 160, to: 420, dur: 0.4, gain: 0.45, cents }); break;
          case "shootSeeker": // dos chirridos que suben: va buscando
            tone(c, dest, { type: "triangle", from: 520, to: 1100, dur: 0.16, gain: 0.4, cents });
            tone(c, dest, { type: "sine", from: 760, to: 1500, at: 0.06, dur: 0.14, gain: 0.3, cents }); break;
          case "shootBounce": // «boing»: sube y cae
            tone(c, dest, { type: "sine", from: 300, to: 900, dur: 0.08, gain: 0.5, cents });
            tone(c, dest, { type: "sine", from: 900, to: 420, at: 0.08, dur: 0.14, gain: 0.45, cents }); break;
          case "shootBomb": tone(c, dest, { type: "sine", from: 260, to: 110, dur: 0.2, gain: 0.6, cents }); break; // «tunk» grave al soltarla
          case "blast": // la bomba revienta: soplido que cae con un golpe grave, lo que dura su aro
            whoosh(c, dest, 0.3, 0.5, cents, 1400, 220);
            tone(c, dest, { type: "sine", from: 150, to: 50, dur: 0.3, gain: 0.8, cents }); break;
          case "boom": // la nave de un robot estalla: golpe grave, soplido largo que cae y un crujido
            whoosh(c, dest, 0.45, 0.7, cents, 2200, 160);
            tone(c, dest, { type: "sine", from: 190, to: 40, dur: 0.45, gain: 0.9, cents });
            tone(c, dest, { type: "square", from: 420, to: 70, dur: 0.16, gain: 0.18, cents }); break;
          case "warp": // llegada en hipervelocidad: barrido que cae mientras frena y golpe seco al detenerse
            whoosh(c, dest, 0.5, 0.5, cents, 3200, 240);
            tone(c, dest, { type: "sawtooth", from: 1800, to: 120, dur: 0.45, gain: 0.14, cents });
            tone(c, dest, { type: "sine", from: 130, to: 48, at: 0.42, dur: 0.16, gain: 0.8, cents }); break;
          case "pickup": // recogiste un aparato: dos notas que suben
            tone(c, dest, { type: "triangle", from: 587, dur: 0.09, gain: 0.5, cents });
            tone(c, dest, { type: "triangle", from: 880, at: 0.08, dur: 0.16, gain: 0.5, cents }); break;
        }
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
