import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const body = `![Server apagado](https://placehold.co/1200x630/0a0a0a/6366f1?text=Fable+5+Apagado)

El 9 de junio de 2026 Anthropic lanzó Fable 5. Lo presentó como "el modelo más capaz que jamás hayamos liberado al público": clase Mythos, coding state-of-the-art, disponible para cualquiera. En horas, la comunidad descubrió que el modelo **degradaba silenciosamente** sus respuestas para quien investigara IA competidora. Un párrafo enterrado en la página 200+ del system card. Backlash inmediato. Anthropic pidió disculpas, admitió "wrong tradeoff", revirtió la política. El daño está hecho. Confianza minada.

El 12 de junio, a las 5:21 PM, el Departamento de Comercio de Estados Unidos emitió una directiva de emergencia: prohibido el acceso a Fable 5 y Mythos 5 para cualquier *foreign national*, dentro o fuera del país. Anthropic no podía verificar nacionalidades en tiempo real. Apagó todo. Global.

---

## Lo que esto demuestra

Cuando tu herramienta de coding corre en servidores ajenos, su existencia depende de factores que no controlas. Un memorándum en Washington y tu stack de desarrollo se apaga. No importa si estás en México, Berlín o Bangalore.

La comunidad tech lleva 18 meses moviéndose hacia modelos abiertos. DeepSeek, Mistral, Arcee, Llama. Por anti-lock-in, por costo, por soberanía. Fable 5 aceleró una migración que ya estaba en marcha.

![DeepSeek V4 Pro benchmarks](https://placehold.co/1200x630/0a0a0a/22c55e?text=DeepSeek+V4+Pro+Benchmarks)

---

## DeepSeek V4 Pro está listo. Pero necesita el runtime correcto.

El 24 de abril — tres semanas antes de Fable 5 — DeepSeek lanzó V4 Pro: 1.6 billones de parámetros (49 mil millones activos por token), 1 millón de tokens de contexto, 80.6% en SWE-bench Verified. A 0.2 puntos de Claude Opus 4.7. Pesos abiertos, licencia MIT. Precio permanente desde mayo: $0.435 por millón de tokens de input, $0.87 de output. Compite en coding con Opus 4.7, cuesta siete veces menos, y ningún gobierno puede apagarlo. Corre en Hugging Face, en tu servidor, en tu laptop.

Pero hay un problema que casi nadie está discutiendo: **casi ningún agente de coding soporta correctamente a DeepSeek V4 Pro.**

El modelo tiene una arquitectura de razonamiento distinta a la de Anthropic y OpenAI. Emite *thinking tokens* — bloques de razonamiento interno — antes y entre tool calls. Estos tokens son invisibles para el usuario pero consumen contexto y se reenvían en cada turno del loop de agente. Los harnesses existentes (Claude Code, Cline, OpenCode, Aider) se construyeron para formatos de respuesta planos: texto + tool_use blocks. Con DeepSeek V4 Pro pasan cuatro cosas:

**Los thinking tokens rompen los parsers de tool calls.** El harness no sabe distinguir el bloque de razonamiento del bloque de acción. En el mejor caso, ignora el thinking y pierde calidad de razonamiento. En el peor, corrompe el loop.

**El contexto se desborda sin avisar.** Los thinking tokens no se contabilizan en el tracking de tokens del agente, pero sí consumen ventana. A las diez iteraciones el modelo está operando en las zonas menos confiables de su contexto, y el harness no te lo dice.

**El prefix caching colapsa.** DeepSeek cachea prefijos estables con ~90% de descuento. Pero cada turno que reenvía thinking tokens del turno anterior muta el prefijo. El caché se invalida. El costo se dispara y la latencia también.

**No hay control de esfuerzo de razonamiento.** DeepSeek V4 Pro expone un parámetro \`reasoning_effort\` que permite decidir cuánto piensa el modelo. Los harnesses genéricos no lo exponen. El resultado: el modelo gasta tokens razonando tareas triviales, o no razona suficiente en las complejas.

El modelo es bueno. El harness no sabe usarlo.

![GhostyCode terminal](https://placehold.co/1200x630/0a0a0a/f59e0b?text=GhostyCode+Terminal)

### GhostyCode está escrito para este modelo

GhostyCode es un agente de terminal en Rust diseñado alrededor de DeepSeek V4 Pro. No es un adaptador genérico que soporta catorce modelos — entiende el formato de respuesta de este modelo en específico: thinking tokens, tool calls intercalados, \`reasoning_effort\`.

**Constitución que gobierna el razonamiento.** GhostyCode opera bajo una constitución de siete artículos. El quinto es verificación obligatoria: después de cada tool call, lee el resultado y confirma antes de continuar. Pero el sistema completo define *cuándo* pensar: profundo para arquitectura y debugging, ligero para generación de código, nulo para lecturas y búsquedas simples. El modelo no desperdicia tokens ni se queda corto.

**1M de contexto administrado.** GhostyCode contabiliza los thinking tokens en el tracking real de contexto. Sabe cuándo está al 60% y sugiere compactación. El prefix caching sobrevive entre turns porque el system prompt tiene capas estáticas al inicio.

**Agentes en paralelo.** Tareas independientes se despachan simultáneamente en sub-agentes que heredan la misma disciplina de verificación. Seis archivos que entender, seis agentes, un solo turno.

**Tool-use nativo.** Shell, git, grep, file I/O, web search, tests. Todo desde el runtime.

**Soberanía real.** Corre en tu terminal. El modelo tiene pesos abiertos — puedes usar la API de DeepSeek o correrlo localmente. El runtime es open-source. Nadie te lo apaga. El Departamento de Comercio no tiene jurisdicción sobre lo que ejecutas en tu máquina.

Instalar GhostyCode toma minutos. Configuras tu API key de DeepSeek y en cinco minutos estás programando con verificación automática, agentes en paralelo y 1M de contexto. El workflow es familiar. La diferencia es quién decide si mañana sigue funcionando.

![GhostyCode + DeepSeek](https://placehold.co/1200x630/0a0a0a/ec4899?text=GhostyCode+%2B+DeepSeek+V4+Pro)

---

## Tu operación merece más que tres días

El 12 de junio Fable 5 dejó de existir. No falló técnicamente. No era inseguro en manos de sus usuarios. Lo apagaron porque Anthropic no podía garantizar la nacionalidad de cada persona usándolo. Y como no podía distinguir, lo mató para todos. Tres días después de haberlo presentado como el futuro.

DeepSeek V4 Pro salió en abril. GhostyCode ya lo corre — y lo corre como ningún otro agente puede. Ambos están a un \`git clone\` de distancia.

Sin permisos. Sin fecha de expiración.
`;

async function main() {
  // Update existing post
  const existing = await db.post.findUnique({
    where: { slug: "ghostycode-deepseek-v4-pro-fable-5" },
  });

  if (existing) {
    const post = await db.post.update({
      where: { id: existing.id },
      data: {
        title: "GhostyCode + DeepSeek V4 Pro: tu stack, tus reglas",
        body,
        contentFormat: "markdown",
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        mainTag: "ai",
        tags: ["ai", "claude", "agentes", "deepseek", "opinion"],
        metaImage: "https://placehold.co/1200x630/0a0a0a/6366f1?text=GhostyCode+%2B+DeepSeek+V4+Pro",
        published: true,
      },
    });
    console.log(`Post updated: /blog/${post.slug}`);
    console.log(`ID: ${post.id}`);
  } else {
    console.log("Post not found");
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
