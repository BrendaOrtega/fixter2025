// Progreso del Mundo en la base (lo único del Mundo que se escribe en Mongo). Un documento por miembro,
// club y cartucho. Se escribe por lotes que manda el motor cada ~6 s, con freno por persona.
import { db } from "~/.server/db";
import { getCartridge } from "~/components/community/v2/world/cartridges";
import type { Progress } from "~/components/community/v2/world/cartridge";
import { emptyProgress, mergeProgress, readProgress } from "~/components/community/v2/world/progress";

export const SAVE_EVERY_MS = 4000;
const lastSave = new Map<string, number>();

const where = (communityId: string, userId: string, cartridgeId: string) => ({ communityId, userId, cartridgeId });

export async function loadProgress(communityId: string, userId: string, cartridgeId: string): Promise<Progress> {
  if (!getCartridge(cartridgeId).structure.progress) return emptyProgress();
  const row = await db.worldProgress.findFirst({ where: where(communityId, userId, cartridgeId), select: { data: true } });
  return row ? readProgress(row.data) : emptyProgress();
}

export async function saveProgress(communityId: string, userId: string, cartridgeId: string, batch: unknown, now = Date.now()): Promise<Progress | null> {
  const structure = getCartridge(cartridgeId).structure;
  if (!structure.progress) return null;
  const key = `${communityId}:${userId}:${cartridgeId}`;
  if (now - (lastSave.get(key) ?? -Infinity) < SAVE_EVERY_MS) return null;
  lastSave.set(key, now);
  if (lastSave.size > 5000) lastSave.clear();
  const row = await db.worldProgress.findFirst({ where: where(communityId, userId, cartridgeId), select: { id: true, data: true } });
  const next = mergeProgress(structure, row ? readProgress(row.data) : emptyProgress(), batch);
  if (row) await db.worldProgress.update({ where: { id: row.id }, data: { data: next } });
  else await db.worldProgress.create({ data: { ...where(communityId, userId, cartridgeId), data: next } });
  return next;
}
