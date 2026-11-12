// GeekSector: sus soniditos, sintetizados (cero archivos). Cada sonido dura lo que dura su
// movimiento (≤ 500 ms) y siempre tiene su señal visual: nada depende sólo del oído.
import type { SoundBank } from "../../cartridge";

export const sounds: SoundBank = {
  thrust: (k) => k.whoosh(0.26, 0.5),
  arrive: (k) => k.tone({ type: "sine", from: 560, to: 300, dur: 0.14, gain: 0.7 }),
  // dos notas hacia arriba
  waveOut: (k) => {
    k.tone({ type: "triangle", from: 660, dur: 0.1, gain: 0.6 });
    k.tone({ type: "triangle", from: 880, at: 0.09, dur: 0.14, gain: 0.6 });
  },
  // otra pareja, más aguda y redonda: te saludaron a ti
  waveIn: (k) => {
    k.tone({ type: "sine", from: 988, dur: 0.1, gain: 0.6 });
    k.tone({ type: "sine", from: 1319, at: 0.1, dur: 0.18, gain: 0.6 });
  },
  sit: (k) => k.tone({ type: "sine", from: 240, to: 130, dur: 0.18, gain: 0.8 }),
  stand: (k) => k.tone({ type: "sine", from: 150, to: 280, dur: 0.16, gain: 0.7 }),
  expand: (k) => k.tone({ type: "triangle", from: 300, to: 640, dur: 0.22, gain: 0.5 }),
  collapse: (k) => k.tone({ type: "triangle", from: 640, to: 300, dur: 0.22, gain: 0.5 }),
  // toquecito grave y corto
  nudge: (k) => k.tone({ type: "sine", from: 210, to: 150, dur: 0.11, gain: 0.4 }),
  // gotita suave: alguien escribió
  msg: (k) => k.tone({ type: "sine", from: 520, to: 700, dur: 0.12, gain: 0.32 }),
  pick: (k) => k.tone({ type: "square", from: 1040, dur: 0.05, gain: 0.22 }),
  // «piu» corto que cae, con un soplido encima
  shoot: (k) => {
    k.tone({ type: "triangle", from: 1250, to: 360, dur: 0.14, gain: 0.5 });
    k.whoosh(0.12, 0.18);
  },
  // tres «piu» escalonados
  shootTriple: (k) => {
    for (let i = 0; i < 3; i++) k.tone({ type: "triangle", from: 1150 + i * 160, to: 380, at: i * 0.045, dur: 0.12, gain: 0.36 });
  },
  // zumbido largo que cae
  shootRay: (k) => {
    k.tone({ type: "sawtooth", from: 1700, to: 240, dur: 0.3, gain: 0.22 });
    k.tone({ type: "sine", from: 850, to: 120, dur: 0.3, gain: 0.4 });
  },
  // soplido grave que se abre, lo que dura el aro
  shootWave: (k) => {
    k.whoosh(0.4, 0.4);
    k.tone({ type: "sine", from: 160, to: 420, dur: 0.4, gain: 0.45 });
  },
  // dos chirridos que suben: va buscando
  shootSeeker: (k) => {
    k.tone({ type: "triangle", from: 520, to: 1100, dur: 0.16, gain: 0.4 });
    k.tone({ type: "sine", from: 760, to: 1500, at: 0.06, dur: 0.14, gain: 0.3 });
  },
  // «boing»: sube y cae
  shootBounce: (k) => {
    k.tone({ type: "sine", from: 300, to: 900, dur: 0.08, gain: 0.5 });
    k.tone({ type: "sine", from: 900, to: 420, at: 0.08, dur: 0.14, gain: 0.45 });
  },
  // «tunk» grave al soltarla
  shootBomb: (k) => k.tone({ type: "sine", from: 260, to: 110, dur: 0.2, gain: 0.6 }),
  // la bomba revienta: soplido que cae con un golpe grave, lo que dura su aro
  blast: (k) => {
    k.whoosh(0.3, 0.5, 1400, 220);
    k.tone({ type: "sine", from: 150, to: 50, dur: 0.3, gain: 0.8 });
  },
  // la nave de un robot estalla: golpe grave, soplido largo que cae y un crujido
  boom: (k) => {
    k.whoosh(0.45, 0.7, 2200, 160);
    k.tone({ type: "sine", from: 190, to: 40, dur: 0.45, gain: 0.9 });
    k.tone({ type: "square", from: 420, to: 70, dur: 0.16, gain: 0.18 });
  },
  // la enemiga estalla: más largo y más grave que un robot, con dos crujidos
  boomBig: (k) => {
    k.whoosh(0.9, 0.9, 2600, 90);
    k.tone({ type: "sine", from: 210, to: 30, dur: 0.9, gain: 1 });
    k.tone({ type: "square", from: 520, to: 60, dur: 0.22, gain: 0.22 });
    k.tone({ type: "sawtooth", from: 300, to: 40, at: 0.2, dur: 0.4, gain: 0.2 });
  },
  // recogiste una vida: tres notas que suben
  life: (k) => {
    k.tone({ type: "sine", from: 523, dur: 0.09, gain: 0.5 });
    k.tone({ type: "sine", from: 659, at: 0.08, dur: 0.09, gain: 0.5 });
    k.tone({ type: "sine", from: 988, at: 0.16, dur: 0.2, gain: 0.5 });
  },
  // llegada en hipervelocidad: barrido que cae mientras frena y golpe seco al detenerse
  warp: (k) => {
    k.whoosh(0.5, 0.5, 3200, 240);
    k.tone({ type: "sawtooth", from: 1800, to: 120, dur: 0.45, gain: 0.14 });
    k.tone({ type: "sine", from: 130, to: 48, at: 0.42, dur: 0.16, gain: 0.8 });
  },
  // viene la nave enemiga: tres avisos graves, uno por segundo, lo que dura el letrero
  alarm: (k) => {
    for (let i = 0; i < 3; i++) {
      k.tone({ type: "triangle", from: 440, to: 330, at: i, dur: 0.32, gain: 0.5 });
      k.tone({ type: "sine", from: 220, to: 165, at: i, dur: 0.32, gain: 0.5 });
    }
  },
  // disparo de la enemiga: zumbido grave y corto
  enemyShot: (k) => k.tone({ type: "sawtooth", from: 330, to: 130, dur: 0.2, gain: 0.3 }),
  // le pegaron a tu nave: golpe seco con un crujido
  hit: (k) => {
    k.tone({ type: "sine", from: 190, to: 70, dur: 0.16, gain: 0.85 });
    k.tone({ type: "square", from: 320, to: 90, dur: 0.08, gain: 0.14 });
  },
  // recogiste un aparato: dos notas que suben
  pickup: (k) => {
    k.tone({ type: "triangle", from: 587, dur: 0.09, gain: 0.5 });
    k.tone({ type: "triangle", from: 880, at: 0.08, dur: 0.16, gain: 0.5 });
  },
};
