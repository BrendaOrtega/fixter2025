import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const courseDescription = `El 12 de junio de 2026, a las 5:21 PM, Fable 5 dejó de existir. No falló. No era inseguro. Lo apagó una directiva del Departamento de Comercio de Estados Unidos porque Anthropic no podía verificar la nacionalidad de cada persona usándolo. Tres días antes lo habían presentado como "el modelo más capaz jamás liberado al público".

Una herramienta de coding que desaparece de un día para otro no es una herramienta. Es una suscripción a la incertidumbre.

---

## El problema no es el modelo. Es dónde corre.

Cuando tu agente de coding vive en servidores ajenos, su existencia depende de factores que no controlas. Un memorándum en Washington, un cambio de términos de servicio, una adquisición, un pivot corporativo. Cualquiera de estas cosas puede apagar tu stack de desarrollo. No importa si estás en México, Berlín o Bangalore.

La comunidad tech lleva 18 meses moviéndose hacia modelos abiertos — DeepSeek, Mistral, Llama, Arcee. Por anti-lock-in, por costo, por soberanía. Pero migrar el modelo no basta. Necesitas migrar el runtime.

**GhostyCode resuelve las dos cosas.**

---

## ¿Qué es GhostyCode?

GhostyCode es un agente de terminal open-source escrito en Rust, diseñado desde cero para DeepSeek V4 Pro. No es un adaptador genérico que soporta catorce modelos — entiende el formato específico de este modelo: thinking tokens, tool calls intercalados, razonamiento multi-turno.

Piensa en GhostyCode como un compañero de coding que:

- **Vive en tu terminal.** No en un datacenter que no controlas.
- **Verifica todo.** Nunca asume que un tool call funcionó — lee el resultado y confirma.
- **Trabaja en paralelo.** Seis archivos que entender, seis agentes simultáneos.
- **Administra 1M de contexto.** Sabe cuándo estás al 60% y sugiere compactar.
- **Optimiza el caché.** Prefix caching real — los turns estables cuestan 10× menos.

Y todo corre bajo una **Constitución de siete artículos** que gobierna cuándo y cómo razona el modelo. No es un prompt bonito. Es un sistema de verificación.

---

## Instalación

GhostyCode se instala con npm. Un comando:

\`\`\`bash
npm install -g ghostycode
\`\`\`

Eso pone el binario \`ghosty\` en tu PATH. Para verificar:

\`\`\`bash
ghosty --version
\`\`\`

La instalación crea un directorio \`~/.ghosty/\` donde vive toda la configuración.

---

## Configuración

Necesitas una API key de DeepSeek. Puedes obtenerla en [platform.deepseek.com](https://platform.deepseek.com).

El archivo de configuración está en \`~/.ghosty/config.toml\`. GhostyCode lo crea automáticamente la primera vez que lo ejecutas, pero también puedes crearlo manualmente:

\`\`\`toml
[api]
provider = "deepseek"
key = "sk-tu-api-key-aqui"
model = "deepseek-v4-pro"

[ui]
theme = "dark"
\`\`\`

También puedes configurar la key vía variable de entorno:

\`\`\`bash
export DEEPSEEK_API_KEY="sk-tu-api-key-aqui"
\`\`\`

---

## Tu primer proyecto con GhostyCode

Abre una terminal en cualquier proyecto y ejecuta:

\`\`\`bash
ghosty
\`\`\`

GhostyCode lee el contexto del directorio — \`CLAUDE.md\`, \`AGENTS.md\`, \`.gitignore\`, el árbol de archivos — y está listo para trabajar. No necesitas indexar nada. No necesitas un workspace configurado. Solo un proyecto y una pregunta.

Prueba con algo simple:

> *"Explícame la estructura de este proyecto."*

GhostyCode va a leer los archivos clave, entender las relaciones entre módulos y darte un mapa claro. Sin alucinaciones — cada afirmación está respaldada por un tool call que verificó el archivo.

Ahora algo más útil:

> *"Agrega un endpoint de health check a esta API."*

GhostyCode lee el router, encuentra dónde van los endpoints, escribe el código, y — esto es lo importante — **verifica que compile** antes de decirte que está listo.

---

## El workflow día a día

Así se ve una sesión típica con GhostyCode:

1. **Abrís ghosty en tu proyecto.** Lee el contexto automáticamente.
2. **Describís lo que querés hacer.** En español, en inglés, como te salga.
3. **GhostyCode hace tool calls.** Lee archivos, busca patrones, entiende la codebase.
4. **Escribe cambios.** Con diffs que podés revisar antes de aplicar.
5. **Verifica.** Corre tests, revisa que compile, confirma que todo funcione.
6. **Itera.** Ajustás, refinás, seguís.

No es un chat. Es un loop de trabajo con verificación en cada paso.

---

## ¿Por qué GhostyCode y no otro agente?

Casi ningún agente de coding soporta correctamente DeepSeek V4 Pro. El modelo emite *thinking tokens* — bloques de razonamiento interno — que los harnesses genéricos no saben interpretar. El resultado:

- **Parsers rotos.** El agente confunde el razonamiento con acciones.
- **Contexto desbordado.** Los thinking tokens no se contabilizan en el tracking.
- **Prefix caching colapsado.** Cada turno muta el prefijo y el caché se invalida.
- **Sin control de esfuerzo.** El modelo gasta tokens en trivialidades o no piensa suficiente en lo complejo.

GhostyCode está escrito para este modelo. Entiende su formato de respuesta, contabiliza sus thinking tokens, respeta su prefix caching y expone el control de esfuerzo de razonamiento.

---

## Lo que viene en este curso

Esta fue la primera lección: instalación, configuración y primer contacto. En las siguientes entradas vamos a cubrir:

- **La Constitución de GhostyCode.** Los 7 artículos que gobiernan el comportamiento del agente.
- **Agentes en paralelo.** Cómo despachar trabajo simultáneo y coordinar resultados.
- **Manejo de contexto.** Cuándo compactar, cómo mantener el prefix cache vivo.
- **Custom instructions.** Tu propio CLAUDE.md para GhostyCode.
- **Modelos locales.** Cómo correr DeepSeek (o Llama, o Mistral) en tu máquina sin depender de ninguna API.

Si querés ir adelantando, el repo está en [github.com/blissito/ghostycode](https://github.com/blissito/ghostycode). El README tiene la documentación completa.

Instalalo. Probalo. La terminal es tuya.
`;

