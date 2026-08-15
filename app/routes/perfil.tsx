import { forwardRef, useRef, useState, type ChangeEvent } from "react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  useFetcher,
} from "react-router";
import type { Route } from "./+types/perfil";
import { FaEdit } from "react-icons/fa";
import { cn } from "~/utils/cn";
import * as fabric from "fabric";
import { getUserOrRedirect } from "~/.server/dbGetters";
import { getPutFileUrl } from "~/.server/tigrs";
import getMetaTags from "~/utils/getMetaTags";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserOrRedirect(request);
  const putURL = await getPutFileUrl(user.email);

  // Las suscripciones de esta persona. Un usuario nos escribió que canceló sin
  // querer, buscó aquí para volver a suscribirse y no había nada: el perfil es
  // el primer lugar donde uno busca, y no existía.
  const { db } = await import("~/.server/db");
  const subscriber = await db.subscriber.findUnique({
    where: { email: user.email },
    select: { id: true },
  });

  const suscripciones = subscriber
    ? await db.sequenceEnrollment.findMany({
        where: { subscriberId: subscriber.id },
        orderBy: { enrolledAt: "desc" },
        select: {
          id: true,
          status: true,
          currentEmailIndex: true,
          nextEmailAt: true,
          sequence: {
            select: {
              id: true,
              slug: true,
              name: true,
              isActive: true,
              _count: { select: { emails: true } },
            },
          },
        },
      })
    : [];

  return { user, putURL, suscripciones };
};

/** Pausar o reactivar una suscripción desde el perfil. */
export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await getUserOrRedirect(request);
  const formData = await request.formData();
  const enrollmentId = formData.get("enrollmentId") as string;
  const intent = formData.get("intent");

  const { db } = await import("~/.server/db");

  // La baja total no lleva `enrollmentId`: se resuelve antes de buscarlo, o la
  // consulta sale con `id: undefined` y Prisma revienta con un 500.

  // De aquí en adelante hace falta una inscripción concreta, y tiene que ser
  // suya: el id viaja en el formulario y no basta con confiarle.
  const enr = enrollmentId
    ? await db.sequenceEnrollment.findUnique({
        where: { id: enrollmentId },
        select: {
          id: true,
          sequenceId: true,
          subscriber: { select: { email: true } },
        },
      })
    : null;
  if (!enr || enr.subscriber?.email !== user.email) {
    return data({ error: "No encontramos esa suscripción" }, { status: 404 });
  }

  if (intent === "pausar") {
    await db.sequenceEnrollment.update({
      where: { id: enr.id },
      data: { status: "paused" },
    });
    return data({ ok: true });
  }

  // Baja total. Tres plantillas de correo usan `/perfil` como su URL de
  // "Cancelar suscripción" (sendSistemasKey, sendProductWelcome,
  // sendSistemasWebinarConfirmation), así que esta página tiene que cumplir esa
  // promesa: si no, el enlace de baja no da de baja y la única salida real que
  // le queda a la persona es marcar el correo como spam.
  if (intent === "baja-total") {
    const subscriber = await db.subscriber.findUnique({
      where: { email: user.email },
      select: { id: true },
    });
    if (subscriber) {
      await db.sequenceEnrollment.updateMany({
        where: { subscriberId: subscriber.id, status: { not: "paused" } },
        data: { status: "paused", nextEmailAt: null },
      });
    }
    return data({ ok: true, bajaTotal: true });
  }

  // Simétrico a la baja total: si irse cuesta un clic, volver también. Sin
  // esto, quien se bajó de todo tenía que reactivar una por una.
  if (intent === "reactivar-todo") {
    const subscriber = await db.subscriber.findUnique({
      where: { email: user.email },
      select: { id: true },
    });
    if (subscriber) {
      const pausadas = await db.sequenceEnrollment.findMany({
        where: { subscriberId: subscriber.id, status: "paused" },
        select: { sequenceId: true },
      });
      const { enrollSubscriberInSequence } = await import("~/.server/sequences");
      for (const p of pausadas) {
        await enrollSubscriberInSequence(p.sequenceId, subscriber.id);
      }
    }
    return data({ ok: true });
  }

  if (intent === "reactivar") {
    const subscriber = await db.subscriber.findUnique({
      where: { email: user.email },
      select: { id: true },
    });
    if (subscriber) {
      const { enrollSubscriberInSequence } = await import("~/.server/sequences");
      await enrollSubscriberInSequence(enr.sequenceId, subscriber.id);
    }
    return data({ ok: true });
  }

  return data({ error: "Acción no reconocida" }, { status: 400 });
};

export const meta = () =>
  getMetaTags({
    title: " Mi perfil",
    description: "Actualiza tu información",
  });

