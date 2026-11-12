import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { FIXTER_SKIN, signCallTicket } from "../services/club-call.server";

// Réplica de `verifyTicket` de la caja (sandbox-host/templates/fixter-call-svc/server.mjs):
// si esta verificación pasa, la caja acepta el ticket.
function verifyLikeBox(raw: string, secret: string, nowS: number) {
  const [body, sig] = raw.split(".");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (sig !== expected) throw new Error("firma inválida");
  const claims = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
  if (!claims.exp || claims.exp < nowS) throw new Error("ticket vencido");
  return claims;
}

const SECRET = "test-secret";
const base = { room: "fx-club-de-agentes-2026-11-12", name: "Ana", role: "speaker" as const, mode: "webinar" as const, title: "Club · Llamada" };
const sign = (extra = {}, nowMs = 1_800_000_000_000) =>
  new URL(signCallTicket({ ...base, ...extra }, { secret: SECRET, baseUrl: "https://llamadas.example.com/", nowMs }));

describe("signCallTicket", () => {
  it("arma la URL de la sala y un ticket que la caja acepta", () => {
    const u = sign({ skin: FIXTER_SKIN });
    expect(u.origin + u.pathname).toBe("https://llamadas.example.com/room");
    expect(u.searchParams.get("room")).toBe(base.room);
    const c = verifyLikeBox(u.searchParams.get("ticket")!, SECRET, 1_800_000_000);
    expect(c).toMatchObject({ ...base, skin: { preset: "fixter" } });
    expect(c.exp).toBe(1_800_000_120);
    expect(c.jti).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sin skin no manda el claim, y cada ticket trae su propio jti", () => {
    const a = verifyLikeBox(sign().searchParams.get("ticket")!, SECRET, 1_800_000_000);
    const b = verifyLikeBox(sign().searchParams.get("ticket")!, SECRET, 1_800_000_000);
    expect("skin" in a).toBe(false);
    expect(a.jti).not.toBe(b.jti);
  });

  it("otro secreto o un ticket vencido no pasan", () => {
    const t = sign().searchParams.get("ticket")!;
    expect(() => verifyLikeBox(t, "otro", 1_800_000_000)).toThrow("firma inválida");
    expect(() => verifyLikeBox(t, SECRET, 1_800_000_121)).toThrow("ticket vencido");
  });
});
