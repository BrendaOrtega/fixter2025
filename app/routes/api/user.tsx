import {
  createSearchParams,
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { sendMagicLink } from "~/mailSenders/sendMagicLink";
import { z } from "zod";
import { getUserOrNull, updateUserAndSetSession } from "~/.server/dbGetters";
import { sendConfirmation } from "~/mailSenders/sendConfirmation";
import { db } from "~/.server/db";
import { destroySession, getSession } from "~/sessions";

const emailSchema = z.string().email();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.has("signout")) {
    const session = await getSession(request.headers.get("Cookie"));
    return redirect("/", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }
  return "t(*_*t) by fixter.org team";
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "suscription") {
    const tags = ["newsletter", "blog"];
    const email = String(formData.get("email"));
    const { success, error } = emailSchema.safeParse(email);
    if (!success) {
      return data({
        errors: error.errors.reduce((acc, el) => {
          acc[el.validation] = { code: el.code, message: el.message };
          return acc;
        }, {}),
      });
    }
    // @todo detached
    const suscriber = await db.subscriber.upsert({
      where: { email },
      create: { email, tags }, // @todo default tags?
      update: { tags: { push: tags } },
    });
    if (!suscriber.confirmed) {
      await sendConfirmation(email, tags);
    }
    throw redirect("/subscribe?success=1"); // throw to force the fetcher
  }

  if (intent === "self") {
    return { user: await getUserOrNull(request) };
  }

  if (intent === "google_login") {
    const next = formData.get("next") as string;
    const data = JSON.parse(formData.get("data") as string); // what's data?
    //@todo validate
    await updateUserAndSetSession(data, { request, next });
  }

  if (intent === "magic_link") {
    const email = String(await formData.get("email"));
    // validation
    emailSchema.parse(email);
    // @todo: agenda (detached)
    await sendMagicLink({ email });
    return redirect("/login?success=1");
  }

  if (intent === "recaptcha_verify_token") {
    const url = new URL("https://www.google.com/recaptcha/api/siteverify");
    url.searchParams.set("secret", process.env.RECAPTCHA_SECRET as string);
    url.searchParams.set("response", formData.get("token") as string);
    return await fetch(url.toString(), { method: "POST" }); // {success}
  }

  return data({ message: "No match" }, { status: 200 });
};
