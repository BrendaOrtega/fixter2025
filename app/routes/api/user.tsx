import {
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { sendMagicLink } from "~/mailSenders/sendMagicLink";
import { z } from "zod";
import { getUserOrNull } from "~/.server/dbGetters";
import { sendConfirmation } from "~/mailSenders/sendConfirmation";
import { db } from "~/.server/db";
import { destroySession, getSession } from "~/sessions";
import { checkSignupRequest, claimEmailSend } from "~/.server/signup-guard";

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
    const extraTags = formData.getAll("tags").map(String).filter(Boolean);
    if (extraTags.length) tags.push(...extraTags);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const name = String(formData.get("name") || "");
    const { success, error } = emailSchema.safeParse(email);
    if (!success) {
      return data({
        errors: error.errors.reduce((acc, el) => {
          acc[el.validation] = { code: el.code, message: el.message };
          return acc;
        }, {}),
      });
    }
    // Guard anti-spam: antes cada envío del form reenviaba la confirmación a cualquier
    // dirección sin confirmar. Bot → éxito falso; error real → se le dice.
    const guard = await checkSignupRequest(request, formData, { email, name, label: "newsletter" });
    if (!guard.ok) {
      if (guard.fake) throw redirect("/subscribe?success=1");
      return data({ errors: { email: { code: "blocked", message: guard.error } } });
    }
    const existing = await db.subscriber.findUnique({ where: { email }, select: { tags: true } });
    const newTags = tags.filter((t) => !existing?.tags.includes(t));
    const suscriber = await db.subscriber.upsert({
      where: { email },
      create: { email, name, tags },
      // sin duplicar tags ni pisar el nombre con uno vacío
      update: { ...(name ? { name } : {}), ...(newTags.length ? { tags: { push: newTags } } : {}) },
    });
    if (!suscriber.confirmed && (await claimEmailSend(email, "confirm:newsletter", guard.ip, "confirm"))) {
      await sendConfirmation(email, tags);
    }
    throw redirect("/subscribe?success=1"); // throw to force the fetcher
  }

  if (intent === "self") {
    return { user: await getUserOrNull(request) };
  }

  // Google login redirect is now handled client-side for better performance

  if (intent === "magic_link") {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    emailSchema.parse(email);
    // Guard anti-spam: sin él, cualquiera mandaba magic links sin límite a cualquier dirección.
    // Bloqueado o sin cupo → la misma pantalla de éxito, para no dar pistas.
    const guard = await checkSignupRequest(request, formData, { email, label: "magic-link" });
    if (guard.ok && (await claimEmailSend(email, "otp:magic-link", guard.ip, "otp"))) {
      await sendMagicLink({ email });
    }
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
