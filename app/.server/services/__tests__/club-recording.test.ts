import { describe, expect, it, vi } from "vitest";
vi.mock("~/.server/db", () => ({ db: {} }));
vi.mock("~/.server/tigrs", () => ({}));
vi.mock("~/.server/services/club-call.server", () => ({}));
import { nextStatus, recordingKey, UPLOAD_GIVE_UP_MS } from "../club-recording.server";

describe("grabaciones del club", () => {
  const endedAt = new Date("2026-11-11T02:00:00Z");
  it("la llave vive en la carpeta del club y del día", () => {
    expect(recordingKey("c1", "fx-club-de-agentes-20261110", 5)).toBe("club/c1/fx-club-de-agentes-20261110-5.mp4");
  });
  it("uploading pasa a ready cuando el MP4 ya está en el bucket", () => {
    expect(nextStatus({ status: "uploading", endedAt }, true)).toBe("ready");
  });
  it("sigue uploading dentro del plazo y falla después", () => {
    const t = endedAt.getTime();
    expect(nextStatus({ status: "uploading", endedAt }, false, t + 60_000)).toBe("uploading");
    expect(nextStatus({ status: "uploading", endedAt }, false, t + UPLOAD_GIVE_UP_MS + 1)).toBe("failed");
  });
  it("ready no se toca", () => {
    expect(nextStatus({ status: "ready", endedAt }, false)).toBe("ready");
  });
});
