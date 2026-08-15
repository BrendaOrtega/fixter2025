import { NavBar } from "../components/common/NavBar";
import { useEffect, type ReactNode } from "react";
import { GlobalBanner } from "~/components/common/GlobalBanner";
import { WebinarBanner } from "~/components/common/WebinarBanner";
import { FloatingPromo } from "~/components/common/FloatingPromo";
import { useFetcher, useLocation } from "react-router";

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const fetcher = useFetcher();
  const location = useLocation();

  useEffect(() => {
    fetcher.submit({ intent: "self" }, { action: "/api/user", method: "post" });
  }, []);

  const user = fetcher.data?.user;

  // Ocultar navbar en rutas de libros, admin y viewer
  const isBookRoute = location.pathname.startsWith('/libros/');
  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  // La URL canónica del reproductor dejó de ser `/viewer`: ahora es
  // `/cursos/:curso/:video`. Al detectar solo "/viewer", la navbar y el promo
  // flotante volvieron a aparecer encima del video.
  const isViewerRoute =
    location.pathname.includes('/viewer') ||
    /^\/cursos\/[^/]+\/[^/]+$/.test(location.pathname);
  const isCoachRoute = location.pathname.startsWith('/coach');
  const isExcalidrawDemo = location.pathname === '/excalidraw-demo';
  const isSecuenciasRoute =
    location.pathname.startsWith('/secuencias') ||
    location.pathname === '/s' ||
    location.pathname.startsWith('/s/');
  // El promo flotante promociona este taller; no mostrarlo en su propia landing
  const isSistemasRoute = location.pathname.startsWith('/sistemas-agenticos');

  return (
    <>
      {!isBookRoute && !isAdminRoute && !isExcalidrawDemo && <NavBar user={user} />}
      {children}
      {!isBookRoute && !isAdminRoute && !isViewerRoute && !isCoachRoute && !isExcalidrawDemo && !isSecuenciasRoute && !isSistemasRoute && <FloatingPromo />}
      {/* <WebinarBanner /> */}
      {/* <GlobalBanner /> */}
    </>
  );
};
