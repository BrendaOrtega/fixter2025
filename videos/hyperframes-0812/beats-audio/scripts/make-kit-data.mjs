// Junta lo que miden `hyperframes beats` y `hyperframes audio` sobre la pista real en
// comp/assets/kit-data.js: rejilla, compases, secciones y un golpe por instrumento.
// Cada instrumento sale de `audio --band`: bombo 30–120 Hz, tarola 1.5–4 kHz, hi-hat 8–16 kHz.
// La composición no puede hacer fetch (render determinista), así que el JSON entra como <script>.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = process.argv[2] || "out/funkorama";
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const item = (f) => read(join(dir, f)).items[0];

const grid = read("comp/beats/assets/track.mp3.json");   // salida de `beats comp`
const meta = item("meta.json");                           // audio --only beats,downbeats,bpm,sections
const signal = item("signal.json");                       // audio (default): silencios, loudness

// golpes por banda: fuerza mínima y separación mínima para que el palo alcance a subir y bajar
function hits(file, minStrength, minGap = 0.17) {
  let last = -1;
  return item(file).onsets.events
    .filter((e) => e.strength >= minStrength)
    .filter((e) => (e.t - last >= minGap ? ((last = e.t), true) : false))
    .map((e) => ({ t: +e.t.toFixed(3), s: +e.strength.toFixed(2) }));
}

const data = {
  bpm: Math.round(meta.bpm.value),
  duration: signal.duration,
  beats: grid.beats.map((b) => b.time),
  downbeats: meta.downbeats.times,
  sections: meta.sections.spans,
  silences: signal.silence.filter((s) => s.end - s.start > 0.5 && s.start > 1 && s.end < signal.duration - 0.2),
  kick: hits("kick.json", 0.6),
  snare: hits("snare.json", 0.6),
  hat: hits("hat.json", 0.5),
  lufs: signal.loudness.lufsIntegrated,
};
writeFileSync(join(root, "comp/assets/kit-data.js"), `// Generado por scripts/make-kit-data.mjs — no editar a mano.\nwindow.KIT_DATA = ${JSON.stringify(data)};\n`);
console.log(`bpm ${data.bpm} · ${data.beats.length} beats · ${data.downbeats.length} compases · secciones ${data.sections.map((s) => s.label + "@" + s.start).join(", ")} · bombo ${data.kick.length} · tarola ${data.snare.length} · hi-hat ${data.hat.length}`);
