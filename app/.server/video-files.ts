/**
 * Borrar los archivos de un vídeo en el bucket.
 *
 * Borrar la fila del `Video` y dejar sus objetos es fácil de no ver: un webinar son ~1,400
 * segmentos y 3.6 GB que siguen pagándose sin que nada apunte a ellos. Esto los limpia.
 *
 * ⚠️ Las tres guardas de abajo NO son adorno. Este código construye un prefijo y borra TODO
 * lo que cuelgue de él; un id vacío o un curso en vez de un vídeo se llevaría por delante
 * material que la gente está viendo ahora mismo. Por eso:
 *
 *   1. `videoId` y `courseId` tienen que ser ObjectId de 24 hex — nada de cadenas libres.
 *   2. El prefijo SIEMPRE termina en `/<videoId>/`: no se puede borrar el nivel del curso.
 *   3. Se comprueba que el `Video` YA NO EXISTA en la base antes de borrar sus bytes.
 */
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { db } from "./db";

const OBJECT_ID = /^[a-f0-9]{24}$/i;

function cliente() {
  return new S3Client({
    region: process.env.AWS_REGION || "auto",
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Borra `fixtergeek/videos/<courseId>/<videoId>/**`.
 *
 * Devuelve cuántos objetos se fueron. Nunca lanza: perder los bytes es un problema de
 * factura, y no puede tumbar el borrado del vídeo, que es lo que pidió quien pulsó.
 */
export async function borrarArchivosDeVideo(courseId: string, videoId: string): Promise<number> {
  if (!OBJECT_ID.test(courseId) || !OBJECT_ID.test(videoId)) return 0;

  // La fila tiene que estar YA borrada. Si sigue ahí, esto se llamó en el orden equivocado
  // y borrar sus objetos dejaría un vídeo vivo apuntando a la nada.
  const vive = await db.video.findUnique({ where: { id: videoId }, select: { id: true } }).catch(() => null);
  if (vive) return 0;

  const bucket = process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME;
  if (!bucket) return 0;
  const prefix = `fixtergeek/videos/${courseId}/${videoId}/`;

  const s3 = cliente();
  let token: string | undefined;
  let n = 0;
  try {
    do {
      const lista = await s3.send(new ListObjectsV2Command({
        Bucket: bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000,
      }));
      const keys = (lista.Contents ?? []).map((o) => ({ Key: o.Key! })).filter((o) => o.Key.startsWith(prefix));
      if (keys.length) {
        await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys, Quiet: true } }));
        n += keys.length;
      }
      token = lista.IsTruncated ? lista.NextContinuationToken : undefined;
    } while (token);
  } catch (e) {
    console.error("[video-files] no pude borrar", prefix, e);
  }
  return n;
}
