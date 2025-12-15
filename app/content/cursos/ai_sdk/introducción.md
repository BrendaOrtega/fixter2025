# Generando streams desde una inferencia básica

Pedirle algo al LLM es crear; generar; detonar una inferencia. ✅

```ts
// index.ts

import { streamText } from "ai";

const chat = (prompt: string) =>
  streamText({
    model,
    system,
    prompt,
  });
```

Creamos la función chat para poder recibir el prompt desde fuera. 🤓
Los _streams_ son la manera más adoptada por la industria web, para crear y tener una experiencia moderna de chat con modelos de lenguaje (LLMs). 🤖💬

## ¿Cómo ejecutamos este script?

Vamos a ejecutar nuestro programa y recorrer el _stream_ para devolver parte por parte a la consola. ⬛️

```ts
// index.ts

const main = async (prompt: string) => {
  const { textStream } = chat(prompt);

  for await (const part of textStream) {
    process.stdout.write(part);
  }
};

main("Díme un poema robótico");
```

Ejecutamos el programa con: `npm run dev` que a su vez, hace simplemente: `tsx index.ts`. Usar `tsx` es la manera más fácil de ejecutar **TypeScript** en **Nodejs**. ✅

## Más allá del texto: Datos estructurados

El AI SDK no solo genera texto. Con `generateObject` y `streamObject` podemos obtener **datos estructurados** y validarlos con Zod:

```ts
// index.ts

import { generateObject } from "ai";
import { z } from "zod";

const { object } = await generateObject({
  model,
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(
        z.object({
          name: z.string(),
          amount: z.string(),
        })
      ),
      steps: z.array(z.string()),
    }),
  }),
  prompt: "Dame la receta de los tacos al pastor",
});

console.log(object.recipe.ingredients); // ✅ Tipado y validado
```

Aquí podemos observar la construcción del `schema` de Zod que tiene la forma de un objeto con la llave `recipe` que a su vez es un objeto con las llaves `name`, `steps` e `ingredients`, que resulta ser un array de objetos con llaves `name` y `amount`. 😵‍💫

> 👀 A este tipo de generación de objetos se le conoce como "structured output".

### ¿Y qué pasó con el streaming?

Para que en la interfaz se muestren los datos según se generan, usaremos `streamObject`.

```ts
// index.ts

import { streamObject } from "ai";

const { partialObjectStream } = streamObject({
  model,
  schema: recipeSchema,
  prompt: "Dame una receta de enchiladas",
});

for await (const partialObject of partialObjectStream) {
  console.clear();
  console.log(partialObject); // 👀 El objeto se va rellenando
}
```

Aquí podemos ver cómo se le entrega a `streamObject`, el `model`, el `prompt` y su `schema`: lo mínimo necesario. También estoy usando `partialObjectStream` que devuelve `streamObject` para actualizar la consola con el nuevo objeto que va llegando. 🛞

> 💡 **Casos de uso:** Formularios inteligentes, extracción de datos de documentos, clasificadores, analizadores de sentimiento, parseo de CVs, parseo de cualquier documento y tanto más. 🍚

> 👀 **Esto es una de las cosas que un LLM hace mejor, obtener datos estructurados de data no estructurada como una imagen o un PDF**

> ⚠️ **Nota:** `generateObject` y `streamObject` no pueden usar herramientas (o tools). Si necesitas _tools_, usa `generateText` o `streamText`. ⚠️

## 💽 La web es el paso siguiente

No siempre queremos ejecutar _scripts_ desde nuestra terminal, a veces se apetece crearnos una interfaz web. 😎
Para ello, usaremos el _framework_ más famoso para crear un servidor web en Nodejs; me refiero a Expressjs. ✅

Todo esto, en las siguiente lecciones, porque primero hay que aprender a usar y crear herramientas. 🛠️👩🏻‍🏭

> 👀 Hoy en día es más recomendable usar Hono que es compatible con multiples runtimes no solo con Node. Además de ser mucho más rápido y usar _patterns (patrones)_ más modernos y apegados a la programación funcional. 👍🏼

> Hay una branch _bonus_. En la que usamos un servidor Hono en vez de uno _express_. `origin/ejercicio/bonus-migrate_to_hono`. ⬅️

Y recuerda, si aún te sientes principiante y quieres ir más despacio, siempre puedes quedarte con `express` y sentirte más cómodo(a), aunque no son muy diferentes. 😬
