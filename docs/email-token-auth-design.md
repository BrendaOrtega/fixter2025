# Sistema de Autenticación por Token para Links de Email

## Overview
Permitir que usuarios accedan directamente a `/newsletters` desde emails usando un token seguro que los autentica automáticamente.

## Flujo de Usuario
1. **Email enviado** → Contiene link con token: `/newsletters?token=xyz123`
2. **Usuario hace click** → Llega a la ruta con token
3. **Sistema valida token** → Si es válido, crea sesión automáticamente
4. **Usuario ve página** → Ya autenticado, puede ver sus sequences y desuscribirse

## Diseño Técnico

### 1. Generación de Token (al enviar emails)
```typescript
// En el sistema de envío de emails
function generateEmailToken(subscriberEmail: string, purpose: 'unsubscribe' | 'manage'): string {
  const payload = {
    email: subscriberEmail,
    purpose,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 días
  };
  
  return jwt.sign(payload, process.env.EMAIL_TOKEN_SECRET);
}

// Usar en templates de email
const manageLink = `https://fixtergeek.com/newsletters?token=${generateEmailToken(subscriber.email, 'manage')}`;
const unsubscribeLink = `https://fixtergeek.com/newsletters?token=${generateEmailToken(subscriber.email, 'unsubscribe')}&tab=settings`;
```

### 2. Validación en Loader
```typescript
// En app/routes/newsletters.tsx
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  
  let user = await getUserOrNull(request);
  
  // Si hay token y no hay usuario, intentar autenticar con token
  if (token && !user) {
    try {
      const payload = jwt.verify(token, process.env.EMAIL_TOKEN_SECRET) as any;
      
      // Buscar usuario por email del token
      user = await db.user.findUnique({
        where: { email: payload.email }
      });
      
      if (user) {
        // Crear sesión automáticamente
        const session = await getSession(request.headers.get('Cookie'));
        session.set('userId', user.id);
        
        // Redirect para limpiar el token de la URL y establecer cookie
        throw redirect('/newsletters', {
          headers: {
            'Set-Cookie': await commitSession(session)
          }
        });
      }
    } catch (error) {
      // Token inválido o expirado, continuar sin autenticar
      console.log('Invalid email token:', error);
    }
  }
  
  // Resto del loader normal...
};
```

### 3. Headers de Email
Todos los emails de sequences incluirán:
```html
<p style="font-size: 12px; color: #666; text-align: center;">
  <a href="{{manageLink}}">Administrar suscripción</a> | 
  <a href="{{unsubscribeLink}}">Desuscribirse</a>
</p>
```

## Seguridad
- **Tokens firmados**: JWT con secret específico para emails
- **Expiración**: 30 días máximo
- **Purpose específico**: 'manage' vs 'unsubscribe'
- **One-time use**: Opcional, podríamos trackear tokens usados
- **Rate limiting**: En la validación de tokens

---

## 2. Sistema de Validación de Envíos por Preferencias

## Overview
Antes de enviar cada email, validar si respeta las preferencias de frecuencia del usuario.

## Casos de Validación

### Preferencias vs Sequences
- **weekly** (varios a la semana) → ✅ Envía todo
- **biweekly** (<6 al mes) → 🔍 Validar frecuencia
- **monthly** (solo 1 al mes) → 🔍 Validar estrictamente

### Lógica de Validación
```typescript
interface FrequencyLimits {
  daily: number;   // -1 = sin límite  
  weekly: number;  // -1 = sin límite
  monthly: number; // número máximo por mes
}

const FREQUENCY_LIMITS: Record<string, FrequencyLimits> = {
  'weekly': { daily: -1, weekly: -1, monthly: -1 }, // Sin límites
  'biweekly': { daily: 2, weekly: 5, monthly: 6 },  // Máximo 6 al mes
  'monthly': { daily: 1, weekly: 1, monthly: 1 }    // Máximo 1 al mes
};

async function canSendEmail(subscriberId: string, sequenceId: string): Promise<boolean> {
  const subscriber = await db.subscriber.findUnique({
    where: { id: subscriberId },
    include: { sequenceEnrollments: true }
  });
  
  // Extraer preferencias
  const prefsTag = subscriber.tags.find(tag => tag.startsWith('pref:'));
  const prefs = prefsTag ? JSON.parse(prefsTag.replace('pref:', '')) : { frequency: 'weekly' };
  
  const limits = FREQUENCY_LIMITS[prefs.frequency];
  if (!limits) return true; // Frecuencia desconocida, permitir
  
  // Si es weekly (sin límites)
  if (limits.monthly === -1) return true;
  
  // Contar emails enviados en el período
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const emailsSentThisMonth = await db.emailSent.count({
    where: {
      subscriberId,
      sentAt: { gte: startOfMonth }
    }
  });
  
  return emailsSentThisMonth < limits.monthly;
}
```

### Tabla de Tracking
```sql
-- Nueva tabla para trackear emails enviados
CREATE TABLE EmailSent {
  id           String @id @default(auto()) @map("_id") @db.ObjectId
  subscriberId String @db.ObjectId
  sequenceId   String @db.ObjectId
  emailId      String @db.ObjectId
  sentAt       DateTime @default(now())
  
  @@index([subscriberId, sentAt])
}
```

### Integración en Sistema de Envío
```typescript
async function processEmailQueue() {
  const pendingEmails = await db.sequenceEnrollment.findMany({
    where: {
      status: 'active',
      nextEmailAt: { lte: new Date() }
    },
    include: { subscriber: true, sequence: { include: { emails: true } } }
  });
  
  for (const enrollment of pendingEmails) {
    // 🔍 VALIDACIÓN DE FRECUENCIA
    const canSend = await canSendEmail(enrollment.subscriberId, enrollment.sequenceId);
    
    if (!canSend) {
      console.log(`⏭️ Skipping email for ${enrollment.subscriber.email} due to frequency limits`);
      
      // Reprogramar para más adelante (ej: próxima semana)
      await db.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { 
          nextEmailAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // +7 días
        }
      });
      continue;
    }
    
    // ✅ Enviar email normalmente
    await sendEmail(enrollment);
    
    // 📝 Registrar envío
    await db.emailSent.create({
      data: {
        subscriberId: enrollment.subscriberId,
        sequenceId: enrollment.sequenceId,
        emailId: getCurrentEmailId(enrollment),
        sentAt: new Date()
      }
    });
  }
}
```

## Estrategias de Reprogramación

### Para usuarios "biweekly" (max 6/mes)
- Si ya enviamos 6 este mes → Reprogramar para el próximo mes
- Si quedan envíos disponibles → Espaciar más los siguientes

### Para usuarios "monthly" (max 1/mes)  
- Solo el email más prioritario del mes
- Pause otras sequences automáticamente
- Resume el siguiente mes

### Priorización
```typescript
// En sequences, agregar campo de prioridad
interface Sequence {
  priority: 'high' | 'medium' | 'low'; // Para casos de límite mensual
}

// Al validar envíos, priorizar sequences importantes
const sequencesByPriority = pendingEmails.sort((a, b) => {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  return priorityOrder[b.sequence.priority] - priorityOrder[a.sequence.priority];
});
```