// Genera el deck autocontenido: incrusta logos e ilustraciones como data URIs
// para poder subirlo como un solo archivo y tener link público.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";

const dir = "docs/webinar-sistemas-agenticos";
const src = join(dir, "slides.html");
const out = join(dir, "slides-standalone.html");

const MIME = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

let html = readFileSync(src, "utf8");
let inlined = 0;
const missing = [];

// `data` cubre el <object> de la ilustración de portada, que no es un <img>.
html = html.replace(/(src|href|data)="((?!data:|https?:|#)[^"]+\.(?:svg|png|jpe?g|webp|gif))"/gi,
  (full, attr, path) => {
    const abs = join(dir, path);
    if (!existsSync(abs)) {
      missing.push(path);
      return full;
    }
    const mime = MIME[extname(path).toLowerCase()];
    const b64 = readFileSync(abs).toString("base64");
    inlined++;
    return `${attr}="data:${mime};base64,${b64}"`;
  });

writeFileSync(out, html);
console.log(`${inlined} recursos incrustados → ${out}`);
if (missing.length) console.log("NO encontrados:", missing);