export default function Route({
  loaderData: { user, putURL, suscripciones },
}: Route.ComponentProps) {
  return (
    <article className="h-screen">
      <section className="py-20 flex flex-col">
        <EditableAvatar
          // @todo: fix it
          src={user.photoURL || `/api/file?storageKey=${user.email}`}
          // src={user.photoURL}
          className="mx-auto"
          putURL={putURL}
          // fallbackSrc={user.photoURL}
        />
        <p className="text-brand-100 text-center mb-16 lowercase">
          {user.email}
        </p>

        {/* Aquí vivía una tarjeta de "Suscripción PRO $X,XXX.00 · Disponible
            Abril 2025": un producto que nunca existió, con precios de relleno y
            una fecha ya pasada. En el perfil de alguien que sí compró, eso se
            lee como que el sitio está abandonado. */}
        <section className="mx-auto w-full max-w-[640px] px-10 md:px-0">
          <div className="rounded-xl border border-brand-100/10 bg-brand-900/40 p-6">
            <h3 className="mb-1 text-xl font-bold text-white">Tus cursos</h3>
            <p className="mb-4 text-sm text-brand-100/70">
              Todo lo que has comprado o desbloqueado.
            </p>
            <a
              href="/mis-cursos"
              className="inline-block rounded-full border border-brand-500 px-5 py-2 text-sm font-medium text-brand-500 transition-colors hover:bg-brand-500/10"
            >
              Ver mis cursos
            </a>
          </div>
        </section>

        <Suscripciones items={suscripciones} />
      </section>
    </article>
  );
}

/**
 * Las secuencias a las que esta persona está suscrita, con su avance.
 *
 * Existe por un reporte concreto: alguien canceló sin querer, vino al perfil a
 * buscar cómo volver y no encontró nada. Cancelar estaba a un clic en cada
 * correo; volver no estaba en ningún lado.
 */
const Suscripciones = ({ items }: { items: any[] }) => {
  const fetcher = useFetcher();
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const todasPausadas = items.every((s: any) => s.status === "paused");

  if (!items?.length) return null;

  return (
    <section className="mx-auto mt-16 w-full max-w-[640px] px-10 md:px-0">
      <h3 className="mb-1 text-xl font-bold text-white">Tus suscripciones</h3>
      <p className="mb-6 text-sm text-brand-100/70">
        Series de correo a las que estás suscrito. Puedes pausarlas y volver
        cuando quieras — retomamos donde te quedaste.
      </p>

      <ul className="space-y-3">
        {items.map((s) => {
          const total = s.sequence?._count?.emails ?? 0;
          const activa = s.status === "active";
          const pausada = s.status === "paused";

          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-brand-100/10 bg-brand-900/40 p-4"
            >
              <div className="min-w-0">
                {/* El nombre lleva a la secuencia: desde aquí solo se podía
                    pausar o reactivar a ciegas, sin ver de qué se trata ni qué
                    entregas trae. */}
                <a
                  href={`/secuencias/${s.sequence?.slug || s.sequence?.id}`}
                  className="block truncate font-medium text-white underline-offset-4 hover:text-brand-500 hover:underline"
                >
                  {s.sequence?.name}
                </a>
                {/* Una terminada no está muerta: cuando la secuencia gana una
                    entrega, los que ya la acabaron vuelven a la fila. Por eso
                    aquí sí hay algo que decidir, y hay que decirlo. */}
                <p className="mt-0.5 text-xs text-brand-100/70">
                  {pausada
                    ? "Pausada — no recibes nada"
                    : s.status === "completed"
                      ? "Al día · te avisamos cuando haya entregas nuevas"
                      : `Entrega ${Math.min(s.currentEmailIndex + 1, total)} de ${total}`}
                </p>
              </div>

              <fetcher.Form method="post" className="shrink-0">
                <input type="hidden" name="enrollmentId" value={s.id} />
                <input
                  type="hidden"
                  name="intent"
                  value={pausada ? "reactivar" : "pausar"}
                />
                <button
                  type="submit"
                  disabled={fetcher.state !== "idle"}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors disabled:opacity-50",
                    pausada
                      ? "border-brand-500 text-brand-500 hover:bg-brand-500/10"
                      : "border-brand-100/20 text-brand-100 hover:border-red-400/50 hover:text-red-400"
                  )}
                >
                  {pausada
                    ? "Reactivar"
                    : s.status === "completed"
                      ? "No avisarme"
                      : "Pausar"}
                </button>
              </fetcher.Form>
            </li>
          );
        })}
      </ul>

      {/* La salida completa, visible y sin buscarla: es lo que prometen los
          correos que usan /perfil como su enlace de baja. */}
      <div className="mt-6 text-center">
        {todasPausadas ? (
          <button
            type="button"
            onClick={() =>
              fetcher.submit({ intent: "reactivar-todo" }, { method: "post" })
            }
            disabled={fetcher.state !== "idle"}
            className="text-sm text-brand-500 underline underline-offset-4 transition-colors hover:text-brand-400 disabled:opacity-50"
          >
            Volver a activar todo
          </button>
        ) : (
        <button
          type="button"
          onClick={() => setConfirmarBaja(true)}
          disabled={fetcher.state !== "idle"}
          className="text-sm text-brand-100/60 underline underline-offset-4 transition-colors hover:text-red-400 disabled:opacity-50"
        >
          Darme de baja de todos los correos
        </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmarBaja}
        title="¿Darte de baja de todos los correos?"
        description="Dejarías de recibir todas tus series de una vez. Puedes volver cuando quieras desde aquí mismo, y retomamos donde te quedaste."
        confirmLabel="Sí, darme de baja"
        cancelLabel="Mejor no"
        onCancel={() => setConfirmarBaja(false)}
        onConfirm={() => {
          setConfirmarBaja(false);
          fetcher.submit({ intent: "baja-total" }, { method: "post" });
        }}
      />
    </section>
  );
};

