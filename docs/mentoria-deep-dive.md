# MentorIA — Deep Dive

Documento interno. Todo lo que necesitas saber para operar, vender y evolucionar MentorIA.

---

## Qué es

Un coach de programación y entrevistas por **voz y texto**, con IA adaptativa. Vive en `/coach`. Usa Formmy STS (speech-to-speech real, no STT+LLM+TTS) para conversación por voz full-duplex.

**No es un chatbot.** Es un sistema de coaching con:
- Perfiles persistentes con scoring en múltiples dimensiones
- Sesiones con fases (kickoff → assessment → practice → review → summary)
- Dos modos: programación y entrevistas
- Monetización por paquetes de sesiones

---

## Arquitectura en 30 segundos

```
/coach (React Router loader)
  ├── CoachInterface.tsx (toda la UI)
  ├── /api/coach (API de sesiones, texto streaming)
  ├── Formmy STS (voz, WebSocket directo al navegador)
  └── Stripe (checkout + webhook para créditos)
```

**Stack**: React Router v7, MongoDB+Prisma, OpenAI gpt-4o-mini (texto), Formmy (voz), Stripe (pagos).

---

## Los dos modos

### Programación

**Perfil**: `LearnerProfile` — 5 dimensiones (0-100):
- Algoritmos
- Fluidez Sintáctica
- Diseño de Sistemas
- Debugging
- Comunicación

**Flujo**: Elige tema (JS, React, Node, Python, AI/ML, System Design) → El coach calibra nivel → Ejercicio adaptativo → Evaluación automática de código → Score deltas.

**Fases**: KICKOFF → ASSESSMENT → PRACTICE → REVIEW → SUMMARY. Las transiciones son automáticas basadas en el contenido del mensaje (si mandas código en PRACTICE, auto-evalúa y pasa a REVIEW).

**Valor real**: El triage engine detecta tu dimensión más débil y ajusta la dificultad. Si tu debugging está en 20 y tu sintaxis en 70, te va a poner ejercicios de debugging. Eso no lo hace ningún chatbot.

### Entrevistas

**Perfil**: `InterviewProfile` — 5 dimensiones (0-100):
- **Substance**: ¿Tiene datos reales, números, detalles técnicos?
- **Structure**: ¿Respuestas con inicio-desarrollo-cierre?
- **Relevance**: ¿Relevante para el rol objetivo?
- **Credibility**: ¿Suena auténtico? ¿Primera persona?
- **Differentiation**: ¿Se distingue de otros candidatos?

**Flujo**: Elige rol (Frontend/Backend/Full Stack/Mobile/Data/DevOps) + seniority (Junior/Mid/Senior) → Coach empieza.

**4 Drill Stages** (progresan entre sesiones):
1. **Foundation** — Descubrir historias del candidato
2. **Practice** — Estructurar con método STAR
3. **Mock** — Entrevista simulada sin feedback inmediato
4. **Challenge** — Preguntas difíciles y follow-ups incómodos

**Storybank STAR**: Cuando el candidato da una buena historia, el sistema la extrae y guarda automáticamente (Situation, Task, Action, Result). Se acumulan entre sesiones.

**Scorecard**: Al hacer debrief, el coach genera un scorecard que se parsea automáticamente y actualiza el perfil.

**Valor real**: La progresión de drills. No es "practiquemos una entrevista" siempre igual — primero te saca historias, luego te ayuda a estructurarlas, luego te simula una entrevista real sin ayudarte, y finalmente te presiona con las preguntas que más duelen. Eso es lo que cobra un career coach $200 USD/hora.

---

## La voz — por qué importa

MentorIA usa **Formmy STS** (speech-to-speech). No es STT → LLM → TTS. Es un modelo que recibe audio y produce audio directamente. Esto significa:

- **Latencia baja** (~300ms vs ~2s de la cadena tradicional)
- **Full-duplex**: el usuario puede interrumpir (barge-in)
- **Tono natural**: no suena a robot leyendo texto

La UI es voice-first: botón grande de micrófono como acción principal, text input como secundario ("o escribe aquí..."). Voz auto-connect al montar.

### Principios de diseño que están en los prompts

1. **Primer turno específico** — "¿Qué es lo último que construiste que te dio problemas?" en vez de "¿En qué te puedo ayudar?". Retención de sesión 2x.

2. **Silencio estratégico** — Los prompts instruyen al modelo a NO llenar el silencio después de una pregunta difícil. En voz esto es crítico: el silencio fuerza al usuario a pensar. El "generation effect" dice que la gente retiene mejor lo que produce con esfuerzo.

3. **Instrucciones temporales, no de personalidad** — No "sé socrático". Sí "haz 1 pregunta, no agregues explicación, espera". Los modelos STS procesan mejor instrucciones de acción cortas.

