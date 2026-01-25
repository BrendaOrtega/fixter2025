import { db } from "../app/.server/db";

const postContent = `Cuando construyes una aplicación web que está disponible para todo el mundo, inevitablemente vas a recibir visitas de **robots**. Algunos son inofensivos (como los de Google que indexan tu sitio), pero otros tienen intenciones menos nobles: **spam masivo**, **ataques de fuerza bruta**, o **web scraping** agresivo que satura tu servidor.

Aquí es donde entra **Google reCAPTCHA** como tu primera línea de defensa. En este post te comparto un hook personalizado que uso en todos mis proyectos de React para integrar reCAPTCHA v3 de manera limpia y reutilizable.

https://youtu.be/5RUV9TS7pR8

## El problema

reCAPTCHA v3 funciona de manera invisible: no requiere que el usuario resuelva puzzles ni haga clic en checkboxes. Analiza el comportamiento del usuario y genera un **token** que debes validar en tu servidor. Sin embargo, integrarlo correctamente en React puede ser tedioso:

- Cargar el script de Google
- Esperar a que esté listo
- Ejecutar la acción y obtener el token
- Manejar errores y estados de carga

---

🎬 **¿Prefieres aprender en video?** Este tema y muchos más los cubrimos en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek). ¡Suscríbete para más contenido!

---

## La solución: useRecaptcha hook

Este hook encapsula toda esa lógica en una interfaz simple y declarativa:

\`\`\`tsx
// useRecaptcha.tsx
import { useCallback, useState, useEffect } from "react";

// Tipos para Google reCAPTCHA
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string }
      ) => Promise<string>;
    };
  }
}

type Props = {
  siteKey?: string;
  action?: string;
};

export const useRecaptcha = ({
  siteKey = "TU_SITE_KEY_AQUÍ",
  action = "form_submit",
}: Props = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar el script de reCAPTCHA
  useEffect(() => {
    // Evitar cargar múltiples veces
    if (document.getElementById("recaptcha-script")) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "recaptcha-script";
    script.src = \`https://www.google.com/recaptcha/api.js?render=\${siteKey}\`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.grecaptcha.ready(() => {
        setIsLoaded(true);
      });
    };

    script.onerror = () => {
      setError("Error al cargar reCAPTCHA");
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup si es necesario
    };
  }, [siteKey]);

  // Función para obtener el token
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!isLoaded) {
      setError("reCAPTCHA aún no está listo");
      return null;
    }

    try {
      const token = await window.grecaptcha.execute(siteKey, { action });
      return token;
    } catch (err) {
      setError("Error al ejecutar reCAPTCHA");
      return null;
    }
  }, [isLoaded, siteKey, action]);

  return { getToken, isLoaded, error };
};
\`\`\`

## Cómo usarlo en un formulario

\`\`\`tsx
import { useRecaptcha } from "~/lib/useRecaptcha";

export default function ContactForm() {
  const { getToken, isLoaded, error } = useRecaptcha({
    siteKey: "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI", // Tu site key
    action: "contact_form",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Obtener token de reCAPTCHA
    const token = await getToken();

    if (!token) {
      console.error("No se pudo obtener token de reCAPTCHA");
      return;
    }

    // Enviar el formulario con el token
    const formData = new FormData(e.target as HTMLFormElement);
    formData.append("recaptchaToken", token);

    // Tu lógica de envío aquí...
    await fetch("/api/contact", {
      method: "POST",
      body: formData,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit" disabled={!isLoaded}>
        {isLoaded ? "Enviar" : "Cargando..."}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </form>
  );
}
\`\`\`

## Validación en el servidor

El token que obtienes en el cliente debe ser validado en tu servidor. Aquí está el endpoint que uso con Remix/React Router:

\`\`\`typescript
// app/routes/api.verify-recaptcha.ts
import { json, type ActionFunctionArgs } from "@remix-run/node";

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const token = formData.get("recaptchaToken") as string;

  if (!token) {
    return json({ success: false, error: "Token no proporcionado" }, { status: 400 });
  }

  // Verificar con Google
  const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: \`secret=\${RECAPTCHA_SECRET}&response=\${token}\`,
  });

  const data = await response.json();

  if (!data.success || data.score < 0.5) {
    return json({
      success: false,
      error: "Verificación fallida",
      score: data.score
    }, { status: 403 });
  }

  // Token válido, continuar con la lógica
  return json({ success: true, score: data.score });
};
\`\`\`

## El score de reCAPTCHA v3

Una característica importante de v3 es que retorna un **score** entre 0.0 y 1.0:

- **1.0**: Muy probablemente humano
- **0.0**: Muy probablemente bot

En el código de arriba uso \`0.5\` como umbral, pero puedes ajustarlo según tus necesidades. Para formularios críticos (como pagos), podrías usar \`0.7\` o más.

## Consejos finales

1. **No bloquees completamente**: En lugar de bloquear al usuario, considera mostrar un CAPTCHA tradicional cuando el score sea bajo
2. **Registra los scores**: Guarda los scores en tu base de datos para analizar patrones
3. **Usa diferentes actions**: Cada formulario debería tener su propia action para mejor análisis
4. **Variables de entorno**: Nunca expongas tu \`SECRET_KEY\` en el cliente, solo la \`SITE_KEY\`

Abrazo. bliss.`;

async function main() {
  console.log("Importando post de useRecaptcha hook...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "como_usar_recaptcha_en_react_userecaptcha_hook_j1lxr" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "como_usar_recaptcha_en_react_userecaptcha_hook_j1lxr",
      title: "Cómo usar recaptcha en React: useRecaptcha hook",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Imágenes
      coverImage: "https://i.imgur.com/Q5HI8v2.png",
      metaImage: "https://i.imgur.com/Q5HI8v2.png",

      // Clasificación
      tags: ["remix", "react", "hooks", "google recaptcha"],
      mainTag: "recaptcha",

      // Fecha original: 29 Dic 2024
      createdAt: new Date("2024-12-29T12:00:00Z"),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Autor: ${post.authorName}`);
  console.log(`   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`);
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
