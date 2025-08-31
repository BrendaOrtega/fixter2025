# Plan: Ruta de Admin para Email Sequences

## Ruta: `/admin/sequences`

### Objetivo
Panel de administración completo para gestionar sequences, emails y enrollments desde el dashboard.

---

## 🎯 Funcionalidades Principales

### 1. Dashboard General
```
📊 MÉTRICAS GENERALES
┌─────────────────────────────────────────────┐
│ 📧 3 Sequences Activas  👥 47 Suscriptores │
│ ⏸️ 1 Sequence Pausada   📈 89% Tasa Entrega │
│ ✉️ 156 Emails Enviados  🔄 12 En Cola      │
└─────────────────────────────────────────────┘
```

### 2. Lista de Sequences
```
📋 TODAS LAS SEQUENCES
┌─────────────────────────────────────────────────────────────────┐
│ ⭐ Pre-Webinar | Gemini-CLI        🟢 Activa    👥 15  📧 3    │
│    📈 Enrollments: 12 activos, 3 pausados                      │
│    [📝 Editar] [⏸️ Pausar] [📊 Ver Stats] [🗑️ Eliminar]      │
├─────────────────────────────────────────────────────────────────┤
│    Bienvenida Claude Code          🟢 Activa    👥 28  📧 3    │
│    📈 Enrollments: 25 activos, 3 pausados                      │
│    [📝 Editar] [⏸️ Pausar] [📊 Ver Stats] [🗑️ Eliminar]      │
├─────────────────────────────────────────────────────────────────┤
│    Re-engagement                   🔴 Inactiva  👥 4   📧 1    │
│    📈 Enrollments: 0 activos, 4 pausados                       │
│    [📝 Editar] [▶️ Activar] [📊 Ver Stats] [🗑️ Eliminar]     │
└─────────────────────────────────────────────────────────────────┘

[➕ Crear Nueva Sequence]
```

### 3. Editor de Sequences
```
📝 EDITAR SEQUENCE: "Pre-Webinar | Gemini-CLI"
┌─────────────────────────────────────────────────────────────────┐
│ Información Básica:                                             │
│ ┌─────────────────────────────────────────┐                     │
│ │ Nombre: [Pre-Webinar | Gemini-CLI     ]│                     │
│ │ Descripción: [Serie de preparación... ]│                     │
│ │ Trigger: [TAG_ADDED ▼] Tag: [gemini   ]│                     │
│ │ Estado: [✅ Activa] [⭐ Destacada]      │                     │
│ └─────────────────────────────────────────┘                     │
│                                                                 │
│ 📧 Emails de la Sequence:                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 1️⃣ Email #1 - ¡Tu lugar está confirmado! 💎               │ │
│ │     📅 Delay: 0 días │ 👤 Héctor Bliss                     │ │
│ │     [📝 Editar] [👁️ Preview] [🗑️ Eliminar]                │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ 2️⃣ Email #2 - 🚀 Prepárate para el webinar                │ │
│ │     📅 Delay: 2 días │ 👤 Héctor Bliss                     │ │
│ │     [📝 Editar] [👁️ Preview] [🗑️ Eliminar]                │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ 3️⃣ Email #3 - ⏰ Último recordatorio                       │ │
│ │     📅 Delay: 4 días │ 👤 Héctor Bliss                     │ │
│ │     [📝 Editar] [👁️ Preview] [🗑️ Eliminar]                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [➕ Añadir Email] [💾 Guardar Cambios] [❌ Cancelar]            │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Stats y Analytics
```
📊 ESTADÍSTICAS: "Pre-Webinar | Gemini-CLI"
┌─────────────────────────────────────────────────────────────────┐
│ 📈 Performance General:                                         │
│ • Total Enrollments: 15 (12 activos, 3 pausados)              │
│ • Emails Enviados: 28 (93% tasa de entrega)                   │
│ • Completados: 2 usuarios                                      │
│                                                                 │
│ 📧 Performance por Email:                                       │
│ Email #1: 15 enviados → 14 entregados (93%)                   │
│ Email #2: 8 enviados → 8 entregados (100%)                    │  
│ Email #3: 5 enviados → 5 entregados (100%)                    │
│                                                                 │
│ 👥 Usuarios Actuales:                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ contacto@fixter.org        🟢 Activo   📧 2/3  67%         │ │
│ │ user2@example.com          ⏸️ Pausado  📧 1/3  33%         │ │
│ │ user3@example.com          🟢 Activo   📧 3/3  100% ✅     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Estructura Técnica

