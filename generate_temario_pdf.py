#!/usr/bin/env python3

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from bs4 import BeautifulSoup
import re

def parse_html_temario():
    """Lee y parsea el archivo HTML del temario"""
    with open("public/temario-claude-code.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extraer el contenido principal
    content_data = {
        'title': soup.find('h1', class_='title').get_text(strip=True) if soup.find('h1', class_='title') else "Temario Completo: Claude Code Power User",
        'webinar': {},
        'sessions': [],
        'pricing': {},
        'contact': {}
    }
    
    # Extraer información del webinar
    webinar_section = soup.find('section', class_='webinar-box')
    if webinar_section:
        content_data['webinar'] = {
            'date': webinar_section.find('h4').get_text(strip=True) if webinar_section.find('h4') else "",
            'details': [],
            'topics': []
        }
        
        # Extraer detalles del webinar
        for p in webinar_section.find_all('p'):
            text = p.get_text(strip=True)
            if text:
                content_data['webinar']['details'].append(text)
        
        # Extraer temas del webinar
        ul = webinar_section.find('ul')
        if ul:
            for li in ul.find_all('li'):
                content_data['webinar']['topics'].append(li.get_text(strip=True))
    
    # Extraer información de las sesiones
    for session in soup.find_all('section', class_='session'):
        session_data = {
            'title': '',
            'meta': '',
            'topics': []
        }
        
        # Título de la sesión
        h4 = session.find('h4')
        if h4:
            session_data['title'] = h4.get_text(strip=True)
        
        # Metadata de la sesión
        meta_div = session.find('div', class_='session-meta')
        if meta_div:
            session_data['meta'] = meta_div.get_text(strip=True)
        
        # Temas de la sesión
        ul = session.find('ul')
        if ul:
            for li in ul.find_all('li'):
                session_data['topics'].append(li.get_text(strip=True))
        
        # Para la sesión bonus, incluir el valor adicional
        if 'bonus' in session.get('class', []):
            bonus_p = session.find('p')
            if bonus_p:
                session_data['bonus_value'] = bonus_p.get_text(strip=True)
        
        content_data['sessions'].append(session_data)
    
    # Extraer información de precios
    pricing_section = soup.find('section', class_='pricing')
    if pricing_section:
        price_options = pricing_section.find_all('div', class_='price-option')
        content_data['pricing']['options'] = []
        for option in price_options:
            price_text = option.get_text(strip=True)
            content_data['pricing']['options'].append(price_text)
        
        # Extraer lo que incluye
        includes_h4 = pricing_section.find('h4', string=re.compile('Incluye'))
        if includes_h4:
            next_p = includes_h4.find_next_sibling('p')
            if next_p:
                includes_text = next_p.get_text()
                content_data['pricing']['includes'] = [line.strip() for line in includes_text.split('\n') if line.strip()]
    
    # Extraer información de contacto
    contact_section = soup.find('section', class_='contact-info')
    if contact_section:
        for p in contact_section.find_all('p'):
            text = p.get_text(strip=True)
            if 'Website:' in text:
                content_data['contact']['website'] = text.replace('Website:', '').strip()
            elif 'Email:' in text:
                content_data['contact']['email'] = text.replace('Email:', '').strip()
            elif 'Registro' in text:
                content_data['contact']['registro'] = text
    
    return content_data

def create_temario_pdf():
    filename = "public/temario-claude-code.pdf"
    
    # Parsear el HTML
    content_data = parse_html_temario()
    
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
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Heading2'],
        fontSize=18,
        spaceAfter=20,
        textColor=HexColor('#83F3D3'),
        alignment=TA_CENTER
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=15,
        textColor=HexColor('#667eea')
    )
    
    session_title_style = ParagraphStyle(
        'SessionTitle',
        parent=styles['Heading3'],
        fontSize=14,
        spaceAfter=10,
        textColor=HexColor('#2D3748'),
        fontName='Helvetica-Bold'
    )
    
    webinar_style = ParagraphStyle(
        'Webinar',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=10,
        textColor=HexColor('#2D3748'),
        backColor=HexColor('#F7FAFC'),
        borderColor=HexColor('#83F3D3'),
        borderWidth=1,
        borderPadding=10,
        leftIndent=10,
        rightIndent=10
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        leading=14
    )
    
    meta_style = ParagraphStyle(
        'Meta',
        parent=styles['Normal'],
        fontSize=10,
        textColor=HexColor('#559B8B'),
        spaceAfter=8
    )

    # Title
    story.append(Paragraph(content_data['title'], title_style))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Webinar Gratis + Taller Modular", subtitle_style))
    story.append(Spacer(1, 20))
    
    # Webinar section
    story.append(Paragraph("🎯 Webinar Gratuito de Introducción", section_style))
    
    webinar_content = f"<b>{content_data['webinar']['date']}</b><br/><br/>"
    for detail in content_data['webinar']['details']:
        webinar_content += f"<b>{detail}</b><br/>"
    
    webinar_content += "<br/><b>Lo que descubrirás:</b><br/>"
    for topic in content_data['webinar']['topics']:
        webinar_content += f"• {topic}<br/>"
    
    story.append(Paragraph(webinar_content, webinar_style))
    story.append(Spacer(1, 20))
    
    # Taller Modular
    story.append(Paragraph("🚀 Taller Modular Especializado", section_style))
    story.append(Paragraph("Elige las sesiones que necesites o toma el paquete completo con descuento y sesión bonus.", normal_style))
    story.append(Spacer(1, 15))
    
    # Sessions
    for i, session in enumerate(content_data['sessions']):
        # Keep session content together
        session_content = []
        
        session_content.append(Paragraph(f"<b>{session['title']}</b>", session_title_style))
        session_content.append(Paragraph(session['meta'], meta_style))
        
        topics_text = ""
        for topic in session['topics']:
            topics_text += f"• {topic}<br/>"
        session_content.append(Paragraph(topics_text, normal_style))
        
        # Para la sesión bonus
        if 'bonus_value' in session:
            session_content.append(Spacer(1, 8))
            session_content.append(Paragraph(f"<b>{session['bonus_value']}</b>", normal_style))
        
        story.append(KeepTogether(session_content))
        story.append(Spacer(1, 15))
    
    # Pricing
    story.append(Paragraph("💰 Inversión y Opciones de Pago", section_style))
    
    pricing_text = "<b>Precios y Paquetes:</b><br/><br/>"
    for option in content_data['pricing']['options']:
        # Limpiar y formatear el texto de precio
        option_clean = option.replace('\n', ' ').strip()
        pricing_text += f"• {option_clean}<br/>"
    
    pricing_text += "<br/><b>Incluye:</b><br/>"
    if 'includes' in content_data['pricing']:
        for include in content_data['pricing']['includes']:
            if include.strip():
                pricing_text += f"{include}<br/>"
    
    story.append(Paragraph(pricing_text, normal_style))
    story.append(Spacer(1, 20))
    
    # Contact
    story.append(Paragraph("📧 Información de Contacto", section_style))
    contact_text = ""
    if 'email' in content_data['contact']:
        contact_text += f"<b>Email:</b> {content_data['contact']['email']}<br/>"
    if 'website' in content_data['contact']:
        contact_text += f"<b>Website:</b> {content_data['contact']['website']}<br/>"
    if 'registro' in content_data['contact']:
        contact_text += f"<br/>{content_data['contact']['registro']}<br/>"
    
    contact_text += "<br/><br/><i>Conviértete en Power User de Claude Code y multiplica tu productividad 10x</i>"
    
    story.append(Paragraph(contact_text, normal_style))
    
    # Footer
    story.append(Spacer(1, 30))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#666666'),
        alignment=TA_CENTER
    )
    story.append(Paragraph("© 2025 FixterGeek - Todos los derechos reservados", footer_style))

    doc.build(story)
    print(f"PDF generado: {filename}")

if __name__ == "__main__":
    create_temario_pdf()