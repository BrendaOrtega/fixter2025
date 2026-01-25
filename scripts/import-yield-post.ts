import { db } from "../app/.server/db";

const yieldPostContent = `
¿Alguna vez te has preguntado qué hace ese asterisco misterioso después de \`yield\`? Hoy vamos a desmenuzar \`yield*\`, un operador que puede simplificar drásticamente tu código cuando trabajas con generadores en JavaScript y, especialmente, cuando usas Effect en TypeScript.

## Parte 1: yield* en JavaScript Nativo

### ¿Qué es un Generador?

Antes de entender \`yield*\`, necesitamos tener claro qué es un generador. Un generador es una función especial que puede pausar su ejecución y reanudarla después.

\`\`\`javascript
function* contador() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = contador();
console.log(gen.next().value); // 1
console.log(gen.next().value); // 2
console.log(gen.next().value); // 3
\`\`\`

Cada vez que llamamos \`.next()\`, la función se ejecuta hasta el siguiente \`yield\` y pausa ahí.

### La Magia de yield*

Ahora, ¿qué pasa cuando queremos **componer** generadores? Es decir, cuando un generador quiere "delegar" a otro generador. Ahí es donde entra \`yield*\`.

\`\`\`javascript
function* numeros() {
  yield 1;
  yield 2;
}

function* letras() {
  yield 'a';
  yield 'b';
}

function* combinado() {
  yield* numeros();  // Delega al generador numeros
  yield* letras();   // Delega al generador letras
}

// Resultado: 1, 2, 'a', 'b'
for (const valor of combinado()) {
  console.log(valor);
}
\`\`\`

Sin \`yield*\`, tendríamos que iterar manualmente:

\`\`\`javascript
// Sin yield* (más verbose)
function* combinadoManual() {
  for (const n of numeros()) {
    yield n;
  }
  for (const l of letras()) {
    yield l;
  }
}
\`\`\`

El asterisco en \`yield*\` significa: "itera sobre este iterable y produce cada valor uno por uno".

### Caso Práctico: Recorriendo un Árbol

Un uso clásico de \`yield*\` es recorrer estructuras recursivas:

\`\`\`javascript
function* recorrerArbol(nodo) {
  yield nodo.valor;
  for (const hijo of nodo.hijos) {
    yield* recorrerArbol(hijo);  // Recursión con delegación
  }
}

const arbol = {
  valor: 1,
  hijos: [
    { valor: 2, hijos: [] },
    { valor: 3, hijos: [
      { valor: 4, hijos: [] }
    ]}
  ]
};

// Resultado: 1, 2, 3, 4
for (const val of recorrerArbol(arbol)) {
  console.log(val);
}
\`\`\`

## Parte 2: yield* en Effect (TypeScript)

### El Mundo de Effect

[Effect](https://effect.website/) es una librería de TypeScript que lleva la programación funcional a otro nivel. Usa generadores de una manera muy elegante para manejar operaciones asíncronas, errores y efectos secundarios.

En Effect, \`yield*\` tiene un papel fundamental: **ejecutar efectos y obtener sus resultados**.

\`\`\`typescript
import { Effect } from "effect";

const obtenerUsuario = Effect.succeed({ id: 1, nombre: "María" });
const obtenerPosts = Effect.succeed([{ titulo: "Hola Mundo" }]);

const programa = Effect.gen(function* () {
  const usuario = yield* obtenerUsuario;
  const posts = yield* obtenerPosts;
  return { usuario, posts };
});
\`\`\`

### La Diferencia Crucial

En JavaScript nativo, \`yield*\` **delega** a otro iterable (produce múltiples valores).

En Effect, \`yield*\` **ejecuta** un efecto y **extrae** su valor (produce un solo valor).

\`\`\`typescript
// JavaScript nativo: yield* produce MÚLTIPLES valores
function* ejemplo() {
  yield* [1, 2, 3];  // Produce 1, luego 2, luego 3
}

// Effect: yield* produce UN valor (el resultado del efecto)
const ejemploEffect = Effect.gen(function* () {
  const valor = yield* Effect.succeed(42);  // valor = 42
  return valor;
});
\`\`\`

### Ejemplo Práctico con Effect

Veamos un caso más realista: un flujo de autenticación:

\`\`\`typescript
import { Effect, pipe } from "effect";

// Simulamos operaciones que pueden fallar
const validarCredenciales = (email: string, password: string) =>
  email === "test@test.com" && password === "1234"
    ? Effect.succeed({ userId: 1 })
    : Effect.fail(new Error("Credenciales inválidas"));

const obtenerPermisos = (userId: number) =>
  Effect.succeed(["leer", "escribir"]);

const registrarLogin = (userId: number) =>
  Effect.succeed(\`Usuario \${userId} logueado\`);

// Componemos todo con yield*
const flujoLogin = (email: string, password: string) =>
  Effect.gen(function* () {
    // Cada yield* ejecuta el efecto y extrae el valor
    const { userId } = yield* validarCredenciales(email, password);
    const permisos = yield* obtenerPermisos(userId);
    const mensaje = yield* registrarLogin(userId);

    return {
      userId,
      permisos,
      mensaje,
    };
  });

// Ejecutar
Effect.runPromise(flujoLogin("test@test.com", "1234"))
  .then(console.log)
  .catch(console.error);
\`\`\`

### Beneficios Clave de yield* en Effect

1. **Código secuencial**: Aunque los efectos pueden ser asíncronos, el código se lee de arriba a abajo
2. **Manejo de errores automático**: Si un efecto falla, el generador se detiene y propaga el error
3. **Tipado completo**: TypeScript infiere los tipos correctamente en cada paso
4. **Composición natural**: Puedes combinar efectos como si fueran simples llamadas a funciones

### Comparación Visual

**Sin yield* (código anidado):**

\`\`\`typescript
// Esto sería muy difícil de leer con muchas operaciones
const resultado = pipe(
  validarCredenciales(email, password),
  Effect.flatMap(({ userId }) =>
    pipe(
      obtenerPermisos(userId),
      Effect.flatMap((permisos) =>
        pipe(
          registrarLogin(userId),
          Effect.map((mensaje) => ({ userId, permisos, mensaje }))
        )
      )
    )
  )
);
\`\`\`

**Con yield* (código secuencial):**

\`\`\`typescript
// Mucho más legible
const resultado = Effect.gen(function* () {
  const { userId } = yield* validarCredenciales(email, password);
  const permisos = yield* obtenerPermisos(userId);
  const mensaje = yield* registrarLogin(userId);
  return { userId, permisos, mensaje };
});
\`\`\`

## Comparativa Rápida

| Aspecto | JavaScript Nativo | Effect |
|---------|------------------|--------|
| **Propósito de yield*** | Delegar a otro iterable | Ejecutar un efecto |
| **Valores producidos** | Múltiples | Uno (el resultado) |
| **Uso principal** | Composición de iterables | Composición de efectos |
| **Manejo de errores** | Manual | Automático |

## Mejores Prácticas

### En JavaScript nativo:
- Usa \`yield*\` para componer generadores relacionados
- Útil para recorrido de estructuras recursivas
- Evita anidación excesiva de loops

### En Effect:
- Prefiere \`Effect.gen\` + \`yield*\` sobre \`pipe\` + \`flatMap\` para flujos complejos
- Cada \`yield*\` es un "punto de await" para efectos
- El código se lee como si fuera síncrono, pero maneja async, errores y más

---

## ¿Quieres aprender más?

Si te interesa dominar Effect y llevar tu TypeScript al siguiente nivel, únete a nuestra lista de correo donde compartimos tutoriales avanzados cada semana.

Abrazo. Bliss. 🤓
`;

