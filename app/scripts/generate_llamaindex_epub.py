#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
from ebooklib import epub
import markdown
from pathlib import Path
import urllib.request

def create_llamaindex_epub():
    """Genera un archivo EPUB del libro Agent Workflows de LlamaIndex TypeScript"""

    # Crear el libro
    book = epub.EpubBook()

    # Metadatos
    book.set_identifier('llamaindex-agent-workflows-001')
    book.set_title('Agent Workflows de LlamaIndex TypeScript')
    book.set_language('es')
    book.add_author('Héctorbliss')
    book.add_metadata('DC', 'publisher', 'FixterGeek')
    book.add_metadata('DC', 'creator', 'Héctorbliss')
    book.add_metadata('DC', 'source', 'fixtergeek.com')
    book.add_metadata('DC', 'description',
                      'Domina los Agent Workflows de LlamaIndex con TypeScript. '
                      'Aprende a crear workflows inteligentes paso a paso con ejemplos prácticos. '
                      'Una guía completa para desarrolladores que quieren dominar la automatización inteligente.')

    # CSS personalizado con colores de LlamaIndex
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
        border-bottom: 2px solid #0066cc;
        padding-bottom: 0.3em;
    }
    h2 {
        font-size: 1.5em;
        color: #0066cc;
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
        background-color: #f4f4f4;
        padding: 15px;
        border-radius: 5px;
        overflow-x: auto;
        line-height: 1.4;
        border: 1px solid #ddd;
    }
    pre code {
        background-color: transparent;
        padding: 0;
        display: block;
    }
    blockquote {
        border-left: 4px solid #0066cc;
        margin-left: 0;
        padding-left: 20px;
        font-style: italic;
        color: #666;
    }
    a {
        color: #0066cc;
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
    '''

    # Añadir CSS
    nav_css = epub.EpubItem(uid="style_nav",
                            file_name="style/nav.css",
                            media_type="text/css",
                            content=css)
    book.add_item(nav_css)

    # Añadir imagen de portada desde archivo temporal
    try:
        cover_path = "/tmp/llamaindex_cover.jpg"
        if os.path.exists(cover_path):
            with open(cover_path, 'rb') as cover_file:
                cover_data = cover_file.read()

            cover_image = epub.EpubItem(uid="cover_image",
                                      file_name="images/cover.jpg",
                                      media_type="image/jpeg",
                                      content=cover_data)
            book.add_item(cover_image)
            book.set_cover("images/cover.jpg", cover_data)
            print("✓ Portada añadida desde Pexels")
        else:
            print("⚠ No se encontró imagen de portada, continuando sin ella")
    except Exception as e:
        print(f"⚠ Error añadiendo portada: {e}")
        print("📖 Continuando sin imagen de portada")

    # Lista de capítulos de LlamaIndex
    chapters_info = [
        {"id": "prólogo", "title": "Prólogo", "slug": "prologo"},
        {"id": "intro", "title": "Introducción", "slug": "introduccion"},
        {"id": "01", "title": "¿Qué son los Agent Workflows?", "slug": "capitulo-01"},
        {"id": "02", "title": "Tu Primer Workflow", "slug": "capitulo-02"},
        {"id": "03", "title": "Steps y Eventos", "slug": "capitulo-03"},
        {"id": "04", "title": "Workflows con Múltiples Steps", "slug": "capitulo-04"},
        {"id": "05", "title": "Streaming en Tiempo Real", "slug": "capitulo-05"},
        {"id": "06", "title": "Integrando Tools Externos", "slug": "capitulo-06"},
        {"id": "07", "title": "Patrones y Mejores Prácticas", "slug": "capitulo-07"},
    ]

    # Directorio donde están los archivos markdown de LlamaIndex
    content_dir = Path(__file__).parent.parent / "content" / "llamaindex"

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

            # Crear capítulo EPUB
            chapter = epub.EpubHtml(title=chapter_info['title'],
                                   file_name=f'chap_{i+1:02d}.xhtml',
                                   lang='es')

            # Envolver el HTML con estructura adecuada (sin duplicar título)
            chapter.content = f'''
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <title>{chapter_info['title']}</title>
                <link rel="stylesheet" type="text/css" href="style/nav.css"/>
            </head>
            <body>
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

    # Crear tabla de contenidos dinámicamente
    book.toc = epub_chapters

    # Añadir página de navegación
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # Definir spine (orden de lectura)
    book.spine = spine

    # Generar el archivo EPUB
    output_path = Path(__file__).parent.parent.parent / "public" / "agent-workflows-llamaindex.epub"
    epub.write_epub(output_path, book, {})

    print(f"\n✅ EPUB de LlamaIndex generado exitosamente: {output_path}")
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

        epub_path = create_llamaindex_epub()

        # Si se pasa como argumento, devolver la ruta
        if len(sys.argv) > 1 and sys.argv[1] == "--return-path":
            print(epub_path)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)