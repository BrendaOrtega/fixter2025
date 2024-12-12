import type { User } from "@prisma/client";
import { useState } from "react";
import { useFetcher, type LoaderFunctionArgs } from "react-router";
import Spinner from "~/components/common/Spinner";
import type { Route } from "./+types/perfil";
import { getUserOrRedirect } from "~/utils/dbGetters";

//@TODO update image (make video and resize it 🤩), navbar

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserOrRedirect(request);
  return { user };
};

export default function Route({ loaderData: { user } }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<User>({ ...user });
  return (
    <article>
      {/* <NavBar user={user} /> */}
      <section
        py={{ base: 8 }}
        maxW="container.xl"
        display="flex"
        flexDir="column"
        gap={8}
      >
        <div className="py-20">
          <img
            className="rounded-full mx-auto"
            src={user.photoURL || "/images/robo_icon.png"}
            alt="fixter robot"
          />
          {editing ? (
            <>
              <input
                onChange={({ target: { value } }) =>
                  setForm({ ...form, displayName: value })
                }
                value={form.displayName}
                name="displayName"
                placeholder={user.displayName}
                className="border-[1px] border-[#ccc] rounded-lg px-2 py-1"
              />
              <button onClick={handleDisplayNameUpdate} variant="outline">
                Guardar
              </button>
            </>
          ) : (
            <div className="text-center flex flex-col items-center">
              <div className="flex items-center">
                <header fontSize="md">{user.displayName}</header>
                <button
                  //    onClick={() => setEditing(true)}
                  variant="ghost"
                >
                  {/* <TbEditCircle /> */}
                </button>
              </div>
              <p className="text-md text-brand-black-400 dark:brand-black-50">
                {user.email}
              </p>
            </div>
          )}
          {fetcher.state !== "idle" && <Spinner />}
        </div>
        <section className="flex justify-center">
          <div
            style={{ backgroundImage: "url(https://i.imgur.com/JEAzNoh.png)" }}
            className=" w-[640px] bg-white p-4 rounded-lg bg-cover bg-right border-[1px] border-brand-black-200/10 dark:border-brand-black-100/10 bg-no-repeat"
          >
            <div className="bg-[#fff] dark:bg-[#1B1E24] rounded-lg p-10">
              <h3 className="font-bold text-xl text-brand-black-400 mb-1">
                {" "}
                Suscripción PRO
              </h3>
              <p className="text-3xl font-bold">
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
                  <button className="bg-brand-black-500 w-[180px] dark:bg-[#fff] h-10 text-white dark:text-brand-black-500 rounded-lg px-1">
                    Disponible Enero 2024
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* <Sections /> */}
      </section>
      <input
        accept="image/*"
        // onChange={handleFileChange}
        // ref={inputRef}
        type="file"
        hidden
      />
    </article>
  );
}
