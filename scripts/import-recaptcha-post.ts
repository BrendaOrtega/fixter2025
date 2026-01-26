import { db } from "../app/.server/db";

const postContent = `Hemos esperado muchas décadas por la llegada de los robots a nuestras vidas, todos estos años hemos soñado con ellos de mil y un maneras; robotínas que nos laven la ropa, pequeños con ruedas que nos lleven la maleta; o humanoides estéticos que remplacen a la pareja. Los hemos imaginado controlándonos o exterminándonos, hemos imaginado de todo. Pero, aún con todo, fue una sorpresa que ahora los tengamos y estén hechos de software, también es irónico que se comporten como malditos duendes, que les llamaríamos bots y que buscaríamos protegernos de ellos. 🤖🔪😱

Por eso en este video te voy a enseñar cómo crear un componente \`<Recaptcha />\` para proteger tus formularios de bots molestos y… exterminarlos. 🤖🔫😎

## _🗺️ Overview_ de lo que haremos

Primero decir que necesitamos de dos piezas para implementar \`recaptcha\` en nuestra página web o en el sitio web entero, por eso vamos a describir estas dos piezas que suceden una en el cliente y la otra en el servidor:

1.  **\`recaptcha\`** Genera un _token_ en el cliente. Este _token_ nos sirve para habilitar o no, el envío de un formulario; debemos enviar este token al servidor junto con el formulario. ✅
2.  Verificamos el token contra \`recaptcha\` en el servidor. Con esto obtenemos un _score_ con el que tomaremos la decisión de guardar el formulario o ignorarlo*.* ✅

Nuestra implementación estaría incompleta sin alguna de estas piezas. Pues el método que estamos usando es el del _score_, no utilizaremos la versión anterior en la que se necesitaba un clic.

Venga pues, comencemos del lado del cliente.

## 🤖 Componente \`<Recaptcha />\`

Para alcanzar nuestro objetivo de agregar \`recaptcha\` y a la vez lograr reutilizar lo que haremos hoy, en nuevos formularios en el futuro, vamos a crear un componente que podamos colocar dentro de cualquier formulario. Este componente conseguirá el _token_ a la vez que lo incluirá en el formulario con un \`<input>\`.

Este componente nos proveerá un _prop_ \`onChange\` con el que podemos enterarnos de la generación del _token_. ✅

\`\`\`jsx
import {
  useGoogleReCaptcha,
  GoogleReCaptchaProvider,
} from "react-google-recaptcha-v3";

export const Recaptcha = ({
  onChange,
  ...props
}: {
  onChange?: (arg0: string) => void;
}) => (
  <GoogleReCaptchaProvider reCaptchaKey={KEY_ID} {...props}>
    <RecaptchaConsumer onChange={onChange} />
  </GoogleReCaptchaProvider>
);

export const RecaptchaConsumer = ({
  onChange,
  ...props
}: {
  onChange?: (token: string) => void;
  [x: string]: any;
}) => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [recaptcha, set] = useState<string>();

  const handleReCaptchaVerify = useCallback(async () => {
    if (!executeRecaptcha) {
      console.log("Execute recaptcha not yet available");
      return;
    }

    const token = await executeRecaptcha("signup");
    if (typeof token === "string" && token !== "") {
      set(token);
      onChange?.(token);
    }
    /* eslint-disable */
  }, [executeRecaptcha]);

  useEffect(() => {
    handleReCaptchaVerify();
  }, [handleReCaptchaVerify]);

  return (
    <input className="hidden" name="recaptcha" value={recaptcha} {...props} />
  );
};
\`\`\`

Estos dos componentes trabajarán juntos para lograr abstraer toda esta lógica y concentrarnos únicamente en usar un pequeño componente.

\`\`\`jsx
// ...
const [token,set] = useState<string>();

return <Form
  method="post"
  action="/subscribe" // o api
>
  // ... otros inputs
  <Recaptcha
    onChange={(value) => set(value)}
  />
<input type="submit" disabled={!token} >
</Form>
\`\`\`

¡Qué bonito! ¿Apoco no? A mi me gusta ver esto como capas (_layers_), hay parte del equipo de desarrollo, el más \`jr\`, que amarán estas abstracciones, mientras que el \`sr\` disfrutará de crearlas para otros, no pierdas oportunidad de crear componentes reutilizables; útiles para otros developers. 🧑🏻‍🔬

## 📺 Vamos ahora al lado oscuro

Es momento de adentrarnos en las fauces de una caverna donde habita una bestia mítica, un minotauro que asecha en el fondo de tu terminal, esperando al primer incauto de la mañana para atraparlo con sus terribles fauces. 🌳😱🐂🪞 Afortunadamente con **Remix**, agregar pequeñas piezas de "backend" es muy fácil. Con Remix podemos crear aplicaciones _full stack_ sin esfuerzo. Veamos.

\`\`\`jsx
export const action = async ({ request }) => {
  // ...
  const formData = await request.formData();
  const token = formData.get("recaptcha");
  const score = await createAssessment({ token, recaptchaAction: "signup" });
  if (score < 0.7) {
    console.log("HELLO BOT 👋🏼🤖");
    return null;
  }
  // ... si es humano, guardamos aquí...
  // await db.subscriber.create(// ... );
  return json({success:true}, {status:201});
}
\`\`\`

Esta es la forma simplificada de nuestra función \`action\`. Como ves, conseguimos el token que el cliente nos envía con el formulario gracias al \`<input>\` en nuestro componente, para luego conseguir un _score_ con la función \`createAssessment\`, que veremos en un momento, con este _score_ decidiremos cuál es el nivel de confianza que preferimos.

La función \`createAssessment\` la he conseguido de la documentación de Google y la he usado tal cual, veamos que tanto hace:

\`\`\`jsx
import { RecaptchaEnterpriseServiceClient } from "@google-cloud/recaptcha-enterprise";

async function createAssessment({
  // TODO: Replace the token and reCAPTCHA action variables
  projectID = "blissmorrito",
  siteKey = "Este-la-key-de-google-console-4UpA",
  token = "este-lo-manda-el-cliente",
  recaptchaAction = "signup", // en mi caso, checa los docs
}): Promise<number> {
  // Create the reCAPTCHA client.
  const client = new RecaptchaEnterpriseServiceClient();
  const projectPath = client.projectPath(projectID);
  // Build the assessment request.
  const request = {
    assessment: {
      event: {
        token,
        siteKey,
      },
    },
    parent: projectPath,
  };
  const [response] = await client.createAssessment(request);
  // Check if the token is valid.
  if (!response.tokenProperties?.valid) {
    console.log(
      \`The CreateAssessment call failed because the token was: \${response.tokenProperties?.invalidReason}\`
    );
    return 0;
  }
  // Check if the expected action was executed.
  if (response.tokenProperties.action === recaptchaAction) {
    // Get the risk score and the reason(s).
    response.riskAnalysis?.reasons?.forEach((reason) => {
      console.log(reason);
    });

    return response.riskAnalysis?.score ?? 0;
  } else {
    console.log(
      "The action attribute in your reCAPTCHA tag does not match the action you are expecting to score"
    );
    return 0;
  }
}
\`\`\`

Yo he modificado esta función un poquito para que siempre devuelva un número, el dato que realmente nos interesa después de pasar por las validaciones es: \`response.riskAnalysis?.score\` que va de 0 a 1 siendo 1 la más alta confianza en que el usuario es humano. También notarás que en el servidor estamos utilizando una biblioteca más: \`@google-cloud/recaptcha-enterprise\`.

Esta herramienta nos ayudará a validar el _token_ y conseguir el _score_. ✅

### Bueno, ahora todos tus formularios estarán más que protegidos contra estos bots que más que bots parecen trolls. 🤖🧌

Espero que este pequeño tutorial simplificado intencionalmente, te resulte algo útil, si es así, no seas gacho (y gacha) y dale like o comparte con alguien a quien le pueda ser útil también para caerle mejor al algoritmo de yutu. Gracias. [VIDEO PRÓXIMAMENTE, suscríbete y no te lo pierdas.]

Abrazo. Bliss. 🤓

## Enlaces relacionados

[Recaptcha](https://www.google.com/recaptcha/about/)`;

async function main() {
  console.log("Importando post original de Remix + React + Recaptcha (Marzo 2024)...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "remix-react-recaptcha-componente-reutilizable" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "remix-react-recaptcha-componente-reutilizable",
      title: "Remix + React + Recaptcha: Componente reutilizable ⚡️",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "http://hectorbliss.com",

      // Imágenes
      coverImage: "https://i.imgur.com/Fyslrdh.png",
      metaImage: "https://i.imgur.com/Fyslrdh.png",

      // Clasificación
      tags: ["React", "Remix", "fullstack", "recaptcha"],
      mainTag: "web",

      // Fecha original: 5 Marzo 2024 (timestamp: 1709655684369)
      createdAt: new Date(1709655684369),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Título: ${post.title}`);
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
