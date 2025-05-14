import { EmojiConfetti } from "../common/EmojiConfetti";
import { PrimaryButton } from "../common/PrimaryButton";
import { Drawer } from "./SimpleDrawer";

export const SuccessDrawer = ({
  isOpen,
  onClose,
}: {
  onClose?: () => void;
  isOpen?: boolean;
}) => {
  return (
    <>
      <EmojiConfetti />
      <Drawer
        header={<></>}
        cta={<></>}
        className="z-[100] "
        title="Desbloquea todo el curso"
        isOpen={isOpen}
        onClose={onClose}
      >
        <div className=" h-full flex items-center px-[5%]">
          <div>
            <img src="/congrats.svg" alt="logo" className="mx-auto w-[240px]" />
            <h2 className="text-2xl text-dark dark:text-white font-semibold md:text-4xl text-center pt-20">
              ¡Has desbloqueado todos los tutoriales! 🎉 🍾
            </h2>
            {/* <p className="text-lg bg-[#0E1317]  dark:text-metal text-center text-iron font-light mt-6">
              Nos da gusto que seas parte de este curso, y que al igual que
              nosotros seas un entusiasta del desarrollo web.{" "}
            </p> */}
            <p className="text-lg bg-[#0E1317]  dark:text-metal text-center text-iron font-light mt-6">
              Inicia sesión para empezar a codear 🧙🏻🪄.
            </p>
            <p className="text-lg bg-[#0E1317]  dark:text-metal text-center text-iron font-light mt-6">
              Inicia sesión directamente con Gmail o ve a tu{" "}
              <a
                className="text-brand-500 underline"
                rel="noreferrer"
                target="_blank"
                href="http://gmail.com"
              >
                correo
              </a>{" "}
              y da clic en el link de acceso. 🎯
            </p>
            <div className="w-full flex  mt-10 ">
              <PrimaryButton
                variant="fill"
                as="Link"
                to="/login"
                className="mx-auto"
              >
                Iniciar sesión
              </PrimaryButton>{" "}
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
};
