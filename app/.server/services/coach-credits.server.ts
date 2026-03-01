import { db } from "~/.server/db";

export const PACKAGES = {
  "5": { sessions: 5, priceCents: 14900, label: "5 sesiones · $149" },
  "15": { sessions: 15, priceCents: 39900, label: "15 sesiones · $399" },
  "50": { sessions: 50, priceCents: 99900, label: "50 sesiones · $999" },
} as const;

export type PackageKey = keyof typeof PACKAGES;

export async function getCredits(userId: string) {
  const credits = await db.sessionCredit.findMany({
    where: { userId },
  });

  let total = 0;
  let used = 0;
  for (const c of credits) {
    // Skip expired credits
    if (c.expiresAt && c.expiresAt < new Date()) continue;
    total += c.total;
    used += c.used;
  }

  return { remaining: total - used, total, used };
}

export async function hasCredits(userId: string): Promise<boolean> {
  const { remaining } = await getCredits(userId);
  return remaining > 0;
}

export async function consumeSession(userId: string): Promise<boolean> {
  // Find a credit pack with remaining sessions (oldest first)
  const credit = await db.sessionCredit.findFirst({
    where: {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  if (!credit || credit.used >= credit.total) return false;

  await db.sessionCredit.update({
    where: { id: credit.id },
    data: { used: { increment: 1 } },
  });

  return true;
}

export async function grantCredits(
  userId: string,
  packageKey: PackageKey,
  purchaseId?: string
) {
  const pkg = PACKAGES[packageKey];
  return db.sessionCredit.create({
    data: {
      userId,
      total: pkg.sessions,
      used: 0,
      package: packageKey,
      purchaseId: purchaseId || null,
    },
  });
}
