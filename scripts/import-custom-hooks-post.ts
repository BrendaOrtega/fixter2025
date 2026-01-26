import { db } from "../app/.server/db";

const customHooksPostContent = `
Los **custom hooks** son una de las características más poderosas de React. Te permiten extraer lógica de componentes y reutilizarla en toda tu aplicación.

En esta guía te muestro cómo crear tus propios hooks desde cero.

## ¿Qué es un custom hook?

Un custom hook es simplemente una función de JavaScript que:

1. Su nombre empieza con **"use"** (por convención y reglas de React)
2. Puede llamar a otros hooks (useState, useEffect, etc.)
3. Retorna lo que tú quieras: valores, funciones, objetos...

\`\`\`typescript
// Esto es un custom hook
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(initialValue);

  return { count, increment, decrement, reset };
}
\`\`\`

## ¿Por qué crear custom hooks?

- **Reutilización**: La misma lógica en múltiples componentes
- **Separación de concerns**: Lógica fuera del componente
- **Testing**: Más fácil de probar en aislamiento
- **Legibilidad**: Componentes más limpios

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales de React en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Ejemplos prácticos

### 1. useLocalStorage

Persiste estado en localStorage automáticamente:

\`\`\`typescript
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}
\`\`\`

**Uso:**

\`\`\`tsx
function Settings() {
  const [theme, setTheme] = useLocalStorage("theme", "dark");

  return (
    <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
      Tema actual: {theme}
    </button>
  );
}
\`\`\`

### 2. useDebounce

Retrasa la ejecución de un valor (útil para búsquedas):

\`\`\`typescript
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
\`\`\`

**Uso:**

\`\`\`tsx
function SearchInput() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (debouncedSearch) {
      // Hacer fetch solo cuando el usuario deja de escribir
      fetchResults(debouncedSearch);
    }
  }, [debouncedSearch]);

  return <input value={search} onChange={e => setSearch(e.target.value)} />;
}
\`\`\`

### 3. useToggle

Simple pero muy útil:

\`\`\`typescript
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return { value, toggle, setTrue, setFalse };
}
\`\`\`

**Uso:**

\`\`\`tsx
function Modal() {
  const { value: isOpen, toggle, setFalse: close } = useToggle();

  return (
    <>
      <button onClick={toggle}>Abrir modal</button>
      {isOpen && (
        <div className="modal">
          <button onClick={close}>Cerrar</button>
        </div>
      )}
    </>
  );
}
\`\`\`

### 4. useFetch

Hook para hacer peticiones HTTP:

\`\`\`typescript
interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
\`\`\`

**Uso:**

\`\`\`tsx
function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading, error, refetch } = useFetch<User>(
    \`/api/users/\${userId}\`
  );

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h1>{user?.name}</h1>
      <button onClick={refetch}>Recargar</button>
    </div>
  );
}
\`\`\`

## Reglas importantes

1. **Siempre empieza con "use"**: React detecta hooks por el prefijo
2. **Solo llama hooks en el nivel superior**: No dentro de loops, condiciones o funciones anidadas
3. **Solo llama hooks desde componentes o custom hooks**: No desde funciones regulares

## Cuándo crear un custom hook

✅ **Sí crear** cuando:
- La misma lógica se repite en 2+ componentes
- Un componente tiene demasiada lógica de estado
- Quieres aislar lógica para testing

❌ **No crear** cuando:
- Solo se usa en un lugar (espera a que se repita)
- Es solo una función utilitaria sin hooks
- Estás "sobre-ingenierizando" algo simple

## Conclusión

Los custom hooks son tu herramienta para escribir React limpio y mantenible. No tengas miedo de crear los tuyos cuando veas lógica repetida.

Empieza con hooks simples como \`useToggle\` y ve aumentando la complejidad conforme los necesites.

Abrazo. bliss.
`;

async function main() {
  console.log("Importando post de Custom Hooks...");

  const slug = "custom-hooks-react-guia-completa";
  const title = "Custom Hooks en React: Guía completa con ejemplos";

  // Verificar si ya existe
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
        body: customHooksPostContent.trim(),
        published: true,
        coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=630&fit=crop",
        metaImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=630&fit=crop",
        youtubeLink: "",
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["react", "hooks", "custom-hooks", "javascript", "frontend"],
        mainTag: "react",
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
      body: customHooksPostContent.trim(),
      published: true,

      // Imágenes (React logo style)
      coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=630&fit=crop",
      metaImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=630&fit=crop",

      // YouTube
      youtubeLink: "",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",

      // Clasificación
      tags: ["react", "hooks", "custom-hooks", "javascript", "frontend"],
      mainTag: "react",

      // Fecha: hoy
      createdAt: new Date(),
      updatedAt: new Date(),
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
