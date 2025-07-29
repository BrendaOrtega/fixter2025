import { cleanTextForTTS } from "fonema";
import { Effect } from "effect";

const testTexts = [
  "Este es un texto con **negritas** y *cursivas*.",
  "También tenemos __negritas__ y _cursivas_ con guiones bajos.",
  "Y texto ~~tachado~~ que debería limpiarse.",
  "# Título\n## Subtítulo\nTexto normal",
  "- Lista con viñetas\n- Segundo elemento",
  "1. Lista numerada\n2. Segundo elemento",
  "> Cita en blockquote",
  "[Enlace](https://example.com) y ![imagen](image.jpg)",
  "Código `inline` y **texto en negrita**.",
];

console.log("🧪 Probando limpieza de markdown...\n");

for (let i = 0; i < testTexts.length; i++) {
  const original = testTexts[i];
  console.log(`Prueba ${i + 1}:`);
  console.log(`Original: "${original}"`);

  const program = Effect.gen(function* () {
    const cleaned = yield* cleanTextForTTS(original);
    console.log(`Limpio:   "${cleaned}"`);
    console.log("---");
    return cleaned;
  });

  Effect.runSync(program);
}

console.log("✅ Pruebas de limpieza de markdown completadas!");
