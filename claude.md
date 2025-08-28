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
- Precios: $1,490 MXN individual, $2,490 MXN paquete completo
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

**PDF del temario:**

```bash
python3 generate_temario_pdf.py
```

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
