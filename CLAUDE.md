# FixterGeek

React Router v7 (NUNCA Remix ni imports de remix) sobre Vite, MongoDB con Prisma, Tailwind CSS, Stripe, Amazon SES, Motion (motion/react), deploy en Fly.io con Docker (HOST=0.0.0.0, PORT=3000). **PROHIBIDO ejecutar `prisma db push --force-reset`, `prisma migrate reset`, `db.dropDatabase()` o `db.collection.drop()`; ante conflictos de Prisma, investigar y preguntar, NUNCA usar `--force-reset` ni `--accept-data-loss`.** Rutas en `app/routes.ts`, utilidades backend en archivos `.server.tsx`, preferir componentes existentes sobre crear nuevos. Posts del blog: **ser creativo y versátil con la estructura — NO forzar el molde Problema/Solución/Resultado/Conclusión.** Elegir la forma que mejor sirva al contenido: ensayo, hook + mecanismo + ejemplos + cierre, narrativa cronológica, dialogada, lista comentada, manifiesto, etc. El molde caso-de-estudio queda disponible solo cuando el post realmente narra "tuvimos X problema y así lo resolvimos"; en posts conceptuales, explicativos, de opinión o guías prácticas, ese molde se siente artificial y debilita el texto. Reglas que SÍ se mantienen siempre: storytelling con arco narrativo, NO listas de tips secas, NUNCA inventar anécdotas/amigos ficticios/aventuras falsas (si no hay historia real, usar el tema mismo como narrativa), incluir datos duros y cifras cuando existan, citas textuales destacadas si hay protagonistas, separar secciones visualmente, 4 imágenes o más en posts nuevos. Tono: español mexicano profesional e internacional (NUNCA voseo argentino — nada de "tenés", "querés", "dejá", "pensalo"; usar "tienes", "quieres", "deja", "piénsalo"), directo y cercano sin ser informal en exceso, puede usar "tú" o formas impersonales. Firma "Abrazo. bliss." solo para Héctorbliss, incluir CTA al canal de YouTube en transiciones naturales. Libros: leer prólogo primero, ejemplos en español. AI SDK v6: usar `DefaultChatTransport`, `sendMessage({ text })`, `message.parts`, `status` (no `isLoading`). Contacto: brenda@fixter.org.

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
