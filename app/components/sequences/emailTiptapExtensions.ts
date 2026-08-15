import { Extension, Node, mergeAttributes } from "@tiptap/core";

/**
 * Los correos se escriben con estilos INLINE porque Gmail y Outlook ignoran las
 * clases. Tiptap, por su cuenta, descarta cualquier atributo que no conozca: al
 * abrir un correo en el editor y guardarlo, todos los `style` se perderían y el
 * diseño se caería sin que nadie tocara nada.
 *
 * Esta extensión declara `style` como atributo global de los nodos de texto
 * para que sobreviva el viaje HTML → editor → HTML.
 */
export const PreserveStyles = Extension.create({
  name: "preserveStyles",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "listItem", "bulletList", "orderedList"],
        attributes: {
          style: {
            default: null,
            parseHTML: (element) => element.getAttribute("style"),
            renderHTML: (attributes) =>
              attributes.style ? { style: attributes.style } : {},
          },
        },
      },
    ];
  },
});

/**
 * Bloque intocable: tablas de layout (callouts, botones, cards de video) y todo
 * lo que el editor no sabe representar. En vez de dejar que Tiptap lo normalice
 * —lo cual significa perderlo— se guarda su HTML original y se pinta tal cual.
 *
 * Se puede seleccionar, mover y borrar como una sola pieza, pero no editar por
 * dentro. Para cambiarle algo se usa la pestaña de HTML.
 */
export const RawHtmlBlock = Node.create({
  name: "rawHtmlBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      html: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "table",
        priority: 100,
        getAttrs: (element) => ({ html: (element as HTMLElement).outerHTML }),
      },
      {
        // Los <div> que envuelven botones también traen estilos que importan.
        tag: "div",
        priority: 60,
        getAttrs: (element) => {
          const el = element as HTMLElement;
          // Un div vacío o de puro texto no vale la pena congelarlo.
          if (!el.querySelector("a, img, table")) return false;
          return { html: el.outerHTML };
        },
      },
    ];
  },

  renderHTML({ node }) {
    // Se devuelve un contenedor marcado; `serializeEmailHtml` lo reemplaza por
    // el HTML original antes de guardar.
    return [
      "div",
      mergeAttributes({
        "data-raw-html": "true",
        "data-html": node.attrs.html,
      }),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-raw-html", "true");
      dom.className =
        "relative my-2 rounded-md ring-1 ring-dashed ring-gray-300 p-1";
      dom.innerHTML = node.attrs.html;
      dom.contentEditable = "false";
      return { dom };
    };
  },
});

/**
 * Devuelve el HTML del editor con los bloques crudos restituidos: cambia cada
 * `<div data-raw-html data-html="…">` por su contenido original.
 */
export function serializeEmailHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const holder = document.createElement("div");
  holder.innerHTML = html;
  holder.querySelectorAll("[data-raw-html]").forEach((node) => {
    const original = node.getAttribute("data-html") || node.innerHTML;
    const slot = document.createElement("div");
    slot.innerHTML = original;
    node.replaceWith(...Array.from(slot.childNodes));
  });
  return holder.innerHTML;
}
