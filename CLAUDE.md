# FixterGeek

React Router v7 (NUNCA Remix ni imports de remix) sobre Vite, MongoDB con Prisma, Tailwind CSS, Stripe, Amazon SES, Motion (motion/react), deploy en Fly.io con Docker (HOST=0.0.0.0, PORT=3000). **PROHIBIDO ejecutar `prisma db push --force-reset`, `prisma migrate reset`, `db.dropDatabase()` o `db.collection.drop()`; ante conflictos de Prisma, investigar y preguntar, NUNCA usar `--force-reset` ni `--accept-data-loss`.** Rutas en `app/routes.ts`, utilidades backend en archivos `.server.tsx`, preferir componentes existentes sobre crear nuevos. Posts del blog: **ser creativo y versátil con la estructura — NO forzar el molde Problema/Solución/Resultado/Conclusión.** Elegir la forma que mejor sirva al contenido: ensayo, hook + mecanismo + ejemplos + cierre, narrativa cronológica, dialogada, lista comentada, manifiesto, etc. El molde caso-de-estudio queda disponible solo cuando el post realmente narra "tuvimos X problema y así lo resolvimos"; en posts conceptuales, explicativos, de opinión o guías prácticas, ese molde se siente artificial y debilita el texto. Reglas que SÍ se mantienen siempre: storytelling con arco narrativo, NO listas de tips secas, NUNCA inventar anécdotas/amigos ficticios/aventuras falsas (si no hay historia real, usar el tema mismo como narrativa), incluir datos duros y cifras cuando existan, citas textuales destacadas si hay protagonistas, separar secciones visualmente, 4 imágenes o más en posts nuevos, NUNCA usar clichés retóricos de fórmula "X fue el detonante, Y fue el mecanismo", "no es X, es Y", "X no cambió A, cambió B" ni ninguna variante de estructura simétrica de contraste — si el contraste existe en los hechos, dejarlo respirar sin subrayarlo con muletillas. Tono: español mexicano profesional e internacional (NUNCA voseo argentino — nada de "tenés", "querés", "dejá", "pensalo"; usar "tienes", "quieres", "deja", "piénsalo"), directo y cercano sin ser informal en exceso, puede usar "tú" o formas impersonales. Firma oficial "Abrazo. Blissmo. 🤓" (solo para Héctorbliss), incluir CTA al canal de YouTube en transiciones naturales. Libros: leer prólogo primero, ejemplos en español. AI SDK v6: usar `DefaultChatTransport`, `sendMessage({ text })`, `message.parts`, `status` (no `isLoading`). Contacto: brenda@fixter.org.

## Shorts (verticales de webinars y cursos)

**Código en inglés, comentarios en español** — como en todo el proyecto. Los identificadores en
español están prohibidos, incluidos los de scripts de video.

**Estructura fija**: intro (4 s) → clip con subtítulos → outro (6 s), 1080×1920, y cama musical de
fondo agachada bajo la voz. Nunca cortes secos ni crossfades: el fundido es la salida fácil y se
siente prestado de cualquier otro video. La transición sale del lenguaje de la pieza — en estos
shorts, la malla del fondo se cierra en cascada diagonal, tapa el corte y se abre del otro lado.
El sonido dura lo que dura el movimiento: riser mientras cierra, golpe grave en el impacto; un
whoosh corto contra un barrido de un segundo se siente adelantado.

**Nunca un fotograma negro ni vacío, en ningún punto del video** — ni de portada ni dentro de una
transición. Si aparece uno es un bug de composición, no una decisión estética; el montaje debe
verificarlo con `blackdetect` y fallar si lo encuentra. Ojo con los overlays: un render sin canal
alfa pinta negro donde debería ser transparente (usar MOV ProRes 4444, no WebM).

**El fotograma 0 en particular nunca va vacío.** Las tarjetas abren completas y lo que se anima es
movimiento sobre lo que ya está, no aparición desde la nada. Ese cuadro es la miniatura. Verificar
siempre en el **archivo entregado** (`ffprobe stream=start_time` debe dar 0 y el frame 0 debe traer
la tarjeta), no en los snapshots del renderizador.

**Subtítulos literales.** Palabra por palabra lo que se dijo, con las marcas del transcript.
Parafrasear distrae: el ojo lee una cosa y el oído escucha otra. Lo único que se corrige son los
errores de oído de whisper ("la gente" → "el agente", "actitud" → "latitud", "Ibal" → "eval").

**El copy dice qué es y qué hacer.** Un título no es un CTA. La intro explica de dónde salió el
fragmento y dónde está lo completo; el outro lleva fecha, tema, verbo ("Regístrate en"), URL y logo.

**Vocabulario técnico correcto en pantalla**, aunque en vivo se diga coloquial: en las tarjetas van
**sandboxes**, no "cajas".

**Nunca fondo negro plano**: patrón animado con la paleta de la casa (morado `#7c3aed`,
ámbar `#fbbf24`, fondo `#0b0b0f`), en bucle que cierre sin salto.

