// Junta el JSON de `hyperframes beats` (rejilla) con el de `hyperframes audio`
// (downbeats, secciones, silencios) en comp/assets/beat-data.js.
// La composición no puede hacer fetch (render determinista), así que el JSON entra como <script>.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const grid = read("comp/beats/assets/funk.mp3.json");          // salida de `beats`
const meta = read("out/audio-beats.json").items[0];            // audio --only beats,downbeats,bpm,sections
const signal = read("out/audio-default.json").items[0];        // audio (default): onsets, loudness, silence

const data = {
  source: grid.audio,
  bpm: meta.bpm.value,
  beats: grid.beats,                                   // [{time, strength}]
  downbeats: meta.downbeats.times,
  sections: meta.sections.spans,
  // sólo silencios largos (> 0.5 s) dentro de la música: los huecos entre golpes no cuentan
  silences: signal.silence.filter((s) => s.end - s.start > 0.5 && s.start > 1 && s.end < signal.duration - 0.2),
  // golpes reales (hi-hat, tarola, bombo): marcan el reloj de corcheas que toca el hi-hat
  onsets: signal.onsets.events.map((e) => ({ t: e.t, strength: e.strength })),
  lufs: signal.loudness.lufsIntegrated,
};
writeFileSync(join(root, "comp/assets/beat-data.js"), `// Generado por scripts/make-beat-data.mjs — no editar a mano.\nwindow.BEAT_DATA = ${JSON.stringify(data, null, 2)};\n`);
console.log(`bpm ${data.bpm} · ${data.beats.length} beats · ${data.downbeats.length} downbeats · secciones ${data.sections.map((s) => s.label + "@" + s.start).join(", ")} · silencios ${JSON.stringify(data.silences)}`);
