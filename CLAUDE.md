# Notas de Desarrollo - FixterGeek

Este archivo contiene información útil para Claude Code sobre el proyecto y procedimientos comunes.

## Estructura del Proyecto

- **Framework**: React Router v7 (no Remix, nunca usar import remix)
- **Base de datos**: MongoDB con Prisma
- **Styling**: Tailwind CSS
- **Pagos**: Stripe
- **Emails**: Amazon SES
- **Animaciones**: Motion (motion/react)

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

- Webinar gratuito: 14 Agosto 2025, 7:00 PM CDMX
- Taller modular: 3 sesiones de 2h cada una + bonus
- Precios: $1,490 MXN individual, $3,499 MXN paquete completo
- Orden de sesiones:
  1. Fundamentos y Context Management
  2. SDK, Subagentes y Scripting
  3. MCP y Automatización
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

## Notas Adicionales

- Siempre usar "Python/TS" en lugar de "Python/JS"
- Email de contacto correcto: brenda@fixter.org
- Las sesiones del taller son de 2 horas cada una
- El webinar es completamente gratuito
