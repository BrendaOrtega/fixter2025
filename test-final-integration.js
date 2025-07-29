import { cleanTextForTTS } from "fonema";
import { Effect } from "effect";

const problematicText =
  "Este texto tiene **negritas** y *cursivas* que antes causaban problemas con asteriscos.";

console.log("🔧 Prueba final de integración...");
console.log("Texto original:", problematicText);

const program = Effect.gen(function* () {
  const cleaned = yield* cleanTextForTTS(problematicText);
  console.log("Texto limpio:", cleaned);

  // Verificar que no hay asteriscos
  if (cleaned.includes("*")) {
    console.log("❌ ERROR: Aún hay asteriscos en el texto limpio!");
    return false;
  } else {
    console.log("✅ ÉXITO: No hay asteriscos en el texto limpio!");
    return true;
  }
});

const success = Effect.runSync(program);

if (success) {
  console.log(
    "\n🎉 ¡Problema solucionado! Los asteriscos de markdown ya no aparecen en el TTS."
  );
  console.log(
    "📚 La documentación ha sido actualizada en el README de fonema."
  );
} else {
  console.log("\n❌ El problema persiste.");
}
