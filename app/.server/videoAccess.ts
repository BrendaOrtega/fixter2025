import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { checkSubscriptionByEmail } from "~/.server/dbGetters";
import { getMemberEmail } from "~/.server/memberCookie";
import { sequenceUnlockFor } from "~/.server/sequences";

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
 *   4. El video es `sequence` y la entrega que lo trae ya te llegó por correo.
 *
 * El caso 4 no se puede resolver con los datos que ya trae el loader —hay que ir a
 * preguntarle a la inscripción— así que `resolveAccess` recibe el veredicto ya
 * calculado en `sequenceUnlocked`. Sin ese dato, un video de secuencia queda
 * bloqueado: el default nunca debe abrir de más.
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
  /** Cuándo se abre, para los `sequence` que todavía no llegan. */
  unlocksAt: Date | null;
};

/**
 * Resuelve el acceso a partir de los datos ya cargados. Se usa desde el loader del
 * viewer, que ya consultó al usuario y la suscripción y no debe volver a hacerlo.
 */
export const resolveAccess = ({
  accessLevel,
  isPurchased,
  isSubscribed,
  sequenceUnlocked = false,
  unlocksAt = null,
}: {
  accessLevel?: string | null;
  isPurchased: boolean;
  isSubscribed: boolean;
  sequenceUnlocked?: boolean;
  unlocksAt?: Date | null;
}): AccesoAVideo => {
  const nivel = accessLevel || "paid";
  return {
    accessLevel: nivel,
    isPurchased,
    isSubscribed,
    unlocksAt: nivel === "sequence" && !sequenceUnlocked ? unlocksAt : null,
    hasAccess:
      isPurchased ||
      nivel === "public" ||
      (nivel === "subscriber" && isSubscribed) ||
      (nivel === "sequence" && sequenceUnlocked),
  };
};

/**
 * El correo con el que identificamos a quien no tiene cuenta. Dos cookies porque
 * son dos puertas distintas: `fxg_member` la deja la confirmación de una secuencia
 * o comunidad, `fixtergeek_subscriber` el desbloqueo de un video con OTP.
 */
export const viewerEmailFrom = async (
  request: Request,
  userEmail?: string | null
): Promise<string | null> =>
  userEmail || (await getMemberEmail(request)) || subscriberEmailFrom(request);

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

  if (video.accessLevel === "sequence" && !isPurchased) {
    const email = await viewerEmailFrom(request, user?.email);
    const { unlocked, unlocksAt } = await sequenceUnlockFor(videoSlug, email);
    return {
      ...resolveAccess({
        accessLevel: video.accessLevel,
        isPurchased,
        isSubscribed: false,
        sequenceUnlocked: unlocked,
        unlocksAt,
      }),
      videoId: video.id,
      courseIds: video.courseIds,
    };
  }

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
