// Tipos mínimos de `ghosty3d.js`: copia sin cambios del Ghosty 3D oficial de los shorts
// (`videos/_shared/ghosty-3d/ghosty3d.js`, sacado del vector oficial; no se repinta ni se redibuja).
import type * as THREE from "three";
export function makeGhosty3D(opts: { THREE: unknown; SVGLoader: unknown; url?: string; svg?: string | null }): THREE.Group;
