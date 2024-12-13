import { useFetcher } from "react-router";
import { NavBar } from "../components/common/NavBar";
import { useEffect, type ReactNode } from "react";

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const fetcher = useFetcher();
  useEffect(() => {
    fetcher.submit({ intent: "self" }, { method: "POST", action: "/api/user" });
  }, []);
  return (
    <>
      <NavBar user={fetcher.data?.user} />
      {children}
    </>
  );
};
