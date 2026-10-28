// Junta todo lo que miden `hyperframes beats` y `hyperframes audio` sobre la ventana de la pista
// en assets/scenes-data.js: rejilla, compases, secciones (de la ventana y de la canción entera),
// golpes por banda pegados a la rejilla y la envolvente a 30 fps para el vúmetro.
// La composición no puede hacer fetch (render determinista), así que el JSON entra como <script>.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = process.argv[2] || "out";                   // carpeta con meta/full/signal/kick/snare/hat.json
const windowStart = Number(process.argv[3] || 0.025);   // segundo de la canción donde empieza la ventana
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const item = (f) => read(join(dir, f)).items[0];

const grid = read("beats/assets/track.mp3.json");   // salida de `beats comp`
const meta = item("meta.json");                           // audio --only beats,downbeats,bpm,sections
const full = item("full.json");                           // audio --only sections,bpm sobre la canción entera
const signal = item("signal.json");                       // audio (default): loudness, envelope
const beats = grid.beats.map((b) => b.time);

// bombo y tarola: el golpe vive en la rejilla de `beats`; la banda dice si esa pieza sonó en ese beat
function onBeats(file, minStrength) {
  const events = item(file).onsets.events;
  return beats.flatMap((t) => {
    const e = events.filter((x) => Math.abs(x.t - t) < 0.05).sort((a, b) => b.strength - a.strength)[0];
    return e && e.strength >= minStrength ? [{ t: +e.t.toFixed(3), s: +e.strength.toFixed(2) }] : [];
  });
}
// bombo: en electro el bajo sostenido tapa el ataque y los onsets fallan; lo que sí se ve es que la
// envolvente de 30–120 Hz sube de golpe en el beat. Golpe = subida de al menos minRise dB contra los 80 ms previos.
function riseOnBeats(file, minRise) {
  const { values, hopMs } = item(file).envelope;
  const hop = hopMs / 1000;
  const span = (a, b, f) => values.slice(Math.max(0, Math.round(a / hop)), Math.round(b / hop) + 1).reduce((m, v) => f(m, v));
  return beats.flatMap((t) => {
    const rise = span(t - 0.02, t + 0.06, Math.max) - span(t - 0.1, t - 0.02, Math.min);
    return rise >= minRise ? [{ t, s: +Math.min(1, rise / 60).toFixed(2) }] : [];
  });
}
// hi-hat: golpes agudos libres, con separación mínima para que el palo alcance a subir
function free(file, minStrength, minGap) {
  let last = -1;
  return item(file).onsets.events
    .filter((e) => e.strength >= minStrength && e.t - last >= minGap && ((last = e.t), true))
    .map((e) => ({ t: +e.t.toFixed(3), s: +e.strength.toFixed(2) }));
}

// envolvente en dB → un valor por cuadro (30 fps)
const env = signal.envelope;
const fps = 30;
const frames = Math.ceil(signal.duration * fps);
const envFrames = Array.from({ length: frames }, (_, f) => {
  const i = Math.min(env.values.length - 1, Math.round(((f / fps) * 1000 - (env.startsAt || 0) * 1000) / env.hopMs));
  return +Math.max(-60, env.values[Math.max(0, i)]).toFixed(1);
});

const data = {
  bpm: Math.round(meta.bpm.value),
  duration: signal.duration,
  beats,
  downbeats: meta.downbeats.times,
  sections: meta.sections.spans,
  song: { start: windowStart, duration: full.duration, sections: full.sections.spans },
  kick: riseOnBeats("kick.json", 10),
  snare: onBeats("snare.json", 0.65),
  hat: free("hat.json", 0.4, 0.12),
  env: envFrames,
  lufs: signal.loudness.lufsIntegrated,
  truePeak: signal.loudness.truePeakDb,
};
writeFileSync(join(root, "assets/scenes-data.js"), `// Generado por scripts/make-scenes-data.mjs — no editar a mano.\nwindow.SCENES_DATA = ${JSON.stringify(data)};\n`);
console.log(`bpm ${data.bpm} · ${beats.length} beats · ${data.downbeats.length} downbeats · secciones ${data.sections.map((s) => s.label + "@" + s.start).join(", ")} · canción ${data.song.sections.length} secciones · bombo ${data.kick.length} · tarola ${data.snare.length} · hi-hat ${data.hat.length} · ${data.lufs} LUFS`);
