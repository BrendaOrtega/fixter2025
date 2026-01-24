# Notas de Desarrollo - FixterGeek

Este archivo contiene información útil para Claude Code sobre el proyecto y procedimientos comunes.

## ⛔ PROHIBIDO - NUNCA EJECUTAR (CRÍTICO)

**NUNCA, BAJO NINGUNA CIRCUNSTANCIA, ejecutar estos comandos:**

```bash
# ❌ PROHIBIDO - Borra TODA la base de datos
prisma db push --force-reset

# ❌ PROHIBIDO - Puede borrar datos
prisma migrate reset

# ❌ PROHIBIDO - Destructivo
db.dropDatabase()

# ❌ PROHIBIDO - Borra colecciones
db.collection.drop()
```

**Historia (19 Enero 2026):** Se ejecutó `prisma db push --force-reset` intentando sincronizar un campo nuevo y SE PERDIERON TODOS LOS DATOS: usuarios, cursos, videos, subscribers, ratings - TODO. Los archivos de video en S3/Tigris sobrevivieron pero los metadatos en MongoDB se perdieron.

**Si hay conflictos con Prisma:**
1. NUNCA usar `--force-reset` o `--accept-data-loss`
2. Investigar el error específico primero
3. Preguntar al usuario antes de cualquier acción en la DB
4. Si hay índices duplicados, arreglarlos manualmente en MongoDB Atlas
5. En caso de duda, NO HACER NADA y consultar

**Incluso con backup, NO ejecutar comandos destructivos.** La restauración nunca es perfecta.

## Estructura del Proyecto

