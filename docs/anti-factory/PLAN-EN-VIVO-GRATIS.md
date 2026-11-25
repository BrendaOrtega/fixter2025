# Anti-Factory gratis y en vivo: plan de empuje (25-nov → 3-dic-2026)

Decisión de bliss (25-nov): el taller del **martes 1 y jueves 3 de diciembre, 7 a 9 pm CDMX** ya no se cobra.
Se transmite gratis en vivo (YouTube público + llamada del club). La meta es usarlo de imán: correos, miembros
del club y cuentas de Ghosty Studio.

## Por qué el momento es bueno (tendencias revisadas el 25-nov)

- **«Software factory» es la palabra de moda de 2026** y ya se usa para vender tres cosas distintas: producto,
  consultoría y forma de trabajar (WebReactiva). BCG, HCLTech y Warp venden su «agentic software factory».
  Anti-Factory llega como la postura contraria con nombre propio, justo cuando el término empieza a cansar.
- **Multi-agente ya es lo normal**: Codex, Claude Code, Antigravity, Cursor, Copilot y Devin traen subagentes en
  paralelo. La pregunta del público cambió de «¿uso agentes?» a «¿cómo los orquesto sin perder el control?».
- **Los modelos cambian cada dos semanas** (Gemini 4 Neon salió el 18-nov). El argumento que gana: el arnés y el
  flujo importan más que el modelo. Anti-Factory enseña un flujo que sobrevive al cambio de modelo.
- **Sandboxes y permisos se endurecieron en noviembre**: hay gente buscando dónde correr sus agentes, y las cajas
  de Ghosty Studio responden eso.
- **McKinsey**: 32 % dejó de comprar algún software porque lo construye con agentes. Gancho para dueños de negocio.
- YouTube Live: 600 M de espectadores con sesión al día (VidSummit 2026). En México YouTube es la plataforma líder.

Jules (Google) queda fuera del copy por decisión de bliss (25-nov).

Fuentes: webreactiva.com/blog/software-factory · bcgplatinion.com/insights/the-agentic-software-factory ·
beevr.ai/blog/ai-coding-agents-november-2026 · ecosistemastartup.com/?p=91178 · gyre.pro (resumen VidSummit).
Son blogs y consultoras: sirven como señal, no como cifra para poner en pantalla sin verificar.

## El imán: qué gana quien se registra (y quien sólo ve YouTube no)

Ver en YouTube es gratis y sin registro. Registrarse en `fixtergeek.com/anti-factory` da lo que vale guardar:

1. **El repo/plantilla del taller** y los slides, por correo al terminar cada sesión.
2. **Entrar a la llamada del club** (preguntas en vivo, pantalla compartida) y no sólo al chat de YouTube.
3. **Quiz en vivo con premios** (Razzia ya está en producción): sólo juegan los registrados. Premios sin gasto: revisión de su repo en vivo y mención en pantalla.
4. Grabación completa por correo (YouTube puede quedar público, pero el correo trae los capítulos y el repo).

Sin cuenta Power de cortesía (decisión de bliss, 25-nov): se quita también de la landing.

Frase del registro: «Regístrate gratis y te llega el repo del taller y la liga a la llamada.»

## Calendario (6 días)

| Día | Qué sale |
|---|---|
| **Mié 25** | Cambiar landing a gratis + registro; reembolsar a quien ya pagó (con correo personal); evento de YouTube programado para las dos sesiones (así aparece «Recordarme»). |
| **Jue 26** | Correo 1 a la lista + usuarios + club: «¿Ya viste que todo mundo vende una fábrica de agentes? Te enseño gratis a no necesitarla». Short 1. Post en el club. |
| **Vie 27** | Short 2 (tendencia: «tu agente cambió de modelo otra vez»). Sin pauta pagada: el anuncio de Meta que ya existe sólo se edita a «gratis» si sigue activo; no se le mete dinero nuevo. |
| **Sáb 28–Dom 29** | Post del blog con el ángulo contra la fábrica (SEO para «software factory IA»). Short 3. |
| **Lun 30** | Correo 2: «Mañana 7 pm». Community post en YouTube. Recordatorio por WhatsApp/Telegram si hay grupo. |
| **Mar 1** | Correo 3 a las 11 am «Hoy 7 pm». Sesión 1 con quiz. Al terminar, correo con repo y liga a la sesión 2. |
| **Mié 2** | Shorts recortados de la sesión 1 (2–3), con subtítulos literales. Correo a no-asistentes con la grabación. |
| **Jue 3** | Correo «Hoy, sesión 2». Sesión 2 y cierre con la oferta: **membresía del Club de Agentes de IA** (siguiente escalón de paga). |
| **Vie 4 →** | Grabación, shorts del momento más fuerte, correo de cierre con CTA al club. |

## Los tres shorts previos (ganchos; aprobar storytelling antes de render)

Cada uno abre con una pregunta directa al espectador y cierra con «Regístrate gratis en fixtergeek.com/anti-factory ·
1 y 3 de diciembre, 7 pm».

1. «¿Te están vendiendo una fábrica de software con agentes y no sabes si la necesitas?» — formato 3D de Ghosty
   (el que funcionó el 28-oct).
2. «¿Cuántas veces cambiaste de modelo este mes?» — demo real: el mismo flujo con dos modelos, mismo resultado.
3. «¿Dónde corren tus agentes cuando cierras la laptop?» — las cajas de Ghosty Studio en acción.

## Cambios técnicos (código)

- `app/routes/software-factory.tsx`: quitar el checkout de Stripe del taller; botón «Regístrate gratis» que crea
  `Subscriber` + inscripción al evento y manda el correo con `.ics` (el flujo de confirmación ya existe; se reusa
  sin cobro). Meta y título sin precio. Contador «N registrados» si pasa de un número digno (≥ 100).
- Llamada del club: las sesiones del taller hoy sólo dejan entrar a quien pagó (`fcb848a`). Cambiar a «quien se
  registró».
- `scripts/club-anti-factory-events.mts`: eventos marcados como gratis.
- Correos: copiar `scripts/send-anti-factory-webinar-hoy.mts` (correo 1, 2, 3 y post-sesión) con `CAMPAIGN`
  fechado para medir por UTM.
- Referidos (opcional, alto impacto): liga personal «invita a 3 y ganas 1 mes del club».

## Pendientes de bliss

1. Ok para reembolsar a quienes ya pagaron (y qué les damos de más: ¿mes del club?).
2. ¿La sesión va también a YouTube completa o sólo los primeros 30 min y el resto en la llamada?
3. Presupuesto: cero (decisión de bliss, 25-nov). Todo el empuje es orgánico: correos, shorts, club, blog y YouTube.
