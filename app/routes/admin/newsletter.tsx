import type { Newsletter } from "@prisma/client";
import { db } from "~/.server/db";
import type { Route } from "./+types/newsletter";
import slugify from "slugify";
import { getUserOrRedirect } from "~/.server/dbGetters";
import { Form, useFetcher } from "react-router";
import { useState, type FormEvent } from "react";
import { cn } from "~/utils/cn";

export const loader = async () => {
  const newsletters = await db.newsletter.findMany();
  return { newsletters };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await getUserOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save") {
    const id = formData.get("id") as string;
    const data = Object.fromEntries(formData);
    delete data.intent;
    delete data.id;
    // data.schedule = data.schedule ? new Date(data.schedule) : data.schedule;
    console.log("DATA:", data);
    // return { screen: "list" };
    await db.newsletter.update({
      where: {
        id,
      },
      data,
    });
    return { screen: "list" };
  }

  if (intent === "new") {
    const title = (formData.get("title") as string) || "Unamed";
    const data = {
      title,
      slug: slugify(title),
      userId: user.id,
    };
    await db.newsletter.create({
      data,
    });
  }

  if (intent === "edit") {
    const newsletter = await db.newsletter.findUnique({
      where: { id: formData.get("id") as string },
    });
    return { newsletter, screen: "edit" };
  }

  if (intent === "cancel") {
    return { screen: "list" };
  }
};

export default function Page({ loaderData }: Route.ComponentProps) {
  const { newsletters } = loaderData;

  const fetcher = useFetcher();

  const handleNew = () => {
    fetcher.submit(
      {
        intent: "new",
      },
      { method: "post" }
    );
  };

  const handleEdit = (id: string) => {
    fetcher.submit(
      {
        intent: "edit",
        id,
      },
      { method: "post" }
    );
  };

  const handleSubmit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();

    const formD = new FormData(ev.currentTarget);
    const form = Object.fromEntries(formD);

    formD.set("intent", "save");
    formD.set("id", fetcher.data.newsletter.id);
    const d = new Date(form.schedule).toISOString();
    console.log("DATE:", d);
    formD.set("schedule", d);
    fetcher.submit(formD, { method: "post" });
  };

  const handleCancel = () => {
    fetcher.submit(
      {
        intent: "cancel",
      },
      { method: "post" }
    );
  };

  const screen = fetcher.data?.screen || "list"; // list | edit
  const newsletter = fetcher.data?.newsletter;

  console.log("SCHEDULE: ", new Date(newsletter?.schedule));

  return (
    <article className="py-20 text-white max-w-3xl mx-auto px-3 h-svh">
      {screen === "list" && (
        <List onNew={handleNew} newsletters={newsletters} onEdit={handleEdit} />
      )}
      {screen === "edit" && (
        <NewsletterForm
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          newsletter={newsletter}
        />
      )}
    </article>
  );
}

const NewsletterForm = ({
  newsletter,
  onSubmit,
  onCancel,
}: {
  onCancel?: () => void;
  onSubmit: (arg0: FormEvent<HTMLFormElement>) => void;
  newsletter: Newsletter;
}) => {
  const formatSchedule = (n: Newsletter) => {
    if (!n.schedule) return "";

    const withZero = (n: number) => (n < 10 ? `0${n}` : n);
    const d = new Date(n.schedule);
    const fd = d.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "numeric",
    });
    const invert =
      fd.split("/").reverse().join("-") +
      `T${withZero(d.getHours())}:${withZero(d.getMinutes())}:00`;
    console.log("CLIENt_DATE", invert);
    return invert;
  };
  return (
    <Form className="text-black" onSubmit={onSubmit}>
      <h2 className="text-xl mb-6 text-white">Editando entrega</h2>
      <label className="font-medium my-2 block text-white">Asunto</label>
      <input
        name="title"
        defaultValue={newsletter.title}
        className="text-black focus:border-brand-500 focus:outline-none focus:shadow-outline w-full"
      />
      <nav className="flex gap-4 items-center">
        <label className="font-medium my-2 block text-white">
          Contenido HTML
        </label>
        <button
          type="button"
          className="text-white bg-brand-700 px-3 rounded-full text-xs"
        >
          Ver Preview
        </button>
      </nav>
      <textarea
        defaultValue={newsletter.content || undefined}
        name="content"
        className="w-full h-[350px]"
      />
      <label className="font-medium my-2 block text-white">
        Programar envío para:
      </label>
      <input
        type="datetime-local"
        name="schedule"
        // defaultValue={"2025-05-17T10:00:00"}
        defaultValue={formatSchedule(newsletter)}
      />
      <nav className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="text-white p-2 bg-brand-500/30 ml-auto active:scale-95"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="text-white p-2 bg-brand-700 active:scale-95"
        >
          Guardar
        </button>
      </nav>
    </Form>
  );
};

const List = ({ onEdit, onNew, newsletters }) => {
  return (
    <>
      <nav className="flex items-center justify-between px-8">
        <h1 className="font-bold text-2xl">Fixtergeek Newsletter</h1>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-black text-white font-bold rounded-md border-black border enabled:hover:border-white enabled:active:bg-white transition-all enabled:active:text-black"
        >
          + Nueva entrega
        </button>
      </nav>
      <NewsLettersTable onEdit={onEdit} newsletters={newsletters} />
    </>
  );
};

const NewsLettersTable = ({
  onEdit,
  newsletters,
}: {
  newsletters: Newsletter[];
}) => {
  return (
    <article className="my-10 px-3">
      {newsletters.map((n) => (
        <NewsLetterCard onEdit={() => onEdit(n.id)} newsletter={n} key={n.id} />
      ))}
    </article>
  );
};

const NewsLetterCard = ({ onEdit, newsletter }: { newsletter: Newsletter }) => {
  const getFormatedDate = (date?: string | Date | null) => {
    if (!date) return null;

    return new Date(date).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  const status = newsletter.sent
    ? "Enviado"
    : newsletter.schedule
    ? "Programado"
    : "Draft";

  return (
    <section className="p-4 border rounded-md my-3 group">
      <div className="flex items-center gap-4 mb-2">
        <h2 className="font-bold text-2xl">{newsletter.title}</h2>
        <span
          className={cn(
            "py-1 px-3 font-medium rounded-full text-blue-500 bg-blue-200 text-xs lowercase",
            {
              "bg-blue-200": status === "Programado",
              "bg-gray-300 text-gray-500": status === "Draft",
              "bg-green-200 text-green-500": status === "Enviado",
            }
          )}
        >
          {status}
        </span>
        {!newsletter.sent && (
          <button
            onClick={onEdit}
            className="group-hover:block hidden text-xs bg-gray-300 rounded px-2 ml-auto text-black"
          >
            Editar
          </button>
        )}
      </div>
      <div className="text-xs flex items-center gap-3 text-gray-500">
        <p>{newsletter.recipients.length} recipients</p>
        <p>42.3% Open Rate</p>
        <p>40.9% Click Rate</p>
        <p>1,082 Clicks</p>
        <p>0 Unsuscribers</p>
      </div>
      <p className="text-sm text-gray-400">
        {newsletter.sent ? "Enviado: " : "No enviado aún"}
        {getFormatedDate(newsletter.sent)}
      </p>
    </section>
  );
};
