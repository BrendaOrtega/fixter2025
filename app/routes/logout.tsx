import { redirect } from "react-router";
import { destroySession, getSession } from "~/sessions";
import type { Route } from "./+types/logout";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  return redirect("/", {
    headers: {
      "set-cookie": await destroySession(session),
    },
  });
};
