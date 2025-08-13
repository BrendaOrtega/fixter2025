#!/usr/bin/env python3

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from bs4 import BeautifulSoup
import re

def parse_html_workshop():
    """Lee y parsea el archivo HTML del temario del workshop"""
    with open("public/temario-claude-workshop.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    content_data = {
        'title': soup.find('h1', class_='title').get_text(strip=True) if soup.find('h1', class_='title') else "De Junior a Senior con Claude Code",
        'subtitle': soup.find('div', class_='subtitle').get_text(strip=True) if soup.find('div', class_='subtitle') else "",
        'badges': [],
        'webinar': {},
        'sessions': [],
        'pricing': {},
        'contact': {}
    }
    
    # Extraer badges
    for badge in soup.find_all('span', class_='badge'):
        content_data['badges'].append(badge.get_text(strip=True))
    
    # Extraer información del webinar
    webinar_section = soup.find('section', class_='webinar-box')
    if webinar_section:
        content_data['webinar'] = {
            'date': webinar_section.find('h3').get_text(strip=True) if webinar_section.find('h3') else "",
            'details': [],
            'topics': []
        }
        
        for p in webinar_section.find_all('p'):
            text = p.get_text(strip=True)
            if text and not text.startswith('🎯'):
                content_data['webinar']['details'].append(text)
        
        ul = webinar_section.find('ul')
        if ul:
            for li in ul.find_all('li'):
                content_data['webinar']['topics'].append(li.get_text(strip=True))
    
    # Extraer información de las sesiones
    for session in soup.find_all('section', class_='session'):
        session_data = {
            'title': '',
            'meta': '',
            'topics': [],
            'is_bonus': 'bonus' in session.get('class', [])
        }
        
        h3 = session.find('h3')
        if h3:
            session_data['title'] = h3.get_text(strip=True)
        
        meta_div = session.find('div', class_='session-meta')
        if meta_div:
            session_data['meta'] = meta_div.get_text(strip=True)
        
        ul = session.find('ul')
        if ul:
            for li in ul.find_all('li'):
                session_data['topics'].append(li.get_text(strip=True))
        
        # Para sesión bonus
        if session_data['is_bonus']:
            for p in session.find_all('p'):
                if '⚡' in p.get_text():
                    session_data['bonus_note'] = p.get_text(strip=True)
        
        content_data['sessions'].append(session_data)
    
    # Extraer información de precios
    pricing_section = soup.find('section', class_='pricing')
    if pricing_section:
        content_data['pricing']['options'] = []
        
        for option in pricing_section.find_all('div', class_='price-option'):
            price_div = option.find('div', class_='price')
            if price_div:
                price_text = price_div.get_text(strip=True)
                description = []
                for p in option.find_all('p'):
                    description.append(p.get_text(strip=True))
                content_data['pricing']['options'].append({
                    'price': price_text,
                    'description': ' '.join(description)
                })
        
        # Extraer lo que incluye
        includes_h4 = pricing_section.find('h4', string=re.compile('incluyen'))
        if includes_h4:
            next_ul = includes_h4.find_next_sibling('ul')
            if next_ul:
                content_data['pricing']['includes'] = []
                for li in next_ul.find_all('li'):
                    content_data['pricing']['includes'].append(li.get_text(strip=True))
    
    # Extraer información de contacto
    contact_section = soup.find('section', class_='contact-info')
    if contact_section:
        for p in contact_section.find_all('p'):
            text = p.get_text(strip=True)
            if 'Website:' in text:
                content_data['contact']['website'] = text.replace('Website:', '').strip()
            elif 'Email:' in text:
                content_data['contact']['email'] = text.replace('Email:', '').strip()
            elif 'WhatsApp:' in text:
                content_data['contact']['whatsapp'] = text.replace('WhatsApp:', '').strip()
        
        # Proceso de registro
        ol = contact_section.find('ol')
        if ol:
            content_data['contact']['process'] = []
            for li in ol.find_all('li'):
                content_data['contact']['process'].append(li.get_text(strip=True))
    
    return content_data

