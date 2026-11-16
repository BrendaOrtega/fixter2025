import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/.server/db", () => ({ db: {} }));

import { facebookAuthorizeUrl, facebookState, signConnectState, signLiveEnvelope, verifyConnectState } from "../club-live.server";
import { createLiveVideo } from "~/.server/live/facebook-live";

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

describe("Facebook", () => {
  process.env.STREAM_KEYS_MASTER = "a".repeat(64);
  it("el state de Facebook lleva provider y sólo lo acepta facebookState", () => {
    const raw = signConnectState({ ...st, provider: "facebook" }, key);
    expect(verifyConnectState(raw, key, 1_000)?.provider).toBe("facebook");
    // Un state de YouTube (sin provider) no pasa por el callback de Facebook.
    expect(facebookState(signConnectState(st))).toBeNull();
  });
  it("la liga de Meta pide los permisos de transmisión y vuelve al callback propio", () => {
    process.env.FB_LIVE_APP_ID = "123";
    delete process.env.FB_LIVE_CONFIG_ID;
    const u = new URL(facebookAuthorizeUrl({ communityId: "c1", slug: "club", email: "a@b.mx" }));
    expect(u.host).toBe("www.facebook.com");
    expect(u.searchParams.get("scope")).toContain("publish_video");
    expect(u.searchParams.get("redirect_uri")).toContain("/comunidad/live/facebook/callback");
    expect(facebookState(u.searchParams.get("state"))).toMatchObject({ communityId: "c1", provider: "facebook" });
  });
  it("createLiveVideo devuelve la URL RTMPS con llave y la liga pública", async () => {
    const f = vi.fn(async (url: string | URL | Request) =>
      String(url).includes("live_videos")
        ? Response.json({ id: "9", secure_stream_url: "rtmps://live-api-s.facebook.com:443/rtmp/FB-9-key" })
        : Response.json({ permalink_url: "/p/videos/9" }),
    );
    const v = await createLiveVideo(f as unknown as typeof fetch, "tok", { pageId: "p", title: "Webinar" });
    expect(v.rtmpUrl).toBe("rtmps://live-api-s.facebook.com:443/rtmp/FB-9-key");
    expect(v.watchUrl).toBe("https://www.facebook.com/p/videos/9");
  });
});
