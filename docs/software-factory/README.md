# Taller Software Factory: sondeo y bases para el temario

Estado al **2026-09-23**. Mañana se arma el temario con esto.

## Qué es y de dónde salió
- Un prospecto preguntó por un taller de "software factory". Esa persona usa **Antigravity + ChatGPT combinados**: planea en ChatGPT y ejecuta con los agentes del IDE de Google. Despliega en **Vercel** y usa **Supabase** como base de datos.
- **La promesa:** montar tu propia fábrica de software, donde agentes de código toman tickets, abren PRs y despliegan mientras tú revisas, con el agente y el stack que ya usas.
- **Método agnóstico de herramienta:** spec → tickets → agentes en paralelo → verificación → deploy. Se hace igual con Claude Code, Codex, Antigravity, Cursor o Ghosty.

## Lo que ya está en producción
- **Landing** `/software-factory` (`app/routes/software-factory.tsx`):
  - Una pantalla sin scroll, con un tablero animado donde hasta 3 agentes trabajan en paralelo y Ghosty se asoma.
  - El título alterna entre inglés y español.
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
