import { Footer } from "~/components/Footer";
import type { Route } from "../+types/root";
import questions from "~/data/questions";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

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
        <div className="flex mb-20">
          <div>
            <h2 className="text-2xl md:text-3xl xl:text-4xl font-bold text-white mt-10">
              ¿Tienes alguna duda? Tal vez estas respuestas puedan ayudarte.
            </h2>
            <p className="text-colorParagraph text-lg md:text-xl mt-6 font-light lg:max-w-7xl max-w-lg">
              Si no encuentras la respuesta que buscabamos por favor escríbenos
              a{" "}
              <a
                style={{ textDecoration: "underline" }}
                href="mailto:brenda@fixter.org"
                rel="noopener noreferrer"
              >
                {" "}
                <strong className="text-gradient ">brenda@fixter.org</strong>
              </a>
            </p>{" "}
          </div>
          <img className="w-64" src="/ico.png" alt="robot" />
        </div>
        {questions.map((faq: any) => (
          <Question key={faq.question} {...faq} />
        ))}
      </section>
      <Footer />
    </>
  );
}

export const Question = ({
  question,
  answer,
}: {
  question: ReactNode;
  answer: ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b-brand-100/10 border-b-[1px]">
      <button
        className="w-full px-0 py-6 md:py-8 text-xl md:text-2xl font-medium text-left flex justify-between"
        onClick={() => {
          setOpen((o) => !o);
        }}
      >
        <p className="w-[90%] text-white font-normal">{question}</p>
        {open ? (
          <div className="bg-brand-500 rounded-full h-10 w-10 flex justify-center items-center  transition-all rotate-90">
            <img src="/arrow-right.svg" />
          </div>
        ) : (
          <div className="bg-brand-500 rounded-full h-10 w-10 flex justify-center items-center  transition-all">
            <img src="/arrow-right.svg" />
          </div>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
          >
            <p className="text-lg text-iron font-light text-colorParagraph pb-8">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
