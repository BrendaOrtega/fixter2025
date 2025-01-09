import { useFetcher } from "react-router";
import { NavBar } from "../components/common/NavBar";
import { useEffect, type ReactNode } from "react";
import { GlobalBanner } from "~/components/common/GlobalBanner";

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const fetcher = useFetcher();
  useEffect(() => {
    fetcher.submit({ intent: "self" }, { method: "GET", action: "/api/user" });
  }, []);
  return (
    <>
      <NavBar user={fetcher.data?.user} />
      {children}
      <GlobalBanner />
    </>
  );
};
