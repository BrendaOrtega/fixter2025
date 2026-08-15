# Syntax Highlighting en 2026: La muerte de Prism y el reinado de Shiki

La semana pasada estaba configurando el highlighting de código para un blog y me encontré con un cementerio de librerías. Prism.js, que usé durante años, lleva desde 2022 con su versión 2 "en desarrollo". Highlight.js funciona pero se siente anticuado. ¿Qué pasó? ¿Qué usa la gente en 2026?

Investigué a fondo y esto es lo que encontré.

## El problema con las opciones "clásicas"

### Prism.js: Abandonado en la práctica

Prism fue el estándar durante años. Ligero, extensible, con plugins para todo. Pero hay un problema: **el desarrollo se estancó**.

La versión 2.0 lleva años en "beta". Los issues se acumulan. Los PRs no se mergean. El repositorio sigue activo técnicamente, pero la energía se fue.

No significa que no funcione — funciona bien. Pero si empiezas un proyecto nuevo en 2026, ¿para qué elegir algo sin futuro claro?

### Highlight.js: Funcional pero básico

Highlight.js sigue mantenido y es sólido. El problema es que se quedó en una era anterior:

- Temas limitados comparado con el ecosistema de VS Code
- Sin soporte nativo para cosas modernas como line highlighting
- La API se siente anticuada

Para proyectos legacy o casos simples, cumple. Para un blog técnico moderno, hay mejores opciones.

## El ganador: Shiki

Shiki (木 — "árbol" en japonés) es el highlighter que usa VS Code internamente. Y eso cambia todo.

```bash
npm install shiki
```

### ¿Por qué Shiki domina?

**1. Todos los temas de VS Code funcionan**

¿Te gusta Dracula? ¿One Dark Pro? ¿GitHub Dark? Si existe en VS Code, funciona en Shiki sin configuración adicional.

```typescript
import { codeToHtml } from 'shiki'

const html = await codeToHtml('console.log("hola")', {
  lang: 'typescript',
  theme: 'github-dark' // O cualquier tema de VS Code
})
```

**2. Highlighting en build-time**

Shiki genera HTML con clases CSS en tiempo de compilación. **Cero JavaScript en el cliente**. Tu blog carga más rápido porque no hay runtime de highlighting.

**3. Astro lo usa por defecto**

Cuando Astro — uno de los frameworks más populares para blogs — elige Shiki como su highlighter por defecto, es señal de que la industria se movió.

**4. Activamente mantenido**

La versión 1.0 salió en febrero 2024. El equipo de Nuxt está detrás. Los releases son frecuentes. El ecosistema crece.

---

🎬 **¿Prefieres ver esto en acción?** Tenemos tutoriales de configuración de blogs en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## La mejor integración: rehype-pretty-code

Si usas React con markdown (MDX, react-markdown, etc.), la forma más elegante de integrar Shiki es con `rehype-pretty-code`.

```bash
npm install rehype-pretty-code shiki
```

```typescript
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeStringify from 'rehype-stringify'

const html = await unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypePrettyCode, {
    theme: 'github-dark',
    // Opciones avanzadas
    keepBackground: true,
  })
  .use(rehypeStringify)
  .process(markdown)
```

### Funcionalidades que vienen gratis

Con rehype-pretty-code obtienes:

- **Line highlighting**: Resalta líneas específicas con `{1,3-5}`
- **Títulos de archivo**: Muestra el nombre del archivo sobre el bloque
- **Números de línea**: Opcionalmente visibles
- **Diff highlighting**: Muestra líneas añadidas/eliminadas
- **Word highlighting**: Resalta palabras específicas dentro del código

Todo esto sin JavaScript adicional en el cliente.

## Comparativa rápida

| Característica | Prism | Highlight.js | Shiki |
|----------------|-------|--------------|-------|
| Mantenimiento activo | ⚠️ Estancado | ✅ Sí | ✅ Muy activo |
| Temas de VS Code | ❌ | ❌ | ✅ Todos |
| Build-time | Con plugins | Con plugins | ✅ Nativo |
| Line highlighting | Con plugin | ❌ | ✅ Con rehype-pretty-code |
| Bundle size cliente | ~15kb | ~30kb | **0kb** (build-time) |
| Usado por | Legacy | Legacy | Astro, VitePress, Nuxt |

## Demo: Componente completo para tu blog

Aquí está un componente listo para usar en React Router o Next.js. Copia, pega y funciona.

### 1. Instala las dependencias

```bash
npm install shiki rehype-pretty-code react-markdown remark-gfm
```

### 2. Crea el componente de Markdown

