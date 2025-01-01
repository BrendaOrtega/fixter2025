import type { User } from "@prisma/client";
import { useEffect } from "react";
import { useFetcher, useLocation } from "react-router";

export const useSelf = (): Partial<User> | undefined => {
  const location = useLocation();
  const fetcher = useFetcher();
  useEffect(() => {
    fetcher.submit({ intent: "self" }, { method: "POST", action: "/api/user" });
  }, [location.pathname]);
  return fetcher.data?.user;
};
