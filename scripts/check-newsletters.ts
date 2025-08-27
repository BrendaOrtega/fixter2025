import { db } from "../app/.server/db";

async function checkNewsletters() {
  console.log("🔍 Verificando newsletters...\n");
  
  const newsletters = await db.newsletter.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  
  for (const newsletter of newsletters) {
    console.log("📧 Newsletter:", newsletter.title);
    console.log("   ID:", newsletter.id);
    console.log("   Status:", newsletter.status);
    console.log("   Recipients:", newsletter.recipients.length);
    console.log("   MessageIds:", newsletter.messageIds.length);
    console.log("   Delivered:", newsletter.delivered.length);
    console.log("   Opened:", newsletter.opened.length);
    console.log("   Clicked:", newsletter.clicked.length);
    
    if (newsletter.messageIds.length > 0) {
      console.log("   Sample MessageId:", newsletter.messageIds[0]);
    }
    
    console.log("---");
  }
  
  // Verificar si hay algún newsletter con aperturas
  const withOpens = await db.newsletter.findFirst({
    where: {
      opened: {
        isEmpty: false
      }
    }
  });
  
  if (withOpens) {
    console.log("✅ Hay newsletters con aperturas registradas!");
    console.log("   Newsletter:", withOpens.title);
    console.log("   Aperturas:", withOpens.opened);
  } else {
    console.log("❌ No hay newsletters con aperturas registradas");
  }
  
  process.exit(0);
}

checkNewsletters().catch(console.error);