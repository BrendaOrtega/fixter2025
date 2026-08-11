import { useState } from "react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  useFetcher,
} from "react-router";
import type { Route } from "./+types/productos";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { AdminNav } from "~/components/admin/AdminNav";
import { FaPlus, FaTimes, FaExclamationTriangle } from "react-icons/fa";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getAdminOrRedirect(request);

  const [products, courses, sequences, purchases] = await Promise.all([
    db.product.findMany({ orderBy: { createdAt: "desc" } }),
    db.course.findMany({
      select: { slug: true, title: true },
      orderBy: { title: "asc" },
    }),
    db.sequence.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.purchaseEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  // Tipos que llegaron por Stripe y nadie supo cumplir: son los que hay que
  // convertir en producto, y la razón de que este panel exista.
  const known = new Set(products.map((p) => p.key));
  const orphanKeys = [
    ...new Set(
      purchases
        .filter((p) => p.status === "orphan" && p.productKey)
        .map((p) => p.productKey as string)
        .filter((key) => !known.has(key))
    ),
  ];

  return { products, courses, sequences, purchases, orphanKeys };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await getAdminOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "toggle_active") {
    const id = formData.get("id") as string;
    const product = await db.product.findUnique({ where: { id } });
    await db.product.update({
      where: { id },
      data: { active: !product?.active },
    });
    return { success: true };
  }

  if (intent === "upsert") {
    // Whitelist explícita: el update de cursos hace spread de lo que llegue,
    // y eso deja que cualquier form escriba stripeId o basePrice sin querer.
    const key = (formData.get("key") as string)?.trim();
    const title = (formData.get("title") as string)?.trim();
    if (!key || !title) return { error: "Clave y título son obligatorios" };

    const list = (name: string) =>
      ((formData.get(name) as string) || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    const priceRaw = formData.get("priceMxn") as string;
    const data = {
      title,
      courseSlugs: list("courseSlugs"),
      userTags: list("userTags"),
      subscriberTags: list("subscriberTags"),
      createsUser: formData.get("createsUser") === "on",
      createsSubscriber: formData.get("createsSubscriber") === "on",
      sequences: list("sequenceIds").map((sequenceId) => ({
        sequenceId,
        immediate: true,
      })),
      priceMxn: priceRaw ? parseInt(priceRaw) : null,
      successPath: ((formData.get("successPath") as string) || "").trim() || null,
    };

    await db.product.upsert({
      where: { key },
      create: { key, ...data },
      update: data,
    });
    return { success: true, message: `Producto "${key}" guardado` };
  }

  return { error: "Acción no reconocida" };
};

export default function AdminProducts({ loaderData }: Route.ComponentProps) {
  const { products, courses, sequences, purchases, orphanKeys } = loaderData;
  const fetcher = useFetcher<{ error?: string; message?: string }>();
  const [editing, setEditing] = useState<any>(null);

  return (
    <>
      <AdminNav />
      <main className="min-h-screen bg-brand-900 pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">Productos</h1>
            <button
              onClick={() => setEditing({ key: "", createsUser: true, createsSubscriber: true })}
              className="inline-flex items-center gap-2 bg-brand-500 text-brand-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-400"
            >
              <FaPlus className="w-3 h-3" /> Nuevo
            </button>
          </div>
          <p className="text-brand-100/60 text-sm mb-8">
            Qué se entrega cuando alguien compra. Un producto sin cursos es
            válido: los talleres en vivo no dan acceso a nada en el sitio.
          </p>

          {orphanKeys.length > 0 && (
            <div className="mb-6 rounded-lg border border-amber-400/30 bg-amber-400/5 p-4">
              <p className="flex items-center gap-2 text-amber-300 text-sm font-bold mb-2">
                <FaExclamationTriangle className="w-3 h-3" />
                Compras que nadie supo cumplir
              </p>
              <div className="flex flex-wrap gap-2">
                {orphanKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => setEditing({ key, createsUser: true, createsSubscriber: true })}
                    className="px-3 py-1 rounded-full bg-brand-900 border border-amber-400/30 text-amber-200 text-xs hover:border-amber-400"
                  >
                    crear «{key}»
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 mb-12">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-4 rounded-lg border border-brand-100/10 bg-brand-900/40 p-4"
              >
                <button
                  onClick={() => setEditing(product)}
                  className="flex-1 text-left min-w-0"
                >
                  <span className="block text-white text-sm font-medium truncate">
                    {product.title}
                  </span>
                  <span className="block text-brand-100/50 text-xs font-mono truncate">
                    {product.key}
                    {product.courseSlugs.length
                      ? ` · ${product.courseSlugs.join(", ")}`
                      : " · sin acceso a cursos"}
                    {product.sequences.length
                      ? ` · ${product.sequences.length} secuencia(s)`
                      : ""}
                  </span>
                </button>
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="toggle_active" />
                  <input type="hidden" name="id" value={product.id} />
                  <button
                    type="submit"
                    className={
                      "px-3 py-1 rounded-full text-xs border " +
                      (product.active
                        ? "border-brand-500/40 text-brand-500"
                        : "border-brand-100/20 text-brand-100/40")
                    }
                  >
                    {product.active ? "activo" : "inactivo"}
                  </button>
                </fetcher.Form>
              </div>
            ))}
            {products.length === 0 && (
              <p className="text-brand-100/40 text-sm">Todavía no hay productos.</p>
            )}
          </div>

          <h2 className="text-white text-lg font-bold mb-3">Últimas compras</h2>
          <div className="rounded-lg border border-brand-100/10 overflow-hidden">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center gap-3 px-4 py-2 border-b border-brand-100/5 text-sm"
              >
                <StatusBadge status={purchase.status} />
                <span className="text-brand-100/80 truncate flex-1">
                  {purchase.email}
                </span>
                <span className="text-brand-100/40 text-xs font-mono truncate hidden sm:block">
                  {purchase.productKey || "—"}
                </span>
                <span className="text-brand-100/60 text-xs tabular-nums">
                  ${((purchase.amountTotal || 0) / 100).toFixed(0)}
                </span>
              </div>
            ))}
            {purchases.length === 0 && (
              <p className="text-brand-100/40 text-sm p-4">Sin compras registradas.</p>
            )}
          </div>
        </div>
      </main>

      {editing && (
        <ProductDrawer
          product={editing}
          courses={courses}
          sequences={sequences}
          fetcher={fetcher}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    fulfilled: "text-brand-500 border-brand-500/30",
    fulfilled_manually: "text-brand-100/70 border-brand-100/20",
    partial: "text-amber-300 border-amber-300/30",
    orphan: "text-danger border-danger/30",
    foreign: "text-brand-100/30 border-brand-100/10",
  };
  return (
    <span
      className={
        "px-2 py-0.5 rounded-full border text-[10px] whitespace-nowrap " +
        (styles[status] || "text-brand-100/50 border-brand-100/20")
      }
    >
      {status}
    </span>
  );
}

