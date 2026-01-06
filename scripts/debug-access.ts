import { db } from "../app/.server/db";

async function debug() {
  const BOOK_SLUG = "ai-sdk";
  const chapterSlug = "capitulo-08";

  // Simular la consulta del loader
  const chapterAccess = await db.bookChapterAccess.findUnique({
    where: {
      bookSlug_chapterSlug: {
        bookSlug: BOOK_SLUG,
        chapterSlug,
      },
    },
  });

  console.log("Query result:", chapterAccess);

  const accessLevel = chapterAccess?.accessLevel || "public";
  const hasAccess = accessLevel === "public"; // Sin usuario, sin suscripción

  console.log("---");
  console.log("accessLevel:", accessLevel);
  console.log("hasAccess (sin auth):", hasAccess);
  console.log("showSubscriptionDrawer:", hasAccess === false && accessLevel === "subscriber");
  console.log("showPurchaseDrawer:", hasAccess === false && accessLevel === "paid");

  process.exit(0);
}
debug();