**La música sale de Openverse** (el buscador de Creative Commons, catálogo de Jamendo; API pública
sin key). Mixkit se agotó — sus cinco pistas ya se usaron y repetir está prohibido. Flujo completo,
scripts y reglas en **`scripts/bgm/README.md`**; leerlo antes de elegir cama musical:

```sh
node scripts/bgm/fetch-bgm.mjs "upbeat energetic techno" /tmp/bgm --n 30
node scripts/bgm/medir-bgm.mjs /tmp/bgm
```

**Ahora hay que dar crédito**: lo aprovechable de Jamendo es CC BY, así que el artista y la
licencia van en la descripción del short (`creditos.json` los deja listos). El script filtra solo
pistas **instrumentales** — una canción cantada compite con la narración y el medidor no la
distingue, porque mide energía y no voz. **Pistas nuevas cada
video**, nunca reciclar la del anterior, y el mp3 no va al repo público. Se eligen midiendo, no de
oído: BPM (autocorrelación sobre el flujo de onsets), RMS y punch; se busca movida —BPM alto y
punch alto— con RMS moderado (~0.12) para que quepa debajo de la voz. Luego se normaliza a −20 LUFS
y se mete con `sidechaincompress` para que se agache al hablar. Precedente de documentación en
`videos/hooks-deterministas/assets/BGM.md`.

Herramientas: HyperFrames para las tarjetas (SVG animado a mano, nunca imágenes generadas), ffmpeg
para el montaje. Ver `docs/webinar-sistemas-agenticos/SHORTS.md`.

## Blog — Sistema de posts

**Tres formatos**: `markdown` (default), `html` (full HTML), `tiptap` (JSON AST). El campo `contentFormat` en el modelo `Post` determina el renderizado.

### Crear un post

Los posts se guardan en MongoDB (modelo `Post` en Prisma), NO como archivos markdown. Para crear un post programáticamente:

```typescript
// Via Prisma directamente (en .server.tsx o script)
import { db } from "~/utils/db.server";

await db.post.create({
  data: {
    title: "Título del post",
    slug: "slug-del-post",
    body: "contenido markdown o HTML completo",
    contentFormat: "markdown", // o "html"
    authorName: "Héctorbliss",
    authorAt: "@hectorbliss",
    photoUrl: "https://i.imgur.com/TaDTihr.png",
    authorAtLink: "https://www.hectorbliss.com",
    mainTag: "ai",
    tags: ["ai", "claude", "agentes"],
    metaImage: "/url-imagen-og.png", // 1200x630
    published: true,
  },
});
```

**Via API**: `POST /api/blog.save-post` con JSON body (usa el blog editor en `/admin/blog-editor/new`).

**Autores válidos**: bliss (@hectorbliss), brendi (@brendago), david (@DeividZavala).

**Tags disponibles**: react, typescript, javascript, css, tailwind, node, prisma, nextjs, remix, vite, ai, claude, openai, agentes, tutorial, opinion, carrera.

### Formato HTML

Posts con `contentFormat: "html"` se renderizan con `dangerouslySetInnerHTML` directo — sin Streamdown, sin markdown processing. El HTML debe ser **auto-contenido con estilos inline o Tailwind** porque no hereda estilos del layout de markdown. Incluir estructura completa: navegación, tipografía, spacing, responsive.

### Formato Markdown

Posts con `contentFormat: "markdown"` se renderizan con **Streamdown** + Shiki (tema dracula). Incluyen automáticamente: barra de progreso, modo lectura, botón de audio, botones de compartir, tabla de contenidos, info del autor.

### Lecciones de posts anteriores

