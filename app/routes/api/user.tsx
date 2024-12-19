import { redirect, type ActionFunctionArgs } from "react-router";
import { sendMagicLink } from "~/mailSenders/sendMagicLink";
import { z } from "zod";
import { getUserOrNull, updateUserAndSetSession } from "~/.server/dbGetters";
import { sendConfirmation } from "~/mailSenders/sendConfirmation";

const emailSchema = z.string().email();

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "suscription") {
    const email = String(formData.get("email"));
    emailSchema.parse(email);
    // @todo detached
    await sendConfirmation(email, ["newsletter", "blog"]);
    return redirect("/subscribe?success=1");
  }

  if (intent === "self") {
    return { user: await getUserOrNull(request) };
  }

  if (intent === "google_login") {
    const data = JSON.parse(formData.get("data") as string); // what's data?
    //@todo validate
    await updateUserAndSetSession(data, { request });
  }

  if (intent === "magic_link") {
    const email = String(await formData.get("email"));
    // validation
    emailSchema.parse(email);
    // @todo: agenda (detached)
    await sendMagicLink({ email });
    return redirect("/login?success");
  }
  return null;
};
