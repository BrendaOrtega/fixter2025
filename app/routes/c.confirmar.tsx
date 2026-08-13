import { redirect, type LoaderFunctionArgs } from "react-router";
import type { Route } from "./+types/c.confirmar";
import { joinCommunity } from "~/.server/community";
import { setMemberCookie } from "~/.server/memberCookie";
import { validateCommunitySubscribeToken } from "~/utils/tokens";
import getMetaTags from "~/utils/getMetaTags";

export const meta = () =>
  getMetaTags({ title: "Confirmar correo | FixterGeek" });

/**
 * El clic del correo de doble opt-in. Si todo sale bien no hay pantalla
 * intermedia: la confirmación ES la llegada al catálogo, con la secuencia de
 * bienvenida ya activada.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return { error: "Enlace inválido" };

  const { isValid, decoded, error } = validateCommunitySubscribeToken(token);
  if (!isValid || !decoded) return { error: error || "Enlace inválido" };

  const result = await joinCommunity({
    communityId: decoded.communityId,
    email: decoded.email,
    name: decoded.name,
  });
  if (!result) return { error: "Esta comunidad ya no está disponible." };

  // De vuelta a la comunidad, ya reconocido: ahí ve su panel, no el formulario.
  throw redirect(`/c/${result.communitySlug}?bienvenida=1`, {
    headers: { "Set-Cookie": await setMemberCookie(decoded.email) },
  });
};

export default function ConfirmCommunity({ loaderData }: Route.ComponentProps) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-brand-900">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⛓️‍💥</div>
        <h1 className="text-2xl font-bold text-white mb-2">
          No pudimos confirmar
        </h1>
        <p className="text-brand-100">{loaderData.error}</p>
      </div>
    </main>
  );
}
