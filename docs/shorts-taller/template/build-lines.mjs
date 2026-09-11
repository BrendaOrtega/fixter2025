// Agrupa las palabras del transcript en líneas de karaoke (una a la vez en pantalla).
import fs from "node:fs";
const OFFSET = 0.3; // large-v3 marca ~0.3 s antes de la voz real
const raw = JSON.parse(fs.readFileSync(new URL("./assets/transcript.json", import.meta.url)));
let words = Array.isArray(raw) ? raw : raw.words;
const merged = [];
for (const w of words) {
  // "WebSocket,¿sí?" viene pegado: dos palabras
  if (w.text === "WebSocket,¿sí?") { merged.push({ text: "WebSocket,", start: w.start, end: w.start + 0.7 }, { text: "¿sí?", start: w.start + 0.75, end: w.end }); continue; }
  merged.push({ ...w });
}
// puntuación mínima para partir líneas + errores de oído
const FIX = { "wey,": "güey,", por: "Por", "comunicarnos,": "comunicarnos.", "chat,": "chat.", "más,": "más,", "humano,": "humano," };
let nChat = 0, nY = 0;
words = merged.map((w) => {
  let t = FIX[w.text] ?? w.text;
  if (w.text === "chat,") { nChat++; t = nChat === 1 ? "chat." : "chat,"; }
  if (w.text === "y") { nY++; if (nY === 1) t = "Y"; }
  if (w.text === "eso" && merged.indexOf(w) > 60) t = "Eso";
  return { ...w, text: t, start: w.start + OFFSET, end: w.end + OFFSET };
});
const MAX = 24;
const lines = []; let cur = null; let prevEnd = 0;
for (const w of words) {
  const gap = w.start - prevEnd;
  const overflow = cur && (cur.text + " " + w.text).length > MAX;
  const endsSentence = cur && /[.?!]$/.test(cur.text);
  if (!cur || overflow || endsSentence || gap > 0.6) { cur = { start: w.start, end: w.end, text: w.text, words: [w] }; lines.push(cur); }
  else { cur.text += " " + w.text; cur.end = w.end; cur.words.push(w); }
  prevEnd = w.end;
}
lines.forEach((l, i) => { l.hold = i + 1 < lines.length ? lines[i + 1].start - 0.05 : l.end + 0.6; });
export default lines;
