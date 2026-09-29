# Taller Software Factory: sondeo y bases para el temario

Estado al **2026-09-29**. Precio, formato y temario ya están en la landing. Falta el repo plantilla, las fechas y abrir la venta.

## Qué es y de dónde salió
- Un prospecto preguntó por un taller de "software factory". Esa persona usa **Antigravity + ChatGPT combinados**: planea en ChatGPT y ejecuta con los agentes del IDE de Google. Despliega en **Vercel** y usa **Supabase** como base de datos.
- **La promesa:** montar tu propia fábrica de software, donde agentes de código toman tickets, abren PRs y despliegan mientras tú revisas, con el agente y el stack que ya usas.
- **Método agnóstico de herramienta:** spec → tickets → agentes en paralelo → verificación → deploy. Se hace igual con Claude Code, Codex, Antigravity, Cursor o Ghosty.

## Lo que ya está en producción (29-sep)
- **Landing** `/software-factory` (`app/routes/software-factory.tsx`). Link directo al temario: **`/software-factory#temario`**.
- **Promesa:** «Monta en tu repo una fábrica de cuatro agentes con rol fijo, con un patrón que ya corre en producción: te entregan PRs que revisas en dos minutos.» + «No es outsourcing, y los agentes no programan solos: tú firmas el plan y tú das el merge.»
  - ⚠️ **No vender Ghosty.** El patrón (4 roles) sale de Ghosty Factory (`~/ghosty-studio/docs/claude/software-factory-producto.md`), pero el copy no usa el producto como gancho.
  - El sandbox siempre va como opciones: **EasyBits, Fly o Vercel** (Vercel Sandbox existe). Hostings: Vercel, Netlify, Fly o EasyBits.
- **Hero:**
  - Título que alterna «Software Factory» / «Fábrica agéntica».
  - Chips: los 4 roles, «Sobre tu propio repo», «Costo y calidad medidos por rol» y «3 sesiones en vivo de 2.5 h».
  - Precio: ~~$5,000~~ **$2,500 MXN**, «50% de lanzamiento para la lista».
  - Tablero animado con columnas `@plan` → `@build` → `@check` → «Para ti», costo por tarjeta y contador de PRs listos. Los agentes de las tarjetas rotan entre Claude Code, Codex, Cursor, Antigravity y Ghosty (uno de cinco).
- **Roles como chips** (`app/components/software-factory/RoleChip.tsx`): cada `@plan`, `@build`, `@check` o `@eval` del texto se pinta con su carita (`public/factory-roles/`, copiadas de `ghosty-studio/public/avatars`) y su color: amarillo, verde, durazno y lila. `withRoles(texto)` los reemplaza solo.
  - ⚠️ Los assets **no** pueden ir en `public/software-factory/`: una carpeta con el nombre de la ruta hace que `/software-factory` redirija a `/software-factory/`. Pasó el 29-sep por ~20 min.
- **Secciones** (`app/components/software-factory/FactorySections.tsx`):
  1. **Esto ya pasa:** Stripe, Mastra, Globant y Factory.ai con fuente, y «En México todavía no hay un caso público».
  2. **Temario** (`id="temario"`): 3 sesiones de 2.5 h con 5 temas cada una, numerados del 1 al 15 (ver abajo).
  3. **Lo que te llevas:** 6 piezas y el árbol de `tu-repo/` (`AGENTS.md`, `docs/agents/`, `plans/`, `.github/`, `.agents/{plan,build,check,eval}.md`, `evals/`). ⚠️ Es ilustrativo: tiene que coincidir con el repo plantilla.
  - ⚠️ Una animación con `whileInView` dentro de un `<svg>` recortado nunca dispara: el disparo va en el `<svg>` y los hijos heredan con `variants`.
- **Estilo (29-sep):** se dejó el brutalista (bordes gruesos, sombras duras, giros). Ahora son líneas finas en menta, sombras suaves y títulos en **Bricolage Grotesque** (se carga en el `links` de la ruta). Las etiquetas van en minúsculas. La paleta sigue siendo la de FixterGeek.
- **SEO:** OG propia (`public/courses/software-factory-og-v2.png`) y JSON-LD `Course` con `offers` ($2,500 MXN, `PreOrder`), `courseWorkload: PT7H30M` y `teaches` de los 4 roles. Sin fechas todavía.
- **Links:** navbar, botón principal del hero de la home, `SoftwareFactoryBand` y `FloatingPromo`.
- **Registro:**
  - Tag `software-factory-waitlist` en `Subscriber`. Desde el 29-sep, **`Subscriber.tagDates`** guarda cuándo entró a cada tag (`{ "software-factory-waitlist": ISO }`); `createdAt` sólo dice cuándo nació la cuenta.
  - Las fechas anteriores al 29-sep se rellenaron con la bienvenida de `EmailSendLog`.
  - Bienvenida con doble opt-in (`app/mailSenders/sendFactoryWaitlistWelcome.ts`), **una sola vez por dirección**. El link lleva a `/software-factory?confirmar=<token>`.
  - Protegido por `app/.server/signup-guard.ts`.
