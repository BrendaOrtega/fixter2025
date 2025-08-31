# 🎯 Patrones de Email Sequences - Guía de la Industria

## ¿Qué son las Sequences?

Las **Sequences** son series de emails automáticos que se envían basados en **triggers** (disparadores) y **delays** (retrasos). Son la funcionalidad más valiosa de cualquier plataforma de email marketing.

## Los 5 Patrones Más Usados en la Industria

### 1. 🎉 Welcome Series (Bienvenida)

**Propósito**: Dar la bienvenida y educar a nuevos suscriptores
**Trigger**: Nuevo suscriptor
**Duración**: 7-14 días

```
Trigger: Nuevo suscriptor
├── Email 1: "¡Bienvenido!" (inmediato)
├── Email 2: "Esto es lo que hacemos" (+1 día)
├── Email 3: "Tu primer recurso gratuito" (+3 días)
└── Email 4: "¿Alguna pregunta?" (+7 días)
```

**Ejemplo para FixterGeek**:
- Email 1: "¡Bienvenido a FixterGeek! 🤖"
- Email 2: "Por qué Claude Code cambiará tu forma de programar"
- Email 3: "Tu primera automatización [Tutorial gratuito]"
- Email 4: "¿Alguna duda? Estamos aquí para ayudarte"

---

### 2. 🛒 Abandoned Cart (Carrito Abandonado)

**Propósito**: Recuperar ventas perdidas
**Trigger**: Usuario añade al carrito pero no compra
**Duración**: 3-7 días

```
Trigger: Usuario añade al carrito pero no compra
├── Email 1: "¿Olvidaste algo?" (+1 hora)
├── Email 2: "Termina tu compra + 10% descuento" (+1 día)
└── Email 3: "Última oportunidad" (+3 días)
```

**Ejemplo para FixterGeek**:
- Email 1: "Tu curso de Claude Code te está esperando 🤖"
- Email 2: "10% descuento en tu curso + bonus exclusivo"
- Email 3: "¡Últimas horas! No pierdas esta oportunidad"

---

### 3. 🎓 Educational Series (Educacional)

**Propósito**: Educar sobre un tema específico
**Trigger**: Usuario se interesa en tema específico (tag o descarga)
**Duración**: 10-21 días

```
Trigger: Usuario se interesa en tema específico
├── Email 1: "Fundamentos de X" (inmediato)
├── Email 2: "Tips avanzados de X" (+2 días)
├── Email 3: "Casos de estudio" (+4 días)
└── Email 4: "¿Listo para el siguiente nivel?" (+7 días)
```

**Ejemplo para FixterGeek**:
- Email 1: "Los 3 pilares de la automatización con IA"
- Email 2: "Cómo crear tu primer agente inteligente"
- Email 3: "Case Study: Automatizando 80% del desarrollo"
- Email 4: "¿Listo para dominar Claude Code?"

---

### 4. 🔄 Re-engagement (Re-enganche)

**Propósito**: Reactivar suscriptores inactivos
**Trigger**: Usuario inactivo por 30+ días
**Duración**: 7-14 días

```
Trigger: Usuario inactivo por 30+ días
├── Email 1: "Te extrañamos" (inmediato)
├── Email 2: "¿Qué ha cambiado?" (+3 días)
└── Email 3: "Una última vez..." (+7 días)
```

**Ejemplo para FixterGeek**:
- Email 1: "¿Sigues interesado en la automatización con IA?"
- Email 2: "Mira lo que te has perdido [Últimas novedades]"
- Email 3: "Última oportunidad antes de eliminarte de la lista"

---

### 5. 🎯 Lead Nurturing (Nutrición de leads)

**Propósito**: Convertir leads en clientes
**Trigger**: Usuario descarga recurso o muestra interés comercial
**Duración**: 14-30 días

```
Trigger: Usuario descarga recurso
├── Email 1: "Tu descarga + siguiente paso" (inmediato)
├── Email 2: "Case study relevante" (+2 días)
├── Email 3: "Demo/consulta gratuita" (+5 días)
└── Email 4: "Propuesta comercial" (+10 días)
```

