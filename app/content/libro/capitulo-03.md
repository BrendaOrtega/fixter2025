# Capítulo 3: CLAUDE.md - La Memoria Persistente del Proyecto

## La Revolución de la Documentación Inteligente

El archivo CLAUDE.md representa una innovación fundamental en la gestión de contexto para proyectos de desarrollo. No es simplemente otro archivo de documentación; es la memoria persistente del proyecto que permite que Claude Code mantenga comprensión profunda y consistente del contexto, las decisiones arquitectónicas, y las peculiaridades específicas que definen cómo debe abordarse el trabajo en cada proyecto único.

Esta aproximación transforma la relación entre documentación y desarrollo activo. Tradicionalmente, la documentación se vuelve obsoleta rápidamente porque requiere mantenimiento manual que compite con la presión de entregar features. CLAUDE.md invierte esta dinámica: se convierte en una herramienta activa que mejora directamente la productividad diaria, creando incentivos naturales para mantenerla actualizada y relevante.

## ¿Qué es CLAUDE.md?

CLAUDE.md es un archivo especial que Claude Code lee automáticamente al comenzar cualquier sesión en tu proyecto. Funciona como un "cerebro compartido" que contiene:

- **Contexto del proyecto**: Qué hace tu aplicación y por qué existe
- **Decisiones arquitectónicas**: Por qué elegiste ciertas tecnologías y patrones
- **Convenciones del código**: Estilo, naming, y mejores prácticas específicas
- **Comandos útiles**: Scripts, herramientas, y workflows comunes
- **Información de contacto**: Emails, recursos, y links importantes

## Estructura Básica de CLAUDE.md

### Ejemplo de Estructura Completa

```markdown
# Mi Proyecto - Context para Claude

## Descripción del Proyecto
Una aplicación web de e-commerce construida con React y Node.js que permite...

## Stack Tecnológico
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, PostgreSQL
- **Testing**: Jest, React Testing Library
- **Deployment**: Vercel (frontend), Railway (backend)

## Estructura de Archivos
- `src/components/` - Componentes reutilizables
- `src/pages/` - Páginas principales
- `src/hooks/` - Custom hooks
- `src/utils/` - Funciones utilitarias
- `src/types/` - Definiciones de TypeScript

## Convenciones de Código
- Usar arrow functions para componentes
- Nombres de archivos en camelCase
- Interfaces con prefijo 'I': `IUser`, `IProduct`
- Custom hooks empiezan con 'use': `useAuth`, `useCart`

## Scripts Útiles
- `npm run dev` - Desarrollo local
- `npm run build` - Build para producción
- `npm run test` - Ejecutar tests
- `npm run lint` - Verificar código

## APIs y Servicios
- **Auth**: usando JWT tokens en localStorage
- **Payments**: Stripe integration en `/api/payments`
- **Database**: PostgreSQL con Prisma ORM

## Información de Contacto
- **Email principal**: dev@miempresa.com
- **Documentación**: https://docs.miproyecto.com
- **Repositorio**: https://github.com/usuario/mi-proyecto
```

## Secciones Esenciales

### 1. Descripción y Contexto

Siempre comienza explicando **qué hace tu proyecto** y **por qué existe**. Esto ayuda a Claude a entender el objetivo general.

```markdown
## Descripción del Proyecto
Esta es una aplicación de gestión de tareas para equipos remotos. 
Permite crear proyectos, asignar tareas, trackear tiempo, y generar reportes.
El objetivo es reemplazar el uso de múltiples herramientas dispersas.
```

### 2. Stack Tecnológico

Lista las tecnologías principales con versiones específicas cuando sea relevante:

```markdown
## Stack Tecnológico
- **Frontend**: Next.js 14, React 18, TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **Estado**: Zustand para estado global
- **Base de datos**: MongoDB con Mongoose
- **Autenticación**: NextAuth.js
- **Deployment**: Vercel
```

### 3. Convenciones Específicas

Documenta las reglas y patrones únicos de tu proyecto:

```markdown
## Convenciones de Código
- Componentes siempre con TypeScript interfaces
- Usar barrel exports en cada carpeta (index.ts)
- Estados de loading siempre llamados `isLoading`
- Errores siempre en formato `{ message: string, code?: string }`
- APIs responses en formato `{ data: T, error?: string }`
```

### 4. Comandos y Scripts

Lista los comandos más útiles para desarrollo:

```markdown
## Comandos Útiles
- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción  
- `npm run test` - Tests con Jest
- `npm run test:watch` - Tests en modo watch
- `npm run db:migrate` - Ejecutar migraciones
- `npm run db:seed` - Sembrar datos de prueba
```

### 5. Configuraciones Importantes

Incluye configuraciones específicas o variables de entorno:

```markdown
## Configuración
### Variables de Entorno Requeridas
- `DATABASE_URL` - URL de la base de datos
- `NEXTAUTH_SECRET` - Secret para NextAuth
- `STRIPE_SECRET_KEY` - API key de Stripe

### Puertos por Defecto
- Frontend: 3000
- Backend API: 3001
- Database: 5432
```

