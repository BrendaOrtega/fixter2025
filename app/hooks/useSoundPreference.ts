import { useCallback, useEffect, useState } from "react";

const KEY = "fx_stories_sound";

/**
 * Preferencia de sonido del feed, recordada entre visitas.
 *
 * Arranca SIEMPRE en silencio, aunque la preferencia guardada diga lo
 * contrario: los navegadores solo permiten autoplay muted, y aplicar el
 * sonido antes de un gesto del usuario hace que `play()` sea rechazado y el
 * video ni siquiera arranque. Si había preferencia, se restaura sola en el
 * primer toque en cualquier parte del documento — que ya es gesto válido.
 */
export function useSoundPreference(): [boolean, (value: boolean) => void] {
  const [soundOn, setSoundOn] = useState(false);

  const update = useCallback((value: boolean) => {
    setSoundOn(value);
    try {
      localStorage.setItem(KEY, value ? "1" : "0");
    } catch {
      // Safari en privado tira al escribir. La preferencia se pierde, nada más.
    }
  }, []);

  useEffect(() => {
    let wanted = false;
    try {
      wanted = localStorage.getItem(KEY) === "1";
    } catch {
      return;
    }
    if (!wanted) return;

    const restore = () => setSoundOn(true);
    document.addEventListener("pointerdown", restore, { once: true });
    return () => document.removeEventListener("pointerdown", restore);
  }, []);

  return [soundOn, update];
}