**Ejemplo para FixterGeek**:
- Email 1: "Tu guía de Claude + próximos pasos"
- Email 2: "Cómo Juan automatizó su startup con Claude Code"
- Email 3: "¿Te interesa una sesión 1-a-1 gratuita?"
- Email 4: "Propuesta: Mentoring personalizado en IA"

---

## 🏗️ Modelo de Datos Simplista

### Estructura Básica

```prisma
enum SequenceTrigger {
  SUBSCRIPTION     // Al suscribirse (welcome series)
  TAG_ADDED       // Cuando se añade un tag específico
  MANUAL          // Inscripción manual por admin
  INACTIVITY      // Por inactividad (re-engagement)
  COURSE_PURCHASE // Tras comprar curso
}

model Sequence {
  id          String @id @default(auto()) @map("_id") @db.ObjectId
  name        String                    // "Bienvenida Claude Code"
  description String?                   // Descripción interna
  
  // Trigger
  trigger     SequenceTrigger
  triggerTag  String?                   // Tag específico si trigger es TAG_ADDED
  
  // Estado
  isActive    Boolean @default(false)
  
  // Relaciones
  emails      SequenceEmail[]
  enrollments SequenceEnrollment[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model SequenceEmail {
  id         String @id @default(auto()) @map("_id") @db.ObjectId
  sequenceId String @db.ObjectId
  sequence   Sequence @relation(fields: [sequenceId], references: [id])
  
  // Orden y timing
  order      Int                        // 1, 2, 3, etc.
  delayDays  Int                        // Días a esperar desde email anterior
  
  // Contenido
  subject    String                     // "¡Bienvenido a FixterGeek!"
  content    String                     // HTML del email
  
  // Configuración
  fromName   String @default("FixterGeek")
  fromEmail  String @default("contacto@fixter.org")
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model SequenceEnrollment {
  id           String @id @default(auto()) @map("_id") @db.ObjectId
  sequenceId   String @db.ObjectId
  sequence     Sequence @relation(fields: [sequenceId], references: [id])
  
  subscriberId String @db.ObjectId
  subscriber   Subscriber @relation(fields: [subscriberId], references: [id])
  
  // Estado actual
  status           String    @default("active")  // active, completed, paused
  currentEmailIndex Int      @default(0)         // Qué email sigue
  nextEmailAt      DateTime?                     // Cuándo enviar el siguiente
  
  // Tracking básico
  enrolledAt       DateTime  @default(now())
  completedAt      DateTime?
  emailsSent       Int       @default(0)
  
  @@unique([sequenceId, subscriberId])
}
```

---

## 🎨 UX Típico de la Industria

### 1. Lista de Sequences

```
📋 Mis Sequences
├── 🎉 Bienvenida Claude Code (ACTIVA) - 1,234 inscritos
├── 🎓 Serie Educacional Git (PAUSADA) - 567 inscritos  
├── 🔄 Re-engagement (BORRADOR) - 0 inscritos
└── [+ Crear Nueva Sequence]
```

### 2. Editor de Sequence

```
📝 Editando: "Bienvenida Claude Code"

Trigger: 📥 Al suscribirse con tag "claude"

Emails:
├── 1️⃣ "¡Bienvenido a Claude Code!" (inmediato)
├── 2️⃣ "Tu primera automatización" (+ 2 días) 
├── 3️⃣ "Recursos gratuitos" (+ 5 días)
└── [+ Añadir Email]

👥 1,234 personas inscritas
📊 Tasa de apertura: 67%
```

### 3. Estadísticas Simples

```
📊 Estadísticas: Bienvenida Claude Code

Email 1: 📧 1,200 enviados → 👀 804 abiertos (67%) → 🖱️ 156 clicks (13%)
Email 2: 📧 1,150 enviados → 👀 745 abiertos (65%) → 🖱️ 138 clicks (12%)  
Email 3: 📧 1,100 enviados → 👀 682 abiertos (62%) → 🖱️ 121 clicks (11%)

✅ 1,089 completaron la serie (91%)
```

---

## 🚀 Casos de Uso para FixterGeek