- **NO repetir el título como h1 en el cuerpo** — Streamdown ya renderiza el título. El primer `# Título` en el body se ve duplicado. Arrancar directo con contenido.
- **Imágenes con Pexels**: la API key está en `.env` (`PEXELS_API_KEY`). El endpoint `/v1/search` está roto (401), pero `/v1/photos/:id` sí funciona. Buscar fotos por ID o usar IDs conocidos (546819, 1181244, 577585). Como fallback, `placehold.co` genera placeholders con colores.
- **EasyBits image_generate falló** por créditos agotados en fal.ai. `create_or_edit_image` (OpenAI) y `edit_image` (Gemini) también fallaron con error de decodificación. Si toca generar imágenes para un post, verificar créditos primero con `get_usage_stats`.
- **Subir imágenes propias**: `upload_file` con `access: public` → PUT al `putUrl` con curl → usar `file.url` en el cuerpo. La URL pública tiene el formato `https://easybits-public.fly.storage.tigris.dev/{ownerId}/{storageKey}`.
- **GhostyCode**: instalación vía `npm install -g ghostycode`, comando `ghosty`, config en `~/.ghosty/config.toml`. README en [github.com/blissito/ghostycode](https://github.com/blissito/ghostycode).

### Archivos clave

| Archivo | Propósito |
|---------|-----------|
| `app/routes/post.tsx` | Renderizado (3 paths: html, markdown, tiptap) |
| `app/routes/admin/blog-editor.tsx` | Editor moderno (markdown/html) |
| `app/routes/api/blog.save-post.ts` | API de guardado |
| `app/components/blog/MetadataPanel.tsx` | Panel de metadatos |
| `prisma/schema.prisma` (modelo Post) | Esquema de datos |

## MentorIA — Voice Coaching Architecture

**Ruta**: `/coach` — Coach de programación + entrevistas con Formmy STS (speech-to-speech).

**Modelos de datos**: `LearnerProfile` (programación, 5 dims), `InterviewProfile` (entrevistas, 5 dims STAR), `SessionCredit` (paquetes de sesiones), `CoachingSession` (con campo `mode`: programming | interview).

**Créditos**: Anónimos: 2 sesiones gratis por día (sin login, sin registro). Autenticados: 1 sesión gratis, luego paquetes Stripe MXN (5/$149, 15/$399, 50/$999). Se consume al terminar sesión >5 min. **Fase beta**: MentorIA es gratuito y anónimo para beta testers — el límite diario existe para controlar abuso, no para monetizar aún.

**Principios de diseño de prompts para voice coaching** (aplicar siempre que se editen prompts de MentorIA):
1. **Primer turno específico, no genérico** — "¿Qué construiste que te dio problemas?" > "¿En qué te ayudo?". El 40% de usuarios abandonan en los primeros 2 min si el agent no engancha con algo concreto.
2. **Instrucciones de comportamiento temporal, no de personalidad** — No decir "sé socrático". Decir "haz 1 pregunta, no agregues explicación después, espera". Los modelos STS procesan en chunks; instrucciones cortas y de acción funcionan mejor que descripciones de personalidad.
3. **El silencio es coaching** — Después de una pregunta difícil, el prompt debe indicar explícitamente NO llenar el silencio. El "generation effect" (cognitive science) dice que la gente retiene mejor lo que genera con esfuerzo. Un coach que explica todo está saboteando el aprendizaje.
4. **Respuestas cortas por default** — Máximo 3 oraciones fuera de debriefs. En voz, una respuesta de 2 párrafos se siente como un monólogo de 45 segundos. 1 observación + 1 pregunta es el formato ideal.
5. **70/30 rule** — 70% challenge, 30% encouragement. Más aliento que eso baja los outcomes reales aunque suba la satisfacción percibida.

## URGENTE — Libro corto: A2A v1.0

**Hueco editorial verificado el 18 ago 2026: no existe ningún libro sobre el protocolo A2A**
(Agent2Agent, Linux Foundation). Ni de v0.3 ni de v1.0. Se revisó O'Reilly, Manning/MEAP, Packt,
Apress, Amazon y Leanpub. Lo más cercano son libros de agentes con un capítulo dedicado, escritos
antes del release de v1.0.

**Por qué es urgente y no sólo interesante:**

1. **La literatura existente enseña la versión equivocada.** La v1.0 (abril 2026) rompió con
   v0.3. El curso de DeepLearning.AI —hecho con Google Cloud e IBM, enero 2026— es anterior al
   release, igual que casi todos los codelabs de Google y todo lo de Udemy. Quien estudie hoy por
   esos materiales aprende un dialecto muerto.
2. **El tema no es de nicho.** Linux Foundation reportó en abril 150+ organizaciones y un TSC con
   AWS, Cisco, Google, IBM, Microsoft, Salesforce, SAP y ServiceNow.
3. **La ventana se cierra sola.** El ciclo de un libro técnico es de 12 a 18 meses. Cuando
   O'Reilly o Manning publiquen el suyo, la oportunidad se acabó.

**El ángulo que nadie más tiene.** No es "qué dice la spec" —eso está en la doc oficial y es
gratis— sino **qué pasa cuando la implementas de verdad**: el mapeo de un dialecto propio al cable
A2A, las dos contradicciones internas de la spec (`securityRequirements` vs `security`;
`SubscribeToTask` como GET vs POST), qué NO tiene equivalente en el protocolo (consumo/facturación,
inyección en un turno vivo) y cómo se resuelve sin inventar campos, y por qué el AgentCard puede
vivir en otro origen que el endpoint. Todo eso sale de la implementación real en sandbox-host,
hecha contra el `a2a.proto` normativo del tag v1.0.1.

**Qué cambia respecto a los diferenciadores 0.3 → 1.0** (para no escribir lo obsoleto):
métodos PascalCase (`SendMessage`, no `message/send`), AgentCard sin `url` en la raíz sino
`supportedInterfaces[]`, sin discriminador `kind`, Part aplanado a un oneof `{text|raw|url|data}`,
TaskState en SCREAMING_SNAKE, eventos de stream sin `final`, ruta `/.well-known/agent-card.json`.

- Referencia técnica ya publicada (esqueleto del libro): https://claude.ai/code/artifact/a413ce56-a063-4849-bf6d-fb217c98d75b
- Implementación de referencia: `~/sandbox-host/templates/claude-worker/src/a2a/`
- Fuente normativa: `github.com/a2aproject/A2A`, tag `v1.0.1`, `specification/a2a.proto`
- Recordatorio de estilo del proyecto: leer el prólogo primero, ejemplos en español.
