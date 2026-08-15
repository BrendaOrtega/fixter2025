import { getReadURLForT3Bucket } from "../app/.server/tigrs";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
const run = promisify(execFile);

const BUCKET = "wild-bird-2039";
const BASE = "fixtergeek/videos/6a78ff744a8e00e3b2eea500/6a7e98bebf5a7abbd633c640/hls";
const OUT = process.env.OUT_DIR!;

// Cortes finos, ajustados a las marcas reales del transcript.
const CLIPS = [
  { slug: "5-agent-native", from: 1389, to: 1545 },
];

const get = async (key: string) => {
  const url = await getReadURLForT3Bucket(BUCKET, key, 3600);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${key} → ${r.status}`);
  return r;
};

await mkdir(`${OUT}/seg`, { recursive: true });
await mkdir(`${OUT}/audio`, { recursive: true });

const master = await (await get(`${BASE}/master.m3u8`)).text();
const variante = master.split("\n").find((l) => l.trim() && !l.startsWith("#"))!.trim();
const carpeta = variante.includes("/") ? variante.split("/")[0] : "";
const play = await (await get(`${BASE}/${variante}`)).text();

const segs: { dur: number; name: string }[] = [];
let dur = 0;
for (const raw of play.split("\n")) {
  const l = raw.trim();
  if (l.startsWith("#EXTINF:")) dur = parseFloat(l.slice(8));
  else if (l && !l.startsWith("#")) segs.push({ dur, name: l });
}
const inicio: number[] = [];
let t = 0;
for (const s of segs) { inicio.push(t); t += s.dur; }

for (const c of CLIPS) {
  const idx = segs.map((_, i) => i).filter((i) => inicio[i] + segs[i].dur > c.from && inicio[i] < c.to);
  const lista: string[] = [];
  for (const i of idx) {
    const name = segs[i].name;
    const local = `${OUT}/seg/${name.replace(/\//g, "_")}`;
    if (!existsSync(local)) {
      const key = `${BASE}/${carpeta ? carpeta + "/" : ""}${name}`;
      await writeFile(local, Buffer.from(await (await get(key)).arrayBuffer()));
    }
    lista.push(`file '${local}'`);
  }
  const listaPath = `${OUT}/seg/${c.slug}.txt`;
  await writeFile(listaPath, lista.join("\n"));
  const offset = (c.from - inicio[idx[0]]).toFixed(2);
  const largo = (c.to - c.from).toFixed(2);
  // `aresample` y los timestamps a cero: sin esto el corte hereda el desfase de
  // los segmentos HLS y la voz queda adelantada frente a la cara.
  await run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listaPath,
    "-ss", offset, "-t", largo,
    "-af", "aresample=async=1:first_pts=0",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-r", "30",
    "-c:a", "aac", "-ar", "48000",
    "-avoid_negative_ts", "make_zero", "-fflags", "+genpts", `${OUT}/${c.slug}.mp4`]);
  // el audio es lo que de verdad sirve: la imagen del webinar es una pantalla dentro de otra
  await run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listaPath,
    "-ss", offset, "-t", largo, "-vn", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-c:a", "aac", "-b:a", "192k", `${OUT}/audio/${c.slug}.m4a`]);
  console.log("✔", c.slug, `${largo}s`);
}
process.exit(0);
