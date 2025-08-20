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
    const url = await getStripeCheckout({
      courseSlug: formData.get("courseSlug") as string,
    });
    throw redirect(url.toString());
  }
  return null;
};
