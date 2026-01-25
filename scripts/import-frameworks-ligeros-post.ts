import { db } from "../app/.server/db";

const postContent = `
En la era de la generación de código automática, es una mucho mejor idea dejar los frameworks (no todos) de lado para usar herramientas más simples y nativas. Te da velocidad, resiliencia, mantenibilidad y puedes reducir tu equipo al mínimo. ✅

## 1. HTMX: HTML mejorado

**¿Por qué HTMX?**
- Casi cero JavaScript en el cliente
- Interactividad sin SPA (Single Page Application)
- Ideal para aplicaciones tradicionales con interacciones AJAX

**Ejemplo básico:**
\`\`\`html
<button
  hx-get="/api/contador"
  hx-target="#contador"
  hx-swap="innerHTML">
  Actualizar contador
</button>
<div id="contador">0</div>
\`\`\`

## 2. HTML5 + Preact: Lo justo y necesario

**Ventajas:**
- Preact pesa solo 3KB (vs 40KB+ de React)
- Compatible con la mayoría del ecosistema React
- Mejor rendimiento por menos sobrecarga

**Ejemplo de componente:**
\`\`\`jsx
import { h, render } from 'preact';
import { useState } from 'preact/hooks';

function Contador() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Clics: {count}
    </button>
  );
}

render(<Contador />, document.getElementById('app'));
\`\`\`

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## 3. Phoenix (Elixir): Potencia en el servidor

**¿Por qué ahora?**
- Los LLMs facilitan aprender lenguajes funcionales
- Concurrencia masiva con procesos ligeros
- LiveView permite aplicaciones reactivas sin JavaScript

**Ejemplo de LiveView:**
\`\`\`elixir
defmodule MiAppWeb.CounterLive do
  use Phoenix.LiveView

  def mount(_params, _session, socket) do
    {:ok, assign(socket, count: 0)}
  end

  def handle_event("increment", _, socket) do
    {:noreply, update(socket, :count, &(&1 + 1))}
  end

  def render(assigns) do
    ~L"""
    <button phx-click="increment">
      Clics: <%= @count %>
    </button>
    """
  end
end
\`\`\`

## Conclusión

- **HTMX**: Para aplicaciones web tradicionales que necesitan interactividad
- **Preact**: Cuando necesitas componentes React pero con menos peso
- **Phoenix/Elixir**: Para aplicaciones en tiempo real con alta concurrencia

### Los LLMs están haciendo accesibles tecnologías que antes requerían una curva de aprendizaje pronunciada. ¿Por qué no aprovecharlos para explorar estas alternativas más ligeras y eficientes?

Abrazo. Bliss.
`;

async function main() {
  console.log("Importando post: Alternativas ligeras a los frameworks en la era LLM...");

  const post = await db.post.create({
    data: {
      slug: "alternativas-ligeras-a-los-frameworks-en-la-era-llm",
      title: "Alternativas ligeras a los frameworks en la era LLM",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissito",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Clasificación
      tags: ["htmx", "preact", "elixir", "phoenix"],
      mainTag: "llm",

      // Imágenes para SEO/OG
      coverImage:
        "https://cdn.prod.website-files.com/6542d8f9e468531067fe9978/6593fe9fe2224b371a2a1072_20240102T1158-fdea45fe-263c-4234-aabf-0f980120fe39.webp",
      metaImage:
        "https://cdn.prod.website-files.com/6542d8f9e468531067fe9978/6593fe9fe2224b371a2a1072_20240102T1158-fdea45fe-263c-4234-aabf-0f980120fe39.webp",

      // Fecha original: Diciembre 2024
      createdAt: new Date("2024-12-15T12:00:00.000Z"),
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
