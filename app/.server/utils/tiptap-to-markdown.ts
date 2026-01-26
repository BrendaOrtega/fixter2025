/**
 * Convierte contenido de Tiptap (JSON) a Markdown
 * Usado para generar el campo `body` al guardar posts desde el editor Tiptap
 */

export function tiptapToMarkdown(content: any): string {
  if (!content || !content.content) return "";

  return content.content
    .map((node: any) => nodeToMarkdown(node))
    .filter(Boolean)
    .join("\n\n");
}

function nodeToMarkdown(node: any): string {
  switch (node.type) {
    case "heading":
      const level = node.attrs?.level || 1;
      const prefix = "#".repeat(level);
      return `${prefix} ${getTextContent(node)}`;

    case "paragraph":
      const text = getTextContent(node);
      return text || "";

    case "codeBlock":
      const lang = node.attrs?.language || "";
      const code = getRawTextContent(node);
      return `\`\`\`${lang}\n${code}\n\`\`\``;

    case "blockquote":
      return (
        node.content
          ?.map((n: any) => `> ${nodeToMarkdown(n)}`)
          .join("\n") || ""
      );

    case "bulletList":
      return (
        node.content
          ?.map((item: any) => `- ${getListItemContent(item)}`)
          .join("\n") || ""
      );

    case "orderedList":
      return (
        node.content
          ?.map(
            (item: any, i: number) => `${i + 1}. ${getListItemContent(item)}`
          )
          .join("\n") || ""
      );

    case "listItem":
      return getListItemContent(node);

    case "horizontalRule":
      return "---";

    case "image":
      const alt = node.attrs?.alt || "";
      const src = node.attrs?.src || "";
      const title = node.attrs?.title;
      if (title) {
        return `![${alt}](${src} "${title}")`;
      }
      return `![${alt}](${src})`;

    case "hardBreak":
      return "  \n";

    default:
      // Para nodos desconocidos, intentar extraer texto
      return getTextContent(node);
  }
}

function getTextContent(node: any): string {
  if (!node.content) return node.text || "";

  return node.content
    .map((child: any) => {
      if (child.type === "text") {
        let text = child.text || "";
        // Aplicar marks (bold, italic, code, link, strike)
        if (child.marks) {
          for (const mark of child.marks) {
            switch (mark.type) {
              case "bold":
              case "strong":
                text = `**${text}**`;
                break;
              case "italic":
              case "em":
                text = `*${text}*`;
                break;
              case "code":
                text = `\`${text}\``;
                break;
              case "link":
                const href = mark.attrs?.href || "";
                const linkTitle = mark.attrs?.title;
                if (linkTitle) {
                  text = `[${text}](${href} "${linkTitle}")`;
                } else {
                  text = `[${text}](${href})`;
                }
                break;
              case "strike":
                text = `~~${text}~~`;
                break;
            }
          }
        }
        return text;
      }
      if (child.type === "hardBreak") {
        return "  \n";
      }
      return nodeToMarkdown(child);
    })
    .join("");
}

// Para bloques de código, obtener texto sin formateo
function getRawTextContent(node: any): string {
  if (!node.content) return node.text || "";

  return node.content
    .map((child: any) => {
      if (child.type === "text") {
        return child.text || "";
      }
      return getRawTextContent(child);
    })
    .join("");
}

function getListItemContent(item: any): string {
  if (!item.content) return "";

  return item.content
    .map((n: any) => {
      // Para párrafos dentro de list items, solo extraer texto
      if (n.type === "paragraph") {
        return getTextContent(n);
      }
      // Para listas anidadas
      if (n.type === "bulletList" || n.type === "orderedList") {
        const nested = nodeToMarkdown(n);
        // Indentar listas anidadas
        return nested
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n");
      }
      return getTextContent(n);
    })
    .join("\n");
}