## Mejores Prácticas para CLAUDE.md

### 1. Mantén la Información Actualizada

CLAUDE.md solo es útil si refleja el estado actual del proyecto. Actualízalo cuando:
- Cambies tecnologías o dependencias principales
- Modifiques convenciones de naming o estructura
- Agregues nuevos scripts o comandos importantes
- Changes en la arquitectura o patrones

### 2. Sé Específico, No Genérico

En lugar de escribir "usamos buenas prácticas", especifica:

```markdown
❌ Malo:
- Seguimos buenas prácticas de React

✅ Mejor:
- Componentes funcionales con TypeScript
- Props destructuring en la función
- Custom hooks para lógica compartida
- React.memo para componentes que rerenderean frecuentemente
```

### 3. Incluye Contexto de Decisiones

Explica **por qué** tomas ciertas decisiones, no solo qué haces:

```markdown
## Decisiones Arquitectónicas

### Por qué Zustand sobre Redux
- Menor boilerplate para nuestro caso de uso simple
- TypeScript support nativo
- Bundle size más pequeño
- API más intuitiva para el equipo

### Por qué MongoDB sobre PostgreSQL
- Esquemas flexibles para datos de usuario variables
- Mejor performance para nuestros queries de lectura
- Experiencia previa del equipo
```

### 4. Organiza por Frecuencia de Uso

Pon la información más usada al principio:

```markdown
# Mi Proyecto

## Stack Principal (lo más importante)
...

## Comandos Diarios (muy frecuente)
...

## Configuración Avanzada (menos frecuente)
...

## Información Histórica (raramente necesaria)
...
```

## Ejemplos por Tipo de Proyecto

### Para una API REST

```markdown
## Endpoints Principales
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

## Autenticación
- Header: `Authorization: Bearer <token>`
- Tokens válidos por 24 horas
- Refresh tokens en cookie httpOnly

## Manejo de Errores
- Status codes estándar HTTP
- Formato: `{ error: string, details?: object }`
- Logging con Winston en producción
```

### Para una App React

```markdown
## Estructura de Componentes
- Componentes de UI en `/src/components/ui/`
- Componentes de página en `/src/components/pages/`
- Layouts en `/src/components/layouts/`

## Manejo de Estado
- Estado local con useState/useReducer
- Estado global con Context API en `/src/context/`
- Estado de servidor con React Query

## Routing
- React Router v6
- Rutas protegidas con ProtectedRoute component
- Lazy loading para páginas con React.lazy()
```

### Para un Proyecto Full-Stack

```markdown
## Arquitectura
- Frontend: Next.js con API routes
- Database: PostgreSQL con Prisma
- Authentication: NextAuth.js con GitHub provider
- File storage: AWS S3 para imágenes

## Flujo de Datos
1. Frontend hace request a `/api/...`
2. API route valida autenticación
3. Prisma query a PostgreSQL
4. Response en formato JSON estándar

## Deployment
- Frontend y API en Vercel
- Database en Railway
- Variables de entorno en Vercel dashboard
```

## Integrando CLAUDE.md en tu Workflow

### 1. Creación Inicial

Al empezar un proyecto, crea CLAUDE.md inmediatamente:

```bash
# En la raíz de tu proyecto
touch CLAUDE.md
echo "# Mi Proyecto - Contexto para Claude" > CLAUDE.md
```

### 2. Actualización Regular

Agrega una tarea recurrente para revisar CLAUDE.md:
- Cada sprint/milestone importante
- Cuando onboardees nuevos desarrolladores
- Después de cambios arquitectónicos significativos

### 3. Colaboración en Equipo

Si trabajas en equipo, considera:
- Hacer CLAUDE.md parte del code review
- Documentar decisiones importantes inmediatamente
- Usar como referencia en onboarding

## Comandos Útiles para Mantener CLAUDE.md

```markdown
## Scripts de Mantenimiento
- `npm run docs:update` - Actualizar documentación
- `npm run analyze` - Analizar dependencias
- `npm run audit` - Revisar seguridad
- `npm run clean` - Limpiar cache y node_modules
```

## Conclusión

CLAUDE.md transforma cómo Claude Code entiende y trabaja con tu proyecto. Es la diferencia entre tener un asistente que necesita explicaciones constantes versus uno que "conoce" tu codebase y puede trabajar de manera autónoma y consistente.

La inversión de tiempo en crear y mantener un CLAUDE.md completo se paga inmediatamente en productividad aumentada y menos fricción en cada interacción con Claude Code.

En el próximo capítulo exploraremos todos los comandos disponibles en Claude Code, desde los básicos hasta los más avanzados, proporcionándote una referencia completa de la caja de herramientas.

---

*Un CLAUDE.md bien estructurado es la base de una colaboración efectiva con AI. Cada minuto invertido en documentar tu contexto se multiplica en horas de productividad ganadas.*