function ProductDrawer({ product, courses, sequences, fetcher, onClose }: any) {
  const isNew = !product.id;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}>
      <fetcher.Form
        method="post"
        onClick={(event: any) => event.stopPropagation()}
        onSubmit={() => setTimeout(onClose, 100)}
        className="w-full max-w-lg bg-brand-900 h-full overflow-y-auto p-6 space-y-4 border-l border-brand-100/10"
      >
        <input type="hidden" name="intent" value="upsert" />
        <div className="flex items-center justify-between">
          <h2 className="text-white text-lg font-bold">
            {isNew ? "Nuevo producto" : product.title}
          </h2>
          <button type="button" onClick={onClose} className="text-brand-100/60">
            <FaTimes />
          </button>
        </div>

        <Field
          label="Clave"
          hint="El mismo string que viaja en metadata.type desde la landing"
        >
          <input
            name="key"
            required
            defaultValue={product.key}
            readOnly={!isNew}
            className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white font-mono text-sm read-only:opacity-60"
          />
        </Field>

        <Field label="Título">
          <input
            name="title"
            required
            defaultValue={product.title}
            className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm"
          />
        </Field>

        <Field
          label="Cursos que otorga"
          hint="Slugs separados por coma. Vacío para talleres en vivo."
        >
          <input
            name="courseSlugs"
            defaultValue={product.courseSlugs?.join(", ")}
            list="course-slugs"
            className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm"
          />
          <datalist id="course-slugs">
            {courses.map((course: any) => (
              <option key={course.slug} value={course.slug}>
                {course.title}
              </option>
            ))}
          </datalist>
        </Field>

        <Field label="Secuencias" hint="IDs separados por coma">
          <input
            name="sequenceIds"
            defaultValue={product.sequences?.map((s: any) => s.sequenceId).join(", ")}
            list="sequence-ids"
            className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm font-mono"
          />
          <datalist id="sequence-ids">
            {sequences.map((sequence: any) => (
              <option key={sequence.id} value={sequence.id}>
                {sequence.name}
              </option>
            ))}
          </datalist>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tags de usuario">
            <input
              name="userTags"
              defaultValue={product.userTags?.join(", ")}
              className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm"
            />
          </Field>
          <Field label="Tags de suscriptor">
            <input
              name="subscriberTags"
              defaultValue={product.subscriberTags?.join(", ")}
              className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio MXN" hint="Solo si vende desde su propia landing">
            <input
              name="priceMxn"
              type="number"
              defaultValue={product.priceMxn ?? ""}
              className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm"
            />
          </Field>
          <Field label="Ruta de éxito">
            <input
              name="successPath"
              placeholder="/mis-cursos"
              defaultValue={product.successPath ?? ""}
              className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm"
            />
          </Field>
        </div>

        <div className="space-y-2 pt-2 border-t border-brand-100/10">
          <Checkbox name="createsUser" defaultChecked={product.createsUser}>
            Crear cuenta al comprar
          </Checkbox>
          <Checkbox name="createsSubscriber" defaultChecked={product.createsSubscriber}>
            Crear suscriptor (necesario para las secuencias)
          </Checkbox>
        </div>

        <button
          type="submit"
          className="w-full bg-brand-500 text-brand-900 py-2 rounded-lg font-medium hover:bg-brand-400"
        >
          Guardar
        </button>
      </fetcher.Form>
    </div>
  );
}

function Field({ label, hint, children }: any) {
  return (
    <label className="block">
      <span className="block text-sm text-brand-100 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-brand-100/40 text-xs mt-1">{hint}</span>}
    </label>
  );
}

function Checkbox({ name, defaultChecked, children }: any) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="w-4 h-4 rounded border-brand-100/30 bg-brand-900 text-brand-500"
      />
      <span className="text-sm text-brand-100/80">{children}</span>
    </label>
  );
}
