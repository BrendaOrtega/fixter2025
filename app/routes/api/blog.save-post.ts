import type { Route } from "./+types/blog.save-post";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { tiptapToMarkdown } from "~/.server/utils/tiptap-to-markdown";

export const action = async ({ request }: Route.ActionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  await getAdminOrRedirect(request);

  try {
    const data = await request.json();
    const { postId, title, slug, content, body: bodyMarkdownInput, contentFormat, youtubeLink, metaImage, author, tags, mainTag } = data;

    // Para formato markdown, usamos body directamente
    // Para formato tiptap, usamos content
    const hasContent = contentFormat === "markdown" ? bodyMarkdownInput : content;

    if (!title || !slug || !hasContent) {
      return Response.json(
        { error: "title, slug, and content are required" },
        { status: 400 }
      );
    }

    let authorData;
    switch (author) {
      case "brendi":
        authorData = {
          authorAt: "@brendago",
          photoUrl: "https://i.imgur.com/TFQxcIu.jpg",
          authorAtLink: "https://www.linkedin.com/in/brendago",
          authorName: "BrendaGo",
        };
        break;
      case "david":
        authorData = {
          authorAt: "@DeividZavala",
          photoUrl: "https://i.imgur.com/X7m3EsR.jpg",
          authorAtLink: "https://github.com/DeividZavala",
          authorName: "David Zavala",
        };
        break;
      default:
        authorData = {
          authorAt: "@hectorbliss",
          photoUrl: "https://i.imgur.com/TaDTihr.png",
          authorAtLink: "https://www.hectorbliss.com",
          authorName: "Héctorbliss",
        };
    }

    // Si es markdown directo, usar body; si es tiptap, convertir
    let bodyMarkdown: string;
    let contentToSave: any;

    if (contentFormat === "markdown") {
      bodyMarkdown = bodyMarkdownInput;
      contentToSave = null; // No guardar content JSON para markdown puro
    } else {
      bodyMarkdown = content ? tiptapToMarkdown(content) : "";
      contentToSave = content;
    }

    let post;

    if (postId) {
      post = await db.post.update({
        where: { id: postId },
        data: {
          title,
          slug,
          content: contentToSave,
          body: bodyMarkdown,
          contentFormat: contentFormat || "markdown",
          youtubeLink: youtubeLink || undefined,
          metaImage: metaImage || undefined,
          tags: tags || [],
          mainTag: mainTag || null,
          ...authorData,
          published: true,
        },
      });
    } else {
      post = await db.post.create({
        data: {
          title,
          slug,
          content: contentToSave,
          body: bodyMarkdown,
          contentFormat: contentFormat || "markdown",
          youtubeLink: youtubeLink || undefined,
          metaImage: metaImage || undefined,
          tags: tags || [],
          mainTag: mainTag || null,
          ...authorData,
          published: true,
        },
      });
    }

    return Response.json({
      success: true,
      postId: post.id,
      url: `/blog/${post.slug}`,
    });
  } catch (error: any) {
    console.error("Error saving post:", error);
    return Response.json(
      { error: error.message || "Failed to save post" },
      { status: 500 }
    );
  }
};
