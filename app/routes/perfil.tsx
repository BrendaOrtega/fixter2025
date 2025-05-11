import { forwardRef, useRef, useState, type ChangeEvent } from "react";
import { type LoaderFunctionArgs } from "react-router";
import type { Route } from "./+types/perfil";
import { FaEdit } from "react-icons/fa";
import { cn } from "~/utils/cn";
import * as fabric from "fabric";
import { getUserOrRedirect } from "~/.server/dbGetters";
import { getPutFileUrl } from "~/.server/tigrs";
import getMetaTags from "~/utils/getMetaTags";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserOrRedirect(request);
  const putURL = await getPutFileUrl(user.email);
  return { user, putURL };
};

export const meta = () =>
  getMetaTags({
    title: " Mi perfil",
    description: "Actualiza tu información",
  });

export default function Route({
  loaderData: { user, putURL },
}: Route.ComponentProps) {
  return (
    <article className="h-screen">
      <section className="py-20 flex flex-col">
        <EditableAvatar
          src={`/api/file?storageKey=${user.email}`}
          className="mx-auto"
          putURL={putURL}
          fallbackSrc={user.photoURL}
        />
        <p className="text-brand-100 text-center mb-16 lowercase">
          {user.email}
        </p>

        <section className="flex justify-center px-10 md:px-[5%] xl:px-0">
          <div
            style={{ backgroundImage: "url(https://i.imgur.com/JEAzNoh.png)" }}
            className="dark:text-white w-[640px] bg-white p-4 rounded-lg bg-cover bg-right border-[1px] border-brand-black-200/10 dark:border-brand-black-100/10 bg-no-repeat"
          >
            <div className="bg-[#fff] dark:bg-[#1B1E24] rounded-lg p-10">
              <h3 className="font-bold text-xl text-brand-black-400 mb-1">
                {" "}
                Suscripción PRO
              </h3>
              <p className="text-3xl font-bold ">
                $X,XXX.00 <span className="text-sm text-blueLight">MXN</span>
              </p>
              <div className="flex flex-wrap md:flex-nowrap mt-6">
                <div className="pr-6 flex flex-col gap-4 dark:text-white mb-4 md:mb-0">
                  <div>🤓 Acceso ilimitado a todos los cursos</div>
                  <div>📄 Certificados digitales</div>
                  <div>🎯 Talleres online exclusivos </div>
                  <div>🎟 Pack de stickers o swag hasta tu casa </div>
                  <div>🤳🏻 Soporte prioritario</div>
                </div>
                <div className=" border-l-0 w-full md:w-fit	 border-t-[1px] md:border-l-[1px] md:border-t-0 pl-0 md:pl-6 ">
                  <p className="text-sm text-brand-black-400 dark:brand-black-50 mt-6 md:mt-0">
                    Inicio de suscripción
                  </p>
                  <h2>---</h2>
                  <p className="text-sm text-brand-black-400 dark:brand-black-50 mt-2">
                    Fecha de renovación
                  </p>
                  <h2>---</h2>
                  <p className="text-sm text-brand-black-400 dark:brand-black-50 mt-2">
                    Costo de renovación
                  </p>
                  <h2>---</h2>
                  <br />
                  <button className="bg-brand-black-500 w-[180px] h-10 text-white dark:text-brand-black-500 rounded-lg px-1">
                    Disponible Abril 2025
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </article>
  );
}

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
    const resultImage = canvasObj.current?.toDataURL({
      // top: center.y,
      top: center.y - 160,
      left: center.x - 160,
      width: 320,
      height: 320,
      multiplier: 1,
      format: "png",
      // quality: 0.2,
    });
    const file = await fetch(resultImage).then((r) => r.blob());
    setImageSrc(resultImage);
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = true;
    a.click();
    if (!file) return;
    console.log("About to put:", putURL);
    const res = await fetch(putURL, {
      // presignurl
      method: "PUT",
      body: file,
    }).catch((e) => console.error(e));
    console.log("RES:", res);
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
