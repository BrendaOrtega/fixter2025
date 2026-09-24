# Taller Software Factory: sondeo y bases para el temario

Estado al **2026-09-24**. El 24-sep se investigó el mercado y se reorientó la landing; falta el temario.

## Qué es y de dónde salió
- Un prospecto preguntó por un taller de "software factory". Esa persona usa **Antigravity + ChatGPT combinados**: planea en ChatGPT y ejecuta con los agentes del IDE de Google. Despliega en **Vercel** y usa **Supabase** como base de datos.
- **La promesa:** montar tu propia fábrica de software, donde agentes de código toman tickets, abren PRs y despliegan mientras tú revisas, con el agente y el stack que ya usas.
- **Método agnóstico de herramienta:** spec → tickets → agentes en paralelo → verificación → deploy. Se hace igual con Claude Code, Codex, Antigravity, Cursor o Ghosty.

## Lo que ya está en producción
- **Landing** `/software-factory` (`app/routes/software-factory.tsx`):
  - **Hero de una pantalla**, con un tablero animado donde hasta 3 agentes trabajan en paralelo y Ghosty se asoma. Desde PR, cada tarjeta muestra lo que costó el ticket (`$0.38`).
  - **Título** que alterna entre «Software Factory» y **«Fábrica agéntica»** (24-sep). Cada renglón es una ventana con `overflow-hidden`: crece 0.15em arriba y abajo con margen negativo para no recortar acentos ni la cola de la g, y el `h1` es `flex` para que esos márgenes no se colapsen.
  - **Copy (24-sep):** «Monta tu fábrica de software sobre tu propio repo… Tú apruebas.» + «No es outsourcing, y los agentes no programan solos: aprendes el sistema que hace confiable lo que generan.» Chips: Sobre tu propio repo · Agentes en paralelo con revisión · Mides costo y calidad por ticket · Descuento para grupos. En móvil el descuento va en la línea bajo el botón.
  - **Bajo el hero** (`app/components/software-factory/FactorySections.tsx`), con bajada suave desde «↓ esto ya pasa»:
    - **Esto ya pasa:** 4 tarjetas con objeto SVG animado, número que cuenta y fuente: Stripe (~1,300 PRs/semana), Mastra (277 de 1,627 PRs), Globant ($52.8M ARR en AI Pods), Factory.ai ($4 mil M de valuación, dato de Forge). Cierra con «En México todavía no hay un caso público. Tu caso puede ser de los primeros.»
    - **Lo que te llevas:** árbol de `tu-repo/` que se escribe solo y resalta la pieza activa, junto a 6 tarjetas (`AGENTS.md`, specs con «terminado», puertas de CI, 3 agentes en paralelo, revisor distinto al que escribió, tablero con costo por ticket). ⚠️ El árbol (`planner.md`, `builder.md`, `reviewer.md`) es ilustrativo: tiene que coincidir con el repo plantilla cuando exista.
    - ⚠️ Una animación con `whileInView` dentro de un `<svg>` recortado nunca dispara (el IntersectionObserver no la ve): el disparo va en el `<svg>` y los hijos heredan con `variants`.
  - Imagen OG propia (`public/courses/software-factory-og-v2.png`, centrada para la miniatura cuadrada de WhatsApp) y schema JSON-LD de tipo Course, sin precio ni fechas.
- **Links:** en el navbar, como botón principal del hero de la home, en la banda de la home (`SoftwareFactoryBand`) y en el promo flotante (`FloatingPromo`).
- **Registro:**
  - Tag `software-factory-waitlist` en `Subscriber`.
  - Bienvenida con doble opt-in (`app/mailSenders/sendFactoryWaitlistWelcome.ts`), que se manda **una sola vez por dirección**. El link lleva a `/software-factory?confirmar=<token>`.
  - Protegido por `app/.server/signup-guard.ts`, el guard anti-spam común de todos los formularios.