- **Framework**: React Router v7 (no Remix, nunca usar import remix) sobre Vite y su ecosistema de plugins
- **Frontend**: Usamos un archivo de rutas routes.tsx
- **Base de datos**: MongoDB con Prisma
- **Styling**: Tailwind CSS
- **Pagos**: Stripe
- **Emails**: Amazon SES
- **Animaciones**: Motion (motion/react)
- **Deploy**: Fly.io con Docker (https://fixter2025.fly.dev/)
- **Configuración Docker**:
  - Dockerfile usa Node 20.11.1-alpine
  - Servidor configurado para escuchar en 0.0.0.0:3000
  - Variables ENV HOST=0.0.0.0 y PORT=3000 necesarias

## TODO: Regenerar chunks de video de animaciones

- **Video ID**: `video-6760a7e680d28dce1a1fd71c`
- **Problema**: Faltan segmentos HLS 049-071 (solo existen 000-048)
- **Ubicación S3**: `animaciones/chunks/video-6760a7e680d28dce1a1fd71c/`
- **Acción**: Re-procesar el video original con ffmpeg para generar los chunks faltantes
- **Estado**: Video funciona ~68% (primeros 8 minutos aprox), falla al final

## TODO: Habilitar HLS en courseViewer

- **Archivo**: `app/routes/courseViewer.tsx` (línea ~213)
- **Problema**: El campo `m3u8` está excluido del select con comentario "algunos videos tienen datos corruptos"
- **Impacto**: Aunque se procesen videos a HLS, el player siempre usa `storageLink` (MP4 directo)
- **Acciones necesarias**:
  1. Identificar qué videos tienen `m3u8` corrupto en la DB
  2. Limpiar/corregir esos datos
  3. Incluir `m3u8: true` en el select del loader
- **Contexto**: Videos legacy (como Pong) pueden procesarse a HLS desde admin, pero sin este fix no se reproducirán con HLS-first

## TODO: Cron de backup automático de MongoDB

- **Prioridad**: ALTA (después del incidente del 19 Enero 2026)
- **Objetivo**: Backup automático diario de la base de datos MongoDB
- **Opciones a evaluar**:
  1. **MongoDB Atlas Backup** (si el plan lo incluye) - backups automáticos en la nube
  2. **Cron en Fly.io** - script que exporta con `mongodump` y sube a S3/Tigris
  3. **GitHub Action programada** - workflow nocturno que hace backup
- **Implementación sugerida**:
  - Script: `scripts/backup-mongodb.ts`
  - Destino: Bucket de Tigris (`fixtergeek-backups/`)
  - Frecuencia: Diario a las 3:00 AM CDMX
  - Retención: Últimos 30 días
- **Datos críticos a respaldar**: users, courses, videos, subscribers, ratings, sequences
- **Bonus**: Notificación por email si el backup falla

## TODO: Corregir títulos de videos de Animaciones

- **Curso**: Construye más de 14 componentes animados con React y Motion
- **Problema**: Los títulos de los videos se perdieron en el incidente de la DB y se restauraron con títulos genéricos
- **Acción**: Ir a la otra app (fixtergeek original) y copiar los títulos reales de cada video
- **Videos afectados**: 31 videos del curso de Animaciones
- **Nota**: Ya se corrigieron los videos 2 y 3 a "Fundamentos de Motion" y "Fundamentos de Vite"

## Lo nuevo

Siempre intentamos añadir solo una ruta nueva, no añadir más de una. Interactiva y organizada con componentes reusables para que este modelo de ruta sea pequeña y legible, usando react router v7, ya no remix y nunca colocando utilidades del backend en ella, esas utilidades, si necesarias, existirá en sus propios archivos .server.tsx.
Siempre siguiendo los estilos de la aplicación, colores y formatos. Es mejor copiar que inventar nuevos, es mejor usar los componentes ya existentes antes que crear nuevos.

### Actualizaciones Septiembre 12, 2025 - FloatingPromo Moderno

- **FloatingPromo Widget**: Sistema de promoción innovador siguiendo patrones UX 2025
  - **Widget flotante**: Bottom-left position, no interfiere con reCAPTCHA
  - **Timing inteligente**: Aparece después de 3 segundos (respeta flujo del usuario)
  - **Dismiss inteligente**: Se oculta por 24 horas con localStorage persistence
  - **Hover unificado**: Area invisible conecta botón y card, elimina brincos
  - **Progressive disclosure**: Botón compacto → hover → card expandida
  - **Responsive**: Dark mode support, touch-friendly, animaciones smooth
- **Homepage actualizada**:
  - Tag de anuncio: "✨ Nuevo taller de Construcción de Agentes IA drag & drop"
  - Botón CTA actualizado: "Explorar creación de agentes no-code" → `/agentes`
  - Colores naranja consistentes con página de Agentes IA
- **Banner en página /agentes**: Optimización de conversión con CTA directo
- **Promoción "Sesión gratis"**: Más atractivo que mostrar precio completo

### Actualizaciones Agosto 31, 2025

- **Nueva ruta /gemini**: Landing page para el curso de Gemini CLI completamente funcional
- **Navbar actualizada**: Ahora incluye enlaces a "Claude Code" y "Agentes IA"
- **Homepage anterior**: 
  - Tag de anuncio previo de Gemini-CLI (reemplazado por Agentes IA)
  - Tres CTAs principales: "Explorar Claude", "Explorar Gemini", "Explorar el blog" (actualizado)
- **Módulo webinarUtils.ts**: Centraliza toda la lógica de gestión de webinars (usar siempre este módulo)
- **Sistema de Email Sequences completamente implementado**:
  - **Ruta `/newsletters`**: Gestión completa de sequences con tabs persistentes
  - **Modelos Prisma**: `Sequence`, `SequenceEmail`, `SequenceEnrollment`
  - **Triggers**: SUBSCRIPTION, TAG_ADDED, MANUAL, COURSE_PURCHASE
  - **Sequences activas**: 
    - "Bienvenida Claude Code" (3 emails)
    - "Pre-Webinar | Gemini-CLI" (3 emails, featured)
    - "Re-engagement" (1 email, pausada)
  - **Funcionalidades**:
    - ⏸️ Pausar/Reanudar con preservación del progreso (`currentEmailIndex`)
    - 📊 Visualización de progreso en porcentajes
    - 🎵 Iconos play/pause de react-icons
    - 🌟 Sistema de sequences destacadas (`isFeatured`)
    - 🔄 Pestañas que recuerdan selección (localStorage)
    - ⚙️ Preferencias de frecuencia mejoradas con textos naturales
  - **Preferencias de Usuario**: 
    - "No me molesta recibir varios a la semana" (weekly)
    - "Prefiero recibir menos de 6 al mes" (biweekly) 
    - "Prefiero recibir solo 1 al mes" (monthly)
  - **Scripts útiles**: `npm run sequences:create`, múltiples scripts de testing
  - **Decisión de diseño**: Sistema simple sin validación automática de frecuencia
- **Precios actualizados**: 
  - Claude: $1,490 MXN (curso completo)
  - Gemini: En desarrollo
  - **Agentes IA**: $4,900 MXN (curso premium completo)
- **IMPORTANTE sobre merges**: Siempre verificar que las rutas estén registradas en `app/routes.ts` antes de hacer merge a main

### Actualizaciones Diciembre 11, 2025 - Página Agentes IA

- **Precio premium establecido**: $4,900 MXN para posicionamiento serio en el mercado
- **Estructura de sesiones reorganizada**:
  1. **Sesión 1**: Tu Primer Chatbot con Memoria (fundamentos)
  2. **Sesión 2**: Herramientas y Automatización → Asistente de Restaurante Inteligente
  3. **Sesión 3**: Estudio Fotográfico Automático → Proyecto nano-banana (generación de imágenes)
  4. **Sesión 4**: Cerebro Maestro Empresarial con RAG (finale avanzado)
- **Proyecto estrella definido**: Sistema que toma imagen de producto + modelo → genera 3+ variantes profesionales
- **Sección de testimonios agregada**:
  - Carlos Mendoza (Fundador Agencia Digital): +$50K MXN mensuales con sistema drag-and-drop
  - Kevin James (CTO Software): 40% reducción tiempo + 25% satisfacción cliente
  - Fotos reales de Pexels para máxima credibilidad
- **Cards de "próximamente" con estilo deshabilitado**:
  - Generación de Video Avanzada (Q2 2025)
  - Asistente Personal Inteligente (Q3 2025)
  - Sin hover effects, cursors disabled, badges "PRÓXIMAMENTE"
- **Hover especial nano-banana**: Confeti de emojis que rotan y suben infinitamente con fondo amarillo
- **Precio visible en sección CTA**: Card "Taller Completo" muestra $4,900 MXN claramente

## el libro

- cada que estes por escribir un nuevo capitulo, lee el prologo y recuerda el propósito, la filosofía y el estilo.
  Cada capítulo incluye ejemplos prácticos que puedes ejecutar inmediatamente, pero más importante, cada técnica está presentada en el contexto de problemas reales que enfrentan desarrolladores trabajando en proyectos de producción.
- Además de técnicas específicas, cada capítulo incluye reflexiones sobre las implicaciones más amplias de estas capacidades - cómo están cambiando la naturaleza del trabajo de desarrollo, qué nuevas oportunidades están creando, y cómo puedes posicionarte estratégicamente para aprovecharlas.
- Los ejemplos de prompts son siempre en español así como los comentarios de código.

### Proceso para Añadir o Refactorizar Capítulos

Cada vez que añadas o refactorices un capítulo, sigue estos pasos:

1. **Leer contexto existente**: Revisa prólogo y capítulos anteriores para mantener consistencia
2. **Verificar numeración**: Asegúrate de que la secuencia de capítulos sea lógica
3. **Actualizar archivos afectados** (SIEMPRE en este orden):
   - Crear o editar el archivo `capitulo-XX.md` en `app/content/libro/`
   - Actualizar la lista de capítulos en `app/routes/libros/domina_claude_code.tsx`
   - Actualizar referencias entre capítulos (próximo/anterior)
   - Renumerar capítulos posteriores si es necesario
4. **Verificar enlaces**: Confirma que todas las referencias internas funcionan correctamente
5. **Mantener estilo**: Seguir la filosofía y tono establecidos en el prólogo
6. **Regenerar EPUB**: Ejecutar `python3 app/scripts/generate_epub.py` para actualizar el archivo descargable

## El Libro de AI SDK

**Versión: AI SDK v6** - Todo el libro usa la versión 6 del AI SDK de Vercel (la más reciente). No usar código de versiones anteriores (4.x o 5.x).

### Estrategia: Mucho más profundo que el taller

El libro complementa el taller siendo **significativamente más profundo**:

- **Taller**: Ejercicios prácticos paso a paso (el "cómo")
- **Libro**: Fundamentos, arquitectura, internals y trade-offs (el "por qué")

Cada capítulo incluye:
1. Teoría profunda que el taller omite (cómo funciona internamente)
2. Contexto arquitectural y decisiones de diseño
3. Edge cases, patrones avanzados y optimización
4. Matemáticas y conceptos técnicos cuando aplica (embeddings, tokens, etc.)

### Orden del libro (diferente al taller)

| Capítulo | Tema | Profundidad extra |
|----------|------|-------------------|
| 1 | Streams básicos | Tokens, context window, costos |
| 2 | React + useChat | Internals del hook, protocolo de mensajes, optimización |
| 3 | Backend Hono | HTTP streaming, Transfer-Encoding, SSE vs WebSocket |
| 4+ | Tools, Embeddings, Agentes | ... |

### Proceso para el libro AI SDK

1. **INDISPENSABLE - Leer docs con Context7 MCP**: Antes de escribir cualquier capítulo, SIEMPRE consultar la documentación oficial del AI SDK usando el MCP de Context7 para obtener la sintaxis más actualizada de v6
2. **Leer prólogo**: Recordar el enfoque TypeScript-first, sin Python
3. **Consultar estructura del taller**: Ver `https://github.com/blissito/taller-ai-sdk-para-principiantes`
4. **Ir más profundo**: Cada tema del taller se expande con teoría y fundamentos
5. **Archivos**: Los capítulos están en `app/content/ai-sdk/`
6. **Ruta del libro**: `app/routes/libros/ai_sdk.tsx`
7. **Regenerar EPUB**: `python3 app/scripts/generate_ai_sdk_epub.py`

### TODO: Publicación en Amazon

Cuando el libro esté completo y listo para producción:
- Investigar los lineamientos de Amazon KDP para publicar EPUBs
- Ajustar metadatos del EPUB según requerimientos de Amazon
- Generar versión .mobi si es necesario
- Crear portada con dimensiones correctas (1600x2560 px recomendado)
- Configurar pricing y royalties

### ⚠️ CHECKLIST OBLIGATORIO - AI SDK v6

**ANTES de escribir cualquier código con `useChat`, verificar:**

- [ ] Import incluye `DefaultChatTransport`: `import { useChat, DefaultChatTransport } from '@ai-sdk/react'`
- [ ] Usar `transport` en lugar de `api`: `useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }) })`
- [ ] Enviar mensajes con `text`: `sendMessage({ text: input })` — NO `{ content: input }`
- [ ] Renderizar con `parts`: `message.parts.map(part => part.type === 'text' ? part.text : null)`
- [ ] Usar `status` para estados: `status === 'streaming'` — NO `isLoading`

### Código de referencia v6 (COPIAR ESTE)

```typescript
// ✅ CORRECTO - AI SDK v6
import { useChat, DefaultChatTransport } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <>
      {messages.map((m) => (
        <div key={m.id}>
          {m.parts.map((part, i) =>
            part.type === 'text' ? <span key={i}>{part.text}</span> : null
          )}
        </div>
      ))}
      <form onSubmit={(e) => {
        e.preventDefault();
        sendMessage({ text: input });
        setInput('');
      }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button disabled={status === 'streaming'}>Enviar</button>
      </form>
    </>
  );
}
```

### ❌ Código INCORRECTO (v4/v5 - NO USAR)

```typescript
// ❌ INCORRECTO - Esto es v4/v5
import { useChat } from '@ai-sdk/react';

const { messages, append, isLoading, handleInputChange, input } = useChat({
  api: '/api/chat',  // ❌ Usar transport
});

append({ content: input });  // ❌ Usar sendMessage({ text: })
messages.map(m => m.content);  // ❌ Usar m.parts
```

### Tabla de cambios v6

| Antes (v4/v5) | Ahora (v6) |
|---------------|------------|
| `useChat({ api: "/api/chat" })` | `useChat({ transport: new DefaultChatTransport({ api }) })` |
| `import { useChat }` | `import { useChat, DefaultChatTransport }` |
| `handleInputChange`, `handleSubmit` | Manejar input con `useState` manualmente |
| `append({ content: input })` | `sendMessage({ text: input })` |
| `reload()` | `regenerate()` |
| `isLoading` | `status` ('ready', 'submitted', 'streaming', 'error') |
| `message.content` | `message.parts` (array con `type` y `text`) |
| `generateObject({ schema })` | `generateText({ output: Output.object({ schema }) })` |
| `streamObject({ schema })` | `streamText({ output: Output.object({ schema }) })` |
| `convertToCoreMessages()` | `await convertToModelMessages()` (async) |
| `toDataStreamResponse()` | `toUIMessageStreamResponse()` |

### Guía de tono y estilo para el libro AI SDK

**Audiencia objetivo:**
- Desarrolladores latinoamericanos hispanohablantes
- Principiantes en React y TypeScript
- Personas que quieren integrar IA en sus proyectos

**Lenguaje:**
- **Sin anglicismos innecesarios**: Evitar "game-changer", "approach", "leverage", etc.
- **Español natural**: Preferir "valioso" sobre "game-changer", "enfoque" sobre "approach"
- **Tono profesional**: Evitar frases como "rezar que funcione" o jerga demasiado coloquial
- **Directo pero amigable**: No condescendiente, pero tampoco intimidante

**Explicaciones para principiantes:**
- Cuando uses `for await...of`, explica brevemente qué es un async iterator
- Cuando uses `process.stdout.write`, explica por qué no `console.log`
- Antes de usar Zod, introduce qué es y para qué sirve
- Si un concepto de TypeScript es avanzado (generics, types complejos), añade una nota

**Estructura de cada capítulo:**
1. Código primero - mostrar el ejemplo funcionando
2. Explicar qué pasó - desglosar cada parte
3. Profundizar en conceptos - tokens, context window, etc.
4. Casos de uso prácticos - ejemplos latinos relevantes (tacos, enchiladas, facturas en pesos)
5. Resumen con tabla comparativa

**Ejemplos culturalmente relevantes:**
- Recetas mexicanas (tacos al pastor, enchiladas)
- Moneda en pesos mexicanos cuando aplique
- Contextos latinoamericanos (facturación, RFC, etc.)

**Frases a evitar:**
| Evitar | Usar en su lugar |
|--------|------------------|
| "game-changer" | "valioso", "poderoso", "útil" |
| "rezar que funcione" | "esperar que funcione" |
| "approach" | "enfoque", "método" |
| "leverage" | "aprovechar", "usar" |
| "Suficiente teoría" | (eliminar, empezar directo) |

## Información de Contacto

- **Email de contacto**: brenda@fixter.org
- **Website**: fixtergeek.com

## Generación de PDFs

Para generar PDFs profesionales (como temarios, documentos de marketing, etc.), usa este método con ReportLab:

### Instalación

```bash
pip3 install reportlab
```

### Método de Generación

```python
#!/usr/bin/env python3

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor

def create_pdf(filename, title, content):
    # Create PDF document
    doc = SimpleDocTemplate(filename, pagesize=letter,
                           rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=18)

    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        textColor=HexColor('#667eea'),
        alignment=1  # Center
    )

    # Add content
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 12))

    for section in content:
        story.append(Paragraph(section, styles['Normal']))
        story.append(Spacer(1, 12))

    doc.build(story)
    print(f"PDF generado: {filename}")
```

### Características del método:

- **Biblioteca**: ReportLab (pura Python, sin dependencias del sistema)
- **Formato**: Letter size con márgenes estándar
- **Estilos**: Títulos con colores corporativos (#667eea)
- **Contenido**: Soporte para HTML básico en texto
- **KeepTogether**: Para mantener secciones unidas

### Ejemplo de uso para temarios:

- Ubicación: `/public/` para archivos descargables
- Nombre: `temario-[producto].pdf`
- Contenido: Structured con títulos, listas, precios, información de contacto

## Base de Datos - Campos Importantes

### Tabla Users

- `webinar`: JSON con datos de registro al webinar
  - `experienceLevel`: nivel de experiencia
  - `contextObjective`: situación del usuario
  - `urgencyTimeline`: urgencia
  - `registeredAt`: timestamp de registro
  - `webinarType`: tipo de webinar
  - `webinarDate`: fecha del webinar

## Landing Pages

### Claude Landing (/claude)

- Webinar gratuito: 15 Agosto 2025, 7:00 PM CDMX
- Taller modular: 3 sesiones de 2h cada una + bonus
- Fechas sesiones: 19, 21 y 26 Agosto 2025 a las 7:00 PM
- Precios: $999 MXN individual, $2,490 MXN paquete completo
- Orden de sesiones:
  1. Fundamentos y Context Management (Martes 19 Agosto)
  2. SDK, Subagentes y Scripting (Jueves 21 Agosto)
  3. MCP y Automatización (Martes 26 Agosto)
  4. BONUS: Sesión Privada Individual

## Admin Panel

### Webinar Admin (/admin/webinar)

- Muestra registrados al webinar con datos completos
- Filtra entre solo registrados vs compraron taller
- Exporta CSV con toda la información
- Acceso protegido con `getAdminOrRedirect`

### Sequences Admin (/admin/sequences) - PLANIFICADO

- **Panel completo** para gestionar email sequences
- **Dashboard**: Métricas generales, sequences activas, enrollments
- **CRUD Sequences**: Crear, editar, pausar, eliminar sequences
- **Editor de Emails**: Gestionar emails de cada sequence con WYSIWYG
- **Analytics**: Stats por sequence, performance de emails, lista de usuarios
- **Funcionalidades**: Filtros, búsqueda, acciones bulk, preview de emails
- **Diseño**: Consistente con admin existente, responsive, estados claros
- **Plan detallado**: Ver `docs/admin-sequences-plan.md`

## Sistemas de Promoción y Marketing

### FloatingPromo - Widget Moderno de Promoción

Componente innovador que sigue patrones UX 2025 para promoción no-intrusiva:

**Ubicación**: `app/components/common/FloatingPromo.tsx`

**Características**:
- **Posicionamiento**: `fixed bottom-6 left-6` (evita conflicto con reCAPTCHA)
- **Timing**: Aparece después de 3 segundos (respeta flujo del usuario)
- **Persistence**: localStorage con expiración de 24 horas
- **Progressive Disclosure**: Botón compacto → hover → card expandida
- **Hover Unificado**: Área invisible conecta elementos, elimina brincos
- **Responsive**: Dark mode, touch-friendly, animaciones Framer Motion

**Implementación**:
```tsx
// Activado en MainLayout
import { FloatingPromo } from "~/components/common/FloatingPromo";

// Se muestra automáticamente, dismiss inteligente
// Promociona taller actual con colores consistentes
```

**Ventajas sobre banners tradicionales**:
- ✅ No bloquea navegación
- ✅ Timing respetuoso 
- ✅ Dismiss temporal (no permanente)
- ✅ Hover sin brincos
- ✅ Posicionamiento inteligente

### Sistemas de Promoción Anteriores

- **WebinarBanner**: Banner sticky tradicional (actualmente desactivado)
- **GlobalBanner**: Banner global (disponible pero no usado)

## Comandos Útiles

- **Desarrollo**: `npm run dev`
- **Build**: `npm run build`
- **Deploy**: `fly deploy` (se despliega en https://fixter2025.fly.dev/)
- **Prisma**: `npx prisma studio`
- **Generar PDF**: `python3 generate_pdf.py` (desde /public/)
- **Generar EPUB del libro**: `python3 app/scripts/generate_epub.py`
- **Generar PDF del temario**: `python3 generate_temario_pdf.py`
- **Generar documentos (subagente)**: `npx tsx app/subagents/document-generator.ts --epub --pdf`

## Generación de Documentos

### Subagente Document Generator

Puedes usar el subagente especializado para generar tanto EPUB como PDF:

```bash
# Generar solo EPUB del libro
npx tsx app/subagents/document-generator.ts --epub

# Generar solo PDF del temario
npx tsx app/subagents/document-generator.ts --pdf

# Generar ambos documentos
npx tsx app/subagents/document-generator.ts --epub --pdf

# Forzar regeneración
npx tsx app/subagents/document-generator.ts --epub --pdf --force
```

### Generación Manual

**EPUB del libro:**

```bash
python3 app/scripts/generate_epub.py
```

**EPUB de LlamaIndex:**

```bash
python3 app/scripts/generate_llamaindex_epub.py
```

**PDF del temario:**

```bash
python3 generate_temario_pdf.py
```

### Fix de Títulos en EPUB (Septiembre 2025)

**Problema resuelto**: Los EPUBs mostraban nombres genéricos como "chap_01", "chap_02" en lugar de los títulos reales de los capítulos.

**Solución aplicada**:
1. **Nombres de archivo descriptivos**: Usar títulos completos como nombres de archivo (ej: `Fundamentos_para_administrar_mejor_el_contexto.xhtml`)
2. **TOC explícito**: Crear tabla de contenidos con `epub.Link()` para garantizar títulos correctos
3. **UIDs únicos**: Asignar UIDs únicos a cada capítulo para navegación correcta

**Archivos modificados**:
- `app/scripts/generate_epub.py` (Claude Code)
- `app/scripts/generate_llamaindex_epub.py` (LlamaIndex)

**Resultado**: Navegación e índice muestran títulos completos como "Fundamentos para administrar mejor el contexto" en lugar de códigos genéricos.

### Cuándo regenerar los documentos:

**EPUB:**

- Después de modificar cualquier capítulo en `app/content/libro/`
- Al añadir nuevos capítulos
- Cuando el usuario lo solicite explícitamente
- Antes de publicar actualizaciones del libro

**PDF:**

- Después de cambiar fechas del webinar
- Al actualizar precios o información del taller
- Cuando se modifique el contenido del temario

### Archivos generados:

- **EPUB:** `/public/dominando-claude-code.epub`
- **PDF:** `/public/temario-claude-code.pdf`

### Metadatos del EPUB:

- Autor: Héctorbliss
- Publisher: FixterGeek
- Website: fixtergeek.com

El subagente procesa automáticamente todos los capítulos y genera documentos válidos con verificación de integridad.

### Uso con Claude Code

Claude Code puede usar automáticamente el agente `technical-book-editor` que incluye estas funcionalidades para:

- Revisar capítulos del libro para consistencia técnica
- Generar EPUBs actualizados cuando se modifiquen capítulos
- Generar PDFs del temario cuando cambien fechas o precios
- Organizar y renumerar capítulos del libro

El agente se invoca automáticamente cuando Claude detecta cambios en el contenido del libro o cuando se solicita explícitamente la generación de documentos.

## Notas Adicionales

- Siempre usar "Python/TS" en lugar de "Python/JS"
- Email de contacto correcto: brenda@fixter.org
- Las sesiones del taller son de 2 horas cada una
- El webinar es completamente gratuito

### Benchmarks Claude Sonnet 4 (para post de blog)

**TODO: Recordar solicitar post de blog sobre estos benchmarks**

- **MMLU (80.1%)**: Massive Multitask Language Understanding - mide conocimiento general en 57 materias académicas
- **GPQA (50.3%)**: Graduate-Level Google-Proof Q&A - preguntas de nivel posgrado en ciencias que requieren razonamiento experto
- **Aider Coding (9.8%)**: Benchmark específico de programación que mide capacidad de editar código existente
- **Context (1M tokens)**: Ventana de contexto - puede procesar ~750,000 palabras en una sola conversación
- **Fortaleza**: Velocidad y clasificación - destaca en rapidez de respuesta y tareas de categorización

Los porcentajes indican qué tan bien el modelo resuelve cada tipo de problema comparado con el máximo posible.

## TODO: Sistema de Lead Magnets (Próxima Sesión)

Sistema para capturar leads con recursos descargables (PDFs, EPUBs) estilo Lemon Squeezy.

### Concepto
- Landing minimalista `/download/:slug` → usuario deja email → descarga inmediata + email con link
- Modelo `LeadMagnet` con archivo en S3, tag automático, y sequence opcional de nurturing
- Si tiene sequence asignada → inscribe automático; si no → solo tag (backfill después)

### Modelo Prisma (agregar a schema.prisma)
```prisma
model LeadMagnet {
  id                  String   @id @default(auto()) @map("_id") @db.ObjectId
  slug                String   @unique
  title               String
  description         String?
  coverImage          String?
  s3Key               String                  // fixtergeek/leadmagnets/slug/file.pdf
  fileName            String?
  fileType            String?                 // pdf, epub, zip
  urlExpirationHours  Int      @default(24)
  tagOnDownload       String                  // Tag automático al suscriptor
  sequenceId          String?  @db.ObjectId   // Sequence de nurturing (opcional)
  isFree              Boolean  @default(true) // Extensible para pagos
  price               Int?                    // Centavos MXN (futuro)
  downloadCount       Int      @default(0)
  isActive            Boolean  @default(true)
  downloads           LeadMagnetDownload[]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  @@map("lead_magnets")
}

model LeadMagnetDownload {
  id            String      @id @default(auto()) @map("_id") @db.ObjectId
  leadMagnetId  String      @db.ObjectId
  leadMagnet    LeadMagnet  @relation(fields: [leadMagnetId], references: [id], onDelete: Cascade)
  subscriberId  String?     @db.ObjectId
  email         String
  name          String?
  downloadedAt  DateTime    @default(now())
  presignedUrl  String?
  urlExpiresAt  DateTime?
  @@index([leadMagnetId, email])
  @@map("lead_magnet_downloads")
}
```

### Archivos a Crear
1. `app/.server/services/s3-leadmagnet.ts` - Presigned URLs (basado en `s3-video.ts`)
2. `app/.server/services/sequence-enrollment.ts` - Enrollar + backfill por tag
3. `app/routes/download.$slug.tsx` - Landing pública
4. `app/routes/download.$slug.gracias.tsx` - Thank you + descarga
5. `app/routes/admin/leadmagnets.tsx` - Dashboard admin (basado en `admin/sequences.tsx`)
6. `app/mailSenders/sendLeadMagnetDownload.ts` - Email con link

### Flujo
```
/download/guia-claude → Form email → Action:
  1. Upsert Subscriber + añadir tag
  2. Generar presigned URL (24h)
  3. Crear LeadMagnetDownload record
  4. Si sequenceId → enrollInSequence()
  5. Enviar email con link
  6. Redirect a /gracias?token=presignedUrl
```

### Admin Features
- CRUD lead magnets con upload a S3
- Asignar/cambiar sequence
- Botón "Backfill" → inscribir usuarios con tag en sequence
- Stats de descargas

### Referencia de patrones existentes
- Presigned URLs: `app/.server/services/s3-video.ts`
- Admin UI: `app/routes/admin/sequences.tsx`
- Landing forms: `app/routes/claude.tsx`
- reCAPTCHA: `app/lib/useRecaptcha.tsx`

### Plan completo
Ver `/Users/bliss/.claude/plans/humble-toasting-nebula.md`

---

## Creación de Posts del Blog

### Proceso Rápido para Crear Posts

Para crear posts rápidamente, usar el script en `scripts/create-post-template.ts` como plantilla:

```bash
npx tsx scripts/create-post.ts
```

**Campos requeridos del Post:**
```typescript
{
  slug: "url-amigable-del-post",
  title: "Título del Post",
  body: "Contenido en Markdown",
  published: true,
  authorName: "Héctorbliss",
  authorAt: "@blissito",
  photoUrl: "https://i.imgur.com/TaDTihr.png",
  authorAtLink: "https://www.hectorbliss.com",
  tags: ["tag1", "tag2"],
  mainTag: "tag-principal",
  // Para SEO/OG (importante para redes sociales):
  coverImage: "URL de imagen 1200x630",
  metaImage: "URL de imagen 1200x630",
}
```

### 📺 TEMPORADA ACTUAL: Promoción del Canal de YouTube

**IMPORTANTE (Enero 2026):** Por esta temporada, SIEMPRE incluir una invitación al canal de YouTube **a la mitad del post**:

```markdown
---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro canal de YouTube. [Suscríbete aquí](https://www.youtube.com/@fixtergeek) para no perderte ninguno.

---
```

**Variaciones permitidas:**
- "Si prefieres aprender en video, visita nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek)"
- "📺 Más contenido como este en [YouTube @fixtergeek](https://www.youtube.com/@fixtergeek)"

### Imágenes para OG/Twitter

Usar imágenes de Unsplash (libres de derechos) con dimensiones 1200x630:

```
https://images.unsplash.com/photo-XXXXX?w=1200&h=630&fit=crop
```

### Firma del Post

Siempre terminar con:
```
Abrazo. bliss.
```

---

## Guía de Estilo para Claude Code

### Audiencia y Tono

#### Audiencia Objetivo

- Desarrolladores principiantes en código y Claude
- Usuarios que buscan mejorar su productividad
- Profesionales que quieren dominar herramientas de IA

#### Tono de Escritura

- **Sobrio y profesional**: Evitar jerga innecesaria o tono demasiado casual
- **Accesible**: Explicar conceptos técnicos de manera clara
- **Directo**: Ir al grano sin rodeos excesivos
- **Práctico**: Incluir ejemplos concretos y aplicables

### Estructura de Contenido

#### Formato de Artículos

1. **Título claro y específico**: Que indique el valor del contenido
2. **Introducción breve**: Contexto y promesa de valor
3. **Secciones numeradas**: Para facilitar la navegación
4. **Ejemplos de código**: Con sintaxis apropiada
5. **Conclusión práctica**: Próximos pasos o resumen de valor

#### Longitud de Secciones

- **Párrafos**: 2-4 oraciones máximo
- **Explicaciones**: Suficientes para entender, sin exceso
- **Ejemplos**: Concisos pero completos

### Elementos de Estilo

#### Uso de Código

```
Usar bloques de código para comandos y ejemplos
```

#### Listas y Viñetas

- Usar viñetas para enumerar características
- Usar números para procesos paso a paso
- Incluir emojis ocasionales para mejorar legibilidad (✅ 📋 🎯 ⚠️)

#### Énfasis

- **Negritas** para conceptos clave
- `Código inline` para comandos y referencias técnicas
- _Cursivas_ para términos en inglés cuando sea necesario

### Principios de Redacción

#### Claridad

- Una idea por párrafo
- Oraciones directas y activas
- Evitar ambigüedades

#### Utilidad

- Cada sección debe aportar valor práctico
- Incluir casos de uso reales
- Proporcionar soluciones, no solo problemas

#### Progresión

- De conceptos simples a complejos
- Construir sobre conocimiento previo
- Conectar ideas entre secciones

### Elementos Específicos para Claude Code

#### Comandos

- Mostrar sintaxis exacta
- Explicar parámetros cuando sea relevante
- Incluir variaciones útiles

#### Ejemplos

- Usar casos de uso comunes
- Mostrar input y output esperado
- Contextualizar dentro de flujos de trabajo reales

#### Consejos

- Incluir "hacks" y trucos prácticos
- Mencionar errores comunes a evitar
- Sugerir mejores prácticas
