import { Form } from "react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../common/PrimaryButton";
import { Drawer } from "./SimpleDrawer";

export const PurchaseDrawer = ({ courseSlug, price }: { courseSlug: string; price?: number }) => {
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
      title="Desbloquea todo el curso"
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
          ¿List@ para ver todo el curso? Prepárate porque apenas estamos
          comenzando 🚀
        </h3>
        <p className="mt-3 text-base font-light text-colorParagraph sm:text-lg">
          ¡Desbloquea el curso completo y conviértete en un web hacker! 🫶🏻
        </p>
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