- **Contar interesados:**
  ```js
  db.subscriber.findMany({ where: { tags: { has: "software-factory-waitlist" } } })
  ```
  Bienvenidas enviadas: `db.emailSendLog.count({ where: { purpose: "welcome:software-factory-waitlist" } })`.
- **Inscritos al 23-sep: 2.** Uno es bliss (prueba). La otra es **Mefit Hernández** (`mefitdev@gmail.com`): llegó por Instagram a `/sistemas-agenticos` el 2-sep.
  - **Rosalba Flores** (`rfc.rossy@gmail.com`, llegó por Facebook a `/sistemas-agenticos`) se apuntó a Animaciones con AI, que se retiró por no pegar. Es candidata para avisarle cuando abra.

## Competencia y precios (investigado el 23-sep)
| Quién | Formato | Precio |
|---|---|---|
| [AI Tinkerers + Actual AI, Software Factory Intensive](https://seattle.aitinkerers.org/p/software-factory-intensive-two-day-practical-workshop-for-software-engineers) (Seattle/NYC) | 2 días presenciales (~14 h), 6 agentes: planeación, diseño, arquitectura, testing, review y deploy. Capstone de punta a punta el día 2 | **USD $750**, o $600 c/u en grupos de 5+ |
| [aihero, taller Ralph](https://www.aihero.dev/events/turn-ai-agents-into-autonomous-software-engineers-with-ralph) | medio día | USD $500 |
| [Agent Conf](https://www.agent.sh/workshop) | PRD → tickets → dependencias → paralelo | incluido en el boleto |
| [egghead](https://egghead.io/workshop/software-factory) | fábrica con Claude Code y Codex | sin precio público |
| [Mastra Factory](https://mastra.ai/workshops) | 1 h, issues de GitHub/Linear → agentes → PR | gratis |
| Platzi ([Claude Code](https://platzi.com/cursos/claude-code/), [Codex](https://platzi.com/cursos/codex/), [Agentes AI](https://platzi.com/cursos/agentes-ai/)) | grabado, por herramienta; **ninguno de "software factory"** | suscripción |
| Udemy en español (Máster Claude Code, etc.) | grabado, 3–7 h | ~$200–400 MXN |

Lecturas que se parecen a lo que queremos enseñar:
- [Web Reactiva, Daniel Primo (16-ago-2026)](https://www.webreactiva.com/blog/software-factory). En español. **Tesis: la fábrica la monta el terreno del equipo, no el modelo.**
  - Auditar el repo y tener un `AGENTS.md`.
  - Puertas deterministas: pre-commit, linters y CI.
  - Contrato de validación antes de generar.
  - Separar la generación de la validación.
  - Limitar el trabajo en curso a 2 flujos.
  - Vende un curso de SDD/OpenSpec gratis y una suscripción premium.
- [freeCodeCamp, Qudrat Ullah (22-may-2026)](https://www.freecodecamp.org/news/how-to-build-software-factory-with-claude-code/). ~18,400 palabras, ~80 min de lectura, gratis.
  - `CLAUDE.md` + skills + hooks.
  - 7 agentes: investigador, historias, spec, builders de backend y frontend, verificador de tests y validador.
  - Un orquestador con 3 aprobaciones humanas.
  - **Casi un temario, pero sin tablero de equipo ni deploy real.**
- Repo [ccpm](https://github.com/Ninegd/ccpm): GitHub Issues como tablero y worktrees para correr agentes en paralelo.
- Video de referencia de Actual AI: `~/Downloads/actual-ai-software-factory.mp4` (sólo referencia; no se reusa).

**El hueco:** en español nadie da el formato "fábrica" **en vivo, con cohorte chica y deploy real**. Lo que hay son cursos grabados por herramienta y artículos largos que casi nadie termina.

## Mercado y orientación (investigado el 24-sep)

### Quién vende "software factory" y qué compra el cliente
| Quién | Qué vende | Montaje | Ejecución |
|---|---|---|---|
| [Factory.ai](https://factory.com/pricing) | Droids, de $20 a $200 USD/mes; Teams $60 + $40 por asiento; Business y Enterprise cotizados | Incluido en Enterprise: Forward Deployed Engineers y un «programa de agent-readiness» | **Se cobra**: asientos + tokens |
| [Mastra Factory](https://mastra.ai/factory) (27-jul, beta 8-sep) | Kanban Intake→Triage→Plan→Build→Review→Done sobre GitHub/Linear/Slack, open source | Gratis: lo montas tú | **Se cobra** el hosting: Teams $250 USD/mes |
| [Globant Glob.AI](https://www.globant.com/ai-pods) (6-ago) | AI Pods supervisados | Lo hacen ellos | Por entregable, no por hora. [ARR $52.8M a junio](https://finance.yahoo.com/technology/ai/articles/globant-sa-glob-q2-2026-050324527.html) |

**Conclusión:** el cliente paga por la ejecución y el montaje se regala para que haya consumo. El taller es el montaje; el negocio recurrente es la fábrica corriendo (Ghosty Teams).

### México
- **No hay player fuerte en producto.** En servicios enterprise: Globant, [Softtek FRIDA](https://www.softtek.com/frida-framework-for-intelligent-digital-automation) (mexicana) y [Wizeline Agentic Pods](https://www.wizeline.ai/agentic-pods/) (nació en Guadalajara y San Francisco; sede en SF).
- [Apiux AI Factory](https://api-ux.com/ai-factory/) (Chile): 7 agentes por rol, enterprise, sin precio publicado. No opera en México.
- Mastra no tiene presencia en México ni contenido en español; sus talleres son gratis y en inglés.
- [Claude Community México](https://www.claudecommunity.mx/en): 5,000+ registros a eventos, todo gratis. Es público sin producto: el canal más barato para sondear.
- ⚠️ En México «fábrica de software» significa outsourcing. De ahí el título «Fábrica agéntica» y la línea «No es outsourcing».
- Grok Build (xAI) es un agente de código para la terminal, como Claude Code; no es una fábrica.

### Social proof y quejas
- **A favor:** Stripe, Mastra y Globant (arriba). En México no hay ningún caso público verificable.
- **En contra:**
  - Factory.ai: tokens impredecibles y código que hay que limpiar ([eesel](https://www.eesel.ai/blog/factory-ai), citando Reddit).
  - Mastra: issues abiertos, p. ej. su veredicto de review no cuenta como aprobación en GitHub ([#24482](https://github.com/mastra-ai/mastra/issues/24482)).
  - METR: 19% más lento aunque se sintiera más rápido. GitClear: 8× más código duplicado.
- **Confusión:** «software factory» vende tres cosas a la vez: plataforma, consultoría y forma de trabajo ([Web Reactiva](https://www.webreactiva.com/blog/software-factory)).

### Decisiones del 24-sep
- **Sin diagnóstico de repo** previo.
- **Público:** el developer curioso y actualizado. Los grupos no son el eje, pero se menciona el descuento.
- **El temario y la landing se ordenan por las 4 piezas de Primo:** contrato de «terminado», puertas deterministas, validación separada y autoridad limitada. Además, medir costo por ticket, que es la queja #1 y nadie lo enseña.
- **Copy:** sin muletillas de contraste ni estampas («el lunes siguiente»). Se dice el hecho concreto.

### Huecos abiertos
1. Costo real en tokens por fábrica: nadie lo publica.
2. Quién en México lo intentó y lo dejó (preguntar en la Claude Community MX).
3. El primer caso mexicano con números: publicar el de los egresados.

### Copys del video de Actual AI (testimonios del Intensive)
Transcrito el 24-sep. Los que sirven, en español:
- «Un caballo un poco más rápido, o un tren bala a tu disposición.» Es fórmula de contraste: usarlo como cita de ellos o sólo como imagen.
- «En una fábrica, cada quien sube un nivel: el diseñador cuida el sistema de diseño, el senior la arquitectura y DevOps el plan de pruebas y deploy.»
- «La complejidad que te deja dormir tranquilo.»
- «Te vas del taller con tu fábrica montada.»
- «El futuro ya llegó, sólo que no a todos por igual. Apréndelo ahora.»
- ⚠️ «Completely autonomously» y «dark factories» chocan con nuestra línea («los agentes no programan solos»): no usarlos.

## Formato y precio propuestos (para decidir mañana)
- **2 sesiones de 2.5 h**, cupo de 10 a 12 personas y **una semana de soporte asíncrono** después.
- **Precio:** se sondeó en $2,500 MXN, y se sostiene hasta **$3,500–4,500**.
  - Early bird: **$2,900** (primeras 10 de la lista).
  - Regular: **$3,900**.
  - Equipos de 3 o más: **$3,200 c/u**.
  - Aun así queda 3× por debajo de los gringos (USD $750 ≈ $13,500 MXN).
- **Qué hace que valga la pena:**
  1. **Preparación obligatoria** antes de la sesión 1: cuentas de GitHub y Vercel, un agente de pago instalado y el repo clonado. Si el setup se hace en vivo, se come la primera hora.
  2. **Repo plantilla** con CI, reglas del agente (`AGENTS.md`/`CLAUDE.md`) y una spec de ejemplo. Es la mitad del valor.
  3. **Una herramienta en vivo** (Claude Code o Codex) y una guía corta para las demás. No dar soporte en vivo a 5 herramientas a la vez.
  4. **3 agentes, no 7:** planeador, implementador y revisor.

## Borrador de estructura (base para el temario)
- **Sesión 1:**
  - Spec con plantilla.
  - El agente parte la spec en issues.
  - Primer agente abre un PR.
  - Checks de CI y preview en Vercel.
  - Primer merge a producción.
- **Tarea:** escribir la spec de su propio proyecto.
- **Sesión 2:**
  - 3 agentes en paralelo (worktrees).
  - Agente revisor que compara el resultado contra la spec.
  - Resolver conflictos, merge y deploy.
  - Capstone: su propio proyecto corriendo en la fábrica.

**Tablero / visualizador:**
- **GitHub Projects** es el universal. La tarjeta es un issue asignado a un agente (Copilot coding agent, la Action `@claude` o Codex cloud). Se mueve sola con el PR, Vercel comenta el preview y al hacer merge pasa a Done.
- **Ghosty Teams** es la versión "todo en una pantalla": room + tablero + panel «Trabajando ahora» + tarjeta `gt-pr`. Se presenta como la mejora, no como requisito.
- Quien no tenga Vercel o Supabase puede usar cajas nuestras para deploy y DB (plan B).

## Riesgos si se usan cajas de gs para los alumnos
- La llave de Tigris de todo el bucket está en cada caja: hay que cerrarla antes de abrir más tenants.
- RAM de la caja de Teams: pasar a 3 GB y poner alerta antes de meter a una cohorte.
- La Supabase del alumno: dentro de la caja del agente sólo va un proyecto de desarrollo o una rama, nunca la `service_role` de producción. Las migraciones se aplican en el merge.

## Pendiente para mañana
- [ ] Temario sesión por sesión, con qué lleva cada bloque y cuánto dura.
- [ ] Repo plantilla: stack, CI y spec de ejemplo.
- [ ] Decidir la herramienta en vivo (Claude Code vs Codex) y el precio final.
- [ ] Fechas, y abrir la venta con early bird a quienes confirmaron en la lista.

## Producto (Ghosty como fábrica, al estilo de Factory.ai)
Mercado, stack y precios de Factory, comparación con Ghosty y escenarios de ingreso en MXN:
`~/ghosty-studio/docs/claude/software-factory-producto.md`. Mañana (24-sep) se explora Factory en vivo.
