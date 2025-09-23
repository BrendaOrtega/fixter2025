# Notas de Desarrollo - FixterGeek

Este archivo contiene información útil para Claude Code sobre el proyecto y procedimientos comunes.

## Estructura del Proyecto

- **Framework**: React Router v7 (no Remix, nunca usar import remix) sobre Vite y su ecosistema de plugins
- **Frontend**: Usamos un archivo de rutas routes.tsx
- **Base de datos**: MongoDB con Prisma
- **Styling**: Tailwind CSS
- **Pagos**: Stripe
- **Emails**: Amazon SES
- **Animaciones**: Motion (motion/react)

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
