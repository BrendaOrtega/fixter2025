import { db } from "./db";
import { subscriberEmail } from "./subscriberCookie";

/// Quién está pidiendo el material. No se le exige correo: el material es la
/// carnada, cobrarlo antes de entregarlo mata la conversión. Si trae la cookie
/// de suscriptor, se aprovecha para medir compromiso; si no, cuenta anónimo.
export const getRequesterEmail = (request: Request) => subscriberEmail(request);

/// Resuelve un material por la URL canónica /cursos/:curso/:video/:slug.
/// El curso se valida contra el video para que la URL no mienta: un material
/// solo se sirve desde el programa al que de verdad pertenece.
export const findResource = async (
  courseSlug: string,
  videoSlug: string,
  slug: string,
) => {
  const video = await db.video.findUnique({
    where: { slug: videoSlug },
    select: { id: true, courseIds: true },
  });
  if (!video) return null;

  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    select: { id: true },
  });
  if (!course || !video.courseIds.includes(course.id)) return null;

  return db.resource.findUnique({
    where: { videoId_slug: { videoId: video.id, slug } },
  });
};

/// Construye la URL canónica de un material a partir de su ruta corta vieja.
/// El mapeo vive en datos (`Resource.legacyPath`), no en un `switch`: cada
/// webinar nuevo que reparta un link corto no debería pedir un deploy.
export const canonicalUrlForLegacyPath = async (legacyPath: string) => {
  const resource = await db.resource.findUnique({
    where: { legacyPath },
    select: { slug: true, videoId: true, courseId: true },
  });
  if (!resource?.videoId || !resource.courseId) return null;

  const [video, course] = await Promise.all([
    db.video.findUnique({
      where: { id: resource.videoId },
      select: { slug: true },
    }),
    db.course.findUnique({
      where: { id: resource.courseId },
      select: { slug: true },
    }),
  ]);
  if (!video || !course) return null;

  return `/cursos/${course.slug}/${video.slug}/${resource.slug}`;
};

/// Registra el acceso y devuelve a dónde mandar al visitante.
/// Nunca truena por el registro: perder una métrica es barato, no entregar el
/// material que alguien está esperando no lo es.
export const openResource = async (
  resource: { id: string; s3Key: string | null; externalUrl: string | null },
  request: Request,
) => {
  try {
    await db.resourceAccess.create({
      data: { resourceId: resource.id, email: await getRequesterEmail(request) },
    });
  } catch (error) {
    console.error("[resources] no se pudo registrar el acceso", error);
  }

  if (resource.externalUrl) return resource.externalUrl;
  if (resource.s3Key) {
    // `isAnimations: false` = la key va tal cual, sin el prefijo de animaciones.
    const { getReadURL } = await import("./tigrs");
    return await getReadURL(resource.s3Key, 3600, false);
  }
  return null;
};