const EditableAvatar = ({
  src,
  className,
  putURL,
  fallbackSrc,
}: {
  fallbackSrc?: string;
  putURL: string;
  className?: string;
  src?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasObj = useRef<fabric.Canvas>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  const onClose = async () => {
    setIsEditing(false);
    const center = canvasObj.current?.getCenterPoint();
    canvasObj.current?.setDimensions({
      width: 160,
      height: 160,
    });
    // JPEG con calidad alta en vez de PNG crudo: un avatar de 320px en PNG
    // pesa cientos de KB para una foto, y se sirve en un círculo de 160.
    // `multiplier: 2` lo exporta al doble para que no se vea suave en retina.
    const resultImage = canvasObj.current?.toDataURL({
      top: center.y - 160,
      left: center.x - 160,
      width: 320,
      height: 320,
      multiplier: 2,
      format: "jpeg",
      quality: 0.85,
    });
    const file = await fetch(resultImage).then((r) => r.blob());
    setImageSrc(resultImage);
    // Aquí había un `a.click()` que DESCARGABA el avatar al disco de la persona
    // cada vez que lo editaba. Nadie pidió ese archivo.
    if (!file) return;
    const res = await fetch(putURL, {
      // presignurl
      method: "PUT",
      body: file,
    }).catch((e) => console.error("No se pudo subir el avatar:", e));
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.currentTarget.files?.length || !canvasRef.current) return; //@todo files

    setIsEditing(true);

    const imageURL = URL.createObjectURL(event.currentTarget.files[0]);
    const img = await fabric.FabricImage.fromURL(imageURL);
    img.selectable = true;
    img.scaleToHeight(320);
    canvasObj.current?.dispose();
    canvasObj.current = new fabric.Canvas(canvasRef.current, {
      width: innerWidth,
      height: innerHeight - 220,
      backgroundColor: "black",
      // experiment
      // scaleProportionally: true,
      // uniformScaling: true,
      controlsAboveOverlay: true,
    });
    const center = canvasObj.current.getCenterPoint();
    img.left = center.x - 160;
    img.top = center.y - 160;
    canvasObj.current.add(img);
    // selector
    // const cube = new fabric.Circle({
    //   top: 0,
    //   left: 0,
    //   radius: 160,
    //   stroke: "#85ddcb",
    //   strokeWidth: 3,
    //   fill: "",
    //   // experiment
    //   lockScalingX: true,
    //   lockScalingY: true,
    // });
    const clipPath = new fabric.Circle({
      radius: 160,
      top: center.y - 160,
      left: center.x - 160,
    });
    canvasObj.current.clipPath = clipPath;
    canvasObj.current.setActiveObject(canvasObj.current.item(0));
  };

  return (
    <>
      <CanvasModal ref={canvasRef} onClose={onClose} visible={isEditing} />
      <section
        className={cn(
          "group border-white border-4",
          "w-40 h-40 bg-avatar bg-cover",
          "relative inline-block my-8 overflow-hidden rounded-full",
          className
        )}
      >
        <button
          onClick={() => inputRef.current?.click()}
          className={cn(
            "absolute inset-0 justify-center items-center bg-gray-800/70",
            "group-hover:flex",
            "hidden",
            "active:scale-105"
          )}
        >
          <span className="text-4xl text-white ">
            {" "}
            <FaEdit />
          </span>
        </button>

        <img
          className={cn("object-cover w-full h-full")}
          src={imageSrc || "/robot.svg"}
          alt="avatar"
          onError={(e) => {
            e.target.src = fallbackSrc;
            e.target.onerror = null;
          }}
        />
        <input
          ref={inputRef}
          type="file"
          hidden
          aria-hidden
          onChange={handleFile}
        />
      </section>
    </>
  );
};

const CanvasModal = forwardRef<HTMLCanvasElement>(
  ({ onClose, visible }: { visible?: boolean; onClose?: () => void }, ref) => {
    return (
      <div
        className={cn(
          "fixed inset-0 hidden place-content-center bg-gray-500/70 backdrop-blur-sm z-10",
          {
            grid: visible,
          }
        )}
      >
        <canvas ref={ref} className="" />
        <button
          onClick={onClose}
          className="py-2 px-4 bg-brand-700 text-white rounded-xl mt-12"
        >
          Aceptar
        </button>
      </div>
    );
  }
);
