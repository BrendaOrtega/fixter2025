import { db } from "../app/.server/db";

const zustandPostContent = `
¿Todavía sigues usando Redux? Déjame contarte que existe una alternativa más simple, más elegante y con mucho menos boilerplate: **Zustand**.

En este post te muestro por qué Zustand se ha convertido en mi manejador de estado favorito para React.

## El problema con Redux

Redux es poderoso, pero seamos honestos:

- **Mucho boilerplate**: Actions, reducers, action creators, selectors...
- **Curva de aprendizaje**: Middleware, thunks, sagas, slices...
- **Archivos por todos lados**: Un cambio simple requiere tocar múltiples archivos
- **Configuración inicial**: Configurar el store toma más tiempo del necesario

Para aplicaciones enterprise enormes, Redux tiene su lugar. Pero para el 90% de los proyectos, es overkill.

## Entra Zustand 🐻

Zustand (alemán para "estado") es un manejador de estado minimalista creado por los mismos autores de Jotai y React Spring. Su filosofía es simple: **hacer state management sin complicaciones**.

### Instalación

\`\`\`bash
npm install zustand
\`\`\`

### Tu primer store en 10 líneas

\`\`\`typescript
import { create } from 'zustand'

interface CounterStore {
  count: number
  increment: () => void
  decrement: () => void
}

const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}))
\`\`\`

Y ya. Eso es todo. 😎

---

🎬 **¿Prefieres aprender en video?** Tenemos más tutoriales de React y state management en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

### Usándolo en un componente

\`\`\`tsx
function Counter() {
  const { count, increment, decrement } = useCounterStore()

  return (
    <div>
      <p>Contador: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  )
}
\`\`\`

No hay Provider, no hay connect, no hay mapStateToProps. Solo un hook.

## Comparación: Redux vs Zustand

Veamos el mismo ejemplo de un carrito de compras en ambos:

### Con Redux (versión moderna con toolkit)

\`\`\`typescript
// store/cartSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
}

const initialState: CartState = {
  items: [],
}

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find(item => item.id === action.payload.id)
      if (existing) {
        existing.quantity += 1
      } else {
        state.items.push({ ...action.payload, quantity: 1 })
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload)
    },
  },
})

export const { addItem, removeItem } = cartSlice.actions
export default cartSlice.reducer
\`\`\`

\`\`\`typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './cartSlice'

export const store = configureStore({
  reducer: {
    cart: cartReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
\`\`\`

\`\`\`tsx
// App.tsx
import { Provider } from 'react-redux'
import { store } from './store'

function App() {
  return (
    <Provider store={store}>
      <Cart />
    </Provider>
  )
}
\`\`\`

\`\`\`tsx
// Cart.tsx
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from './store'
import { addItem, removeItem } from './store/cartSlice'

function Cart() {
  const items = useSelector((state: RootState) => state.cart.items)
  const dispatch = useDispatch()

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          {item.name} x {item.quantity}
          <button onClick={() => dispatch(removeItem(item.id))}>
            Eliminar
          </button>
        </div>
      ))}
    </div>
  )
}
\`\`\`

### Con Zustand

\`\`\`typescript
// store/cartStore.ts
import { create } from 'zustand'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => {
    const existing = state.items.find(i => i.id === item.id)
    if (existing) {
      return {
        items: state.items.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
    }
    return { items: [...state.items, { ...item, quantity: 1 }] }
  }),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id)
  })),
}))
\`\`\`

\`\`\`tsx
// Cart.tsx
import { useCartStore } from './store/cartStore'

function Cart() {
  const { items, removeItem } = useCartStore()

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          {item.name} x {item.quantity}
          <button onClick={() => removeItem(item.id)}>
            Eliminar
          </button>
        </div>
      ))}
    </div>
  )
}
\`\`\`

¿Ves la diferencia? Un archivo vs cuatro. Sin Provider. Sin dispatch. Sin selectors.

## Features avanzadas

### Persistencia con localStorage

\`\`\`typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: 'user-storage', // key en localStorage
    }
  )
)
\`\`\`

### Acciones asíncronas

\`\`\`typescript
const useUserStore = create((set) => ({
  user: null,
  loading: false,
  fetchUser: async (id: string) => {
    set({ loading: true })
    const user = await fetch(\`/api/users/\${id}\`).then(r => r.json())
    set({ user, loading: false })
  },
}))
\`\`\`

Sin thunks, sin sagas, sin middleware especial. Solo async/await normal.

### Selectors para optimizar renders

\`\`\`typescript
// Solo re-renderiza cuando cambia 'count'
const count = useStore((state) => state.count)

// Seleccionar múltiples valores
const { count, increment } = useStore((state) => ({
  count: state.count,
  increment: state.increment,
}))
\`\`\`

## ¿Cuándo usar Redux?

Redux todavía tiene sentido en:

- Equipos muy grandes donde la estructura rígida ayuda
- Aplicaciones que necesitan time-travel debugging extensivo
- Proyectos legacy que ya lo usan
- Cuando necesitas el ecosistema completo de middleware

## ¿Cuándo usar Zustand?

Para todo lo demás:

- Proyectos nuevos
- Aplicaciones pequeñas a medianas
- Cuando quieres empezar rápido
- Cuando el boilerplate de Redux te frustra
- Cuando tu equipo es pequeño y ágil

## Conclusión

Zustand no es solo "Redux simplificado". Es un replanteamiento de cómo debería ser state management en React moderno: **simple, intuitivo y sin ceremonias innecesarias**.

Dale una oportunidad en tu próximo proyecto. Te va a sorprender lo productivo que puedes ser cuando no estás peleando con tu manejador de estado.

Abrazo. Blissmo. 🤓
`;

async function main() {
  console.log("Importando post de Zustand...");

  const slug = "zustand-llego-para-destronar-a-redux-2023";
  const title = "Zustand llegó para destronar a Redux";

  // Verificar si ya existe por slug o título
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
        body: zustandPostContent.trim(),
        published: true,
        coverImage: "https://i.imgur.com/GAS5XVz.png",
        metaImage: "https://i.imgur.com/GAS5XVz.png",
        youtubeLink: "https://youtu.be/oD3r09IL7vc",
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.facebook.com/blissito",
        tags: ["zustand", "state", "redux", "management", "context", "hooks"],
        mainTag: "zustand",
        createdAt: new Date(1698629009535),
        updatedAt: new Date(1699972665795),
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title,
      body: zustandPostContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/GAS5XVz.png",
      metaImage: "https://i.imgur.com/GAS5XVz.png",

      // YouTube
      youtubeLink: "https://youtu.be/oD3r09IL7vc",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.facebook.com/blissito",

      // Clasificación
      tags: ["zustand", "state", "redux", "management", "context", "hooks"],
      mainTag: "zustand",

      // Fechas originales: 30 Oct 2023
      createdAt: new Date(1698629009535),
      updatedAt: new Date(1699972665795),
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
    console.error("❌ Error creando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
