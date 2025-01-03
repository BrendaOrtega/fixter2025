import { PrimaryButton } from "~/components/common/PrimaryButton";

export default function Route() {
  return (
    <main className="pt-16 p-4 min-h-screen container mx-auto text-white flex items-center justify-center">
      <div className="flex flex-col items-center">
        <h1 className="text-[110px] md:text-[140px] font-bold text-brand-500 text-center mb-0 pb-0">
          Oops!
        </h1>
        <p className="text-colorParagraph font-light text-xl text-center -mt-6">
          404 - ¡Vaya vaya! Esta página no existe 👷🏻‍♀️
        </p>
        <PrimaryButton
          as="Link"
          to="/"
          className="mx-auto mt-8 z-10 relative"
          title="Volver al inicio"
          variant="fill"
        />
        <img className="mt-0 md:-mt-16" alt="cover" src="/404.png" />
      </div>
    </main>
  );
}
