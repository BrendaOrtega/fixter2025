import { db } from "../app/.server/db";

const postContent = `Si estás buscando una alternativa más ligera y privada a reCAPTCHA de Google, **Cloudflare Turnstile** es exactamente lo que necesitas. En este tutorial te muestro cómo integrarlo con React Router Framework (antes Remix) de una manera limpia y reutilizable.

---

🎬 **¿Prefieres ver esto en video?** Lo explico paso a paso en nuestro [canal de YouTube](https://youtu.be/Qu2LgHM-bCE).

---

## ¿Por qué Turnstile en lugar de reCAPTCHA?

Antes de meternos al código, vale la pena entender las diferencias:

| Característica | reCAPTCHA | Turnstile |
|----------------|-----------|-----------|
| **Privacidad** | Recopila datos | Más privado |
| **UX** | A veces requiere resolver puzzles | Casi siempre invisible |
| **Velocidad** | Más pesado | Más ligero |
| **Precio** | Gratis con límites | Gratis generoso |

Turnstile valida usuarios sin fricción en la mayoría de los casos, lo que mejora significativamente la experiencia de usuario.

## 1. Configuración en Cloudflare

Primero necesitas obtener tus llaves desde el dashboard de Cloudflare:

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navega a **Turnstile** en el menú lateral
3. Crea un nuevo sitio y obtén tu **Site Key** y **Secret Key**

Guarda estas llaves en tus variables de entorno:

\`\`\`bash
TURNSTILE_SITE_KEY=0x4AAAAAAA...
TURNSTILE_SECRET_KEY=0x4AAAAAAA...
\`\`\`

## 2. Validación en el servidor

Creamos una función utilitaria para validar el token de Turnstile en el servidor:

\`\`\`typescript
// app/.server/turnstile.ts
export async function handleTurnstilePost(request: Request) {
  const formData = await request.formData();
  const token = formData.get("cf-turnstile-response") as string;

  if (!token) {
    return { success: false, error: "Token no proporcionado" };
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey!,
        response: token,
      }),
    }
  );

  const data = await response.json();

  return {
    success: data.success,
    error: data.success ? null : "Verificación fallida",
  };
}
\`\`\`

Esta función:
- Extrae el token del \`formData\`
- Hace una petición POST al API de verificación de Cloudflare
- Retorna el resultado de la validación

## 3. Hook personalizado useScript

Para cargar scripts externos de manera limpia, usamos un hook reutilizable:

\`\`\`typescript
// app/hooks/useScript.ts
import { useEffect, useState } from "react";

export function useScript(src: string) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Verificar si ya existe
    const existingScript = document.querySelector(\`script[src="\${src}"]\`);
    if (existingScript) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError(new Error(\`Error cargando: \${src}\`));

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [src]);

  return { isLoaded, error };
}
\`\`\`

Este hook es útil no solo para Turnstile, sino para cualquier script externo que necesites cargar.

## 4. Componente Turnstile reutilizable

Ahora creamos el componente que renderiza el widget:

\`\`\`tsx
// app/components/Turnstile.tsx
import { useEffect, useRef } from "react";
import { useScript } from "~/hooks/useScript";

declare global {
  interface Window {
    turnstile: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  siteKey: string;
  onSuccess?: (token: string) => void;
  theme?: "light" | "dark" | "auto";
}

export function Turnstile({
  siteKey,
  onSuccess,
  theme = "auto"
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const { isLoaded } = useScript(
    "https://challenges.cloudflare.com/turnstile/v0/api.js"
  );

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;

    // Limpiar widget anterior si existe
    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
    }

    // Renderizar nuevo widget
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onSuccess,
      theme,
    });

    return () => {
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [isLoaded, siteKey, theme]);

  return <div ref={containerRef} />;
}
\`\`\`

El componente:
- Carga el script de Turnstile automáticamente
- Renderiza el widget cuando está listo
- Limpia recursos al desmontarse
- Soporta temas claro, oscuro o automático

## 5. Uso con fetcher.Form

Ahora veamos cómo usarlo con React Router:

\`\`\`tsx
// app/routes/contacto.tsx
import { ActionFunctionArgs } from "react-router";
import { useFetcher } from "react-router";
import { Turnstile } from "~/components/Turnstile";
import { handleTurnstilePost } from "~/.server/turnstile";

export async function action({ request }: ActionFunctionArgs) {
  // Primero validamos Turnstile
  const turnstileResult = await handleTurnstilePost(request);

  if (!turnstileResult.success) {
    return { error: "Verificación de seguridad fallida" };
  }

  // Aquí procesas el formulario normalmente
  const formData = await request.formData();
  const email = formData.get("email");
  const mensaje = formData.get("mensaje");

  // ... tu lógica de contacto

  return { success: true };
}

export default function Contacto() {
  const fetcher = useFetcher();
  const siteKey = "tu-site-key-aqui"; // O desde env/loader

  return (
    <fetcher.Form method="POST">
      <input type="email" name="email" placeholder="Tu email" required />
      <textarea name="mensaje" placeholder="Tu mensaje" required />

      {/* Widget de Turnstile */}
      <Turnstile siteKey={siteKey} />

      <button type="submit" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Enviando..." : "Enviar"}
      </button>

      {fetcher.data?.error && (
        <p className="text-red-500">{fetcher.data.error}</p>
      )}
    </fetcher.Form>
  );
}
\`\`\`

El widget automáticamente añade un campo oculto \`cf-turnstile-response\` al formulario con el token.

## 6. Render explícito para obtener token

Si necesitas el token antes de enviar el formulario (por ejemplo, para validación cliente), puedes usar el callback:

\`\`\`tsx
import { useState } from "react";
import { Turnstile } from "~/components/Turnstile";

export function FormConValidacion() {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
    setIsValid(true);
    console.log("Token recibido:", token);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileToken) {
      alert("Por favor completa la verificación");
      return;
    }

    // Enviar con el token
    const response = await fetch("/api/contacto", {
      method: "POST",
      body: JSON.stringify({
        // ... tus datos
        turnstileToken,
      }),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... campos del formulario */}

      <Turnstile
        siteKey="tu-site-key"
        onSuccess={handleTurnstileSuccess}
      />

      <button type="submit" disabled={!isValid}>
        Enviar
      </button>
    </form>
  );
}
\`\`\`

## Modo de desarrollo

Para pruebas locales, Cloudflare proporciona llaves de prueba:

\`\`\`bash
# Site Key de prueba (siempre pasa)
TURNSTILE_SITE_KEY=1x00000000000000000000AA

# Secret Key de prueba (siempre válido)
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
\`\`\`

También hay llaves que siempre fallan, útiles para probar el manejo de errores:

\`\`\`bash
# Siempre falla
TURNSTILE_SITE_KEY=2x00000000000000000000AB
\`\`\`

## Recursos adicionales

- [Documentación oficial de Turnstile](https://developers.cloudflare.com/turnstile/)
- [Guía de React Router](https://reactrouter.com/)
- [Repositorio con código completo](https://github.com/FixterGeek)

---

Con esto tienes una implementación completa y reutilizable de Cloudflare Turnstile en React Router. Es más liviano, más privado, y generalmente ofrece mejor experiencia de usuario que reCAPTCHA.

Abrazo. Blissmo. 🤓`;

async function main() {
  console.log("Importando post de Cloudflare Turnstile + React Router...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "cloudflare-turnstile-react-router" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "cloudflare-turnstile-react-router",
      title:
        "Cómo añadir Cloudflare Turnstile a tus formularios con React Router Framework",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissito",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Imágenes
      coverImage: "https://i.imgur.com/1yEVPaG.png",
      metaImage: "https://i.imgur.com/1yEVPaG.png",

      // Video de YouTube
      youtubeLink: "https://youtu.be/Qu2LgHM-bCE",

      // Clasificación
      tags: ["cloudflare", "react-router", "recaptcha", "react", "custom-hook"],
      mainTag: "turnstile",

      // Fecha aproximada del post original (Julio 2024)
      createdAt: new Date("2024-07-26T22:59:49.000Z"),
      updatedAt: new Date("2024-07-26T22:59:49.000Z"),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Título: ${post.title}`);
  console.log(`   Autor: ${post.authorName}`);
  console.log(
    `   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`
  );
  console.log(`   YouTube: ${post.youtubeLink}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error importando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
