import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { checkSubscriptionByEmail } from "~/.server/dbGetters";

/**
 * ¿Esta petición puede ver este video?
 *
 * Vive aparte porque la regla la necesitan varias rutas —el viewer, los subtítulos, los
 * capítulos, la búsqueda— y duplicarla es justo como se abren agujeros: el proxy HLS
 * pasó meses sirviendo cualquier video a cualquiera porque el permiso sólo se calculaba
 * en el loader del viewer.
 *
 * Tres formas de tener acceso, en orden:
 *   1. Compraste el curso (`user.courses`).
 *   2. El video es `public`.
 *   3. El video es `subscriber` y confirmaste tu correo con el tag del curso.
 */

export const SUBSCRIBER_COOKIE = "fixtergeek_subscriber";

/** El correo del suscriptor guardado en cookie, ya decodificado. */
export const subscriberEmailFrom = (request: Request): string | null => {
  const cookie = request.headers.get("Cookie") || "";
  const crudo = cookie
    .split(";")
    .find((c) => c.trim().startsWith(`${SUBSCRIBER_COOKIE}=`))
    ?.split("=")[1];
  return crudo ? decodeURIComponent(crudo) : null;
};

export type AccesoAVideo = {
  hasAccess: boolean;
  accessLevel: string;
  isPurchased: boolean;
  isSubscribed: boolean;
};

/**
 * Resuelve el acceso a partir de los datos ya cargados. Se usa desde el loader del
 * viewer, que ya consultó al usuario y la suscripción y no debe volver a hacerlo.
 */
export const resolveAccess = ({
  accessLevel,
  isPurchased,
  isSubscribed,
}: {
  accessLevel?: string | null;
  isPurchased: boolean;
  isSubscribed: boolean;
}): AccesoAVideo => {
  const nivel = accessLevel || "paid";
  return {
    accessLevel: nivel,
    isPurchased,
    isSubscribed,
    hasAccess:
      isPurchased || nivel === "public" || (nivel === "subscriber" && isSubscribed),
  };
};

/**
 * La versión completa, para rutas sueltas (subtítulos, capítulos, búsqueda) que sólo
 * tienen la petición y un slug. Devuelve `null` si el video no existe.
 */
export const videoAccessFor = async (
  request: Request,
  videoSlug: string
): Promise<(AccesoAVideo & { videoId: string; courseIds: string[] }) | null> => {
  const video = await db.video.findUnique({
    where: { slug: videoSlug },
    select: { id: true, accessLevel: true, courseIds: true },
  });
  if (!video) return null;

  const user = await getUserOrNull(request);
  const isPurchased = user
    ? video.courseIds.some((id) => user.courses.includes(id))
    : false;

  // La suscripción se marca con un tag por curso, así que hay que resolver el slug del
  // curso al que pertenece el video antes de preguntar.
  let isSubscribed = false;
  const email = subscriberEmailFrom(request);
  if (email && !isPurchased && video.accessLevel === "subscriber") {
    const cursos = await db.course.findMany({
      where: { id: { in: video.courseIds } },
      select: { slug: true },
    });
    for (const curso of cursos) {
      if (await checkSubscriptionByEmail(email, curso.slug)) {
        isSubscribed = true;
        break;
      }
    }
  }

  return {
    ...resolveAccess({ accessLevel: video.accessLevel, isPurchased, isSubscribed }),
    videoId: video.id,
    courseIds: video.courseIds,
  };
};
