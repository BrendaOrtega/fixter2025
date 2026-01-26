import { db } from "../app/.server/db";

const postContent = `Cuando construyes una aplicación web que recibe tráfico del mundo entero, inevitablemente vas a recibir visitas de **bots**. Algunos son inofensivos, pero otros intentarán hacer spam, ataques de fuerza bruta o saturar tu servidor.

**Google reCAPTCHA** es una excelente primera línea de defensa. En este post te muestro cómo integrarlo en una aplicación de **Remix** con React.

## Las dos piezas necesarias

Para integrar reCAPTCHA necesitas implementar dos partes:

1. **El cliente (React)**: Un componente que carga el script de Google y ejecuta la verificación
2. **El servidor (Remix)**: Un action que valida el token con la API de Google

Veamos cada una.

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## El componente Recaptcha

Este componente encapsula toda la lógica del cliente. Lo puedes usar en cualquier formulario:

\`\`\`tsx
// app/components/Recaptcha.tsx
import { useCallback, useEffect, useState } from "react";

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

type RecaptchaProps = {
  siteKey: string;
  action?: string;
  onVerify: (token: string) => void;
  children: (props: {
    execute: () => Promise<void>;
    isReady: boolean
  }) => React.ReactNode;
};

export function Recaptcha({
  siteKey,
  action = "submit",
  onVerify,
  children
}: RecaptchaProps) {
  const [isReady, setIsReady] = useState(false);

  // Cargar el script de reCAPTCHA
  useEffect(() => {
    if (document.getElementById("recaptcha-script")) {
      window.grecaptcha.ready(() => setIsReady(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "recaptcha-script";
    script.src = \`https://www.google.com/recaptcha/api.js?render=\${siteKey}\`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.grecaptcha.ready(() => setIsReady(true));
    };

    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById("recaptcha-script");
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [siteKey]);

  const execute = useCallback(async () => {
    if (!isReady) {
      console.warn("reCAPTCHA no está listo");
      return;
    }

    const token = await window.grecaptcha.execute(siteKey, { action });
    onVerify(token);
  }, [isReady, siteKey, action, onVerify]);

  return <>{children({ execute, isReady })}</>;
}
\`\`\`

## Uso del componente

\`\`\`tsx
// app/routes/contacto.tsx
import { Recaptcha } from "~/components/Recaptcha";
import { useFetcher } from "@remix-run/react";

export default function Contacto() {
  const fetcher = useFetcher();

  return (
    <Recaptcha
      siteKey="TU_SITE_KEY_AQUI"
      action="contact_form"
      onVerify={(token) => {
        // Enviar el formulario con el token
        fetcher.submit(
          { token, email: "...", mensaje: "..." },
          { method: "POST" }
        );
      }}
    >
      {({ execute, isReady }) => (
        <form onSubmit={(e) => {
          e.preventDefault();
          execute();
        }}>
          <input name="email" type="email" required />
          <textarea name="mensaje" required />
          <button disabled={!isReady}>
            {isReady ? "Enviar" : "Cargando..."}
          </button>
        </form>
      )}
    </Recaptcha>
  );
}
\`\`\`

## Validación en el servidor con createAssessment

En el servidor, necesitas validar el token que recibiste del cliente. Google ofrece dos APIs:

1. **reCAPTCHA v3 estándar**: Más simple, usa \`siteverify\`
2. **reCAPTCHA Enterprise**: Más potente, usa \`createAssessment\`

Aquí te muestro la implementación con **reCAPTCHA Enterprise** usando \`createAssessment\`:

\`\`\`typescript
// app/.server/recaptcha.ts
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY!;
const PROJECT_ID = process.env.GCP_PROJECT_ID!;

type AssessmentResponse = {
  tokenProperties: {
    valid: boolean;
    action: string;
    createTime: string;
  };
  riskAnalysis: {
    score: number;
    reasons: string[];
  };
  event: {
    token: string;
    siteKey: string;
    expectedAction: string;
  };
};

export async function createAssessment(
  token: string,
  siteKey: string,
  expectedAction: string
): Promise<{ success: boolean; score: number; reasons?: string[] }> {
  const url = \`https://recaptchaenterprise.googleapis.com/v1/projects/\${PROJECT_ID}/assessments?key=\${RECAPTCHA_SECRET}\`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: {
        token,
        siteKey,
        expectedAction,
      },
    }),
  });

  if (!response.ok) {
    console.error("Error en reCAPTCHA:", await response.text());
    return { success: false, score: 0 };
  }

  const data: AssessmentResponse = await response.json();

  // Verificar que el token sea válido
  if (!data.tokenProperties?.valid) {
    return {
      success: false,
      score: 0,
      reasons: ["Token inválido"]
    };
  }

  // Verificar que la acción coincida
  if (data.tokenProperties.action !== expectedAction) {
    return {
      success: false,
      score: 0,
      reasons: ["Acción no coincide"]
    };
  }

  const score = data.riskAnalysis?.score ?? 0;

  // Score >= 0.5 se considera humano
  return {
    success: score >= 0.5,
    score,
    reasons: data.riskAnalysis?.reasons,
  };
}
\`\`\`

## El action de Remix

\`\`\`typescript
// app/routes/contacto.tsx
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { createAssessment } from "~/.server/recaptcha";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const token = formData.get("token") as string;

  if (!token) {
    return json({ error: "Token requerido" }, { status: 400 });
  }

  const assessment = await createAssessment(
    token,
    process.env.RECAPTCHA_SITE_KEY!,
    "contact_form"
  );

  if (!assessment.success) {
    return json({
      error: "Verificación fallida",
      score: assessment.score
    }, { status: 403 });
  }

  // Continuar con la lógica del formulario...
  const email = formData.get("email");
  const mensaje = formData.get("mensaje");

  // Guardar en DB, enviar email, etc.

  return json({ success: true });
};
\`\`\`

## Interpretando el score

reCAPTCHA v3/Enterprise retorna un **score** entre 0.0 y 1.0:

| Score | Interpretación |
|-------|----------------|
| 0.9 - 1.0 | Muy probablemente humano |
| 0.7 - 0.9 | Probablemente humano |
| 0.5 - 0.7 | Sospechoso |
| 0.3 - 0.5 | Probablemente bot |
| 0.0 - 0.3 | Muy probablemente bot |

Mi recomendación:
- **Formularios normales**: Acepta score >= 0.5
- **Pagos/acciones críticas**: Requiere score >= 0.7
- **Score bajo pero no bot**: Muestra un CAPTCHA tradicional como fallback

## Variables de entorno necesarias

\`\`\`bash
# .env
RECAPTCHA_SITE_KEY=6LeXXXXXXXXXXXXXXXXXXXXXX  # Público (va al cliente)
RECAPTCHA_SECRET_KEY=XXXXXXXX                   # Secreto (solo servidor)
GCP_PROJECT_ID=mi-proyecto-123                  # Solo para Enterprise
\`\`\`

## Recursos útiles

- [Documentación oficial de reCAPTCHA](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA Enterprise API](https://cloud.google.com/recaptcha-enterprise/docs)
- [Remix Actions](https://remix.run/docs/en/main/route/action)

Abrazo. bliss.`;

async function main() {
  console.log("Importando post de Remix + React + Recaptcha...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "remix-react-recaptcha-2023" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "remix-react-recaptcha-2023",
      title: "Remix + React + Recaptcha ⚡️",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Imágenes
      coverImage: "https://i.imgur.com/Fyslrdh.png",
      metaImage: "https://i.imgur.com/Fyslrdh.png",

      // Clasificación
      tags: ["React", "Remix", "fullstack", "recaptcha"],
      mainTag: "web",

      // Fecha original aproximada: 2023
      createdAt: new Date("2023-08-15T12:00:00Z"),
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
