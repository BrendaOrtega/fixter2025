import { db } from "../app/.server/db";

const postContent = `**Redux Toolkit Query**, o mejor conocido como **RTK** **Query**, nombre my influenciado como te habrás dado cuenta por **React Query**, ahora conocido también por **TanStack Query**.

**RTKQ** Es una herramienta opcional que está incluida en el paquete de **Redux** **Toolkit**. 📦 Y es una herramienta muy poderosa para hacer *fetching* y *caching* de datos. Ha sido diseñada para simplificar casos comunes de carga de datos desde un servidor, eliminando la necesidad de escribir a mano peticiones *fetch* o lidiar con lógica de cabeceras (*headers*) por tu cuenta. 🙌🏼

## ¿Por qué otra librería para fetching y caching?

Los sitios web, casi siempre, prácticamente siempre, necesitarán de consumir datos desde un servidor, datos que mostrarán dentro de **HTML**. Les llamamos aplicaciones web, cuando estas necesitan transformar estos datos también.

Existe la posibilidad de no hacer demasiadas peticiones al servidor administrando la *cache* de estas peticiones, pero esto es algo no tan fácil de hacer a mano. 🤕

Además, las aplicaciones de hoy en día son mucho más complejas; administran multiples *spinners* de carga, crean actualizaciones optimistas (*optimistic UI*), guardan cosas en el \`localStorage\` y a veces hasta duplican datos en el cliente para poder manipularlos mejor.

Son auténticas aplicaciones espagueti, ¿apoco no? 🍝 😪

**Redux** siempre ha proporcionado las herramientas mínimas en su core, dejando a los developer escribir su propia lógica y estrategias para administrar todos estos datos, con herramientas como \`createAsyncThunk\`. Es aquí donde está la novedad de **RTK Query**, pues la comunidad de **Redux** se ha dado cuenta de que el "*state management*" es una cosa, muy diferente del "*data fetching and caching*". Así que, el equipo de **Redux** han decidido ofrecernos, además de sus herramientas para el manejo de estado, una herramienta para hacer *fetching* de datos y administrar la *cache* también. 😎

## 🎪 Inspiración

**RTKQ** se ha inspirado de herramientas populares, como son:

**React Query, Urql, o  SWR** pero aportando un diseño muy al estilo **Redux**.

**RTKQ** es completamente **UI-agnostic**, separado del *core* del *Toolkit*, lo que significa que puede usarse con **calquier framework frontent**, **Vue**, **Svelte** etc.

Una característica bien genial de **RTKQ**, es que **auto-genera** **React Hooks** por ti. 🤖

Estos **Hooks** encapsulan todo el proceso del *fetching* de los datos, proveyendo un *flag* \`isLoading\` y una llave \`data\`, una vez que estos se han conseguido, convirtiendo en abstracto el proceso entero. 📦

**RTKQ** hace *cache* de los datos con algo que llaman "*cache entry lifecycle*" que le permite administrar de forma inteligente datos **hasta cando se hace streaming con sockets**. 🦦

Pero lo mejor es que **RTKQ** está completamente escrita en **TypeScript** y nos provee de una experiencia *ent-to-end type safety.*

Finalmente, **RTKQ** pesa muy poquito, apenas 17kb, mismos que se compensan con desinstalar **Axios** u otras herramientas para el *fetching* 😉

## 💻 Pero, veamos el uso básico en código

Vamos a leer algo de código, para no solo quedarnos con la parte teórica y para satisfacer a ese "nerd" que llevas dentro (a veces hablo del mío) 🤓

### Primero se crea un api-slice

El primer paso casi siempre será crear nuestro *slice*, o nuestro pedacito de código que se encargará de consumir cierta API específica. En este caso la de Rick & Morty.

Para ello utilizaremos la herramienta que **RTKQ** nos incluye; llamada \`createApi\`.

\`\`\`tsx
import { createApi } from '@reduxjs/toolkit/query'
// RRTKQ incluye un entr point específico para React (y así crear los hooks por nosotros)
import { createApi } from '@reduxjs/toolkit/query/react'
\`\`\`

Ahora vamos a utilizar esta herramienta para crear el *slice*, si no tienes mucha experiencia trabajando con objetos y la declaración de funciones dentro de los mismos, te recomiendo le des una leída al *spec* correspondiente de **ES6** y vuelvas acá, te dejo el [enlace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer).

\`\`\`tsx
// src/features/rick-and-morty-api-slice.ts

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Character } from './types'

// Definimos un servicio
export const rickAndMortyApi = createApi({
  reducerPath: 'characters',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://rickandmortyapi.com/' }),
  endpoints: (builder) => ({
    getChars: builder.query<Character, void>({
      query: () => \`characters/\`,
      // Automatic dispatch
    }),
  }),
})

// Se exportan los Hooks autogenerados
export const { useGetCharsQuery } = rickAndMortyApi
\`\`\`

Ahora tenemos el lugar perfecto para colocar nuestras peticiones, sin siquiera tener que lidiar con herramientas como **Axios** o incluso **fetch** (que es, lo que **RTKQ** usa por debajo), aquí también podríamos configurar \`headers\` o cualquier info extra para la petición.

### ⚙️ Configuramos o actualizamos el store

La configuración que hemos hecho en el *slice*, es suficiente para **auto-generar** no solo los **Hooks** para nuestros componentes, también ha autogenerado el *reducer* que necesitamos incluir en la configuración del *store*. 🤖

Algo que seguro apreciarás, si has usado **Redux** antes, es que ya no es necesario incluir ningún *middleware* para *thunks* o *sagas*, las *subscription lifetimes* son administradas automáticamente también, ¡Genial, no! ✅

\`\`\`tsx
import { configureStore } from '@reduxjs/toolkit'
// O también '@reduxjs/toolkit/query/react'
import { setupListeners } from '@reduxjs/toolkit/query'
import { rickAndMortyApi } from './services/pokemon'

export const store = configureStore({
  reducer: {
    // El reducer y el path están disponíbles dentro del objeto API
    [rickAndMortyApi.reducerPath]: pokemonApi.reducer,
  },
  // el middleware por defalt incluye las habilidades de:
  // caching, invalidation y polling
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(rickAndMortyApi.middleware),
})

// Esto es opcional, pero es útil para acciones avanzadas como refetchOnFocus
setupListeners(store.dispatch)
\`\`\`

Listo, todo está en su sitio, ahora podemos usar datos desde nuestros componentes sin pensar en peticiones, únicamente en **Hooks**.

### 🔥 Es hora de usar nuestro Hook

Vamos a importar el **Hook** autogenerado desde nuestro archivo \`rick-and-morty-api-slice.ts\`.

Y vamos a invocarlo como a cualquier otro **Hook**, pasando los parámetros si fueran necesarios, para nuestro ejemplo, no hemos ocupado ningún parámetro.

Este **Hook** pone a nuestra disposición una llave \`data\` y una \`isLoading\` que son reactivas y cambiarán automáticamente según se haga *fetch*, *re-fetch* o cualquier otra operación de red; ahora invisible para el componente.

\`\`\`tsx
import * as React from 'react'
import { useGetCharsQuery } from './features/rick-and-morty-api-slice.ts'

export default function App() {
  // Fetching automático
  const { data, error, isLoading } = useGetCharsQuery()
  return (
    <ul>
      {data?.results.map(char=>(
        <li key={char.id} >
          <img width="300" src={char.image} alt={char.name} />
        </li>
      ))}
    </ul>
  )
}
\`\`\`

### ¡Maravilloso, te has actualizado y hasta te han entrado ganas de implementarlo en tu proyecto ya mismo en una sola entrada de blog!

Esto merece un like o un comentario, ¿apoco no?

Abrazo. Bliss. 🤓

### Enlaces relacionados

Object initializer (must read)

[Object initializer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer)`;

async function main() {
  const slug = "que-es-rtk-query-2023";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("Post ya existe, actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "¿Qué es RTK Query?",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.facebook.com/blissito",
        coverImage: "https://i.imgur.com/AfeTUREh.png",
        metaImage: "https://i.imgur.com/AfeTUREh.png",
        youtubeLink: "https://youtu.be/kTiIzTTOR-k",
        tags: ["react", "redux"],
        mainTag: "Redux",
      },
    });
    console.log("Post actualizado:", post.id);
  } else {
    console.log("Creando nuevo post...");
    const post = await db.post.create({
      data: {
        slug,
        title: "¿Qué es RTK Query?",
        body: postContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.facebook.com/blissito",
        coverImage: "https://i.imgur.com/AfeTUREh.png",
        metaImage: "https://i.imgur.com/AfeTUREh.png",
        youtubeLink: "https://youtu.be/kTiIzTTOR-k",
        tags: ["react", "redux"],
        mainTag: "Redux",
      },
    });
    console.log("Post creado:", post.id);
  }

  await db.$disconnect();
}

main().catch(console.error);
