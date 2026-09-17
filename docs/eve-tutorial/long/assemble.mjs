// Concatena los 8 capítulos y monta el audio: voz (marks) −15 LUFS, cama −26 con sidechain, SFX 0.7.
import fs from "node:fs";
import { execSync } from "node:child_process";
import { scenes } from "./scenes.mjs";
const sh = (c) => execSync(c, { stdio: ["ignore", "pipe", "inherit"] }).toString();
const marks = JSON.parse(fs.readFileSync("marks.json", "utf8"));
const chStart = (ch) => (ch === 0 ? 0 : +(marks.find((m) => m.ch === ch).start - 0.8).toFixed(2));
const files = [0, 1, 2, 3, 4, 5, 6, 7].map((c) => { const f = fs.readdirSync(`ch${c}/renders`).filter((x) => x.endsWith(".mp4")).sort().at(-1); return `ch${c}/renders/${f}`; });
fs.writeFileSync("concat.txt", files.map((f) => `file '${f}'`).join("\n"));
sh("ffmpeg -y -loglevel error -f concat -safe 0 -i concat.txt -c copy video-mudo.mp4");
const T = parseFloat(sh("ffprobe -v error -show_entries format=duration -of csv=p=0 video-mudo.mp4"));
console.log("video", T.toFixed(2), "s");
// SFX: cortinillas en cada frontera + los sfx.json de cada tarjeta desplazados a su escena
const S = "../../shorts-taller/sfx"; const sfx = [];
// la cortinilla de salida arranca en chStart−0.75 y cubre todo hacia chStart−0.3
for (let c = 1; c <= 7; c++) { sfx.push([chStart(c) - 0.95, "riser.wav"]); sfx.push([chStart(c) - 0.22, "hit-sub.wav"]); }
const map = { "chip-place": "pop", "key-type": "tick", "power-down": "hit-low", "frost-crack": "card", "power-up": "coin", "melt-whoosh": "whoosh-fly", "pop": "pop", "boing": "pop", "chip-slide": "whoosh-short", "rattle": "block", "paper": "paper", "whoosh-soft": "whoosh-short", "drawer-open": "block", "tick": "tick", "whoosh-short": "whoosh-short", "hit-low": "hit-low", "card": "card", "stamp": "stamp", "tada": "ding" };
for (const [ch, list] of Object.entries(scenes)) for (const s of list) if (s.kind === "card") {
  const dir = `../cards/${s.src.replace(/-long$/, "")}/${s.src.endsWith("-long") ? "sfx-long.json" : "sfx.json"}`; if (!fs.existsSync(dir)) continue;
  const base = marks[s.from].start; const j = JSON.parse(fs.readFileSync(dir, "utf8"));
  for (const [k, ts] of Object.entries(j)) for (const t of ts) if (map[k]) sfx.push([base + t, map[k] + ".wav"]);
}
let last = null; const sfxOk = sfx.sort((a, b) => a[0] - b[0]).filter(([t, f]) => { if (last && last[1] === f && t - last[0] < 0.3) return false; last = [t, f]; return true; });
console.log("sfx", sfxOk.length); fs.writeFileSync("sfx-timeline.json", JSON.stringify(sfxOk));
const BGM_A = "/tmp/bgm-pick/synths.mp3", BGM_B = "/tmp/bgm-pick/uplifting.mp3"; const T6 = chStart(6);
sh(`ffmpeg -y -loglevel error -i voice/voice.wav -af "loudnorm=I=-15:TP=-1.5:LRA=11" -ar 48000 -ac 2 /tmp/v.wav`);
// cama A (ambiente) hasta el capítulo 6; ahí entra la cama B (más movida) con un cruce de 2 s
sh(`ffmpeg -y -loglevel error -stream_loop 3 -i ${BGM_A} -t ${(T6 + 2).toFixed(2)} -af "loudnorm=I=-26:TP=-3:LRA=11,afade=t=in:d=1" -ar 48000 -ac 2 /tmp/bA.wav`);
sh(`ffmpeg -y -loglevel error -stream_loop 3 -i ${BGM_B} -t ${(T - T6 + 4).toFixed(2)} -af "loudnorm=I=-25:TP=-3:LRA=11,afade=t=out:st=${(T - T6 - 1).toFixed(1)}:d=3" -ar 48000 -ac 2 /tmp/bB.wav`);
sh(`ffmpeg -y -loglevel error -i /tmp/bA.wav -i /tmp/bB.wav -filter_complex "[0:a][1:a]acrossfade=d=2:c1=tri:c2=tri[b]" -map "[b]" /tmp/b.wav`);
const inputs = ["-i /tmp/v.wav", "-i /tmp/b.wav"]; let F = ""; let mix = "[vb][bd]"; let n = 2;
sfxOk.forEach(([t, f], i) => { inputs.push(`-i ${S}/${f}`); F += `[${i + 2}:a]volume=0.7,adelay=${Math.round(t * 1000)}:all=1,apad=whole_dur=${T}[s${i}];`; mix += `[s${i}]`; n++; });
sh(`ffmpeg -y -loglevel error ${inputs.join(" ")} -filter_complex "[0:a]apad=whole_dur=${T},asplit=2[va][vb];[1:a]atrim=0:${T},apad=whole_dur=${T}[bg];${F}[bg][va]sidechaincompress=threshold=0.02:ratio=8:attack=8:release=500[bd];${mix}amix=inputs=${n}:normalize=0:duration=first[m];[m]atrim=0:${T}[out]" -map "[out]" -ar 48000 /tmp/premix.wav`);
const L = parseFloat(sh(`ffmpeg -i /tmp/premix.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "^\\s+I:" | tail -1 | awk '{print $2}'`));
const G = (-14.5 - L).toFixed(2);
sh(`ffmpeg -y -loglevel error -i /tmp/premix.wav -af "volume=${G}dB,alimiter=limit=0.84" /tmp/mix.wav`);
sh(`ffmpeg -y -loglevel error -i video-mudo.mp4 -i /tmp/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t ${T} eve-agentes-durables.mp4`);
console.log("LUFS", sh(`ffmpeg -i eve-agentes-durables.mp4 -af ebur128 -f null - 2>&1 | grep -E "^\\s+I:" | tail -1`).trim());
console.log("start_time", sh("ffprobe -v error -show_entries stream=start_time -of csv=p=0 eve-agentes-durables.mp4").trim());
