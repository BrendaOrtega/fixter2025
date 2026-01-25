import { db } from "../app/.server/db";

const postContent = `En mi canal tengo [un video](https://youtu.be/1sGDvFMSRCY) donde te muestro cómo usar React Hook Form. 📺

Si has trabajado con formularios en React, probablemente conoces Formik. Durante años fue la librería más popular para manejar formularios. Pero en mi experiencia, **React Hook Form** es más fácil de usar, más ligera y tiene mejor rendimiento.

## ¿Por qué React Hook Form?

Estas son las razones principales por las que prefiero React Hook Form:

1. **Menos código**: No necesitas envolver todo en componentes especiales
2. **Mejor rendimiento**: Usa refs internamente, no re-renderiza todo el formulario
3. **Más ligera**: ~8KB vs ~12KB de Formik
4. **API más intuitiva**: El hook \`useForm\` es súper simple

## Instalación

\`\`\`bash
npm install react-hook-form
\`\`\`

Eso es todo. No necesitas dependencias adicionales.

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek). ¡Suscríbete para no perderte ninguno!

---

## Uso básico

Aquí está un formulario simple con React Hook Form:

\`\`\`jsx
import { useForm } from "react-hook-form";

export default function ContactForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data) => {
    console.log(data);
    // { nombre: "...", email: "..." }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register("nombre", { required: "El nombre es requerido" })}
        placeholder="Tu nombre"
      />
      {errors.nombre && <span>{errors.nombre.message}</span>}

      <input
        {...register("email", {
          required: "El email es requerido",
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$/i,
            message: "Email inválido"
          }
        })}
        placeholder="tu@email.com"
      />
      {errors.email && <span>{errors.email.message}</span>}

      <button type="submit">Enviar</button>
    </form>
  );
}
\`\`\`

## Comparación con Formik

En Formik necesitarías algo así:

\`\`\`jsx
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup"; // Otra dependencia más

const validationSchema = Yup.object({
  nombre: Yup.string().required("El nombre es requerido"),
  email: Yup.string().email("Email inválido").required("El email es requerido"),
});

export default function ContactForm() {
  return (
    <Formik
      initialValues={{ nombre: "", email: "" }}
      validationSchema={validationSchema}
      onSubmit={(values) => console.log(values)}
    >
      <Form>
        <Field name="nombre" placeholder="Tu nombre" />
        <ErrorMessage name="nombre" component="span" />

        <Field name="email" placeholder="tu@email.com" />
        <ErrorMessage name="email" component="span" />

        <button type="submit">Enviar</button>
      </Form>
    </Formik>
  );
}
\`\`\`

¿Ves la diferencia? Con Formik necesitas:
- Importar múltiples componentes (\`Formik\`, \`Form\`, \`Field\`, \`ErrorMessage\`)
- Instalar y configurar Yup para validación
- Envolver todo en el componente \`<Formik>\`
- Definir \`initialValues\` por separado

Con React Hook Form:
- Solo importas \`useForm\`
- La validación viene integrada
- Usas inputs HTML normales con \`register\`
- Todo es más declarativo

## Validación avanzada

React Hook Form soporta validación nativa muy poderosa:

\`\`\`jsx
<input
  {...register("password", {
    required: "La contraseña es requerida",
    minLength: {
      value: 8,
      message: "Mínimo 8 caracteres"
    },
    pattern: {
      value: /^(?=.*[A-Za-z])(?=.*\\d)/,
      message: "Debe contener letras y números"
    }
  })}
  type="password"
/>
\`\`\`

Si necesitas validación más compleja, también puedes integrar Zod:

\`\`\`bash
npm install @hookform/resolvers zod
\`\`\`

\`\`\`jsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

function Form() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  // ...
}
\`\`\`

## Valores por defecto

\`\`\`jsx
const { register, handleSubmit } = useForm({
  defaultValues: {
    nombre: "Héctor",
    email: "hector@fixter.org",
  }
});
\`\`\`

## Estado del formulario

El hook te da acceso a todo el estado:

\`\`\`jsx
const {
  register,
  handleSubmit,
  formState: {
    errors,      // Errores de validación
    isSubmitting, // ¿Está enviando?
    isDirty,      // ¿Cambió algo?
    isValid,      // ¿Es válido?
  },
  reset,         // Reiniciar formulario
  watch,         // Observar valores
  setValue,      // Establecer valor programáticamente
} = useForm();
\`\`\`

## Conclusión

React Hook Form es mi recomendación para cualquier proyecto nuevo con React. Es más simple, más rápido y tiene una mejor experiencia de desarrollo.

Si ya usas Formik y funciona bien para ti, no hay necesidad de migrar. Pero si estás empezando un proyecto nuevo o quieres simplificar tus formularios, dale una oportunidad a React Hook Form.

La [documentación oficial](https://react-hook-form.com/) es excelente y tiene muchos más ejemplos.

Abrazo. bliss.`;

async function main() {
  console.log("Importando post de React Hook Form...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "react-hook-form-es-mas-facil-que-formik" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "react-hook-form-es-mas-facil-que-formik",
      title: "React Hook Form es más fácil que Formik",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Imágenes
      coverImage: "https://i.imgur.com/hqh6k58.png",
      metaImage: "https://i.imgur.com/hqh6k58.png",

      // Video
      youtubeLink: "https://youtu.be/1sGDvFMSRCY",

      // Clasificación
      tags: ["forms", "hook", "hooks", "formik", "useForm", "npm", "react"],
      mainTag: "React",

      // Fecha original del post (Oct 18, 2023)
      createdAt: new Date(1697679357823),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
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
