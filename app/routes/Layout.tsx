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

  // Ocultar navbar en rutas de libros
  const isBookRoute = location.pathname.startsWith('/libros/');

  return (
    <>
      {!isBookRoute && <NavBar user={user} />}
      {children}
      {!isBookRoute && <FloatingPromo />}
      {/* <WebinarBanner /> */}
      {/* <GlobalBanner /> */}
    </>
  );
};
