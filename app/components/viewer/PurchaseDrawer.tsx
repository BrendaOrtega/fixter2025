import { Form } from "react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../common/PrimaryButton";
import { Drawer } from "./SimpleDrawer";

export const PurchaseDrawer = ({
  courseSlug,
  price,
  courseTitle,
  kind,
  stage,
  unlockedCount,
  totalSessions,
  duration,
}: {
  courseSlug: string;
  price?: number;
  courseTitle?: string;
  kind?: string | null;
  stage?: string | null;
  unlockedCount?: number;
  totalSessions?: number | null;
  duration?: string | null;
}) => {
  // En la base todo es `Course`, pero en pantalla un taller se llama taller,
  // y sus videos son sesiones y no lecciones.
  const isTaller = kind === "taller";
  const noun = isTaller ? "taller" : "curso";
  const unit = isTaller
    ? { one: "sesión", many: "sesiones" }
    : { one: "lección", many: "lecciones" };

  // Se vende el programa entero: manda el total prometido, y lo ya grabado va
  // como aclaración cuando todavía faltan.
  const total = totalSessions ?? unlockedCount ?? 0;
  const pending = total - (unlockedCount ?? 0);
  const perks = [
    total
      ? `${total} ${total === 1 ? unit.one : unit.many}` +
        (pending > 0 ? `, ${unlockedCount} ya grabada${unlockedCount === 1 ? "" : "s"}.` : " en video.")
      : null,
    duration ? `${duration} de contenido.` : null,
    pending > 0
      ? `Las ${pending} restantes se suben en cuanto se graban.`
      : null,
  ].filter(Boolean) as string[];
  const [isLoading, setIsLoading] = useState(false);
  const [show, setShow] = useState(true);
  return (
    /* Mismo chasis que los demás: este también se había hecho el suyo con
       `pt-20`, `mt-16` y una ✕ en una imagen, y en panel lateral eso empuja el
       botón de compra debajo del pliegue. */
    <Drawer
      noOverlay
      noActions
      onClose={() => setShow(false)}
      title={`Desbloquea todo el ${noun}`}
      isOpen={show}
    >
      <div className="pb-4">
        <motion.img
          alt="spaceman"
          src="/spaceman.svg"
          className="mx-auto w-40 sm:w-48"
          animate={{ y: [0, -10, 0], rotate: [0, -2.5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <h3 className="text-balance mt-6 text-2xl font-bold leading-tight text-white sm:text-3xl">
          {courseTitle ?? `Este ${noun} completo, en un pago`}
        </h3>
        {perks.length > 0 && (
          <ul className="mt-4 space-y-2 text-base font-light text-colorParagraph sm:text-lg">
            {perks.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
        )}
        {price && (
          <p className="text-2xl font-bold mt-4 text-brand-500">
            ${price} MXN
          </p>
        )}
        <Form method="POST" action="/api/stripe">
          <input type="hidden" name="courseSlug" value={courseSlug} />
          <PrimaryButton
            onClick={() => setIsLoading(true)}
            isLoading={isLoading}
            name="intent"
            value="checkout"
            type="submit"
            variant="fill"
            className="mt-8 w-full font-semibold"
          >
            ¡Desbloquear ahora! 🛸
          </PrimaryButton>
        </Form>{" "}
      </div>
    </Drawer>
  );
};
