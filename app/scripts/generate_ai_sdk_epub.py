#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
from ebooklib import epub
import markdown
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv(Path(__file__).parent.parent.parent / ".env")

# S3 Configuration
S3_BUCKET = os.getenv("AWS_S3_BUCKET", "wild-bird-2039")
S3_REGION = os.getenv("AWS_REGION", "auto")
S3_ENDPOINT = os.getenv("AWS_ENDPOINT_URL_S3")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

# S3 key for the EPUB (single version, always overwritten)
EPUB_S3_KEY = "fixtergeek/books/ai-sdk.epub"

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

    # ========== PORTADA ==========
    # La imagen debe estar en: public/covers/ai-sdk-cover.png
    cover_path = Path(__file__).parent.parent.parent / "public" / "covers" / "ai-sdk-cover.png"

    if cover_path.exists():
        print(f"📖 Agregando portada: {cover_path}")
        with open(cover_path, 'rb') as cover_file:
            cover_content = cover_file.read()

        # Agregar imagen de portada
        book.set_cover("cover.png", cover_content)

        # Crear página de portada
        cover_page = epub.EpubHtml(title='Portada', file_name='cover.xhtml', lang='es')
        cover_page.content = '''
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <title>Portada</title>
            <style>
                body { margin: 0; padding: 0; text-align: center; }
                img { max-width: 100%; max-height: 100%; }
            </style>
        </head>
        <body>
            <img src="cover.png" alt="Portada"/>
        </body>
        </html>
        '''
        book.add_item(cover_page)
    else:
        print(f"⚠️  Portada no encontrada en: {cover_path}")
        print(f"   Genera la imagen y colócala en: public/covers/ai-sdk-cover.png")
        cover_page = None

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
    # 12 capítulos + prólogo + introducción
    chapters_info = [
        {"id": "prologo", "title": "Prólogo", "slug": "prologo"},
        {"id": "intro", "title": "Introducción", "slug": "introduccion"},
        {"id": "01", "title": "Tu Primera Inferencia con IA", "slug": "capitulo-01"},
        {"id": "02", "title": "React y el Hook useChat", "slug": "capitulo-02"},
        {"id": "03", "title": "Dentro del Streaming", "slug": "capitulo-03"},
        {"id": "04", "title": "React Router v7 — Tu Chat Full-Stack", "slug": "capitulo-04"},
        {"id": "05", "title": "Structured Output — Respuestas Tipadas", "slug": "capitulo-05"},
        {"id": "06", "title": "Tools — Dándole Manos al Modelo", "slug": "capitulo-06"},
        {"id": "07", "title": "Agentes — Encapsulando la Inteligencia", "slug": "capitulo-07"},
        {"id": "08", "title": "generateImage — Creando Imágenes con Código", "slug": "capitulo-08"},
        {"id": "09", "title": "Embeddings — Búsqueda Semántica", "slug": "capitulo-09"},
        {"id": "10", "title": "RAG — Retrieval Augmented Generation", "slug": "capitulo-10"},
        {"id": "11", "title": "Agentic RAG — Agentes con Conocimiento", "slug": "capitulo-11"},
        {"id": "12", "title": "Audio y Speech — Voz e IA", "slug": "capitulo-12"},
    ]

    # Directorio donde están los archivos markdown
    content_dir = Path(__file__).parent.parent / "content" / "ai-sdk"

    # Procesar cada capítulo
    epub_chapters = []
    # Si hay portada, ponerla primero en el spine
    spine = [cover_page, 'nav'] if cover_page else ['nav']

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
            safe_title = chapter_info['title'].replace('?', '').replace('¿', '').replace(' ', '_').replace(':', '').replace(',', '').replace('-', '_').replace('—', '_')
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

    # Generar el archivo EPUB en directorio temporal
    output_path = Path(__file__).parent.parent.parent / "tmp" / "ai-sdk.epub"
    output_path.parent.mkdir(exist_ok=True)
    epub.write_epub(output_path, book, {})

    print(f"\n✅ EPUB generado localmente: {output_path}")
    print(f"   Tamaño: {output_path.stat().st_size / 1024:.2f} KB")

    return str(output_path)


def upload_to_s3(local_path: str) -> str:
    """Sube el EPUB a S3 (sobrescribe si existe)"""
    import boto3
    from botocore.config import Config

    if not AWS_ACCESS_KEY or not AWS_SECRET_KEY:
        raise ValueError("AWS credentials not configured")

    print(f"\n📤 Subiendo a S3...")
    print(f"   Bucket: {S3_BUCKET}")
    print(f"   Key: {EPUB_S3_KEY}")

    # Configure S3 client
    client_config = Config(
        signature_version='s3v4',
        s3={'addressing_style': 'path'}
    )

    s3_client = boto3.client(
        's3',
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        region_name=S3_REGION,
        config=client_config
    )

    # Upload with proper content type
    with open(local_path, 'rb') as f:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=EPUB_S3_KEY,
            Body=f.read(),
            ContentType='application/epub+zip',
            ContentDisposition='attachment; filename="ai-sdk-react-router.epub"'
        )

    # Build the URL (private, needs presigned URL to access)
    if S3_ENDPOINT:
        s3_url = f"{S3_ENDPOINT}/{S3_BUCKET}/{EPUB_S3_KEY}"
    else:
        s3_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{EPUB_S3_KEY}"

    print(f"✅ Subido exitosamente a S3")
    print(f"   URL (privada): {s3_url}")

    return s3_url


if __name__ == "__main__":
    try:
        # Instalar dependencias si no están instaladas
        try:
            import markdown
        except ImportError:
            print("Instalando markdown...")
            os.system("pip3 install markdown")
            import markdown

        try:
            import boto3
        except ImportError:
            print("Instalando boto3...")
            os.system("pip3 install boto3")
            import boto3

        try:
            from dotenv import load_dotenv
        except ImportError:
            print("Instalando python-dotenv...")
            os.system("pip3 install python-dotenv")
            from dotenv import load_dotenv

        # Generate EPUB locally
        epub_path = create_epub()

        # Upload to S3 (unless --local-only flag)
        if "--local-only" not in sys.argv:
            s3_url = upload_to_s3(epub_path)
            print(f"\n🎉 EPUB disponible en S3 (requiere presigned URL para acceder)")
        else:
            print(f"\n📁 EPUB generado solo localmente: {epub_path}")

        # Return path if requested
        if "--return-path" in sys.argv:
            print(epub_path)

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