```typescript
// components/MarkdownRenderer.tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypePrettyCode from 'rehype-pretty-code'
import type { Options } from 'rehype-pretty-code'

const rehypeOptions: Options = {
  theme: 'github-dark',
  keepBackground: true,
  defaultLang: 'typescript',
  // Callback para añadir atributos a los bloques de código
  onVisitLine(node) {
    // Previene que líneas vacías colapsen
    if (node.children.length === 0) {
      node.children = [{ type: 'text', value: ' ' }]
    }
  },
  onVisitHighlightedLine(node) {
    // Añade clase a líneas resaltadas
    node.properties.className = ['highlighted']
  },
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypePrettyCode, rehypeOptions]]}
      components={{
        // Estilos personalizados para elementos
        pre: ({ children }) => (
          <pre className="overflow-x-auto rounded-lg p-4 my-4 text-sm">
            {children}
          </pre>
        ),
        code: ({ children, className }) => {
          // Código inline vs bloque
          const isInline = !className
          if (isInline) {
            return (
              <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-sm">
                {children}
              </code>
            )
          }
          return <code className={className}>{children}</code>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
```

### 3. CSS para el highlighting

```css
/* styles/code.css */

/* Contenedor del bloque de código */
pre {
  background: #0d1117;
  border: 1px solid #30363d;
}

/* Líneas resaltadas (cuando usas {1,3-5} en el markdown) */
.highlighted {
  background: rgba(56, 139, 253, 0.15);
  border-left: 2px solid #58a6ff;
  margin-left: -16px;
  margin-right: -16px;
  padding-left: 14px;
  padding-right: 16px;
}

/* Título del archivo (cuando usas title="archivo.ts") */
[data-rehype-pretty-code-title] {
  background: #161b22;
  border: 1px solid #30363d;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  padding: 8px 16px;
  font-size: 14px;
  color: #8b949e;
  font-family: monospace;
}

[data-rehype-pretty-code-title] + pre {
  border-radius: 0 0 8px 8px;
  margin-top: 0;
}

/* Números de línea */
code[data-line-numbers] {
  counter-reset: line;
}

code[data-line-numbers] > [data-line]::before {
  counter-increment: line;
  content: counter(line);
  display: inline-block;
  width: 1rem;
  margin-right: 1.5rem;
  text-align: right;
  color: #6e7681;
}
```

### 4. Úsalo en tu ruta

```typescript
// routes/blog.$slug.tsx
import { MarkdownRenderer } from '~/components/MarkdownRenderer'
import { getPostBySlug } from '~/.server/posts'

export async function loader({ params }) {
  const post = await getPostBySlug(params.slug)
  return { post }
}

export default function BlogPost() {
  const { post } = useLoaderData<typeof loader>()

  return (
    <article className="prose prose-invert max-w-3xl mx-auto">
      <h1>{post.title}</h1>
      <MarkdownRenderer content={post.body} />
    </article>
  )
}
```

### 5. Sintaxis especial en tu markdown

Una vez configurado, puedes usar estas funcionalidades en tus posts:

````markdown
```typescript title="mi-archivo.ts" {3-5} showLineNumbers
function ejemplo() {
  const normal = "esta línea es normal"
  const resaltada = "esta línea está resaltada"
  const tambien = "esta también"
  const yEsta = "y esta última"
  return normal
}
```
````

- `title="..."` → Muestra el nombre del archivo arriba del bloque
- `{3-5}` → Resalta las líneas 3, 4 y 5
- `showLineNumbers` → Muestra números de línea

### El resultado

Con esta configuración obtienes:

- ✅ Highlighting idéntico a VS Code
- ✅ Cero JavaScript en el cliente (todo se procesa en el servidor)
- ✅ Soporte para 100+ lenguajes
- ✅ Line highlighting para tutoriales
- ✅ Títulos de archivo para contexto
- ✅ Dark mode que se ve profesional

## Lo que NO funcionó

Probé `react-syntax-highlighter` que internamente puede usar Prism o Highlight.js. El problema: añade JavaScript al cliente y los temas son limitados.

También probé Streamdown para blogs estáticos — error. Está diseñado para streaming de chat con IA, no para renderizar markdown estático. Los estilos dan problemas porque no es su caso de uso.

## Mi recomendación

Para blogs y documentación en 2026:

1. **Usa Shiki** directamente o a través de rehype-pretty-code
2. **Elige un tema de VS Code** que te guste (yo uso `github-dark`)
3. **Procesa en build-time** para cero JS en el cliente

Si estás en Astro o VitePress, ya viene configurado. Si usas React Router, Next.js o similar, integra rehype-pretty-code con tu pipeline de markdown.

```typescript
// Configuración mínima para react-markdown
import ReactMarkdown from 'react-markdown'
import rehypePrettyCode from 'rehype-pretty-code'

<ReactMarkdown
  rehypePlugins={[[rehypePrettyCode, { theme: 'github-dark' }]]}
>
  {markdown}
</ReactMarkdown>
```

## El futuro

Shiki sigue evolucionando. Recientemente añadieron soporte para "dual themes" (claro/oscuro automático) y mejor integración con frameworks modernos.

Mientras Prism se queda atrás y Highlight.js se mantiene en modo supervivencia, Shiki está donde está la innovación.

La decisión es simple: si empiezas algo nuevo, usa Shiki.

Abrazo. Blissmo. 🤓
