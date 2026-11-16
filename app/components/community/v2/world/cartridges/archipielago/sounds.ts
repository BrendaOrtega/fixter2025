// Archipiélago: soniditos sintetizados, en clave de chiptune (cuadrada y triangular). Cada uno dura
// lo que dura su movimiento y tiene su señal visual.
import type { SoundBank } from "../../cartridge";

export const sounds: SoundBank = {
  thrust: (k) => k.whoosh(0.22, 0.35, 900, 300),
  arrive: (k) => k.tone({ type: "square", from: 660, to: 440, dur: 0.1, gain: 0.25 }),
  waveOut: (k) => {
    k.tone({ type: "square", from: 784, dur: 0.08, gain: 0.25 });
    k.tone({ type: "square", from: 1047, at: 0.08, dur: 0.12, gain: 0.25 });
  },
  waveIn: (k) => {
    k.tone({ type: "triangle", from: 1047, dur: 0.08, gain: 0.5 });
    k.tone({ type: "triangle", from: 1319, at: 0.08, dur: 0.16, gain: 0.5 });
  },
  sit: (k) => k.tone({ type: "triangle", from: 330, to: 165, dur: 0.16, gain: 0.6 }),
  stand: (k) => k.tone({ type: "triangle", from: 165, to: 330, dur: 0.14, gain: 0.6 }),
  expand: (k) => k.tone({ type: "square", from: 330, to: 660, dur: 0.18, gain: 0.2 }),
  collapse: (k) => k.tone({ type: "square", from: 660, to: 330, dur: 0.18, gain: 0.2 }),
  nudge: (k) => k.tone({ type: "triangle", from: 220, to: 160, dur: 0.1, gain: 0.4 }),
  msg: (k) => k.tone({ type: "triangle", from: 880, to: 1175, dur: 0.1, gain: 0.3 }),
  pick: (k) => k.tone({ type: "square", from: 1319, dur: 0.04, gain: 0.15 }),
  // estrella: arpegio que sube, como de moneda
  star: (k) => {
    k.tone({ type: "square", from: 988, dur: 0.06, gain: 0.22 });
    k.tone({ type: "square", from: 1319, at: 0.06, dur: 0.14, gain: 0.22 });
  },
};
