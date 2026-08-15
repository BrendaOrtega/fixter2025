import { db } from "../app/.server/db";

const buenasPracticasContent = `
Después de años desarrollando con React y enseñando a cientos de estudiantes, estas son las 5 prácticas que más impacto tienen en la calidad del código. No son reglas arbitrarias, son patrones que previenen bugs y hacen el código más mantenible.

## 1. Componentes pequeños con responsabilidad única

Un componente debe hacer UNA cosa bien. Si tu componente tiene más de 100 líneas, probablemente hace demasiado.

\`\`\`tsx
// ❌ Malo: Componente que hace todo
function UserDashboard() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  // ... 200 líneas más de lógica

  return (
    <div>
      {/* Header, sidebar, content, footer... */}
    </div>
  );
}

// ✅ Bueno: Componentes con responsabilidad única
function UserDashboard() {
  return (
    <div>
      <DashboardHeader />
      <div className="flex">
        <Sidebar />
        <main>
          <UserProfile />
          <RecentPosts />
          <NotificationList />
        </main>
      </div>
    </div>
  );
}
\`\`\`

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## 2. Custom hooks para lógica reutilizable

Si tienes lógica de estado que se repite, extráela a un custom hook:

\`\`\`tsx
// ❌ Malo: Lógica duplicada en varios componentes
function ProductPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/product')
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  // ...
}

// ✅ Bueno: Custom hook reutilizable
function useFetch<T>(url: string) {
  const [state, setState] = useState<{
    loading: boolean;
    error: Error | null;
    data: T | null;
  }>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => setState({ loading: false, error: null, data }))
      .catch(error => setState({ loading: false, error, data: null }));
  }, [url]);

  return state;
}

// Uso limpio
function ProductPage() {
  const { loading, error, data } = useFetch<Product>('/api/product');

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <ProductDetails product={data} />;
}
\`\`\`

## 3. Evita prop drilling con composición

Antes de meter Context o Redux, considera la composición:

\`\`\`tsx
// ❌ Malo: Prop drilling a través de múltiples niveles
function App() {
  const user = useUser();
  return <Layout user={user} />;
}

function Layout({ user }) {
  return <Header user={user} />;
}

function Header({ user }) {
  return <UserMenu user={user} />;
}

function UserMenu({ user }) {
  return <span>{user.name}</span>;
}

// ✅ Bueno: Composición con children
function App() {
  const user = useUser();
  return (
    <Layout>
      <Header>
        <UserMenu user={user} />
      </Header>
    </Layout>
  );
}

function Layout({ children }) {
  return <div className="layout">{children}</div>;
}

function Header({ children }) {
  return <header>{children}</header>;
}
\`\`\`

## 4. Manejo de estado cerca de donde se usa

El estado debe vivir lo más cerca posible de donde se necesita:

\`\`\`tsx
// ❌ Malo: Estado global para todo
const globalStore = create((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  // ... estado de formulario, modales, todo mezclado
}));

// ✅ Bueno: Estado local cuando es posible
function SearchBar() {
  const [query, setQuery] = useState('');

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}

// Solo sube el estado cuando REALMENTE se comparte
function ProductList() {
  const [filters, setFilters] = useState({
    category: 'all',
    priceRange: [0, 1000],
  });

  return (
    <div>
      <FilterPanel filters={filters} onChange={setFilters} />
      <ProductGrid filters={filters} />
    </div>
  );
}
\`\`\`

## 5. Keys únicas y estables

Las keys son para React, no para ti. Deben ser únicas Y estables:

\`\`\`tsx
// ❌ Muy malo: Índice del array como key
{items.map((item, index) => (
  <Item key={index} item={item} />
))}

// ❌ Malo: Key generada aleatoriamente
{items.map((item) => (
  <Item key={Math.random()} item={item} />
))}

// ✅ Bueno: ID único y estable
{items.map((item) => (
  <Item key={item.id} item={item} />
))}

// ✅ También válido si no hay ID
{items.map((item) => (
  <Item key={\`\${item.name}-\${item.createdAt}\`} item={item} />
))}
\`\`\`

## Bonus: Estructura de archivos por feature

Organiza tu código por funcionalidad, no por tipo:

\`\`\`
// ❌ Malo: Por tipo de archivo
src/
  components/
    Header.tsx
    UserMenu.tsx
    ProductCard.tsx
  hooks/
    useUser.ts
    useProducts.ts
  utils/
    formatPrice.ts

// ✅ Bueno: Por feature
src/
  features/
    auth/
      components/
        LoginForm.tsx
        UserMenu.tsx
      hooks/
        useAuth.ts
      api/
        auth.ts
    products/
      components/
        ProductCard.tsx
        ProductList.tsx
      hooks/
        useProducts.ts
      utils/
        formatPrice.ts
\`\`\`

## Conclusión

Estas prácticas no son dogmas, son guías. Lo importante es entender el *por qué*:

1. **Componentes pequeños** → Más fáciles de testear y reutilizar
2. **Custom hooks** → Lógica compartida sin duplicación
3. **Composición** → Flexibilidad sin acoplar componentes
4. **Estado local** → Menos complejidad, mejor rendimiento
5. **Keys estables** → React puede optimizar el rendering

Aplícalas con criterio y tu código React será más mantenible y predecible.

Abrazo. Blissmo. 🤓
`;

async function main() {
  console.log("Importando post de 5 buenas prácticas en React...");

  const slug = "5-buenas-practicas-en-react-que-debes-conocer";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "5 buenas prácticas en React que debes conocer",
        body: buenasPracticasContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["react", "buenas-practicas", "componentes", "hooks", "tips"],
        mainTag: "React",
        coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=630&fit=crop",
        metaImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=630&fit=crop",
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
      title: "5 buenas prácticas en React que debes conocer",
      body: buenasPracticasContent.trim(),
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: ["react", "buenas-practicas", "componentes", "hooks", "tips"],
      mainTag: "React",
      coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=630&fit=crop",
      metaImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=630&fit=crop",
      createdAt: new Date("2023-03-20"),
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
    console.error("❌ Error importando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
