import { describe, expect, it } from "vitest";
import type { Cartridge } from "../cartridge";
import { CARTRIDGES } from "../cartridges";
import { validateStructure } from "../validate";

describe("validar cartuchos", () => {
  it.each(CARTRIDGES.map((c) => [c.id, c] as const))("%s está bien armado", (_, c) => {
    expect(validateStructure(c)).toEqual([]);
  });

  it("dice qué está mal en uno roto", () => {
    const base = CARTRIDGES[0];
    const broken: Cartridge = {
      ...base,
      copy: { ...base.copy, threat: undefined },
      structure: {
        ...base.structure,
        spawn: { x: -5, y: 10 },
        places: [...base.structure.places, { ...base.structure.places[0] }],
        looks: { ...base.structure.looks, initial: { model: "nave-fantasma", color: "mint", pilot: "astro" } },
        shared: { a: { type: "number", min: 5, max: 1 } },
        areas: [{ id: "x", shape: { kind: "circle", x: 0, y: 0, r: 0 } }],
      },
    };
    const issues = validateStructure(broken).join("\n");
    expect(issues).toMatch(/spawn: el punto de aparición queda fuera/);
    expect(issues).toMatch(/id repetido/);
    expect(issues).toMatch(/initial.model «nave-fantasma»/);
    expect(issues).toMatch(/copy.threat/);
    expect(issues).toMatch(/min debe ser ≤ max/);
    expect(issues).toMatch(/areas.x: forma sin tamaño/);
  });
});