### Rutas Admin
```typescript
// app/routes/admin/sequences/index.tsx - Lista principal
// app/routes/admin/sequences/new.tsx - Crear sequence
// app/routes/admin/sequences/$id.tsx - Editar sequence  
// app/routes/admin/sequences/$id/stats.tsx - Estadísticas
// app/routes/admin/sequences/$id/emails/new.tsx - Crear email
// app/routes/admin/sequences/$id/emails/$emailId.tsx - Editar email
```

### Componentes Reutilizables
```typescript
// SequenceCard.tsx - Card para lista
// SequenceForm.tsx - Form de crear/editar
// EmailEditor.tsx - Editor WYSIWYG
// StatsChart.tsx - Gráficas de performance
// EnrollmentTable.tsx - Tabla de usuarios
```

### Funcionalidades por Implementar

#### 📋 **Lista de Sequences** (`/admin/sequences`)
- [x] Listar todas las sequences
- [ ] Filtros por status (activa/pausada)  
- [ ] Búsqueda por nombre
- [ ] Acciones bulk (pausar múltiples)
- [ ] Crear nueva sequence

#### 📝 **Editor de Sequences** (`/admin/sequences/$id`)  
- [ ] Editar info básica (nombre, descripción, trigger)
- [ ] Gestionar emails de la sequence
- [ ] Reordenar emails (drag & drop)
- [ ] Preview de emails
- [ ] Duplicar sequence

#### 📊 **Analytics** (`/admin/sequences/$id/stats`)
- [ ] Métricas generales
- [ ] Performance por email
- [ ] Lista de enrollments actuales
- [ ] Gráficas de progreso
- [ ] Exportar datos (CSV)

#### ✉️ **Editor de Emails** (`/admin/sequences/$id/emails/$emailId`)
- [ ] Editor WYSIWYG (TinyMCE o similar)
- [ ] Variables dinámicas ({{nombre}}, {{unsubscribeLink}})
- [ ] Preview responsive
- [ ] Test email (enviar a admin)
- [ ] Templates predefinidos

#### ⚙️ **Configuración Global**
- [ ] Templates de email base
- [ ] Configuración SMTP/SES
- [ ] Frecuencias por defecto
- [ ] Reglas de envío automático

---

## 🎨 Diseño UI/UX

### Principios
- **Consistente** con el admin panel existente (`/admin/webinar`)
- **Clara navegación** con breadcrumbs
- **Actions prominentes** (crear, editar, ver stats)
- **Estados visuales** claros (activa/pausada/destacada)
- **Responsive** para uso en tablet

### Colores y Estados
- 🟢 **Verde**: Sequences activas, enrollments activos
- ⏸️ **Amarillo**: Sequences/enrollments pausados  
- 🔴 **Rojo**: Sequences inactivas, errores
- ⭐ **Azul**: Sequences destacadas (featured)
- 📊 **Gris**: Stats y datos neutrales

---

## 🚀 Plan de Implementación

### Fase 1: Básico (MVP)
1. Lista de sequences con acciones básicas
2. Crear/editar sequence (info básica)
3. Gestionar emails (CRUD simple)
4. Stats básicas (contadores)

### Fase 2: Funcionalidad Completa  
1. Editor WYSIWYG para emails
2. Preview y test emails
3. Analytics avanzadas
4. Filtros y búsqueda

### Fase 3: Automatización
1. Templates predefinidos
2. Rules engine para triggers
3. A/B testing de subject lines
4. Scheduled sequences

---

## 📋 Checklist de Implementación

### Preparación
- [ ] Crear rutas admin en `app/routes/admin/sequences/`
- [ ] Actualizar `getAdminOrRedirect` para proteger rutas
- [ ] Crear componentes base (Layout, Card, Form)

### Funcionalidades Core
- [ ] Lista de sequences (index)
- [ ] Crear sequence (new)
- [ ] Editar sequence (edit)
- [ ] CRUD de emails
- [ ] Stats básicas

### Polish y UX
- [ ] Confirmaciones de delete
- [ ] Loading states
- [ ] Error handling
- [ ] Breadcrumbs navigation
- [ ] Mobile responsive

### Testing
- [ ] Scripts de testing para admin actions
- [ ] Verificar permisos de admin
- [ ] Test de edge cases (sequences vacías, etc.)

---

**Resultado Final**: Panel de admin completo que permita gestionar todo el sistema de email sequences desde una interfaz unificada y profesional.