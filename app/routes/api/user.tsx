import { redirect, type ActionFunctionArgs } from "react-router";
import { sendMagicLink } from "~/mailSenders/sendMagicLink";
import { z } from "zod";
import { updateUserAndSetSession } from "~/.server/dbGetters";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "google_login") {
    const data = JSON.parse(formData.get("data") as string);
    //@todo validate
    await updateUserAndSetSession(data, { request });
  }

  if (intent === "magic_link") {
    const email = String(await formData.get("email"));
    // validation
    z.string().email().parse(email);
    // @todo: agenda (detached)
    await sendMagicLink({ email });
    return redirect("/login?success=1");
  }
  return null;
};
