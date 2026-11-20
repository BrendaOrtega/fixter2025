import { describe, expect, it } from "vitest";
import { clubCallRoom, isCallHost } from "../club-call.server";

const d = new Date("2026-11-20T18:00:00Z");

describe("sala principal por comunidad", () => {
  it("el club conserva su sala de siempre y cada comunidad tiene la suya", () => {
    expect(clubCallRoom(d)).toBe("fx-club-de-agentes-20261120");
    expect(clubCallRoom(d, "club-de-agentes")).toBe(clubCallRoom(d));
    expect(clubCallRoom(d, "google-review")).toBe("fx-google-review-20261120");
    // Todo nombre empieza con `fx-`, el prefijo que exige la caja.
    expect(clubCallRoom(d, "Otra Comunidad!")).toBe("fx-otracomunidad-20261120");
  });
  it("modera el dueño de la comunidad o un correo de casa, no cualquier otro", () => {
    delete process.env.CLUB_CALL_HOST_EMAILS;
    const community = { ownerId: "u1" };
    expect(isCallHost({ id: "u1", email: "anfitrion@cliente.mx" }, community)).toBe(true);
    expect(isCallHost({ id: "u2", email: "fixtergeek@gmail.com" }, community)).toBe(true);
    expect(isCallHost({ id: "u3", email: "miembro@cliente.mx" }, community)).toBe(false);
  });
});
