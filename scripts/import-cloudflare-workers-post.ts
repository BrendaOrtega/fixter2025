import { db } from "../app/.server/db";

const workersContent = `
Cloudflare Workers cambió mi perspectiva sobre el backend. Es serverless, pero diferente. Corre en el edge, cerca del usuario, con latencias de milisegundos. Si nunca los has probado, aquí te explico por qué deberías.

## ¿Qué son Cloudflare Workers?

Son funciones JavaScript que corren en más de 300 data centers de Cloudflare alrededor del mundo. Tu código se ejecuta cerca del usuario, no en un servidor centralizado.

\`\`\`javascript
export default {
  async fetch(request) {
    return new Response("¡Hola desde el edge!");
  },
};
\`\`\`

## 5 razones para usarlos

### 1. Latencia mínima

Tu código corre en el data center más cercano al usuario. Si alguien en CDMX hace una petición, se ejecuta en el edge de CDMX, no en Virginia.

| Servicio tradicional | Workers |
|---------------------|---------|
| 200-500ms latencia | 10-50ms |
| Un servidor central | 300+ ubicaciones |

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

### 2. Sin cold starts

A diferencia de AWS Lambda, Workers no tienen cold starts. Están siempre "calientes":

\`\`\`javascript
// Esto responde instantáneamente, sin delay de arranque
export default {
  async fetch(request) {
    const start = Date.now();
    // Tu lógica aquí
    return new Response(\`Ejecutado en \${Date.now() - start}ms\`);
  },
};
\`\`\`

### 3. Pricing generoso

- **100,000 peticiones/día gratis**
- Después: $0.50 por millón de peticiones
- Sin costos por idle time

Para la mayoría de proyectos, es prácticamente gratis.

### 4. Desarrollo local con Wrangler

\`\`\`bash
npm install -g wrangler

# Iniciar proyecto
wrangler init mi-worker

# Desarrollo local
wrangler dev

# Deploy
wrangler deploy
\`\`\`

### 5. Integración con otros servicios Cloudflare

- **KV**: Key-value storage global
- **D1**: Base de datos SQLite en el edge
- **R2**: Object storage compatible con S3
- **Durable Objects**: Estado persistente

## Caso de uso: API proxy con caché

\`\`\`javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Verificar caché
    const cache = caches.default;
    let response = await cache.match(request);

    if (response) {
      return response;
    }

    // Fetch al origin
    response = await fetch(\`https://api.ejemplo.com\${url.pathname}\`);

    // Cachear por 1 hora
    response = new Response(response.body, response);
    response.headers.set("Cache-Control", "max-age=3600");

    await cache.put(request, response.clone());
    return response;
  },
};
\`\`\`

## Caso de uso: Redirect inteligente

\`\`\`javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const country = request.cf?.country || "US";

    const redirects = {
      MX: "https://mx.ejemplo.com",
      ES: "https://es.ejemplo.com",
      AR: "https://ar.ejemplo.com",
    };

    const target = redirects[country] || "https://ejemplo.com";
    return Response.redirect(\`\${target}\${url.pathname}\`, 302);
  },
};
\`\`\`

## Limitaciones a considerar

- **CPU time**: 10ms en plan gratis, 30s en paid
- **Sin Node.js APIs**: No hay \`fs\`, \`path\`, etc.
- **V8 isolates**: No es Node, es un runtime diferente

## Cuándo usar Workers vs otras opciones

| Caso | Mejor opción |
|------|--------------|
| API simple y rápida | Workers |
| Lógica pesada (>30s) | Lambda / Fly.io |
| Base de datos relacional | Fly.io / Railway |
| Autenticación básica | Workers |
| Procesamiento de imágenes | Workers (con Images API) |

## Conclusión

Cloudflare Workers son ideales para:

- APIs ligeras con baja latencia
- Proxies y redirects
- Edge-side rendering
- Autenticación y rate limiting

El free tier es suficiente para experimentar y proyectos pequeños. Para producción, el pricing es competitivo.

Abrazo. bliss.
`;

async function main() {
  console.log("Importando post de Cloudflare Workers...");

  const slug = "por-que-deberias-usar-cloudflare-workers-2023";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "¿Por qué deberías usar Cloudflare Workers?",
        body: workersContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["cloudflare", "workers", "serverless", "edge", "backend"],
        mainTag: "Backend",
        coverImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=630&fit=crop",
        metaImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=630&fit=crop",
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title: "¿Por qué deberías usar Cloudflare Workers?",
      body: workersContent.trim(),
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: ["cloudflare", "workers", "serverless", "edge", "backend"],
      mainTag: "Backend",
      coverImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=630&fit=crop",
      metaImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=630&fit=crop",
      createdAt: new Date("2023-05-15"),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error importando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
