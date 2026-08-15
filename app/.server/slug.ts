// Genera slugs legibles para secuencias (usados en el link público /s/:slug)
// y garantiza unicidad agregando un sufijo numérico si ya existe otro con
// el mismo slug.
import { db } from "~/.server/db";

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // todo lo que no sea alfanumérico -> guion
    .replace(/^-+|-+$/g, "") // sin guiones al inicio/fin
    .slice(0, 80);
}

/**
 * Genera un slug único para una Sequence a partir de su nombre. Si el slug
 * base ya está tomado por otra secuencia, agrega -2, -3, etc.
 *
 * `excludeSequenceId` se usa al renombrar: no cuenta la propia secuencia
 * como colisión contra sí misma.
 */
export async function generateUniqueSequenceSlug(
  name: string,
  excludeSequenceId?: string
): Promise<string> {
  const base = slugify(name) || "secuencia";
  let candidate = base;
  let suffix = 2;

  // Sin límite de intentos "elegante": en la práctica nunca hay tantas
  // colisiones, pero se pone un tope duro por seguridad.
  for (let i = 0; i < 1000; i++) {
    const existing = await db.sequence.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeSequenceId) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  // Fallback extremo: nunca debería llegar aquí.
  return `${base}-${Date.now()}`;
}
