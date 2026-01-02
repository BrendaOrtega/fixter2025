#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
from ebooklib import epub
import markdown
from pathlib import Path

def create_epub():
    """Genera un archivo EPUB del libro AI SDK con React Router v7"""

    # Crear el libro
    book = epub.EpubBook()

    # Metadatos
    book.set_identifier('ai-sdk-react-router-001')
    book.set_title('Introducción al AI-SDK con React Router v7')
    book.set_language('es')
    book.add_author('Héctorbliss')
    book.add_metadata('DC', 'publisher', 'FixterGeek')
    book.add_metadata('DC', 'creator', 'Héctorbliss')
    book.add_metadata('DC', 'source', 'fixtergeek.com')
    book.add_metadata('DC', 'description',
                      'Aprende a integrar inteligencia artificial en tus aplicaciones TypeScript con el AI SDK de Vercel. '
                      'Sin Python, solo TypeScript. Desde streaming básico hasta agentes avanzados.')

    # CSS personalizado - Azul TypeScript (#3178C6)
    css = '''
    @namespace epub "http://www.idpf.org/2007/ops";
    body {
        font-family: Georgia, serif;
        line-height: 1.6;
        margin: 1em;
    }
    h1, h2, h3, h4, h5, h6 {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        color: #333;
    }
    h1 {
        font-size: 2em;
        border-bottom: 2px solid #3178C6;
        padding-bottom: 0.3em;
    }
    h2 {
        font-size: 1.5em;
        color: #3178C6;
    }
    h3 {
        font-size: 1.3em;
    }
    code {
        background-color: #f4f4f4;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: "Courier New", monospace;
        font-size: 0.9em;
    }
    pre {
        background-color: #1e1e1e;
        color: #d4d4d4;
        padding: 15px;
        border-radius: 5px;
        overflow-x: auto;
        line-height: 1.4;
        border: 1px solid #333;
    }
    pre code {
        background-color: transparent;
        color: inherit;
        padding: 0;
        display: block;
    }
    blockquote {
        border-left: 4px solid #3178C6;
        margin-left: 0;
        padding-left: 20px;
        font-style: italic;
        color: #666;
    }
    a {
        color: #3178C6;
        text-decoration: none;
    }
    a:hover {
        text-decoration: underline;
    }
    ul, ol {
        padding-left: 30px;
    }
    li {
        margin-bottom: 0.5em;
    }
    strong {
        font-weight: bold;
    }
    em {
        font-style: italic;
    }
    .typescript-badge {
        background-color: #3178C6;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.8em;
    }
    '''

    # Añadir CSS
    nav_css = epub.EpubItem(uid="style_nav",
                            file_name="style/nav.css",
                            media_type="text/css",
                            content=css)
    book.add_item(nav_css)

    # Lista de capítulos - se sincroniza con app/routes/libros/ai_sdk.tsx
    chapters_info = [
        {"id": "prologo", "title": "Prólogo", "slug": "prologo"},
        {"id": "intro", "title": "Introducción", "slug": "introduccion"},
        {"id": "01", "title": "Tu Primera Inferencia con IA", "slug": "capitulo-01"},
        {"id": "02", "title": "React y el Hook useChat", "slug": "capitulo-02"},
        {"id": "03", "title": "Dentro del Streaming", "slug": "capitulo-03"},
        {"id": "04", "title": "El Atajo", "slug": "capitulo-04"},
    ]

    # Directorio donde están los archivos markdown
    content_dir = Path(__file__).parent.parent / "content" / "ai-sdk"

    # Procesar cada capítulo
    epub_chapters = []
    spine = ['nav']

    for i, chapter_info in enumerate(chapters_info):
        # Leer archivo markdown
        md_file = content_dir / f"{chapter_info['slug']}.md"

        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                md_content = f.read()

            # Convertir markdown a HTML
            html_content = markdown.markdown(md_content,
                                           extensions=['fenced_code', 'tables', 'nl2br'])

            # Crear capítulo EPUB con ID único para navegación
            chapter_id = f"chapter_{chapter_info['id']}"
            # Usar el título completo como nombre de archivo (sin caracteres especiales)
            safe_title = chapter_info['title'].replace('?', '').replace('¿', '').replace(' ', '_').replace(':', '').replace(',', '').replace('-', '_')
            safe_filename = f"{safe_title}.xhtml"
            chapter = epub.EpubHtml(title=chapter_info['title'],
                                   file_name=safe_filename,
                                   lang='es',
                                   uid=chapter_id)

            # Envolver el HTML con estructura adecuada
            chapter.content = f'''
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <title>{chapter_info['title']}</title>
                <link rel="stylesheet" type="text/css" href="style/nav.css"/>
            </head>
            <body>
                <h1>{chapter_info['title']}</h1>
                {html_content}
            </body>
            </html>
            '''

            # Añadir CSS al capítulo
            chapter.add_item(nav_css)

            # Añadir capítulo al libro
            book.add_item(chapter)
            epub_chapters.append(chapter)
            spine.append(chapter)

            print(f"✓ Procesado: {chapter_info['title']}")

        except FileNotFoundError:
            print(f"⚠ Archivo no encontrado: {md_file}")
        except Exception as e:
            print(f"✗ Error procesando {chapter_info['slug']}: {e}")

    # Crear tabla de contenidos explícita con títulos correctos
    toc_entries = []
    for i, chapter in enumerate(epub_chapters):
        chapter_info = chapters_info[i]
        # Crear entrada del TOC con título explícito
        toc_entry = epub.Link(chapter.file_name, chapter_info['title'], f"chapter_{chapter_info['id']}")
        toc_entries.append(toc_entry)

    book.toc = toc_entries

    # Añadir navegación
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # Definir spine (orden de lectura)
    book.spine = spine

    # Generar el archivo EPUB
    output_path = Path(__file__).parent.parent.parent / "public" / "ai-sdk-react-router.epub"
    epub.write_epub(output_path, book, {})

    print(f"\n✅ EPUB generado exitosamente: {output_path}")
    print(f"   Tamaño: {output_path.stat().st_size / 1024:.2f} KB")

    return str(output_path)

if __name__ == "__main__":
    try:
        # Instalar markdown si no está instalado
        try:
            import markdown
        except ImportError:
            print("Instalando markdown...")
            os.system("pip3 install markdown")
            import markdown

        epub_path = create_epub()

        # Si se pasa como argumento, devolver la ruta
        if len(sys.argv) > 1 and sys.argv[1] == "--return-path":
            print(epub_path)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
