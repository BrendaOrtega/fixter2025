/**
 * Importa la transcripción de un video.
 *
 *   npx tsx --env-file=.env scripts/import-transcript.ts <videoSlug> <archivo> [--sin-capitulos]
 *
 * El archivo puede ser la salida cruda de whisper o el `.md` que descarga la vista de
 * transcripción de Ghosty Teams: el parser lee los dos.
 *
 * Es idempotente (upsert por videoId), así que se puede correr de nuevo cuando el
 * transcript se regenera o cuando hay que rehacer los capítulos.
 *
 * TODO: por ahora el archivo se baja a mano de Ghosty Teams. Se puede leer directo de
 * `gt_event_recordings.transcript_key` + `signedUrl(...)`; el camino está en
 * `~/ghosty-teams/src/routes/room.$slug_.transcripcion.$id.tsx`.
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import {
  parseTranscript,
  agruparPorHablante,
  pareceSinMarcas,
  textoPlano,
  type Capitulo,
} from "../app/.server/transcript";

const db = new PrismaClient();

const [, , videoSlug, archivo, ...flags] = process.argv;
const sinCapitulos = flags.includes("--sin-capitulos");

async function main() {
  if (!videoSlug || !archivo) {
    throw new Error(
      "Uso: npx tsx --env-file=.env scripts/import-transcript.ts <videoSlug> <archivo> [--sin-capitulos]"
    );
  }

  const video = await db.video.findUnique({
    where: { slug: videoSlug },
    select: { id: true, title: true, courseIds: true, duration: true },
  });
  if (!video) throw new Error(`No existe el video "${videoSlug}"`);

  const crudo = readFileSync(archivo, "utf8");

  if (pareceSinMarcas(crudo)) {
    throw new Error(
      `${archivo} viene SIN marcas de tiempo (bloques separados por "****" vacíos).\n` +
        `   Sirve para leer y buscar, pero no para subtítulos, capítulos ni clic-para-saltar.\n` +
        `   Regenera la transcripción en Ghosty Teams pidiendo marcas, o corre whisper sobre el mp4.`
    );
  }

  const segmentos = agruparPorHablante(parseTranscript(crudo));
  if (!segmentos.length) {
    throw new Error(
      `No se reconoció ningún segmento en ${archivo}. ¿Es la salida de whisper o el .md de Ghosty Teams?`
    );
  }

  const texto = textoPlano(segmentos);
  const ultimo = segmentos[segmentos.length - 1];
  console.log(`📄 ${segmentos.length} bloques · ${texto.split(" ").length} palabras`);
  console.log(`   termina en ${Math.round(ultimo.e / 60)} min`);

  // Una transcripción que se queda corta produce capítulos apelotonados al principio y un
  // último capítulo de media hora. Se ve rarísimo en la barra y es difícil de diagnosticar
  // después, así que se avisa aquí: casi siempre es que el archivo está truncado.
  const duracionVideo = Number(video.duration) * 60; // el campo está en minutos, como texto
  if (Number.isFinite(duracionVideo) && duracionVideo > 0) {
    const cobertura = ultimo.e / duracionVideo;
    if (cobertura < 0.9) {
      console.warn(
        `\n⚠️  La transcripción cubre sólo el ${Math.round(cobertura * 100)}% del video ` +
          `(${Math.round(ultimo.e / 60)} de ${Math.round(duracionVideo / 60)} min).\n` +
          `   ¿El archivo está completo? Los capítulos van a quedar todos al principio.`
      );
    }
  }
  console.log(`   hablantes: ${[...new Set(segmentos.map((s) => s.quien).filter(Boolean))].join(", ") || "sin nombres"}`);

  let capitulos: Capitulo[] = [];
  if (!sinCapitulos) {
    // Se importa aquí y no arriba para que el script sirva sin ANTHROPIC_API_KEY
    // cuando sólo se quiere guardar el texto.
    const { generarCapitulos } = await import("../app/.server/chapters");
    console.log("🤖 Generando capítulos…");
    capitulos = await generarCapitulos(segmentos, { titulo: video.title });
    for (const c of capitulos) {
      const m = Math.floor(c.s / 60);
      console.log(`   ${String(m).padStart(3)}:${String(c.s % 60).padStart(2, "0")}  ${c.titulo}`);
    }
  }

  const datos = {
    courseId: video.courseIds[0] ?? null,
    language: "es",
    source: "ghosty-teams",
    segments: segmentos as unknown as object,
    text: texto,
    // Al reimportar sin capítulos no se borran los que ya había (pueden estar corregidos a mano).
    ...(capitulos.length ? { chapters: capitulos as unknown as object } : {}),
  };

  await db.transcript.upsert({
    where: { videoId: video.id },
    create: { videoId: video.id, ...datos },
    update: datos,
  });

  console.log(`\n✅ Transcripción guardada para "${video.title}"`);
}

main()
  .catch((error) => {
    console.error(`\n❌ ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