4. **Máximo 3 oraciones** — En voz, 2 párrafos = monólogo de 45 segundos. El formato ideal es 1 observación + 1 pregunta.

---

## Monetización

### Sesiones gratis
- **Sin login**: 2 sesiones gratis (anónimo con cookie)
- **Con login**: 1 sesión gratis

### Paquetes (MXN)
| Paquete | Precio | Por sesión |
|---------|--------|------------|
| 5 sesiones | $149 | $29.80 |
| 15 sesiones | $399 | $26.60 |
| 50 sesiones | $999 | $19.98 |

### Cómo funciona
- Se consume 1 crédito al **terminar** una sesión que duró >5 minutos
- Si cierras antes de 5 min, no se cobra (protege contra sesiones accidentales)
- Checkout vía Stripe → webhook acredita automáticamente
- Los créditos no expiran (por ahora, `expiresAt` existe pero es null)

### Deep links
Puedes mandar usuarios directo a un modo:
- `/coach?mode=programming&topic=react`
- `/coach?mode=interview&role=frontend&seniority=senior`

Esto permite CTAs específicos en emails, blog, YouTube.

---

## Archivos clave

| Archivo | Qué hace |
|---------|----------|
| `app/routes/coach.tsx` | Loader + page component |
| `app/routes/api/coach.tsx` | Toda la API (ambos modos) |
| `app/routes/api/coach.checkout.tsx` | Stripe checkout |
| `app/routes/stripeWebhook.ts` | Handler `coach-sessions` |
| `app/components/coach/CoachInterface.tsx` | Toda la UI |
| `app/components/coach/SessionPurchase.tsx` | UI de compra |
| `app/.server/services/coach.server.ts` | Lógica de programación |
| `app/.server/services/coach-prompts.server.ts` | Prompts programación |
| `app/.server/services/interview-coach.server.ts` | Lógica de entrevistas |
| `app/.server/services/interview-prompts.server.ts` | Prompts entrevistas |
| `app/.server/services/coach-credits.server.ts` | Créditos y paquetes |

### Modelos Prisma
- `LearnerProfile` — perfil programación (5 dims, level, streak)
- `InterviewProfile` — perfil entrevistas (5 dims, storybank, drillStage)
- `CoachingSession` — sesión con `mode`, phase, messages JSON
- `SessionCredit` — paquete comprado (total, used, purchaseId)
- `Exercise` — banco de ejercicios por tema/dimensión/dificultad

---

## Cómo un usuario le saca jugo

### Sesión típica de programación (15-25 min)

1. Abre `/coach`, selecciona Programación → React
2. El coach pregunta algo específico para calibrar nivel
3. Le pone un ejercicio adaptado a su dimensión más débil
4. El usuario habla su approach (o escribe código)
5. Coach da feedback: 1 cosa bien + 1 área de mejora
6. Si manda código, evaluación automática con score deltas
7. Al terminar, resumen + scores actualizados en el radar

**Tip pro**: Decir "más directo" o "más amable" ajusta el estilo del coach en tiempo real (directnessLevel 1-5).

### Sesión típica de entrevistas (20-30 min)

1. Abre `/coach`, selecciona Entrevistas → Frontend → Senior
2. Coach pregunta sobre una experiencia reciente
3. El usuario cuenta su historia
4. Coach ayuda a estructurarla en STAR (Stage 1-2)
5. O simula entrevista real sin ayudar (Stage 3-4)
6. Al terminar, scorecard con las 5 dimensiones
7. Las mejores historias se guardan en el storybank

**Tip pro**: Usar voz. Las entrevistas reales son habladas — practicar hablando es transfer learning directo. El usuario que escribe se prepara para un examen, el que habla se prepara para una entrevista.

---

## Lo que falta (roadmap corto)

- **Radar de entrevistas en sidebar** — Hoy solo muestra el de programación
- **Drill stage auto-progression** — Que suba de Foundation a Practice a Mock basado en desempeño
- **Email post-sesión** — Resumen + scorecard por email
- **Storybank UI** — Vista para revisar/editar historias STAR guardadas
- **Entrevista por empresa** — Prompts específicos por empresa (Amazon Leadership Principles, Google L5 expectations, etc.)

---

## Métricas que importan

- **Session completion rate** — ¿Cuántas sesiones terminan vs abandonan? (target: >60%)
- **Time to first voice** — ¿Cuánto tardan en activar voz? (debería ser 0 con auto-connect)
- **Credit conversion** — ¿Qué % de usuarios gratis compra? Medir por paquete
- **Drill progression** — ¿Cuántas sesiones toma llegar a Stage 4?
- **Storybank growth** — ¿Cuántas historias STAR acumula un usuario promedio?
