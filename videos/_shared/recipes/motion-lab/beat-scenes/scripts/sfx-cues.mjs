// SFX del demo, sutiles: un whoosh por cortinilla (alternando dos para no repetir) y los golpes de la flamita
// (aterrizaje, despegue y caída de cada brinco). Los tiempos salen de los mismos datos y fórmulas que comp/index.html.
// Uso: node scripts/sfx-cues.mjs <render mudo> <salida>
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SFX = join(process.env.HOME, "fixter2025/docs/shorts-taller/sfx");
const [video = "out/render-scenes.mp4", out = "demo-beats-audio.mp4"] = process.argv.slice(2);

const window = {};
eval(readFileSync(join(root, "comp/assets/scenes-data.js"), "utf8"));
const D = window.SCENES_DATA;
const BAR = (60 / D.bpm) * 4;
const barStarts = [D.downbeats[0] - BAR, ...D.downbeats];
const CUT = [0, barStarts[3], barStarts[6], barStarts[9], barStarts[12], barStarts[15], D.duration];
// mismos números que FLAM en la composición
const FLAM = { land: CUT[5] + 0.62, up: 0.15, down: 0.15 };

const cues = [];
for (let k = 1; k <= 5; k++) {
  // el whoosh acompaña los 0.3 s del cierre; su golpe cae en el downbeat
  cues.push({ t: CUT[k] - 0.3, file: k % 2 ? "whoosh-short.wav" : "whoosh-fly.wav", gain: 0.3, len: 0.5 });
}
cues.push({ t: FLAM.land - 0.01, file: "land.wav", gain: 0.32 });
D.beats.filter((t) => t > FLAM.land + 0.6 && t < D.duration + 0.01).forEach((b) => {
  cues.push({ t: b - FLAM.down - FLAM.up, file: "bean.wav", gain: 2.0 });   // despegue (bean ya viene a −22 dB)
  cues.push({ t: b - 0.01, file: "pop.wav", gain: 2.2 });                    // aterriza en el beat
});

const T = 33;
const inputs = ["-i", video, "-i", join(root, "assets/cabello/track.wav")];
const parts = [`[1:a]volume=-3.5dB,afade=t=out:st=32.2:d=0.8,apad=whole_dur=${T}[m]`];
cues.forEach((c, i) => {
  inputs.push("-i", join(SFX, c.file));
  const ms = Math.round(c.t * 1000);
  const trim = c.len ? `atrim=0:${c.len},afade=t=out:st=${c.len - 0.15}:d=0.15,` : "";
  parts.push(`[${i + 2}:a]${trim}aformat=sample_rates=44100:channel_layouts=stereo,volume=${c.gain},adelay=${ms}|${ms},apad=whole_dur=${T}[s${i}]`);
});
parts.push(`[m]${cues.map((_, i) => `[s${i}]`).join("")}amix=inputs=${cues.length + 1}:normalize=0:duration=first,alimiter=limit=0.79:level=disabled[a]`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", parts.join(";"), "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-t", String(T), join(root, out)], { stdio: "inherit" });
cues.forEach((c) => console.log(c.t.toFixed(3).padStart(7), c.file, c.gain));