async function main() {
  console.log("👻 Creando curso: GhostyCode\n");

  // 1. Crear videos placeholder para las lecciones planeadas
  const plannedLessons = [
    { title: "¿Qué es GhostyCode? Instalación y configuración", index: 0, accessLevel: "subscriber" as const },
    { title: "La Constitución de GhostyCode — Los 7 artículos", index: 1, accessLevel: "subscriber" as const },
    { title: "Agentes en paralelo — Trabajo simultáneo", index: 2, accessLevel: "subscriber" as const },
    { title: "Manejo de contexto y prefix caching", index: 3, accessLevel: "subscriber" as const },
    { title: "Custom instructions y configuración avanzada", index: 4, accessLevel: "subscriber" as const },
    { title: "Modelos locales y soberanía digital", index: 5, accessLevel: "subscriber" as const },
  ];

  console.log("📹 Creando lecciones planeadas...");
  const videoIds: string[] = [];

  for (const lesson of plannedLessons) {
    const slug = "ghostycode-" + lesson.title
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

    // La primera lección incluye el markdown completo
    const videoDescription = lesson.index === 0 ? courseDescription : "Video próximamente";

    const video = await prisma.video.upsert({
      where: { slug },
      update: {
        title: lesson.title,
        index: lesson.index,
        isPublic: false,
        accessLevel: lesson.accessLevel ?? "paid",
        authorName: "Héctorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        description: videoDescription,
      },
      create: {
        slug,
        title: lesson.title,
        index: lesson.index,
        isPublic: false,
        accessLevel: lesson.accessLevel ?? "paid",
        authorName: "Héctorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        description: videoDescription,
      },
    });

    videoIds.push(video.id);
    console.log(`  ✅ "${lesson.title}" → ${video.id}`);
  }

  // 2. Crear o actualizar el curso
  const course = await prisma.course.upsert({
    where: { slug: "ghostycode" },
    update: {
      title: "GhostyCode: Programa con DeepSeek V4 Pro",
      description: courseDescription,
      summary:
        "Aprende a usar GhostyCode, el agente de terminal open-source para DeepSeek V4 Pro. Instalación, configuración y workflow diario.",
      icon: "https://easybits-public.fly.storage.tigris.dev/699f35cbc8ad86037eda62b1/te3",
      level: "Intermedio",
      duration: "6 lecciones",
      isFree: true,
      basePrice: 0,
      published: true,
      tipo: null,
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      videoIds,
    },
    create: {
      slug: "ghostycode",
      title: "GhostyCode: Programa con DeepSeek V4 Pro",
      description: courseDescription,
      summary:
        "Aprende a usar GhostyCode, el agente de terminal open-source para DeepSeek V4 Pro. Instalación, configuración y workflow diario.",
      icon: "https://easybits-public.fly.storage.tigris.dev/699f35cbc8ad86037eda62b1/te3",
      level: "Intermedio",
      duration: "6 lecciones",
      isFree: true,
      basePrice: 0,
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      videoIds,
    },
  });

  console.log(`✅ Curso creado: ${course.id}`);
  console.log(`   Slug: ${course.slug}`);
  console.log(`   URL: https://www.fixtergeek.com/cursos/${course.slug}/detalle`);

  // 3. Vincular videos al curso
  console.log("\n🔗 Vinculando lecciones al curso...");
  for (const vid of videoIds) {
    const v = await prisma.video.findUnique({ where: { id: vid } });
    const existingCourseIds = v?.courseIds || [];
    if (!existingCourseIds.includes(course.id)) {
      await prisma.video.update({
        where: { id: vid },
        data: { courseIds: [...existingCourseIds, course.id] },
      });
    }
  }
  console.log("  ✅ Lecciones vinculadas");

  const totalCourses = await prisma.course.count();
  console.log(`\n📊 Total cursos en plataforma: ${totalCourses}`);

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error("Error:", error);
    prisma.$disconnect();
    process.exit(1);
  });