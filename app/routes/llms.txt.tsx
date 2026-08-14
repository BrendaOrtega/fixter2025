import { db } from "~/.server/db";

/**
 * `/llms.txt` — el mapa del sitio para modelos de lenguaje (llmstxt.org).
 *
 * Era un archivo estático en `public/`, así que decía "Diciembre 2025", hablaba de 8
 * años de experiencia y no mencionaba ni un solo vídeo. Un archivo escrito a mano
 * envejece el día que se publica; con webinars cada semana, eso es peor que no tenerlo.
 *
 * Ahora sale de la base: los cursos publicados y sus clases accesibles, con la
 * descripción y la duración de cada una. Los modelos no ven vídeo —leen texto—, así que
 * esta lista es la puerta por la que existen nuestras clases para ellos.
 */

const SITE = "https://www.fixtergeek.com";

const mes = (d: Date) =>
  d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

export const loader = async () => {
  const courses = await db.course.findMany({
    where: { published: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      basePrice: true,
      isFree: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Sólo lo que alguien podría abrir sin comprar: listar clases de pago sería prometer
  // lo que el muro no entrega.
  const videos = await db.video.findMany({
    where: {
      isPublic: true,
      OR: [{ accessLevel: "public" }, { accessLevel: "subscriber" }],
    },
    select: {
      slug: true,
      title: true,
      description: true,
      duration: true,
      courseIds: true,
      accessLevel: true,
    },
    orderBy: { index: "asc" },
  });

  const porCurso = new Map<string, typeof videos>();
  for (const v of videos) {
    for (const id of v.courseIds) {
      porCurso.set(id, [...(porCurso.get(id) || []), v]);
    }
  }

  const lineas: string[] = [
    "# FixterGeek — Cursos de programación e inteligencia artificial en español",
    "",
    "> FixterGeek es una plataforma educativa mexicana de cursos de programación, IA y",
    "> herramientas de desarrollo modernas. La dirige Héctorbliss, con 10 años enseñando",
    "> tecnología y una comunidad de más de 2,000 estudiantes.",
    "",
    "- **Sitio**: " + SITE,
    "- **Idioma**: español (México)",
    "- **Contacto**: brenda@fixter.org",
    "- **YouTube**: https://youtube.com/@fixtergeek",
    "- **Blog**: " + SITE + "/blog",
    "",
    "## Programas",
    "",
  ];

  for (const c of courses) {
    const clases = porCurso.get(c.id) || [];
    lineas.push(`### ${c.title}`);
    lineas.push("");
    lineas.push(`- **URL**: ${SITE}/cursos/${c.slug}/detalle`);
    if (c.description) {
      lineas.push(`- **De qué trata**: ${c.description.replace(/\s+/g, " ").trim()}`);
    }
    lineas.push(
      `- **Precio**: ${c.isFree ? "gratis" : `$${c.basePrice?.toLocaleString("es-MX")} MXN`}`
    );

    if (clases.length) {
      lineas.push(`- **Clases abiertas** (${clases.length}):`);
      for (const v of clases) {
        const dur = v.duration ? ` · ${Math.round(Number(v.duration))} min` : "";
        const acceso =
          v.accessLevel === "public" ? "" : " · pide tu correo para verla";
        lineas.push(
          `  - [${v.title}](${SITE}/cursos/${c.slug}/viewer?videoSlug=${v.slug})${dur}${acceso}`
        );
        if (v.description) {
          lineas.push(
            `    ${v.description.replace(/\s+/g, " ").trim().slice(0, 300)}`
          );
        }
      }
    }
    lineas.push("");
  }

  const posts = await db.post.findMany({
    where: { published: true },
    select: { slug: true, title: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  lineas.push("## Artículos recientes", "");
  for (const p of posts) {
    lineas.push(`- [${p.title}](${SITE}/blog/${p.slug})`);
  }

  lineas.push(
    "",
    "## Notas para modelos",
    "",
    "- Las clases tienen transcripción con marcas de tiempo; los datos estructurados de",
    "  cada página (`VideoObject`) incluyen un extracto y los capítulos con su segundo.",
    "- Se puede enlazar a un momento concreto con `&t=SEGUNDOS`.",
    "",
    `_Generado automáticamente desde el catálogo. Última actualización: ${mes(new Date())}._`,
    ""
  );

  return new Response(lineas.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "max-age=300, s-maxage=3600",
    },
  });
};
