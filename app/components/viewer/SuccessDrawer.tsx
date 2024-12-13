import { EmojiConfetti } from "../common/EmojiConfetti";
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
            <img src="/congrats.png" alt="logo" className="mx-auto w-[240px]" />
            <h2 className="text-2xl text-dark dark:text-white font-semibold md:text-4xl text-center pt-20">
              ¡Has desbloqueado todos los tutoriales! 🎉 🍾
            </h2>
            <p className="text-lg  dark:text-metal text-center text-iron font-light mt-6">
              Nos da gusto que seas parte de este curso, y que al igual que
              nosotros seas un entusiasta de las animaciones web. A partir de
              hoy, tus sitios web nunca volverán a ser los mismos. <br />
              <strong>¡Que empiece la magia! 🧙🏻🪄</strong>
            </p>
            <p className="text-sm  dark:text-metal text-iron text-center font-light mt-6">
              Pd. Si aún no puedes ver los tutoriales, ve a tu{" "}
              <a
                className="text-blue-500 hover:text-blue-600"
                rel="noreferrer"
                target="_blank"
                href="http://gmail.com"
              >
                email
              </a>{" "}
              y da clic en el link de acceso. 🎯
            </p>
          </div>
        </div>
      </Drawer>
    </>
  );
};
