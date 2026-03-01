/**
 * Seed script for coaching exercises.
 * Run with: npx tsx app/.server/services/coach-seed.server.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface ExerciseSeed {
  topic: string;
  dimension: string;
  difficulty: number;
  prompt: string;
  hints: string[];
  solutionGuide?: string;
  tags: string[];
}

const exercises: ExerciseSeed[] = [
  // === JAVASCRIPT ===
  // Algorithms
  { topic: "javascript", dimension: "algorithms", difficulty: 1, prompt: "Escribe una función que reciba un arreglo de números y devuelva la suma de todos los elementos. No uses reduce.", hints: ["Piensa en un for loop", "Necesitas una variable acumuladora"], tags: ["arrays", "loops"] },
  { topic: "javascript", dimension: "algorithms", difficulty: 2, prompt: "Escribe una función que determine si un string es un palíndromo (se lee igual de derecha a izquierda). Ignora espacios y mayúsculas.", hints: ["Primero normaliza el string", "Compara con su versión invertida"], tags: ["strings", "manipulation"] },
  { topic: "javascript", dimension: "algorithms", difficulty: 3, prompt: "Implementa una función que encuentre los dos números en un arreglo que sumen un target dado. Devuelve sus índices. Intenta hacerlo en O(n).", hints: ["Un Map puede guardar lo que ya viste", "Para cada número, busca su complemento"], tags: ["two-sum", "hashmap"] },
  { topic: "javascript", dimension: "algorithms", difficulty: 4, prompt: "Implementa un algoritmo de búsqueda binaria que funcione con un arreglo ordenado. Debe devolver el índice del elemento o -1.", hints: ["Mantén dos punteros: left y right", "Calcula mid y compara"], tags: ["binary-search", "divide-conquer"] },
  { topic: "javascript", dimension: "algorithms", difficulty: 5, prompt: "Implementa una función que resuelva el problema de las N-Reinas para un tablero de tamaño n. Devuelve el número de soluciones posibles.", hints: ["Backtracking es el enfoque", "Necesitas verificar columnas y diagonales"], tags: ["backtracking", "recursion"] },

  // Syntax Fluency
  { topic: "javascript", dimension: "syntaxFluency", difficulty: 1, prompt: "Explica la diferencia entre let, const y var. Da un ejemplo de cuándo usarías cada uno.", hints: ["Piensa en scope y reasignación"], tags: ["variables", "scope"] },
  { topic: "javascript", dimension: "syntaxFluency", difficulty: 2, prompt: "Usa destructuring para extraer las propiedades name y age de un objeto, y el primer y último elemento de un arreglo. Todo en una línea cada uno.", hints: ["Destructuring de objeto: { name, age } = obj", "Para el último elemento del arreglo puedes usar rest: [..., last]"], tags: ["destructuring", "es6"] },
  { topic: "javascript", dimension: "syntaxFluency", difficulty: 3, prompt: "Escribe una función que use async/await para hacer fetch a una API, maneje errores con try/catch, y tenga un timeout de 5 segundos usando Promise.race.", hints: ["Promise.race acepta un arreglo de promesas", "Crea una promesa de timeout con setTimeout"], tags: ["async", "promises"] },
  { topic: "javascript", dimension: "syntaxFluency", difficulty: 4, prompt: "Implementa un generador (function*) que produzca la secuencia de Fibonacci de forma infinita. Luego úsalo con un for...of limitado a los primeros 10 valores.", hints: ["yield devuelve el valor actual", "Mantén dos variables para los valores previos"], tags: ["generators", "iterators"] },
  { topic: "javascript", dimension: "syntaxFluency", difficulty: 5, prompt: "Implementa un Proxy que intercepte gets y sets de un objeto, loguee cada acceso, y lance un error si se intenta asignar un valor negativo a cualquier propiedad numérica.", hints: ["new Proxy(target, handler)", "handler tiene traps: get, set"], tags: ["proxy", "metaprogramming"] },

  // Debugging
  { topic: "javascript", dimension: "debugging", difficulty: 1, prompt: "Este código tiene un bug: `for(var i = 0; i < 5; i++) { setTimeout(() => console.log(i), 100) }`. ¿Qué imprime y por qué? ¿Cómo lo arreglarías?", hints: ["var tiene scope de función, no de bloque", "¿Qué valor tiene i cuando se ejecuta el callback?"], tags: ["closures", "var-scope"] },
  { topic: "javascript", dimension: "debugging", difficulty: 2, prompt: "Un usuario reporta que `[1,2,11,3].sort()` devuelve `[1,11,2,3]`. Explica por qué y cómo arreglarlo.", hints: ["sort() por defecto compara como strings", "Pasa una función comparadora"], tags: ["sort", "coercion"] },
  { topic: "javascript", dimension: "debugging", difficulty: 3, prompt: "Tienes una función async que a veces devuelve undefined y a veces el valor correcto. El código es: `async function getData() { let result; fetch('/api').then(r => r.json()).then(d => result = d); return result; }`. Encuentra y corrige el bug.", hints: ["fetch es asíncrono pero no estás esperando", "result se retorna antes de que llegue la respuesta"], tags: ["async", "race-condition"] },
  { topic: "javascript", dimension: "debugging", difficulty: 4, prompt: "Un memory leak ocurre en una SPA. El dev sospecha de event listeners. Explica: 1) Cómo confirmarías el leak, 2) Las 3 causas más comunes de memory leaks en JS del navegador, 3) Cómo lo resolverías.", hints: ["Chrome DevTools tiene un Memory profiler", "Listeners no removidos, closures, refs a DOM eliminado"], tags: ["memory-leak", "performance"] },

  // System Design
  { topic: "javascript", dimension: "systemDesign", difficulty: 2, prompt: "Diseña un sistema simple de pub/sub (EventEmitter) en JavaScript. Debe soportar: on(event, callback), emit(event, data), off(event, callback).", hints: ["Usa un objeto/Map para guardar listeners por evento", "emit itera sobre los listeners del evento"], tags: ["design-pattern", "events"] },
  { topic: "javascript", dimension: "systemDesign", difficulty: 3, prompt: "Diseña un rate limiter que permita máximo N llamadas por ventana de T segundos. Debe funcionar en el navegador.", hints: ["Guarda timestamps de llamadas recientes", "Filtra las que están fuera de la ventana"], tags: ["rate-limiting", "api"] },

  // Communication
  { topic: "javascript", dimension: "communication", difficulty: 1, prompt: "Explica qué es el event loop de JavaScript como si le explicaras a alguien que viene de Python. Usa una analogía.", hints: ["Piensa en una cocina con un solo chef", "Call stack, callback queue, microtask queue"], tags: ["event-loop", "fundamentals"] },
  { topic: "javascript", dimension: "communication", difficulty: 3, prompt: "Un cliente no técnico te pregunta por qué su página web 'se congela' cuando procesa un archivo grande. Explícale el problema y propón una solución, sin usar jerga técnica.", hints: ["JavaScript es single-threaded", "Web Workers pueden ayudar"], tags: ["web-workers", "ux"] },

  // === REACT ===
  { topic: "react", dimension: "algorithms", difficulty: 2, prompt: "Implementa un hook personalizado `useDebounce(value, delay)` que retorne el valor solo después de que pase el delay sin cambios.", hints: ["useEffect con setTimeout", "Limpia el timeout en el cleanup"], tags: ["hooks", "debounce"] },
  { topic: "react", dimension: "syntaxFluency", difficulty: 1, prompt: "Crea un componente Counter que muestre un número, un botón para incrementar y otro para decrementar. Usa useState.", hints: ["const [count, setCount] = useState(0)"], tags: ["useState", "basics"] },
  { topic: "react", dimension: "syntaxFluency", difficulty: 2, prompt: "Convierte este componente de clase a función con hooks:\nclass Timer extends React.Component { state = {seconds: 0}; componentDidMount() { this.interval = setInterval(() => this.setState(s => ({seconds: s.seconds + 1})), 1000); } componentWillUnmount() { clearInterval(this.interval); } render() { return <div>{this.state.seconds}s</div>; } }", hints: ["useState para seconds", "useEffect con cleanup para el interval"], tags: ["hooks", "migration"] },
  { topic: "react", dimension: "syntaxFluency", difficulty: 3, prompt: "Implementa un componente que use useReducer para manejar un carrito de compras con acciones: ADD_ITEM, REMOVE_ITEM, UPDATE_QUANTITY, CLEAR.", hints: ["Define el reducer con un switch", "El state puede ser un arreglo de items"], tags: ["useReducer", "state-management"] },
  { topic: "react", dimension: "debugging", difficulty: 2, prompt: "Un componente se re-renderiza infinitamente. El código tiene: `useEffect(() => { setData(fetchData()) }, [data])`. ¿Por qué ocurre y cómo lo arreglas?", hints: ["setData cambia data, lo que dispara el effect de nuevo", "¿Realmente necesitas data como dependencia?"], tags: ["useEffect", "infinite-loop"] },
  { topic: "react", dimension: "debugging", difficulty: 3, prompt: "Un formulario en React pierde el focus del input después de cada keystroke. El componente padre re-renderiza el formulario completo. ¿Cuál es la causa más probable y cómo lo solucionas?", hints: ["¿Estás definiendo componentes dentro del render?", "Cada render crea una nueva referencia del componente"], tags: ["re-render", "keys"] },
  { topic: "react", dimension: "systemDesign", difficulty: 3, prompt: "Diseña la arquitectura de un sistema de autenticación en React con: login, registro, recuperación de contraseña, protección de rutas, y refresh tokens.", hints: ["Context para el estado de auth", "Un wrapper/guard para rutas protegidas", "Interceptor para refresh automático"], tags: ["auth", "architecture"] },
  { topic: "react", dimension: "systemDesign", difficulty: 4, prompt: "Diseña un sistema de formularios dinámicos en React donde la configuración viene de un JSON del backend. Debe soportar validación, campos condicionales, y diferentes tipos de input.", hints: ["Schema-driven rendering", "Mapping de tipos a componentes", "Validación basada en reglas del schema"], tags: ["dynamic-forms", "schema"] },
  { topic: "react", dimension: "communication", difficulty: 2, prompt: "Tu compañero de equipo quiere usar Redux para una app con 3 pantallas y estado simple. Argumenta a favor o en contra, explicando cuándo Redux vale la pena.", hints: ["Considera la complejidad vs beneficio", "¿Qué alternativas más simples existen?"], tags: ["state-management", "trade-offs"] },

  // === NODE.JS ===
  { topic: "node", dimension: "algorithms", difficulty: 2, prompt: "Escribe una función en Node.js que lea un archivo de texto línea por línea usando streams y cuente la frecuencia de cada palabra.", hints: ["createReadStream + readline", "Un Map para contar frecuencias"], tags: ["streams", "file-io"] },
  { topic: "node", dimension: "syntaxFluency", difficulty: 2, prompt: "Crea un servidor HTTP básico (sin Express) que responda JSON en GET /api/health, HTML en GET /, y 404 para cualquier otra ruta.", hints: ["http.createServer", "Revisa req.url y req.method"], tags: ["http", "native"] },
  { topic: "node", dimension: "syntaxFluency", difficulty: 3, prompt: "Implementa un middleware de Express que: 1) Loguee método, URL y tiempo de respuesta, 2) Añada headers de seguridad, 3) Maneje CORS para un dominio específico.", hints: ["req, res, next", "res.on('finish') para medir tiempo"], tags: ["express", "middleware"] },
  { topic: "node", dimension: "debugging", difficulty: 3, prompt: "Tu API de Node.js empieza a responder lento después de unas horas. El memory usage crece constantemente. Describe tu proceso de diagnóstico paso a paso.", hints: ["Heap snapshots con --inspect", "Busca objetos que crecen entre snapshots"], tags: ["memory-leak", "profiling"] },
  { topic: "node", dimension: "systemDesign", difficulty: 3, prompt: "Diseña un sistema de colas de trabajo (job queue) en Node.js para procesar emails en background. Debe soportar reintentos, prioridades, y timeouts.", hints: ["Bull/BullMQ como referencia", "Redis como backend", "Dead letter queue para fallos"], tags: ["queues", "background-jobs"] },
  { topic: "node", dimension: "systemDesign", difficulty: 4, prompt: "Diseña una arquitectura para una API REST que soporte: rate limiting, caching, versionado, paginación cursor-based, y documentación auto-generada.", hints: ["Middleware layers", "ETags para cache", "Cursor encoding para paginación"], tags: ["rest-api", "architecture"] },
  { topic: "node", dimension: "communication", difficulty: 2, prompt: "Explica la diferencia entre process.nextTick(), setImmediate(), y setTimeout(fn, 0) en Node.js. ¿En qué orden se ejecutan y por qué?", hints: ["Phases del event loop de Node", "nextTick se ejecuta antes de I/O"], tags: ["event-loop", "node-internals"] },

  // === PYTHON ===
  { topic: "python", dimension: "algorithms", difficulty: 1, prompt: "Escribe una función que reciba una lista de strings y devuelva un diccionario con la frecuencia de cada string.", hints: ["Puedes usar un dict o Counter"], tags: ["dicts", "counting"] },
  { topic: "python", dimension: "algorithms", difficulty: 3, prompt: "Implementa una función que encuentre el subarray contiguo con la suma máxima (Kadane's algorithm). Devuelve la suma y los índices.", hints: ["Mantén la suma actual y la máxima", "Reinicia cuando la suma se vuelve negativa"], tags: ["kadane", "dynamic-programming"] },
  { topic: "python", dimension: "syntaxFluency", difficulty: 2, prompt: "Usa list comprehensions para: 1) Filtrar números pares de una lista, 2) Crear un dict de {palabra: longitud}, 3) Aplanar una lista de listas.", hints: ["[x for x in lst if condición]", "Para aplanar: [item for sublist in lst for item in sublist]"], tags: ["comprehensions", "pythonic"] },
  { topic: "python", dimension: "syntaxFluency", difficulty: 3, prompt: "Implementa un context manager (con __enter__ y __exit__) que mida el tiempo de ejecución de un bloque de código y lo imprima al salir.", hints: ["time.perf_counter() para medir", "__exit__ recibe exc_type, exc_val, exc_tb"], tags: ["context-manager", "timing"] },
  { topic: "python", dimension: "debugging", difficulty: 2, prompt: "Este código tiene un bug clásico de Python: `def append_to(element, to=[]):\n    to.append(element)\n    return to`. ¿Qué pasa al llamarla varias veces y por qué?", hints: ["Los argumentos por defecto mutables se comparten entre llamadas", "Usa None como default"], tags: ["mutable-defaults", "gotcha"] },
  { topic: "python", dimension: "systemDesign", difficulty: 3, prompt: "Diseña un web scraper en Python que sea: robusto ante errores, respetuoso con rate limits, capaz de manejar paginación, y que guarde resultados incrementalmente.", hints: ["requests + BeautifulSoup o Scrapy", "Exponential backoff para reintentos", "Guarda en archivo/DB después de cada página"], tags: ["scraping", "robustness"] },
  { topic: "python", dimension: "communication", difficulty: 2, prompt: "Explica la diferencia entre una lista y una tupla en Python. ¿Cuándo usarías cada una? Da ejemplos concretos del mundo real.", hints: ["Mutabilidad es la diferencia clave", "Tuplas como registros, listas como colecciones"], tags: ["data-types", "fundamentals"] },

  // === AI/ML ===
  { topic: "ai-ml", dimension: "algorithms", difficulty: 2, prompt: "Explica cómo funciona el algoritmo de k-nearest neighbors (KNN). ¿Cuáles son sus ventajas y desventajas? ¿Cómo elegirías el valor de k?", hints: ["Distancia euclidiana para encontrar vecinos", "k impar evita empates"], tags: ["knn", "classification"] },
  { topic: "ai-ml", dimension: "algorithms", difficulty: 3, prompt: "Implementa (en pseudocódigo o Python) el forward pass de una red neuronal simple con una capa oculta. Incluye la función de activación.", hints: ["Multiplicación de matrices + bias", "ReLU o sigmoid como activación"], tags: ["neural-network", "forward-pass"] },
  { topic: "ai-ml", dimension: "syntaxFluency", difficulty: 2, prompt: "Usando la AI SDK de Vercel (TypeScript), escribe código para: 1) Llamar a un modelo con generateText, 2) Usar streaming con streamText, 3) Definir una tool/function.", hints: ["import { generateText } from 'ai'", "tools se definen con zod schemas"], tags: ["ai-sdk", "vercel"] },
  { topic: "ai-ml", dimension: "systemDesign", difficulty: 3, prompt: "Diseña un sistema RAG (Retrieval Augmented Generation) para un chatbot de soporte técnico. Incluye: ingesta de documentos, embeddings, búsqueda, y generación.", hints: ["Chunking de documentos", "Vector DB para embeddings", "Prompt con contexto recuperado"], tags: ["rag", "chatbot"] },
  { topic: "ai-ml", dimension: "systemDesign", difficulty: 4, prompt: "Diseña la arquitectura de un sistema de AI agents que puedan: usar herramientas externas, mantener memoria de conversación, y colaborar entre sí para resolver tareas complejas.", hints: ["Tool calling con schemas", "Memory: short-term (context) + long-term (DB)", "Orchestrator pattern"], tags: ["agents", "architecture"] },
  { topic: "ai-ml", dimension: "communication", difficulty: 2, prompt: "Tu CEO quiere implementar 'IA' en el producto. Explica en términos de negocio: qué puede y qué NO puede hacer un LLM, costos aproximados, y riesgos a considerar.", hints: ["Alucinaciones como riesgo principal", "Costo por token", "No reemplaza lógica determinista"], tags: ["llm", "business"] },
  { topic: "ai-ml", dimension: "debugging", difficulty: 3, prompt: "Tu modelo de ML tiene 99% de accuracy en entrenamiento pero 60% en producción. Describe las posibles causas y cómo diagnosticarías cada una.", hints: ["Overfitting es lo más probable", "Data drift entre train y prod", "Feature leakage"], tags: ["overfitting", "production"] },

  // === SYSTEM DESIGN ===
  { topic: "system-design", dimension: "systemDesign", difficulty: 2, prompt: "Diseña un acortador de URLs (como bit.ly). Cubre: generación de IDs cortos, almacenamiento, redirección, y analytics básicos.", hints: ["Base62 encoding para URLs cortas", "Cache para las más populares", "Contador async para analytics"], tags: ["url-shortener", "basics"] },
  { topic: "system-design", dimension: "systemDesign", difficulty: 3, prompt: "Diseña un sistema de notificaciones push para una app móvil con 1M de usuarios. Debe soportar: targeting por segmento, scheduling, y tracking de entregas.", hints: ["Cola de mensajes para desacoplar", "FCM/APNs como delivery", "Batch processing para segmentos grandes"], tags: ["notifications", "scale"] },
  { topic: "system-design", dimension: "systemDesign", difficulty: 4, prompt: "Diseña un sistema de chat en tiempo real como WhatsApp Web. Cubre: conexión WebSocket, delivery status (enviado/recibido/leído), grupos, y offline support.", hints: ["WebSocket para tiempo real", "Message queue para delivery garantizado", "Last-write-wins para estado de lectura"], tags: ["chat", "real-time"] },
  { topic: "system-design", dimension: "systemDesign", difficulty: 5, prompt: "Diseña un sistema de video streaming como YouTube. Cubre: upload y transcoding, adaptive bitrate streaming, CDN, recommendations, y monetización.", hints: ["HLS/DASH para adaptive streaming", "CDN edge caching", "Transcoding pipeline async"], tags: ["video", "streaming"] },
  { topic: "system-design", dimension: "communication", difficulty: 3, prompt: "En una sesión de system design interview, te piden diseñar Twitter. ¿Cómo estructurarías tu respuesta en 45 minutos? Describe tu framework.", hints: ["Requirements → High-level → Deep dive → Trade-offs", "Clarifica: read-heavy vs write-heavy", "Fan-out on write vs fan-out on read"], tags: ["interview", "framework"] },
  { topic: "system-design", dimension: "algorithms", difficulty: 3, prompt: "Explica cómo funciona consistent hashing y por qué es importante en sistemas distribuidos. ¿Cuándo lo usarías?", hints: ["Anillo hash con nodos virtuales", "Minimiza redistribución al agregar/quitar nodos"], tags: ["distributed-systems", "hashing"] },
];

async function seed() {
  console.log(`Seeding ${exercises.length} exercises...`);

  // Check existing count
  const existing = await db.exercise.count();
  if (existing > 0) {
    console.log(`Already ${existing} exercises in DB. Skipping seed.`);
    return;
  }

  for (const ex of exercises) {
    await db.exercise.create({ data: ex });
  }

  console.log(`Done! Seeded ${exercises.length} exercises.`);
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect());
