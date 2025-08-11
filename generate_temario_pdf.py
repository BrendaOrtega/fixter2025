#!/usr/bin/env python3

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor

def create_temario_pdf():
    filename = "public/temario-claude-code.pdf"
    title = "De Junior a Senior con Claude Code"
    
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
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Heading2'],
        fontSize=18,
        spaceAfter=20,
        textColor=HexColor('#83F3D3'),
        alignment=1
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=15,
        textColor=HexColor('#667eea')
    )
    
    webinar_style = ParagraphStyle(
        'Webinar',
        parent=styles['Normal'],
        fontSize=14,
        spaceAfter=10,
        textColor=HexColor('#2D3748'),
        backColor=HexColor('#F7FAFC'),
        borderColor=HexColor('#83F3D3'),
        borderWidth=1,
        borderPadding=10
    )

    # Content
    content = [
        # Title
        Paragraph(title, title_style),
        Spacer(1, 12),
        
        Paragraph("Taller Modular Especializado", subtitle_style),
        Spacer(1, 20),
        
        # Webinar section
        Paragraph("🎯 Webinar Gratuito de Introducción", section_style),
        
        Paragraph("""
        <b>📅 Viernes 15 de Agosto 2025 - 7:00 PM (CDMX)</b><br/>
        <b>Duración:</b> 60 minutos + Q&A<br/>
        <b>Modalidad:</b> Online en vivo (Zoom)<br/>
        <b>Costo:</b> 100% GRATIS<br/><br/>
        
        <b>Lo que descubrirás:</b><br/>
        • Tour completo por las funciones avanzadas de Claude Code<br/>
        • Qué es MCP y por qué cambiará tu forma de trabajar<br/>
        • Cómo los subagentes pueden automatizar tareas complejas<br/>
        • Preview del temario completo del taller (3 sesiones de 2h + bonus)<br/>
        • Demos en vivo y casos de uso reales
        """, webinar_style),
        
        Spacer(1, 20),
        
        # Sessions
        Paragraph("🚀 Taller Modular Especializado", section_style),
        Paragraph("Elige las sesiones que necesites o toma el paquete completo con descuento y sesión bonus.", styles['Normal']),
        Spacer(1, 15),
        
        # Session 1
        Paragraph("<b>Sesión 1: Fundamentos y Context Management</b>", styles['Heading3']),
        Paragraph("📅 Martes 19 Agosto • 2 horas • $999 MXN", styles['Normal']),
        Paragraph("""
        • Setup profesional de Claude Code y configuración óptima<br/>
        • Arquitectura de prompts efectivos para proyectos grandes<br/>
        • Gestión avanzada de contexto y uso experto de /resume<br/>
        • Optimización de tokens y memoria para sesiones largas<br/>
        • Técnicas para mantener conversaciones coherentes por días<br/>
        • Casos prácticos: debugging de proyectos complejos
        """, styles['Normal']),
        Spacer(1, 12),
        
        # Session 2
        Paragraph("<b>Sesión 2: SDK, Subagentes y Scripting</b>", styles['Heading3']),
        Paragraph("📅 Jueves 21 Agosto • 2 horas • $999 MXN", styles['Normal']),
        Paragraph("""
        • Claude SDK para integración avanzada en tus aplicaciones<br/>
        • Creación y configuración de subagentes especializados<br/>
        • Automatización de workflows de desarrollo<br/>
        • Scripting avanzado para tareas repetitivas<br/>
        • Integración con herramientas de desarrollo<br/>
        • Casos de uso: automatización de testing y deployment
        """, styles['Normal']),
        Spacer(1, 12),
        
        # Session 3
        Paragraph("<b>Sesión 3: MCP y Automatización</b>", styles['Heading3']),
        Paragraph("📅 Martes 26 Agosto • 2 horas • $999 MXN", styles['Normal']),
        Paragraph("""
        • MCP (Model Context Protocol) configurado con JSON (sin programar)<br/>
        • GitHub MCP: explora y analiza miles de repositorios<br/>
        • Automatización de GitHub Actions directamente desde Claude<br/>
        • Conexión con bases de datos y APIs externas<br/>
        • Creación de workflows automatizados complejos<br/>
        • Casos prácticos: análisis masivo de código y documentación
        """, styles['Normal']),
        Spacer(1, 12),
        
        # Bonus
        Paragraph("<b>BONUS: Sesión Privada Individual</b>", styles['Heading3']),
        Paragraph("📅 Por agendar • 1 hora • Solo con paquete completo", styles['Normal']),
        Paragraph("""
        • Revisión personalizada de tu proyecto específico<br/>
        • Consultoría 1:1 para implementar Claude Code en tu stack<br/>
        • Resolución de casos particulares de tu trabajo<br/>
        • Estrategias personalizadas para tu nivel y contexto
        """, styles['Normal']),
        Spacer(1, 20),
        
        # Pricing
        Paragraph("💰 Precios", section_style),
        Paragraph("""
        <b>Sesión Individual:</b> $999 MXN<br/>
        <b>Paquete Completo (3 sesiones + bonus):</b> $2,490 MXN<br/>
        <b>Ahorro:</b> $507 MXN + sesión bonus privada incluida
        """, styles['Normal']),
        Spacer(1, 20),
        
        # Contact
        Paragraph("📧 Información de Contacto", section_style),
        Paragraph("""
        <b>Email:</b> brenda@fixter.org<br/>
        <b>Website:</b> fixtergeek.com<br/><br/>
        
        <i>Conviértete en Power User de Claude Code y multiplica tu productividad 10x</i>
        """, styles['Normal']),
    ]

    # Add all content to story
    for item in content:
        if isinstance(item, str):
            story.append(Paragraph(item, styles['Normal']))
        else:
            story.append(item)

    doc.build(story)
    print(f"PDF generado: {filename}")

if __name__ == "__main__":
    create_temario_pdf()