### 1. Welcome Claude
- **Trigger**: Al suscribirse al newsletter de Claude
- **Duración**: 7 días
- **Objetivo**: Introducir Claude Code y sus beneficios

### 2. Welcome Gemini  
- **Trigger**: Al suscribirse al newsletter de Gemini
- **Duración**: 7 días
- **Objetivo**: Introducir Gemini CLI y casos de uso

### 3. Course Follow-up
- **Trigger**: Tras comprar un curso
- **Duración**: 14 días
- **Objetivo**: Maximizar el éxito del estudiante

### 4. Blog Reader
- **Trigger**: Para lectores frecuentes del blog (tag automático)
- **Duración**: 10 días
- **Objetivo**: Convertir lectores en estudiantes

### 5. Re-engagement
- **Trigger**: Para suscriptores inactivos
- **Duración**: 7 días
- **Objetivo**: Reactivar o limpiar la lista

---

## 📊 Métricas Clave de la Industria

### Tasas de Apertura por Tipo de Sequence:
- **Welcome Series**: 60-80%
- **Educational**: 45-65%
- **Abandoned Cart**: 35-55%
- **Re-engagement**: 25-45%
- **Lead Nurturing**: 40-60%

### Tasas de Click por Tipo:
- **Welcome Series**: 15-25%
- **Educational**: 8-15%
- **Abandoned Cart**: 5-12%
- **Re-engagement**: 3-8%
- **Lead Nurturing**: 10-18%

### Benchmarks de Timing:
- **Email 1**: Abrir en primeras 2 horas (70% de opens)
- **Email 2**: Mejor día para enviar: Martes/Miércoles
- **Frecuencia óptima**: Cada 2-3 días (no diario)
- **Duración máxima**: 21 días (después baja engagement)

---

## 🎯 Mejores Prácticas

### Contenido:
- **Asunto personalizado**: "Hola [Nombre], tu guía de Claude está lista"
- **Valor inmediato**: Cada email debe aportar valor
- **CTA claro**: Un solo llamado a la acción por email
- **Storytelling**: Contar historias, no solo vender

### Timing:
- **Email 1**: Inmediato (mientras el interés está alto)
- **Email 2-3**: 2-3 días de separación
- **Email 4+**: Puede ser semanal

### Personalización:
- Usar nombre del suscriptor
- Referenciar su trigger específico
- Adaptar contenido según tags/intereses

### Testing:
- A/B test en asuntos (primera prioridad)
- Test timing entre emails
- Test longitud de la secuencia

---

## 🔧 Implementación Técnica

### Proceso de Envío (Cron Job):
```typescript
// Cada hora, buscar emails pendientes
const pendingEmails = await db.sequenceEnrollment.findMany({
  where: {
    status: 'active',
    nextEmailAt: { lte: new Date() }
  },
  include: { sequence: { include: { emails: true } }, subscriber: true }
});

// Enviar y actualizar estado
for (const enrollment of pendingEmails) {
  const currentEmail = enrollment.sequence.emails[enrollment.currentEmailIndex];
  await sendEmail(currentEmail, enrollment.subscriber);
  
  // Actualizar para próximo email
  await updateEnrollmentProgress(enrollment);
}
```

### Triggers Automáticos:
```typescript
// Al suscribirse
async function onNewSubscriber(subscriber: Subscriber) {
  const welcomeSequences = await db.sequence.findMany({
    where: { trigger: 'SUBSCRIPTION', isActive: true }
  });
  
  for (const sequence of welcomeSequences) {
    await enrollInSequence(subscriber, sequence);
  }
}

// Al añadir tag
async function onTagAdded(subscriber: Subscriber, tag: string) {
  const sequences = await db.sequence.findMany({
    where: { trigger: 'TAG_ADDED', triggerTag: tag, isActive: true }
  });
  
  for (const sequence of sequences) {
    await enrollInSequence(subscriber, sequence);
  }
}
```

---

Este sistema de sequences te dará capacidades de email marketing profesional manteniendo la simplicidad. Es la funcionalidad que más impacto tiene en conversión y engagement.