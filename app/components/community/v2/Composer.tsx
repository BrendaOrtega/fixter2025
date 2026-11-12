import { useEffect, useRef, useState, type RefObject } from "react";
import { useFetcher } from "react-router";
import { useBotTrap } from "~/hooks/useBotTrap";
import { Icon } from "./icons";
import { Avatar, btn, btnGhost, card } from "./ui";
import type { ClubMe } from "./types";

// Compositor de la casa v2. La lógica es la del muro de hoy (ClubWall.tsx › Composer): mismo
// `intent=post`, trampa anti-bot (`t` y `website`), imagen por /api/wall-image y envío
// optimista. Sólo cambia el aspecto.

/** Llave del envío: el muro la lee para pintar el renglón «Enviando…» mientras se guarda. */
export const POST_FETCHER_KEY = "club-v2-post";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function Composer({
  me,
  bodyRef,
  onCancel,
  onPosted,
}: {
  me: ClubMe;
  bodyRef: RefObject<HTMLTextAreaElement | null>;
  /** Sólo el miembro lo cierra: a quien modera le queda siempre a la vista. */
  onCancel?: () => void;
  onPosted?: () => void;
}) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>({ key: POST_FETCHER_KEY });
  const { trap } = useBotTrap();
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const busy = fetcher.state !== "idle";
  // Optimista: lo enviado se pinta de inmediato en el muro y la caja queda libre. Si el
  // servidor lo rechaza, el texto y la imagen regresan a la caja junto con el mensaje.
  const sent = useRef<{ body: string; imageKey: string | null; preview: string | null } | null>(null);

  useEffect(() => {
    if (fetcher.state === "submitting" && fetcher.formData && !sent.current) {
      sent.current = { body: String(fetcher.formData.get("body") ?? ""), imageKey, preview };
      if (bodyRef.current) bodyRef.current.value = "";
      setImageKey(null);
      setPreview(null);
    } else if (fetcher.state === "idle" && sent.current) {
      if (fetcher.data?.error) {
        if (bodyRef.current && !bodyRef.current.value) bodyRef.current.value = sent.current.body;
        setImageKey(sent.current.imageKey);
        setPreview(sent.current.preview);
      } else {
        onPosted?.();
      }
      sent.current = null;
    }
    // Sólo reacciona al cambio de estado del envío.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    if (file.size > MAX_IMAGE_BYTES) return setUploadError("La imagen pesa más de 8 MB.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("fileName", file.name);
      fd.set("type", file.type);
      const res = await fetch("/api/wall-image", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo subir");
      const put = await fetch(json.putURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) throw new Error("No se pudo subir");
      setImageKey(json.key);
      setPreview(URL.createObjectURL(file));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "No se pudo subir");
    } finally {
      setUploading(false);
    }
  }

  const error = (!busy && fetcher.data?.error) || uploadError;
  return (
    <fetcher.Form method="post" className={`${card} relative px-4 py-3.5`}>
      {trap}
      <input type="hidden" name="intent" value="post" />
      {imageKey && <input type="hidden" name="imageKey" value={imageKey} />}
      <div className="flex gap-3">
        <Avatar person={me} />
        <label className="min-w-0 flex-1">
          <span className="sr-only">Nueva publicación</span>
          <textarea
            ref={bodyRef}
            name="body"
            required
            maxLength={5000}
            placeholder="¿Qué construiste, qué se te atoró o qué descubriste?"
            className="block min-h-[52px] w-full resize-y rounded-lg border border-[#232D33] bg-[#141B20] px-3 py-2 text-base leading-snug text-[#F2F5F4] placeholder:text-[#7C8A8E] focus:border-[#7C8A8E] focus:outline-none focus:ring-0 sm:min-h-[76px] sm:text-sm"
          />
        </label>
      </div>
      {preview && (
        <div className="relative ml-11 mt-3 inline-block">
          <img src={preview} alt="Imagen de la publicación" className="max-h-48 rounded-lg border border-[#232D33]" />
          <button
            type="button"
            onClick={() => {
              setImageKey(null);
              setPreview(null);
            }}
            aria-label="Quitar imagen"
            className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-[#232D33] bg-[#141B20] text-[#F2F5F4] hover:bg-[#1C252B]"
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {/* El <input type="file"> queda dentro del <label>: se abre con clic y con teclado. */}
        <label className={`${btnGhost} cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-500`}>
          <Icon name="image" className="h-[15px] w-[15px]" />
          {uploading ? "Subiendo…" : "Agregar imagen"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        <span className="order-3 basis-full text-xs text-[#7C8A8E] sm:order-none sm:flex-1 sm:basis-auto">
          Markdown y bloques de código funcionan.
        </span>
        <div className="ml-auto flex gap-2 sm:ml-0">
          {onCancel && (
            <button type="button" onClick={onCancel} className={btnGhost}>
              Cancelar
            </button>
          )}
          <button disabled={busy || uploading} className={btn}>
            Publicar
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-[#F08A80]">
          {error}
        </p>
      )}
    </fetcher.Form>
  );
}
