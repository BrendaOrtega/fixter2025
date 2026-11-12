import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/.server/db", () => ({ db: {} }));

import { signConnectState, signLiveEnvelope, verifyConnectState } from "../club-live.server";

const key = Buffer.from("k".repeat(32));
const st = { communityId: "c1", slug: "club-de-agentes", email: "a@b.mx", exp: 2_000 };

describe("state del OAuth de transmisión", () => {
  it("va y vuelve mientras no caduca", () => {
    expect(verifyConnectState(signConnectState(st, key), key, 1_000)).toEqual(st);
  });
  it("caducado, alterado, de otra llave o sin prefijo: null", () => {
    const raw = signConnectState(st, key);
    expect(verifyConnectState(raw, key, 3_000)).toBeNull();
    expect(verifyConnectState(raw.slice(0, -2) + "xx", key, 1_000)).toBeNull();
    expect(verifyConnectState(raw, Buffer.from("z".repeat(32)), 1_000)).toBeNull();
    expect(verifyConnectState(raw.replace("live.", ""), key, 1_000)).toBeNull();
    expect(verifyConnectState(null, key)).toBeNull();
  });
  it("un state del login (JSON en base64) no pasa por nuestro", () => {
    expect(verifyConnectState(btoa(JSON.stringify({ next: "/x" })), key)).toBeNull();
  });
});

describe("sobre firmado de destinos", () => {
  it("firma «live:» + cuerpo, con sala, vigencia de 120 s y jti", () => {
    const raw = signLiveEnvelope({ room: "fx-1", urls: ["rtmp://a.rtmp.youtube.com/live2/abc"] }, "s3cret", 10_000);
    const [body, sig] = raw.split(".");
    expect(sig).toBe(crypto.createHmac("sha256", "s3cret").update(`live:${body}`).digest("base64url"));
    // Un ticket de entrada firma el cuerpo solo: la misma cadena no vale como ticket.
    expect(sig).not.toBe(crypto.createHmac("sha256", "s3cret").update(body).digest("base64url"));
    const claims = JSON.parse(Buffer.from(body, "base64url").toString());
    expect(claims).toMatchObject({ room: "fx-1", urls: ["rtmp://a.rtmp.youtube.com/live2/abc"], exp: 130 });
    expect(claims.jti).toMatch(/^[0-9a-f-]{36}$/);
  });
});