async function main() {
  console.log("Creando post de yield*...");

  const slug = "entendiendo-yield-el-operador-de-delegacion-en-javascript-y-effect";

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Entendiendo yield*: El Operador de Delegación en JavaScript y Effect",
        body: yieldPostContent.trim(),
        published: true,
        coverImage: "https://townsquare.media/site/979/files/2020/01/Yield-album-crop.jpg?w=1200&h=0&zc=1&s=0&a=t&q=89",
        metaImage: "https://townsquare.media/site/979/files/2020/01/Yield-album-crop.jpg?w=1200&h=0&zc=1&s=0&a=t&q=89",
        youtubeLink: "",
        authorName: "BrendaGo",
        authorAt: "@brendago",
        photoUrl: "https://i.imgur.com/TFQxcIu.jpg",
        authorAtLink: "https://www.linkedin.com/in/brendago",
        tags: ["typescript", "yield", "generadores"],
        mainTag: "effect",
        updatedAt: new Date(1753710948796),
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title: "Entendiendo yield*: El Operador de Delegación en JavaScript y Effect",
      body: yieldPostContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://townsquare.media/site/979/files/2020/01/Yield-album-crop.jpg?w=1200&h=0&zc=1&s=0&a=t&q=89",
      metaImage: "https://townsquare.media/site/979/files/2020/01/Yield-album-crop.jpg?w=1200&h=0&zc=1&s=0&a=t&q=89",

      // YouTube (vacío para este post)
      youtubeLink: "",

      // Autor - BrendaGo
      authorName: "BrendaGo",
      authorAt: "@brendago",
      photoUrl: "https://i.imgur.com/TFQxcIu.jpg",
      authorAtLink: "https://www.linkedin.com/in/brendago",

      // Clasificación
      tags: ["typescript", "yield", "generadores"],
      mainTag: "effect",

      // Fechas originales del post
      createdAt: new Date(1753628949914),
      updatedAt: new Date(1753710948796),
    },
  });

  console.log("✅ Post creado exitosamente!");
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
