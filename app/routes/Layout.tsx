import { NavBar } from "../components/common/NavBar";
import { type ReactNode } from "react";
import { GlobalBanner } from "~/components/common/GlobalBanner";
import type { User } from "@prisma/client";

export const MainLayout = ({
  children,
  user,
}: {
  user?: User;
  children: ReactNode;
}) => {
  return (
    <>
      <NavBar user={user} />
      {children}
      <GlobalBanner />
    </>
  );
};
