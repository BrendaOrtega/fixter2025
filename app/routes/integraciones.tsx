import { Form, useFetcher } from "react-router";
import getMetaTags from "~/utils/getMetaTags";
import { SubscriptionModal } from "~/components/SubscriptionModal";
import useRecaptcha from "~/lib/useRecaptcha";
import { useRef } from "react";
import Spinner from "~/components/common/Spinner";

export const meta = () =>
  getMetaTags({
    title:
      "Guia Estrategica 2026 — Observabilidad, Integraciones y Plataformas | Fixter",
    description:
      "Documento estrategico sobre Datadog, consultoria independiente, MCP y el futuro de las plataformas de integraciones.",
    url: "https://www.fixtergeek.com/integraciones",
  });

export default function Integraciones() {
  const fetcher = useFetcher();
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = fetcher.state !== "idle";

  const nameRef = useRef<HTMLInputElement>(null);

  const onSubmit = () => {
    if (!inputRef.current?.value) return;
    const fd = new FormData();
    fd.append("email", inputRef.current.value);
    fd.append("name", nameRef.current?.value || "");
    fd.append("intent", "suscription");
    fd.append("tags", "integraciones");
    fd.append("tags", "analisis_estrategicos");
    fetcher.submit(fd, { method: "POST", action: "/api/user" });
  };

  const { handleSubmit } = useRecaptcha(onSubmit);

  return (
    <main className="w-full bg-background">
      <div className="fixed top-0 left-0 right-0 h-20 bg-[#1a1a1a] z-[199]" />
      <iframe
        src="/integraciones.html"
        title="Guia Estrategica 2026"
        className="w-full border-0"
        style={{ height: "calc(100vh - 120px)" }}
      />
      <div className="bg-background border-t border-brand-500/20">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between px-4 py-4 gap-3">
          <p className="text-sm text-white/60 font-light">
            Recibe análisis estratégicos sobre IA, MCP, observabilidad, desarrollo web y más.
          </p>
          <Form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
            <input
              ref={nameRef}
              required
              name="name"
              className="h-8 text-sm bg-brand-500/5 border border-brand-500/20 rounded-lg px-3 placeholder:text-brand-300/30 text-white font-light focus:ring-1 focus:ring-brand-500 focus:border-transparent"
              placeholder="Tu nombre"
            />
            <input
              ref={inputRef}
              required
              name="email"
              type="email"
              className="h-8 text-sm bg-brand-500/5 border border-brand-500/20 rounded-lg px-3 placeholder:text-brand-300/30 text-white font-light focus:ring-1 focus:ring-brand-500 focus:border-transparent"
              placeholder="tucorreo@gmail.com"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="h-8 px-4 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <Spinner /> : "Suscribirme"}
            </button>
          </Form>
        </div>
      </div>
      <SubscriptionModal />
    </main>
  );
}
