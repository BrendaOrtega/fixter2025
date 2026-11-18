import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ db: { pageVisit: { create: vi.fn() } } }));
import { parseVisit } from "../page-visit.server";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";
const req = (url: string, headers: Record<string, string> = {}, method = "GET") =>
  new Request(url, { method, headers: { "user-agent": CHROME, ...headers } });

describe("parseVisit", () => {
  it("lee los UTM y el host del referrer", () => {
    const v = parseVisit(
      req("https://www.fixtergeek.com/anti-factory?utm_source=youtube&utm_medium=social&utm_campaign=x", {
        referer: "https://www.youtube.com/watch?v=abc",
      }),
    );
    expect(v).toEqual({
      path: "/anti-factory",
      utmSource: "youtube",
      utmMedium: "social",
      utmCampaign: "x",
      referrer: "www.youtube.com",
    });
  });

  it("sin UTM ni referrer guarda nulos; el referrer propio se ignora", () => {
    const v = parseVisit(req("https://www.fixtergeek.com/comunidad/club-de-agentes", { referer: "https://www.fixtergeek.com/" }));
    expect(v).toMatchObject({ utmSource: null, utmCampaign: null, referrer: null });
  });

  it("ignora bots, prefetch, navegación .data y no-GET", () => {
    expect(parseVisit(req("https://x.com/a", { "user-agent": "Googlebot/2.1" }))).toBeNull();
    expect(parseVisit(req("https://x.com/a", { "sec-purpose": "prefetch" }))).toBeNull();
    expect(parseVisit(req("https://x.com/a.data"))).toBeNull();
    expect(parseVisit(req("https://x.com/a", {}, "POST"))).toBeNull();
  });
});
