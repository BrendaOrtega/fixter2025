import type { Route } from "./+types/book-epub";
import {
  getEpubDownloadUrl,
  BOOK_CONFIG,
  type BookSlug,
} from "~/.server/services/book-access.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const bookSlug = url.searchParams.get("book") as BookSlug | null;

  if (!bookSlug || !BOOK_CONFIG[bookSlug]) {
    return Response.json(
      { success: false, error: "Libro no válido" },
      { status: 400 }
    );
  }

  const result = await getEpubDownloadUrl(request, bookSlug);

  if (!result.success) {
    return Response.json(
      { success: false, error: result.error },
      { status: 403 }
    );
  }

  // Redirect to the download URL
  return Response.redirect(result.url!, 302);
}
