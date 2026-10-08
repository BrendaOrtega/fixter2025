/**
 * Qué URLs de video firma el servidor para el proxy HLS.
 *
 * Desde que el proxy exige token (ada51c4), todo lo que `hlsKeyFromUrl` deja en null
 * llega al cliente sin firmar y el proxy lo rechaza con 403. En la DB conviven URLs
 * completas de Tigris y LLAVES sueltas (`fixtergeek/videos/…`, `animaciones/…`); las dos
 * tienen que salir firmadas. Firebase no: su mp4 sigue su propio camino.
 */
import { describe, it, expect } from "vitest";
import { hlsKeyFromUrl, buildHlsProxyUrl } from "../hls";
import { validateHlsToken } from "~/utils/tokens";

const MASTER = "fixtergeek/videos/692e5ded/6933379c/hls/master.m3u8";
const CHUNKS = "animaciones/chunks/video-673b52243699b4f81b671523/720p.m3u8";

describe("hlsKeyFromUrl", () => {
  it("saca la llave de una URL de Tigris con bucket en la ruta", () => {
    expect(hlsKeyFromUrl(`https://t3.storage.dev/wild-bird-2039/${MASTER}`)).toBe(MASTER);
  });

  it("saca la llave de una URL con el bucket en el host", () => {
    expect(hlsKeyFromUrl(`https://wild-bird-2039.t3.storage.dev/${MASTER}`)).toBe(MASTER);
  });

  it("acepta llaves sueltas de cursos y de animaciones", () => {
    expect(hlsKeyFromUrl(MASTER)).toBe(MASTER);
    expect(hlsKeyFromUrl(CHUNKS)).toBe(CHUNKS);
    expect(hlsKeyFromUrl("animaciones/video-673b52243699b4f81b671523")).toBe(
      "animaciones/video-673b52243699b4f81b671523"
    );
  });

  it("quita el bucket si la llave suelta lo trae", () => {
    expect(hlsKeyFromUrl(`wild-bird-2039/${CHUNKS}`)).toBe(CHUNKS);
  });

  it("deja fuera Firebase, rutas internas, otros prefijos y vacío", () => {
    expect(
      hlsKeyFromUrl("https://firebasestorage.googleapis.com/v0/b/x.appspot.com/o/a.mp4?alt=media")
    ).toBeNull();
    expect(hlsKeyFromUrl("https://fly.storage.tigris.dev/wild-bird-2039/pong/paddles_1.mp4")).toBeNull();
    expect(hlsKeyFromUrl("/playlist/abc/index.m3u8")).toBeNull();
    expect(hlsKeyFromUrl("otra/cosa.m3u8")).toBeNull();
    expect(hlsKeyFromUrl("animaciones/../secreto.mp4")).toBeNull();
    expect(hlsKeyFromUrl("")).toBeNull();
  });
});

describe("buildHlsProxyUrl", () => {
  it("firma la llave suelta con un token que el proxy acepta", () => {
    const url = buildHlsProxyUrl(CHUNKS)!;
    const params = new URL(url, "https://www.fixtergeek.com").searchParams;
    expect(params.get("path")).toBe(CHUNKS);
    expect(validateHlsToken(params.get("t"), params.get("path")!).isValid).toBe(true);
  });

  it("el token de un video no sirve para otra carpeta", () => {
    const params = new URL(buildHlsProxyUrl(MASTER)!, "https://x").searchParams;
    expect(validateHlsToken(params.get("t"), CHUNKS).isValid).toBe(false);
  });

  it("devuelve null para Firebase", () => {
    expect(buildHlsProxyUrl("https://firebasestorage.googleapis.com/v0/b/x/o/a.mp4")).toBeNull();
  });
});
