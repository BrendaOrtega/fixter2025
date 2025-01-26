import { NavBar } from "../components/common/NavBar";
import { useEffect, type ReactNode } from "react";
import { GlobalBanner } from "~/components/common/GlobalBanner";
import { useFetcher } from "react-router";

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const fetcher = useFetcher();
  useEffect(() => {
    fetcher.submit({ intent: "self" }, { action: "/api/user", method: "post" });
  }, []);

  const user = fetcher.data?.user;

  return (
    <>
      <NavBar user={user} />
      {children}
      <GlobalBanner />
    </>
  );
};
