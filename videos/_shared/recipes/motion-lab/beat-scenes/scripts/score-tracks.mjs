// califica pistas: ¿el bombo cae en los beats y la tarola en 2 y 4?
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
const dir = process.argv[2];
const hf = (args) => JSON.parse(execFileSync("npx", ["-y", "hyperframes@0.8.212", "audio", ...args, "--json"], { maxBuffer: 1 << 28 }).toString()).items[0];
for (const f of readdirSync(dir).filter((x) => x.endsWith(".mp3"))) {
  const base = `${dir}/${f.replace(".mp3", "")}`;
  if (!existsSync(base + ".wav")) execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", `${dir}/${f}`, "-t", "90", "-ac", "1", base + ".wav"]);
  const cache = base + ".score.json";
  let m, k, s, h;
  if (existsSync(cache)) ({ m, k, s, h } = JSON.parse(readFileSync(cache)));
  else {
    m = hf([base + ".wav", "--only", "beats,downbeats,bpm,sections"]);
    k = hf([base + ".wav", "--only", "onsets", "--band", "30,120", "--threshold", "0.3"]).onsets.events;
    s = hf([base + ".wav", "--only", "onsets", "--band", "1500,5000", "--threshold", "0.3"]).onsets.events;
    h = hf([base + ".wav", "--only", "onsets", "--band", "8000,16000", "--threshold", "0.3"]).onsets.events;
    writeFileSync(cache, JSON.stringify({ m, k, s, h }));
  }
  const beats = m.beats.times, db = m.downbeats.times, B = 60 / m.bpm.value;
  const near = (ev, t, th) => ev.some((e) => e.strength >= th && Math.abs(e.t - t) < 0.04);
  const pos = (t) => { const d = db.filter((x) => x <= t + 0.05).pop(); return d === undefined ? -1 : Math.round((t - d) / B) % 4; };
  const kick = beats.filter((t) => near(k, t, 0.5)).length / beats.length;
  const even = beats.filter((t) => [1, 3].includes(pos(t))), odd = beats.filter((t) => [0, 2].includes(pos(t)));
  const sn24 = even.filter((t) => near(s, t, 0.5)).length / (even.length || 1);
  const sn13 = odd.filter((t) => near(s, t, 0.5)).length / (odd.length || 1);
  console.log(f.padEnd(26), "bpm", String(m.bpm.value).padEnd(6), "bombo", kick.toFixed(2), "tarola2y4", sn24.toFixed(2), "tarola1y3", sn13.toFixed(2), "secs", m.sections.spans.map((x) => x.label + "@" + x.start.toFixed(0)).join(" "));
}
