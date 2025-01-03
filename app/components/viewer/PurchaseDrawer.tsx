import { Form } from "react-router";
import { useState } from "react";
import { PrimaryButton } from "../common/PrimaryButton";
import { Drawer } from "./SimpleDrawer";

export const PurchaseDrawer = ({ courseSlug }: { courseSlug: string }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [show, setShow] = useState(true);
  return (
    <Drawer
      noOverlay
      header={<></>}
      cta={<></>}
      className="z-[100] "
      title="Desbloquea todo el curso"
      isOpen={show}
    >
      <div className="pt-20  px-0 md:px-8 relative  pb-8 ">
        <button onClick={() => setShow(false)}>
          <img
            className="h-12 w-12 absolute right-0 top-0"
            alt="close"
            src="/closeDark.png"
          />{" "}
        </button>
        <img alt="spaceman" className="w-64 mx-auto" src="/spaceman.svg" />
        <h3 className="text-2xl md:text-3xl text-white mt-16 ">
          ¿List@ para ver todo el curso? Prepárate porque apenas estamos
          comenzando 🚀
        </h3>
        <p className="text-lg md:text-xl font-light mt-4 text-metal text-colorParagraph">
          ¡Desbloquea el curso completo y conviértete en un PRO del desarrollo
          web! 🫶🏻 . <br />
        </p>
        <Form method="POST" action="/api/stripe">
          <input type="hidden" name="courseSlug" value={courseSlug} />
          <PrimaryButton
            onClick={() => setIsLoading(true)}
            isLoading={isLoading}
            name="intent"
            value="checkout"
            type="submit"
            variant="fill"
            className="font-semibold w-full mt-20  "
          >
            ¡Desbloquear ahora! 🛸
          </PrimaryButton>
        </Form>{" "}
      </div>
    </Drawer>
  );
};
