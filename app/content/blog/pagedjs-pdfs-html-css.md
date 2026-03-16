# Paged.js: Cómo Generar PDFs Profesionales con HTML y CSS (Sin LaTeX ni InDesign)

Hay cosas que deberían ser simples. Generar un PDF desde código es una de ellas. Pero si alguna vez lo has intentado, sabes que la realidad es otra: terminas en un rabbit hole de herramientas rotas, hacks y frustración.

Esta es la historia de cómo descubrimos Paged.js y por qué cambió completamente nuestra forma de generar documentos en [EasyBits](https://www.easybits.cloud).

---

## El Problema

### Quieres un PDF bonito y terminas peleando con herramientas de los 90s

Piénsalo: HTML y CSS son el sistema de layout más poderoso que existe. Puedes crear cualquier diseño imaginable en un navegador. Pero en el momento en que necesitas ese mismo diseño en un PDF... todo se rompe.

Las opciones "clásicas" son un desastre:

- **wkhtmltopdf**: abandonado, renderiza con un WebKit de 2015, no soporta CSS Grid ni Flexbox moderno. Es como intentar ver Netflix en un televisor de tubo.
- **Puppeteer + `page.pdf()`**: funciona, pero no tiene concepto real de paginación. Tu contenido se corta donde le da la gana — a la mitad de una tabla, en medio de un párrafo, sin piedad.
- **LaTeX**: poderoso, pero la curva de aprendizaje es brutal. Para un dev web, aprender LaTeX es como aprender a pilotar un avión para ir a la tienda de la esquina.
- **InDesign / Word**: manuales, lentos, imposibles de automatizar. Si generas 50 reportes al mes, no es opción.

En [EasyBits](https://www.easybits.cloud) nos topamos con este problema de frente: estábamos generando contenido educativo con IA y necesitábamos que el resultado final se viera editorial — con portada, paginación, headers, footers, el paquete completo. No un HTML renderizado a la fuerza en un PDF, sino un documento que se sintiera diseñado.

Y ahí fue donde encontramos Paged.js.

---

🎬 Si prefieres ver esto en acción, tenemos tutoriales paso a paso en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## La Solución

### El CSS ya tiene un spec para esto — Paged.js lo hace funcionar

Aquí viene lo interesante: el W3C lleva años trabajando en un spec llamado **CSS Paged Media**. Este spec define cómo debería comportarse CSS cuando el destino no es una pantalla, sino una página impresa — con márgenes, numeración, saltos de página, headers y footers.

El problema es que ningún navegador lo implementa completamente.

**Paged.js** (creado en 2018 por el equipo de Coko Foundation) es un polyfill open source que hace exactamente eso: toma el spec de CSS Paged Media y lo hace funcionar en cualquier navegador moderno.

### ¿Cómo funciona?

Paged.js tiene dos motores internos:

1. **Chunker**: toma tu contenido HTML y lo divide en páginas reales, respetando saltos de página, evitando cortes feos en párrafos y tablas.
2. **Polisher**: interpreta las reglas CSS de Paged Media (`@page`, márgenes con nombre, contadores) y las aplica como CSS que el navegador sí entiende.

Todo con una sola línea de script.

### Ejemplo mínimo

Esto es todo lo que necesitas para empezar:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    @page {
      size: letter;
      margin: 2.5cm;

      @bottom-center {
        content: "Página " counter(page) " de " counter(pages);
        font-size: 10pt;
        color: #666;
      }
    }

    @page :first {
      @bottom-center {
        content: none; /* Sin número en la portada */
      }
    }

    .portada {
      page: portada;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    h1 {
      break-before: page; /* Cada H1 empieza en página nueva */
    }

    table, figure {
      break-inside: avoid; /* Nunca cortar tablas ni figuras */
    }
  </style>

  <!-- Esta línea es la magia -->
  <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
</head>
<body>
  <section class="portada">
    <h1>Mi Reporte Profesional</h1>
  </section>

  <h1>Capítulo 1: Introducción</h1>
  <p>Tu contenido aquí. Paged.js se encarga de paginarlo correctamente...</p>

  <h1>Capítulo 2: Resultados</h1>
  <p>Más contenido. Las páginas se crean automáticamente.</p>
</body>
</html>
```

Abre ese archivo en Chrome y verás tu documento paginado, con numeración automática y portada sin número de página. Así de simple.

### Las reglas CSS que necesitas conocer

Para principiantes, estas son las más útiles:

| Regla | Qué hace |
|-------|----------|
| `@page { size: letter; }` | Define el tamaño de página |
| `@page { margin: 2cm; }` | Márgenes de impresión |
| `@bottom-center { content: counter(page); }` | Número de página al pie |
| `break-before: page` | Fuerza salto de página antes del elemento |
| `break-inside: avoid` | Evita que el elemento se corte entre páginas |
| `@page :first` | Estilos solo para la primera página |
| `page: nombre` | Asigna un tipo de página con nombre |

Todo esto es CSS estándar del spec Paged Media. No son inventos de Paged.js — es CSS que *debería* funcionar en navegadores pero aún no lo hace sin el polyfill.

### Cómo lo usamos con IA en EasyBits

En [EasyBits](https://www.easybits.cloud) combinamos esto con generación de contenido por IA:

1. **El usuario describe qué necesita** — un reporte, un curso, un documento técnico.
2. **La IA genera el contenido** en HTML semántico con las clases CSS apropiadas.
3. **Paged.js lo pagina** automáticamente con el diseño editorial definido en CSS.
4. **Puppeteer en el servidor** renderiza el resultado final como PDF.

El resultado es un pipeline 100% automatizado: de prompt a PDF editorial en segundos. Sin intervención manual, sin ajustar márgenes a mano, sin pelearte con Word.

> "La parte más satisfactoria fue darnos cuenta de que el CSS que ya sabíamos era suficiente. No tuvimos que aprender una herramienta nueva — solo un spec nuevo."

---

## El Resultado

### PDFs con calidad editorial desde el navegador

Después de integrar Paged.js en nuestro pipeline:

- **Pipeline 100% web**: HTML + CSS + JavaScript. Nada más. Sin binarios externos, sin dependencias del sistema operativo.
- **Cero curva de aprendizaje nueva**: si sabes CSS, ya sabes el 80% de lo que necesitas. Las reglas de `@page` se aprenden en una tarde.
- **Compatible con Puppeteer para servidor**: `page.pdf()` de Puppeteer respeta las reglas de Paged.js, así que puedes generar PDFs headless en producción.
- **Diseño real, no "HTML exportado"**: portadas, headers, footers, numeración, páginas con nombre, saltos inteligentes. Se siente como un documento diseñado, no como una captura de pantalla.

Hay que ser honestos con las limitaciones:

- Paged.js es un **proyecto comunitario** — no tiene el respaldo de una empresa grande, aunque su comunidad es activa.
- Funciona mejor en **Chromium** (Chrome, Edge, Brave). Firefox y Safari pueden dar resultados inconsistentes.
- La versión actual es **0.4.3** — funcional y estable para producción, pero no es un 1.0.

> "Nos dejamos de pelear con herramientas de generación de PDFs y empezamos a diseñar documentos como lo que son: páginas web que se imprimen bonito."

---

## Conclusión

### Tu navegador es tu imprenta

HTML y CSS nacieron para presentar contenido. Durante años asumimos que "presentar" significaba solo "en pantalla", pero el spec de Paged Media demuestra que el navegador puede ser un pipeline editorial completo.

Paged.js es el puente que faltaba entre la web que ya conoces y los documentos impresos que necesitas generar. No necesitas LaTeX, no necesitas InDesign, no necesitas herramientas de los 90s. Necesitas el CSS que ya sabes y un polyfill de 50KB.

Si quieres ver cómo funciona esto en un producto real, echa un vistazo a [EasyBits](https://www.easybits.cloud). Y si quieres aprender más sobre las herramientas que usamos para construir, pásate por nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek) donde compartimos todo lo que aprendemos.

Abrazo. bliss.
