import type { User } from "~/types/models";
import { useEffect } from "react";
import { useFetcher, useLocation } from "react-router";

/** DEPRECATED Using clientLoaders */
export const useSelf = (): Partial<User> | undefined => {
  const location = useLocation();
  const fetcher = useFetcher();
  useEffect(() => {
    fetcher.submit({ intent: "self" }, { method: "POST", action: "/api/user" });
  }, [location.pathname]);
  return fetcher.data?.user;
};
