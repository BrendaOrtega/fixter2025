// Validación de un cartucho (como los recursos de Godot con propiedades exportadas: el editor no deja
// guardar uno inválido). Los tipos de TypeScript cuidan la forma; esto cuida la coherencia, que es lo que
// separa «compila» de «enchufa y funciona». Puro: lo corren los tests y, en desarrollo, el motor al montar.
import { SHARED_MAX_KEYS, type Cartridge, type Point, type Shape } from "./cartridge";

export function validateStructure(c: Pick<Cartridge, "structure" | "copy">): string[] {
  const S = c.structure, out: string[] = [];
  const { w, h } = S.size;
  const inMap = (p: Point) => p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h;
  if (!(w > 0 && h > 0)) out.push("size: el mapa necesita ancho y alto positivos");
  if (!inMap(S.spawn)) out.push("spawn: el punto de aparición queda fuera del mapa");
  if (S.movement.constrain) {
    const q = S.movement.constrain(S.spawn, S.spawn, new Set(), true);
    if (Math.hypot(q.x - S.spawn.x, q.y - S.spawn.y) > 1) out.push("spawn: `movement.constrain` no deja estar en el punto de aparición");
  }

  // Lugares y mesas.
  const ids = new Set<string>();
  for (const p of S.places) {
    if (ids.has(p.id)) out.push(`places: id repetido «${p.id}»`);
    ids.add(p.id);
    if (!inMap(p)) out.push(`places.${p.id}: el centro queda fuera del mapa`);
    if (!(p.r > 0)) out.push(`places.${p.id}: el radio debe ser positivo`);
    if (p.gravity && p.gravity.radius <= p.r) out.push(`places.${p.id}: gravity.radius debe ser mayor que r`);
    if (p.target === "table") {
      if (p.table === null || !S.tables[p.table]) out.push(`places.${p.id}: lleva a una mesa que no existe (${p.table})`);
    } else if (p.table !== null) out.push(`places.${p.id}: sólo un lugar de mesa lleva índice de mesa`);
  }
  S.tables.forEach((t, i) => {
    if (!S.places.some((p) => p.target === "table" && p.table === i)) out.push(`tables[${i}]: no hay un lugar que lleve a esta mesa`);
    if (!t.seats.length) out.push(`tables[${i}]: sin asientos`);
    t.seats.forEach((s, k) => { if (!inMap(s)) out.push(`tables[${i}].seats[${k}]: fuera del mapa`); });
  });
  if (S.tables.length && !S.tableZone) out.push("tableZone: hay mesas pero no zona de mesas");

  // Robots: su ruta empieza dentro del mapa.
  for (const b of S.bots) if (!inMap(b.at(0))) out.push(`bots.${b.id}: su ruta sale del mapa`);

  // Aspecto: lo inicial y el respaldo existen en las listas.
  const L = S.looks;
  for (const [name, look] of [["initial", L.initial], ["fallback", L.fallback]] as const) {
    if (!L.models.some((m) => m.id === look.model)) out.push(`looks.${name}.model «${look.model}» no está en models`);
    if (!L.colors.some((m) => m.id === look.color)) out.push(`looks.${name}.color «${look.color}» no está en colors`);
    if (!L.pilots.some((m) => m.id === look.pilot)) out.push(`looks.${name}.pilot «${look.pilot}» no está en pilots`);
  }

  // Juego y amenaza.
  const G = S.combat;
  if (G) {
    if (!G.shots[G.basic.shot]) out.push(`combat.basic.shot «${G.basic.shot}» no está en shots`);
    if (G.pickups.count > 0 && !G.weapons.length) out.push("combat: hay aparatos flotando pero ninguna arma");
    for (const wpn of G.weapons) if ("shot" in wpn && !G.shots[wpn.shot]) out.push(`combat.weapons.${wpn.id}: su disparo «${wpn.shot}» no está en shots`);
  }
  if (S.threat) {
    if (!G) out.push("threat: una amenaza necesita `combat`");
    if (!c.copy.threat) out.push("threat: faltan los textos `copy.threat`");
    else if (S.threat.needsWeapon && (!c.copy.threat.arm || !c.copy.threat.unarmed)) out.push("threat.needsWeapon: faltan `copy.threat.arm` y `copy.threat.unarmed`");
  }

  // Estado compartido.
  const keys = Object.entries(S.shared ?? {});
  if (keys.length > SHARED_MAX_KEYS) out.push(`shared: a lo más ${SHARED_MAX_KEYS} llaves`);
  for (const [k, d] of keys) {
    if (d.type === "number" && !(d.min <= d.max)) out.push(`shared.${k}: min debe ser ≤ max`);
    if (d.type !== "number" && "merge" in d) out.push(`shared.${k}: merge sólo aplica a números`);
  }

  // Áreas.
  const aids = new Set<string>();
  const okShape = (s: Shape) => (s.kind === "circle" ? s.r > 0 : s.w > 0 && s.h > 0);
  for (const a of S.areas ?? []) {
    if (aids.has(a.id)) out.push(`areas: id repetido «${a.id}»`);
    aids.add(a.id);
    if (!okShape(a.shape)) out.push(`areas.${a.id}: forma sin tamaño`);
  }
  return out;
}