def create_workshop_pdf():
    filename = "public/temario-claude-workshop.pdf"
    
    # Parsear el HTML
    content_data = parse_html_workshop()
    
    # Create PDF document
    doc = SimpleDocTemplate(
        filename, 
        pagesize=letter,
        rightMargin=72, 
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )

    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=10,
        textColor=HexColor('#667eea'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=20,
        textColor=HexColor('#83F3D3'),
        alignment=TA_CENTER
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        spaceBefore=15,
        textColor=HexColor('#667eea'),
        fontName='Helvetica-Bold'
    )
    
    session_title_style = ParagraphStyle(
        'SessionTitle',
        parent=styles['Heading3'],
        fontSize=13,
        spaceAfter=8,
        textColor=HexColor('#2D3748'),
        fontName='Helvetica-Bold'
    )
    
    webinar_style = ParagraphStyle(
        'Webinar',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=10,
        textColor=HexColor('#2D3748'),
        backColor=HexColor('#F0FDF4'),
        borderColor=HexColor('#83F3D3'),
        borderWidth=1,
        borderPadding=10,
        leftIndent=8,
        rightIndent=8,
        leading=14
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        leading=12,
        textColor=HexColor('#4A5568')
    )
    
    meta_style = ParagraphStyle(
        'Meta',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#559B8B'),
        spaceAfter=6,
        fontName='Helvetica-Oblique'
    )
    
    bonus_style = ParagraphStyle(
        'BonusSession',
        parent=session_title_style,
        textColor=HexColor('#F59E0B')
    )
    
    price_style = ParagraphStyle(
        'Price',
        parent=styles['Normal'],
        fontSize=12,
        textColor=HexColor('#667eea'),
        fontName='Helvetica-Bold',
        spaceAfter=5
    )
    
    # Header with FixterGeek branding
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=12,
        textColor=HexColor('#667eea'),
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    story.append(Paragraph("<b>FixterGeek</b> | fixtergeek.com", header_style))
    story.append(Spacer(1, 10))
    
    # Title and subtitle
    story.append(Paragraph(content_data['title'], title_style))
    if content_data['subtitle']:
        # Limpiar subtitle de emojis
        clean_subtitle = content_data['subtitle'].replace('🚀', '').strip()
        story.append(Paragraph(clean_subtitle, subtitle_style))
    story.append(Spacer(1, 12))
    
    # Badges
    if content_data['badges']:
        badges_text = " • ".join(content_data['badges'])
        story.append(Paragraph(badges_text, meta_style))
        story.append(Spacer(1, 15))
    
    # Webinar section
    story.append(Paragraph("Webinar Gratuito de Introducción", section_style))
    
    # Limpiar fecha de emojis
    clean_date = content_data['webinar']['date'].replace('📅', '').strip()
    webinar_content = f"<b>{clean_date}</b><br/><br/>"
    
    for detail in content_data['webinar']['details']:
        if ':' in detail:
            parts = detail.split(':', 1)
            webinar_content += f"<b>{parts[0]}:</b>{parts[1]}<br/>"
        else:
            webinar_content += f"{detail}<br/>"
    
    if content_data['webinar']['topics']:
        webinar_content += "<br/><b>Lo que descubrirás:</b><br/>"
        for topic in content_data['webinar']['topics']:
            # Limpiar el texto de emojis y caracteres especiales
            clean_topic = topic
            for emoji in ['✨', '🔮', '🤖', '💻', '🎁', '🔥']:
                clean_topic = clean_topic.replace(emoji, '')
            clean_topic = clean_topic.strip()
            if clean_topic.startswith('•'):
                clean_topic = clean_topic[1:].strip()
            webinar_content += f"• {clean_topic}<br/>"
    
    story.append(Paragraph(webinar_content, webinar_style))
    story.append(Spacer(1, 15))
    
    # Taller Modular
    story.append(Paragraph("Taller Modular Especializado", section_style))
    story.append(Paragraph(
        "Elige las sesiones que necesites o toma el paquete completo con descuento y sesión bonus.", 
        normal_style
    ))
    story.append(Spacer(1, 12))
    
    # Sessions
    for session in content_data['sessions']:
        session_content = []
        
        # Limpiar título de emojis problemáticos
        clean_title = session['title'].replace('🎁', '').strip()
        
        if session['is_bonus']:
            session_content.append(Paragraph(f"<b>{clean_title}</b>", bonus_style))
        else:
            session_content.append(Paragraph(f"<b>{clean_title}</b>", session_title_style))
        
        # Limpiar meta de emojis
        clean_meta = session['meta'].replace('📅', '').strip()
        session_content.append(Paragraph(clean_meta, meta_style))
        
        topics_text = ""
        for topic in session['topics']:
            topics_text += f"• {topic}<br/>"
        session_content.append(Paragraph(topics_text, normal_style))
        
        if 'bonus_note' in session:
            session_content.append(Spacer(1, 6))
            # Limpiar nota de emojis
            clean_note = session['bonus_note'].replace('⚡', '').strip()
            session_content.append(Paragraph(f"<b>{clean_note}</b>", meta_style))
        
        story.append(KeepTogether(session_content))
        story.append(Spacer(1, 12))
    
    # Pricing
    story.append(Spacer(1, 15))
    story.append(Paragraph("Inversión y Opciones de Pago", section_style))
    
    for option in content_data['pricing']['options']:
        # Limpiar precio de emojis
        clean_price = option['price'].replace('🎉', '').strip()
        story.append(Paragraph(clean_price, price_style))
        story.append(Paragraph(option['description'], normal_style))
        story.append(Spacer(1, 8))
    
    if 'includes' in content_data['pricing']:
        story.append(Spacer(1, 8))
        story.append(Paragraph("<b>Todos los paquetes incluyen:</b>", session_title_style))
        includes_text = ""
        for item in content_data['pricing']['includes']:
            includes_text += f"• {item}<br/>"
        story.append(Paragraph(includes_text, normal_style))
    
    story.append(Spacer(1, 15))
    
    # Contact
    story.append(Paragraph("Información y Registro", section_style))
    
    contact_content = []
    if 'email' in content_data['contact']:
        contact_content.append(f"<b>Email:</b> {content_data['contact']['email']}")
    if 'website' in content_data['contact']:
        contact_content.append(f"<b>Website:</b> {content_data['contact']['website']}")
    if 'whatsapp' in content_data['contact']:
        contact_content.append(f"<b>WhatsApp:</b> {content_data['contact']['whatsapp']}")
    
    story.append(Paragraph("<br/>".join(contact_content), normal_style))
    
    if 'process' in content_data['contact']:
        story.append(Spacer(1, 12))
        story.append(Paragraph("<b>Proceso de registro:</b>", session_title_style))
        process_text = ""
        for i, step in enumerate(content_data['contact']['process'], 1):
            process_text += f"{i}. {step}<br/>"
        story.append(Paragraph(process_text, normal_style))
    
    # Footer
    story.append(Spacer(1, 30))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=HexColor('#94A3B8'),
        alignment=TA_CENTER
    )
    story.append(Paragraph("© 2025 FixterGeek - Todos los derechos reservados", footer_style))
    story.append(Paragraph("fixtergeek.com", footer_style))

    # Build PDF
    doc.build(story)
    print(f"PDF generado: {filename}")

if __name__ == "__main__":
    create_workshop_pdf()