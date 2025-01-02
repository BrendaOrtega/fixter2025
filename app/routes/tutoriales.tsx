import { Footer } from "~/components/Footer";
import type { Route } from "../+types/root";
import questions from "~/data/questions";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getMetaTags } from "~/utils/getMetaTags";

export const meta = () =>
  getMetaTags({
    title: "Tutoriales",
    description: "Aprende practicando con nuestros tutoriales",
  });

export default function Route({}: Route.ComponentProps) {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, []);
  return (
    <>
      <section className="max-w-7xl mx-auto  pt-40 pb-40">
        <div className="flex flex-col justify-center mb-20 text-center min-h-[50vh]">
          <div>
            <img className="w-64 mx-auto" src="/spaceman.svg" alt="astronaut" />
            <h2 className="text-2xl md:text-3xl xl:text-4xl font-bold text-white mt-10">
              ¡Nos descubriste! Estamos actualizando está página 🔧
            </h2>
            <p className="text-colorParagraph text-lg md:text-xl mt-6 font-light lg:max-w-7xl max-w-lg">
              Vuelve pronto, te encantará la nueva versión.
              <br /> Si tienes alguna duda escríbenos a
              <a
                style={{ textDecoration: "underline" }}
                href="mailto:brenda@fixter.org"
                rel="noopener noreferrer"
              >
                {" "}
                <strong className="text-gradient ">hola@fixtergeek.com</strong>
              </a>
            </p>{" "}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
