import { data, redirect, type ActionFunctionArgs } from "react-router";
import { sendMagicLink } from "~/mailSenders/sendMagicLink";
import { z } from "zod";
import { getUserOrNull, updateUserAndSetSession } from "~/.server/dbGetters";
import { sendConfirmation } from "~/mailSenders/sendConfirmation";
import { db } from "~/.server/db";

const emailSchema = z.string().email();

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "recaptcha_verify_token") {
    const token = formData.get("token");
    const url = new URL("https://www.google.com/recaptcha/api/siteverify");
    const options: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.RECAPTCHA_SECRET,
        response: token,
      }),
    };
    return await fetch(url.toString(), options); // {success}
  }

  if (intent === "suscription") {
    const tags = ["newsletter", "blog"];
    const email = String(formData.get("email"));
    emailSchema.parse(email);
    // @todo detached
    const suscriber = await db.subscriber.upsert({
      where: { email },
      create: { email, tags }, // @todo default tags?
      update: { tags: { push: tags } },
    });
    if (!suscriber.confirmed) {
      await sendConfirmation(email, tags);
    }
    throw redirect("/subscribe?success=1");
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
  return data({ message: "No match" }, { status: 200 });
};
