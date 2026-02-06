import getMetaTags from "~/utils/getMetaTags";
import { SuscriptionBanner } from "~/components/SuscriptionBanner";
import { Footer } from "~/components/Footer";

export const meta = () =>
  getMetaTags({
    title:
      "Guia Estrategica 2026 — Observabilidad, Integraciones y Plataformas | Fixter",
    description:
      "Documento estrategico sobre Datadog, consultoria independiente, MCP y el futuro de las plataformas de integraciones.",
    url: "https://www.fixtergeek.com/integraciones",
  });

export default function Integraciones() {
  return (
    <main className="w-full bg-background">
      {/* Dark background behind the fixed NavBar */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-[#1a1a1a] z-[199]" />
      <iframe
        src="/integraciones.html"
        title="Guia Estrategica 2026"
        className="w-full border-0"
        style={{ height: "100vh" }}
      />
      <SuscriptionBanner />
      <Footer />
    </main>
  );
}