- **Contar interesados:**
  ```js
  db.subscriber.findMany({ where: { tags: { has: "software-factory-waitlist" } }, select: { email: true, confirmed: true, tagDates: true } })
  ```
- **Inscritos al 29-sep: 8 reales, 4 confirmados** (más `fixtergeek@gmail.com`, que es prueba).
  - Confirmados: David Durán, Mefit Hernández, braulio@cashabroad.one, acunag3h.
  - Sin confirmar: ozober, harland@lohora.com, hansfelix50 y una dirección oculta de iCloud.
  - Mefit y David entraron el 23-sep, el primer día; cuatro llegaron el 28 y 29-sep.
  - **Rosalba Flores** (`rfc.rossy@gmail.com`) se apuntó a Animaciones con AI, que se retiró. Es candidata para avisarle cuando abra.

## Temario (29-sep, en la landing)
Tres sesiones en vivo de 2.5 h sobre el repo del alumno. El patrón es el de los 4 roles de Ghosty Factory, enseñado agnóstico.

| Sesión | Temas | Al final |
|---|---|---|
| **1. Preparar y planear** | 1. Los 4 roles: un patrón que ya corre en producción · 2. `AGENTS.md` y `docs/agents/`: el conocimiento vive en el repo · 3. Candados: CI, `main` protegido y gitleaks · 4. Preview por PR en tu hosting · 5. `@plan`: propone y tú firmas | Tu repo tiene reglas, candados y un plan firmado. |
| **2. Construir y revisar** | 6. `@build` trabaja en un sandbox (EasyBits, Fly o Vercel) · 7. Llaves con permisos mínimos · 8. `@check` con otro modelo: por qué no el mismo · 9. Tarjeta de riesgo y «Lee primero» · 10. Rúbrica de mantenibilidad (PRs de menos de 400 líneas) | Te llega un PR que revisas en dos minutos. |
| **3. Medir, calificar y evaluar** | 11. `@eval`: un juez fijo califica a cada rol · 12. Costo real por tarea y por eval · 13. Métrica norte: % de PRs que pasan la primera revisión · 14. Elegir modelo por rol con datos · 15. Lo que la fábrica aprende vuelve a `docs/agents/` | Sabes cuánto cuesta y qué tan bien sale cada PR. |

**Por qué este enfoque:** nadie más enseña un patrón que ya corre en producción, con evals y costo medido. Tinkerers, egghead y freeCodeCamp enseñan agentes, pero ninguno cómo calificarlos (`@eval`). Además, la comunidad ya desconfía del volumen: 67% de los PRs de IA fallan la primera revisión. Por eso la promesa es «PRs que revisas en dos minutos» y no «tu repo se desarrolla solo».

## Formato y precio (decidido el 29-sep)
- **3 sesiones de 2.5 h** (7.5 h en vivo), cupo de 10 a 12 personas y una semana de soporte asíncrono.
- **Precio por persona, sin descuento de grupo:** regular **$5,000 MXN**; lanzamiento **$2,500** (50%) para la lista de espera. Falta fijar el límite (primeros 10 o fecha de corte).
- Frente a Tinkerers (USD $750 ≈ $13,500 MXN por ~14 h), el regular queda casi 3× abajo.

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

## Formato y precio propuestos el 24-sep (superado por lo del 29-sep)
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

## Borrador de estructura del 24-sep (superado por el temario del 29-sep)
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

## Pendiente (29-sep)
- [ ] **Números reales del patrón:** el tema 1 promete «un patrón que ya corre en producción». O se publican cifras (evals de $0.49 y $1.28; calificaciones de 3.3 a 5 sobre 5) o se suaviza la frase.
- [ ] **Repo plantilla** que coincida con el árbol de la landing (`.agents/`, `plans/`, `evals/`), con los disparadores del sandbox ya listos. Si se arma en vivo, se come la sesión 2.
- [ ] **Cómo se mide el costo por ticket** con suscripción (Max/Plus no cobra por token) antes de prometerlo.
- [ ] Una herramienta y un hosting en vivo; los demás como guía escrita.
- [ ] Límite del precio de lanzamiento, fechas y abrir la venta a los 4 confirmados.
- [ ] Revisar el hero en 1440×900 (la nota bajo el botón queda cortada) y la versión móvil del temario.

## Producto (Ghosty como fábrica, al estilo de Factory.ai)
Mercado, stack y precios de Factory, comparación con Ghosty y escenarios de ingreso en MXN:
`~/ghosty-studio/docs/claude/software-factory-producto.md`. Mañana (24-sep) se explora Factory en vivo.
