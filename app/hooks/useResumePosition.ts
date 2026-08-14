import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Retomar donde te quedaste.
 *
 * Un webinar dura 1:15 y nadie lo ve de un jalón; hasta hoy cada visita arrancaba en 0:00
 * y había que buscar el minuto a mano. Ni Mux Player trae esto —sólo expone un `startTime`
 * manual—, así que es de lo poco que nos deja por delante.
 *
 * Va en `localStorage` a propósito: el público de estos videos entra con su correo, sin
 * cuenta, así que guardarlo en la base no lo haría cruzar de dispositivo de todos modos y
 * sí costaría un viaje al servidor en cada guardado.
 *
 * **No salta solo.** Ofrece. Alguien que vuelve a un video puede querer repasar el
 * principio, y saltarle al minuto 34 sin preguntar es peor que no hacer nada.
 */

const PREFIJO = "fx_video_pos:";

/** Antes de esto no hay nada que retomar: es el arranque del video. */
const MINIMO_PARA_OFRECER = 30;
/** Tan cerca del final, lo que se quiere es terminarlo o volver a empezar, no retomar. */
const MARGEN_FINAL = 60;
/** Cada cuánto se escribe mientras corre. Guardar en cada `timeupdate` serían ~4 por segundo. */
const CADA_SEGUNDOS = 5;
/** El aviso se quita solo: si no lo usaste, estorba. */
const SEGUNDOS_VISIBLE = 8;

const leer = (slug: string): number => {
  try {
    return Number(localStorage.getItem(PREFIJO + slug)) || 0;
  } catch {
    return 0;
  }
};

const escribir = (slug: string, segundo: number) => {
  try {
    if (segundo > 0) localStorage.setItem(PREFIJO + slug, String(Math.floor(segundo)));
    else localStorage.removeItem(PREFIJO + slug);
  } catch {
    // Modo privado o almacenamiento lleno: perder la posición no vale un error.
  }
};

export const olvidarPosicion = (slug: string) => escribir(slug, 0);

export const useResumePosition = ({
  videoRef,
  slug,
  /** `?t=` gana siempre: si el enlace apunta a un momento, ese momento manda. */
  desactivado = false,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  slug: string;
  desactivado?: boolean;
}) => {
  const [ofrecido, setOfrecido] = useState(0);
  const guardadoRef = useRef(0);

  // Guardado periódico. Se engancha a `timeupdate` pero sólo escribe cada CADA_SEGUNDOS.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !slug) return;

    const alTiempo = () => {
      const t = el.currentTime;
      if (Math.abs(t - guardadoRef.current) < CADA_SEGUNDOS) return;
      guardadoRef.current = t;
      // Terminado: se olvida, para que la próxima visita empiece limpia.
      const cercaDelFinal = el.duration && t > el.duration - MARGEN_FINAL;
      escribir(slug, cercaDelFinal ? 0 : t);
    };
    const alSalir = () => escribir(slug, el.currentTime);

    el.addEventListener("timeupdate", alTiempo);
    el.addEventListener("pause", alSalir);
    window.addEventListener("pagehide", alSalir);

    return () => {
      el.removeEventListener("timeupdate", alTiempo);
      el.removeEventListener("pause", alSalir);
      window.removeEventListener("pagehide", alSalir);
      // Al desmontar (cambio de lección) se guarda lo último.
      alSalir();
    };
  }, [videoRef, slug]);

  // ¿Hay algo que ofrecer? Se decide una sola vez, cuando ya se conoce la duración.
  useEffect(() => {
    if (desactivado || !slug) return;
    const el = videoRef.current;
    if (!el) return;

    // Se decide de INMEDIATO, sin esperar los metadatos. Esperarlos ataba el aviso a que
    // el video cargara: en una conexión lenta —justo cuando más se agradece retomar— no
    // aparecía nunca. La duración sólo hace falta para descartar el final, y eso se
    // comprueba después, retirando el aviso si resulta que estaba por terminar.
    const guardado = leer(slug);
    if (guardado < MINIMO_PARA_OFRECER) return;
    setOfrecido(guardado);

    const revisarFinal = () => {
      if (el.duration && guardado > el.duration - MARGEN_FINAL) setOfrecido(0);
    };
    if (el.readyState >= 1) revisarFinal();
    else el.addEventListener("loadedmetadata", revisarFinal, { once: true });
    return () => el.removeEventListener("loadedmetadata", revisarFinal);
  }, [videoRef, slug, desactivado]);

  // Se retira solo.
  useEffect(() => {
    if (!ofrecido) return;
    const id = setTimeout(() => setOfrecido(0), SEGUNDOS_VISIBLE * 1000);
    return () => clearTimeout(id);
  }, [ofrecido]);

  const continuar = useCallback(() => {
    const el = videoRef.current;
    if (el) {
      el.currentTime = ofrecido;
      el.play().catch(() => {});
    }
    setOfrecido(0);
  }, [videoRef, ofrecido]);

  const empezarDeNuevo = useCallback(() => {
    const el = videoRef.current;
    if (el) el.currentTime = 0;
    escribir(slug, 0);
    setOfrecido(0);
  }, [videoRef, slug]);

  return { ofrecido, continuar, empezarDeNuevo, descartar: () => setOfrecido(0) };
};
