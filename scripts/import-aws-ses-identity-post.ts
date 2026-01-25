import { db } from "../app/.server/db";

const awsSesPostContent = `
En este video te muestro cómo configuro DMARC con DKIM y SPF en AWS Simple Email Service y mi propio dominio, configurando el DNS en SquareSpace. Todo, para enviar correos desde mi app con nodemailer. ✅

## ¿Qué es Amazon SES?

Amazon Simple Email Service (SES) es un servicio de correo electrónico en la nube que te permite enviar emails transaccionales, marketing y notificaciones de manera confiable y escalable.

Para poder enviar correos desde tu propio dominio (por ejemplo, notificaciones@tuempresa.com), necesitas verificar tu identidad ante AWS. Esto involucra configurar registros DNS específicos.

## Los tres pilares de autenticación de email

### 1. SPF (Sender Policy Framework)

SPF le dice a los servidores de correo qué servidores están autorizados para enviar emails en nombre de tu dominio. Sin SPF, tus correos podrían terminar en spam.

### 2. DKIM (DomainKeys Identified Mail)

DKIM agrega una firma digital a cada correo que envías. El servidor receptor puede verificar que el correo realmente viene de tu dominio y no fue modificado en tránsito.

### 3. DMARC (Domain-based Message Authentication)

DMARC combina SPF y DKIM para dar instrucciones a los servidores receptores sobre qué hacer con correos que fallen la autenticación. Puedes configurarlo para:
- Solo monitorear (none)
- Enviar a spam (quarantine)
- Rechazar completamente (reject)

---

🎬 **¿Prefieres ver el proceso completo en video?** Lo explico paso a paso en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Proceso en AWS SES

1. **Crear identidad**: En la consola de SES, agregas tu dominio
2. **Obtener registros DNS**: AWS te proporciona los registros CNAME para DKIM
3. **Configurar DNS**: Agregas los registros en tu proveedor (SquareSpace, GoDaddy, Cloudflare, etc.)
4. **Esperar verificación**: AWS verifica automáticamente (puede tomar hasta 72 horas)
5. **Salir del sandbox**: Solicitar acceso de producción para enviar a cualquier dirección

## Usando con Nodemailer

Una vez verificado tu dominio, puedes usar Nodemailer para enviar correos:

\`\`\`typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'email-smtp.us-east-1.amazonaws.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USER,
    pass: process.env.SES_SMTP_PASSWORD,
  },
});

await transporter.sendMail({
  from: 'notificaciones@tudominio.com',
  to: 'cliente@ejemplo.com',
  subject: 'Tu orden ha sido enviada',
  html: '<h1>¡Gracias por tu compra!</h1>',
});
\`\`\`

## Beneficios de usar SES

- **Costo**: ~$0.10 USD por cada 1,000 correos
- **Deliverability**: Alta tasa de entrega por la reputación de AWS
- **Escalabilidad**: Puede manejar millones de correos
- **Métricas**: Dashboard con bounces, complaints y deliveries

Espero te sea útil.

Abrazo. Bliss. 🤓
`;

async function main() {
  console.log("Importando post de AWS SES Identity...");

  const slug = "como-anadir-identidad-dominio-propio-amazon-ses";
  const title = "Cómo añadir una identidad (dominio propio) a Amazon Simple Email Service";

  // Verificar si ya existe por slug o título
  const existingBySlug = await db.post.findUnique({
    where: { slug },
  });

  const existingByTitle = await db.post.findUnique({
    where: { title },
  });

  const existing = existingBySlug || existingByTitle;

  if (existing) {
    console.log("⚠️  El post ya existe (ID: " + existing.id + "). Actualizando...");
    const post = await db.post.update({
      where: { id: existing.id },
      data: {
        slug,
        title,
        body: awsSesPostContent.trim(),
        published: true,
        coverImage: "https://i.imgur.com/H4Km02e.png",
        metaImage: "https://i.imgur.com/H4Km02e.png",
        youtubeLink: "https://youtu.be/aaOqVNkeC1U",
        authorName: "Héctorbliss",
        authorAt: "@blissito",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        tags: ["aws", "ses", "nodemailer", "dns", "dkim"],
        mainTag: "ses",
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title,
      body: awsSesPostContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/H4Km02e.png",
      metaImage: "https://i.imgur.com/H4Km02e.png",

      // YouTube
      youtubeLink: "https://youtu.be/aaOqVNkeC1U",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissito",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Clasificación
      tags: ["aws", "ses", "nodemailer", "dns", "dkim"],
      mainTag: "ses",
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error creando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
