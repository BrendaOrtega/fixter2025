import { Form } from "react-router";
import { useState } from "react";
import { PrimaryButton } from "../common/PrimaryButton";
import { Drawer } from "./SimpleDrawer";

export const PurchaseDrawer = ({ courseSlug }: { courseSlug: string }) => {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Drawer
      noOverlay
      header={<></>}
      cta={<></>}
      className="z-50 "
      title="Desbloquea todo el curso"
      isOpen
    >
      <div className="pt-20 px-8  pb-8 ">
        <h3 className="text-4xl text-white">
          ¿List@ ver todo el curso? Prepárate porque apenas estamos comenzando
          🚀
        </h3>
        <p className="text-xl font-light mt-16 text-metal">
          ¡Desbloquea el curso completo! 🫶🏻 Construye conmigo todos los
          componentes paso a paso y conviértete en PRO. <br />
        </p>
        <Form method="POST" action="/api/stripe">
          <input type="hidden" name="courseSlug" value={courseSlug} />
          <PrimaryButton
            onClick={() => setIsLoading(true)}
            isLoading={isLoading}
            name="intent"
            value="checkout"
            type="submit"
            className="font-semibold w-full mt-20 hover:tracking-wide bg-brand-700"
          >
            ¡Desbloquear ahora! 🛸
          </PrimaryButton>
        </Form>{" "}
      </div>
    </Drawer>
  );
};
