# Webinar 2 — Sandboxing: ¿en qué computadora corre tu agente?

**Jueves 20 de agosto de 2026, 8:00 PM CDMX.** ~45 min, alternando slide → demo.

> **Estado al 14 de agosto: deck construido y revisado, 20 slides.**
> Vive en `slides.html`, junto a este archivo. Se abre en el navegador y se comparte
> pestaña. Controles: flechas o espacio, `N` apuntes, `T` cronómetro, `R` reinicia,
> `F` pantalla completa.
>
> **Falta ensayar los demos** — se hace un día de esta semana, antes del jueves 20, y
> ahí se decide qué se queda. Lo demás está listo para presentarse tal cual.

## Lo que quedó decidido en el deck (no volver a discutir)

- **Diseño**: branding EasyBits brutalista —morado, naranja, amarillo, fondo crema,
  borde negro grueso, sombra dura, cero gradientes—, con sus fuentes reales (Cabin y
  Jersey 10) incrustadas para que no dependa de red. 8 ilustraciones animadas en bucle.
- **Apertura**: el escape de julio de 2026 en OpenAI (zero-day en Artifactory, 17,600
  acciones, 136 llaves). Replit se usa después, y solo para hablar de **permisos**.
- **La tabla (slide 12)** compara **cajas y nada más**: una de 2 vCPU y 2 GB prendida
  8 h al día, todo en pesos a 17 por dólar, con tarifas verificadas en las páginas de
  cada proveedor. EasyBits gana la columna de ejecución al 100% y **pierde la del 10%**;
  esa derrota se queda, porque es lo que hace creíble el resto.
- **EasyBits se presenta, no se corona.** Sus dos ventajas reales: 4 agentes por caja, y
  que el kernel persistente no cuesta extra con plan fijo.
- **Code Mode** cierra con los números de Anthropic: 150,000 tokens contra 2,000.

## Pendientes concretos

1. **Ensayar los 3 demos** (ver abajo) y decidir cuáles sobreviven.
2. **Cupón de la sesión** — la slide 19 lo tiene marcado como pendiente. Se crea en
   Stripe igual que `primera-edicion-sistemas`, en el action de
   `app/routes/sistemas-agenticos.tsx`.
3. **El regalo del minuto 30** — en el webinar 1 fue el PDF de las seis piezas. Aquí el
   candidato natural es una hoja de decisión de sandbox.

---

## Las 20 slides, como están hoy

 1. `0:00` — Sandboxing:la cajadonde vivetu agente
 2. `0:30` — Un agente se vuelve potente cuando le das una computadora.
 3. `2:00` — ¿Cuálcomputadora,exactamente?
 4. `4:00` — Unos agentes se salieron de su red aislada.
 5. `6:00` — Aislar y dar permisos resuelven cosas distintas.
 6. `8:00` — Casi todos empiezan en un devcontainer.
 7. `10:00` — Los contenedores comparten el kernel del host.
 8. `13:00` — Cuatro escalones. Cada uno cuesta arranque.
 9. `16:00` — Firecracker
10. `18:00` — **DEMO** Levantar una caja y tratar de salirse.
11. `24:00` — Cuatro preguntas antes de ver precios.
12. `27:00` — La ola de sandboxes del último año.
13. `30:00` — El agente que se quedó prendido.
14. `33:00` — **DEMO** Le pido al agente que analice un archivo.
15. `36:00` — Con la caja resuelta, aparece Code Mode.
16. `38:00` — **DEMO** El agente escribe el programa y lo corre en la caja.
17. `40:00` — EasyBits Sandbox
18. `42:00` — Cinco decisiones.
19. `43:00` — Diseño de sistemas agénticos
20. `44:00` — ¿Preguntas?

## Los demos, para el ensayo

Cada uno pasa una sola prueba: **¿aporta algo que la slide no diga ya?** El que no la
pase se vuelve dato dentro de una slide, se graba, o se quita. Vale más un webinar de
17 slides sólidas que uno con tres demos que se arrastran en vivo.

- **Demo 1 · levantar una caja e intentar salirse.** Falta decidir sobre qué sistema.
- **Demo 2 · el agente analiza un archivo, con dos cronómetros.** Hay que instrumentar
  los tiempos antes. Si no se alcanza, se mide en frío y el número entra a la slide 13.
- **Demo 3 · Code Mode.** El agente escribe un archivo y lo corre en la caja; se mira
  el archivo y el gasto de tokens. Depende de qué tan estable esté hoy.
