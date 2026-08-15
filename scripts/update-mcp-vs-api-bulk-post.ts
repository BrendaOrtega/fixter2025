import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const body = `# Cuándo NO usar tu MCP (aunque lo tengas a la mano)

Tengo un agente en producción que se llama Ghosty. Atiende WhatsApp, cotiza, y desde hace rato tiene un MCP de base de datos conectado. Esta tarde le pedí algo aparentemente simple: *"toma este Excel de 1,259 clientes y pásalos a la DB del catálogo, en una colección nueva".*

26 minutos después seguía pensando. Cero filas insertadas.

## Lo que estaba haciendo

![El agente atorado en un loop](https://images.pexels.com/photos/8294846/pexels-photo-8294846.jpeg)

Ghosty armó un plan razonable: dividir los 1,259 registros en 26 batches de ~50 filas, prepararlos como JSON en \`/tmp\`, y "ejecutarlos en paralelo" llamando al MCP \`db_query\` con cada batch.

Cada llamada al MCP se ve más o menos así desde su perspectiva:

\`\`\`
tool_use: db_query(dbId="...", sql="INSERT INTO clientes (...) VALUES (?, ?, ?, ...)", args=[28KB de JSON])
tool_result: { "affected_rows": 50 }
\`\`\`

Inocente, ¿no? El problema es que **cada uno de esos \`tool_use\` y \`tool_result\` vive dentro del contexto del agente**. 28 KB de args × 26 batches = ~728 KB solo de argumentos, sin contar los resultados, sin contar la narrativa que el agente escribe entre llamada y llamada para "decidir qué sigue".

Resultado: el autocompact de Claude se dispara antes de terminar el primer round. Se pierde el hilo. El agente reinicia, regenera los \`/tmp/batch_*.json\`, vuelve a intentar, vuelve a compactarse. Loop infinito. En 26 minutos pasó tres veces por autocompact y no escribió una sola fila a la DB.

## La regla

![La decisión: razonar o ejecutar](https://images.pexels.com/photos/6192326/pexels-photo-6192326.jpeg)

> Si la respuesta del tool no necesita razonamiento entre cada call, no debe pasar por el contexto del agente.

El MCP es buenísimo para queries puntuales:
- "¿Cuántos productos hay activos?"
- "Dame los 5 clientes que más han comprado este mes."
- "Inserta este pedido nuevo."

Esos casos necesitan que el agente lea la respuesta, razone, y decida qué hacer con ella. El contexto se gana porque hay una decisión que tomar.

Los **bulk ops** son lo opuesto: 1,259 inserts idénticos, sin decisiones intermedias. Hacerlos pasar uno por uno por el cerebro del agente es como pedirle a un cirujano que cuente los granos de arroz en una bolsa: técnicamente puede, pero estás pagando talento caro para una tarea de bucle.

## La alternativa

![Mover el bucle fuera del agente](https://images.pexels.com/photos/8566526/pexels-photo-8566526.jpeg)

El mismo MCP de EasyBits que Ghosty tiene conectado expone un endpoint HTTP por debajo. Lo correcto es:

\`\`\`bash
node /tmp/import_clientes.js
\`\`\`

Donde el script:
1. Lee el \`.xlsx\` desde disco.
2. Itera fila por fila.
3. Hace \`fetch\` directo a la API con el \`EASYBITS_API_KEY\` que ya está en el env del contenedor.
4. Imprime \`OK: 1259 filas\` al final.

¿Qué ve el agente?

\`\`\`
tool_use: Bash("node /tmp/import_clientes.js")
tool_result: "OK: 1259 filas"
\`\`\`

**Impacto en contexto: ~80 bytes.** Un solo \`tool_use\`. El bucle de 1,259 inserts vive en un proceso aparte que ni se entera de Claude.

## Generalizando

El MCP no es la herramienta del agente — es **una herramienta del agente**. La distinción importa cuando el costo es contexto, que es lo único que realmente escasea cuando armas flujos largos.

Mi regla mental para decidir dónde vive un bucle:

| Tipo de tarea | Dónde corre |
|---|---|
| Una decisión por respuesta | Adentro del agente (MCP) |
| Mismo patrón repetido N veces | En un script (Bash/Node) |
| Datos grandes que solo necesitas resumir | En un script que imprime el resumen |
| Pipeline con ramificaciones según resultados | Adentro del agente |

La heurística rápida: **si pudieras escribir el bucle como un \`for\` sin if's intermedios, no necesita al agente.**

## Lo que cambié en Ghosty

![La memoria que le dejé al agente](https://images.pexels.com/photos/8849295/pexels-photo-8849295.jpeg)

Le agregué tres bullets a su \`CLAUDE.md\` (la memoria persistente del agente para ese grupo):

\`\`\`
## Importación masiva (>100 filas)
- NO acumules el dataset en contexto. NO paralelices varios tool_use en un turno. Si lo haces, autocompact te borra mid-batch y reinicias en loop.
- Primera opción: UN script (Node/Bash) que lea el archivo en disco y hable directo con la API. Lo lanzas con un solo Bash, esperas "OK: N filas", listo. Cero turnos del agente en el bucle.
- Fallback (sin API directa): db_query MCP secuencial, 50 filas por turno, leyendo el chunk DESDE DISCO cada turno — jamás del contexto.
\`\`\`

Tres líneas. Le toma 80 tokens leerlas al boot, le ahorra varios cientos de miles cuando aplica.

Si te interesa ver cómo estos patrones se ven en vivo —agentes en producción, MCPs, contexto que se va y se viene— en el [canal de YouTube](https://www.youtube.com/@fixtergeek) subo los episodios donde se ve la cocina por dentro.

## Cierre

Cuando hablamos de "engineering" para agentes, casi siempre pensamos en prompts, herramientas, system messages. Pero la batalla real es por el contexto: qué entra, qué se queda afuera, qué pasa por un proceso paralelo.

El MCP te da acceso a una API. Eso no significa que el agente sea el lugar correcto para correrla.

Abrazo. Blissmo. 🤓

<!-- author-signature -->
`;

async function main() {
  const post = await db.post.update({
    where: { slug: "cuando-no-usar-tu-mcp" },
    data: { body },
  });
  console.log(`Post updated: /blog/${post.slug}`);
  console.log(`Public URL: https://www.fixtergeek.com/blog/${post.slug}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
