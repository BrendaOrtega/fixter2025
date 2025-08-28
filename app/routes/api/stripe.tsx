import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { getStripeCheckout } from "~/.server/stripe";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Manejar requests GET redirigiendo a home
  throw redirect("/");
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "checkout") {
    try {
      const courseSlug = formData.get("courseSlug") as string;
      
      if (!courseSlug) {
        throw new Error("No se especificó el curso");
      }
      
      console.log("Iniciando checkout para curso:", courseSlug);
      
      const url = await getStripeCheckout({
        courseSlug,
      });
      
      if (!url) {
        throw new Error("No se pudo crear la sesión de checkout");
      }
      
      console.log("Redirigiendo a Stripe checkout:", url);
      throw redirect(url.toString());
    } catch (error) {
      // Si el error es un redirect de React Router, no es realmente un error
      if (error instanceof Response && error.status === 302) {
        throw error; // Re-throw the redirect
      }
      
      console.error("Error real en checkout:", error);
      // Solo redirigir con error si es un error real
      throw redirect(`/cursos/${formData.get("courseSlug")}?error=checkout_failed`);
    }
  }
  return null;
};
