#!/usr/bin/env npx tsx
/**
 * Reporte de tráfico por UTM (SÓLO LECTURA) sobre el modelo PageVisit.
 *
 *   npx tsx --env-file=.env scripts/traffic-report.mts                  # últimas 24 h
 *   npx tsx --env-file=.env scripts/traffic-report.mts --since 6h       # horas (6h), días (7d) o minutos (30m)
 *
 * UTM por red (mismo utm_campaign en todas para comparar; cambia sólo utm_source y utm_medium):
 *   correo     ?utm_source=email&utm_medium=email&utm_campaign=<campaña>   (lo pone withUtm)
 *   YouTube    ?utm_source=youtube&utm_medium=social&utm_campaign=<campaña>
 *   TikTok     ?utm_source=tiktok&utm_medium=social&utm_campaign=<campaña>
 *   Instagram  ?utm_source=instagram&utm_medium=social&utm_campaign=<campaña>
 *   LinkedIn   ?utm_source=linkedin&utm_medium=social&utm_campaign=<campaña>
 *   Meta Ads   ?utm_source=facebook&utm_medium=paid&utm_campaign=<campaña>
 */
import { db } from "../app/.server/db";

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};

/** "24h" → 24 horas; "7d" → 7 días; "30m" → 30 minutos. */
export function parseSince(v: string): number {
  const m = /^(\d+)([mhd])$/.exec(v);
  if (!m) throw new Error(`--since inválido: "${v}" (usa 30m, 24h o 7d)`);
  return Number(m[1]) * { m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2] as "m" | "h" | "d"];
}

/** Cuenta por la llave que devuelva `key`, de mayor a menor. */
export function countBy<T>(rows: T[], key: (r: T) => string): [string, number][] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(key(r), (map.get(key(r)) ?? 0) + 1);
  return [...map].sort((a, b) => b[1] - a[1]);
}

const show = (title: string, rows: [string, number][]) => {
  console.log(`\n${title}`);
  if (!rows.length) return console.log("  (sin visitas)");
  for (const [k, n] of rows) console.log(`  ${String(n).padStart(6)}  ${k}`);
};

async function main() {
  const since = arg("--since") ?? "24h";
  const from = new Date(Date.now() - parseSince(since));
  const rows = await db.pageVisit.findMany({ where: { createdAt: { gte: from } } });
  console.log(`Visitas desde ${from.toISOString()} (--since ${since}): ${rows.length}`);

  show("Por path", countBy(rows, (r) => r.path));
  show("Por utm_campaign", countBy(rows, (r) => r.utmCampaign ?? "(sin utm)"));
  show("Por utm_source", countBy(rows, (r) => r.utmSource ?? "(sin utm)"));
  show("Por path / utm_campaign / utm_source", countBy(rows, (r) => `${r.path}  ${r.utmCampaign ?? "-"}  ${r.utmSource ?? "-"}`));
  show("Referrer sin utm", countBy(rows.filter((r) => !r.utmSource), (r) => r.referrer ?? "(directo)").slice(0, 10));
}

// Sólo corre al ejecutarse directo, no al importarse en tests.
if (process.argv[1]?.endsWith("traffic-report.mts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
