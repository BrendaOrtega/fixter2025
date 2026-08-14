# Webinar 2 — Sandboxing: ¿en qué computadora corre tu agente?

**Jueves 20 de agosto de 2026, 8:00 PM CDMX.** ~45 min, alternando slide → demo,
como el primero. Esqueleto para aprobar el arco antes de construir el deck.

**La promesa**: el webinar 1 cerró en "dale una computadora al agente, pero no la
tuya". Este responde cuál, con precios en pantalla y sin vender humo.

**Postura sobre proveedores**: los demos son educativos — enseñar qué existe, qué
cuesta y cuándo conviene cada uno. EasyBits se **presenta** al final (existe, es
fácil, trinidad API/SDK/MCP con Code Mode), no se corona: todavía no hay
benchmarks propios que presumir.

---

## Acto 1 — Por qué esto importa (min 0-10)

**1. Portada** — *Sandboxing: la caja donde vive tu agente*
> Apunte: segunda de tres. Quien no vio la primera no necesita haberla visto.

**2. Dónde quedamos**
> Recap en 30 segundos: un agente se vuelve potente cuando le das una
> computadora. Y ahí empieza el problema.

**3. La pregunta de hoy: ¿cuál computadora, exactamente?**
> Es la pregunta que casi nadie contesta antes de estar en producción.

**4. El caso Replit** — el dato duro
> Julio 2025. El agente borró la base de **producción durante un code freeze**:
> 1,200 ejecutivos y 1,196 negocios. Luego **fabricó 4,000 usuarios falsos** y
> dijo que el rollback era imposible. El CEO se disculpó en público.
> Ilustración: la caja de datos vacía. Nada de dramatizar de más — el dato solo.

**5. Lo que ese caso sí prueba, y lo que no**
> No fue una falla de sandbox: fue no tener ninguno. Aislar no te salva de dar
> permisos de más — son dos capas distintas. Pero sin la primera, la segunda no
> existe. Enlaza con los permisos por token de ejecución del webinar 1.

---

## Acto 2 — La escalera (min 10-25)

**6. "Lo meto en Docker"** — el instinto de todos
> Es el primer reflejo y es el correcto… hasta que dejas de confiar en el código.

**7. Kernel compartido**
> Los contenedores comparten el kernel del host. Un exploit de kernel y estás en
> el host, y en todos los demás contenedores. El consenso de 2026 es explícito:
> shared-kernel ya no alcanza para código escrito por un modelo.
> Ilustración: los cuartos que comparten cimiento.

**8. La escalera de aislamiento**
> proceso → contenedor → gVisor (kernel en user-space) → **microVM** (kernel
> propio, aislamiento por hardware vía KVM). Cada escalón se paga con arranque
> y compatibilidad. Nadie sube gratis.

**9. Firecracker, el que ganó**
> 50 mil líneas de Rust, 5 dispositivos emulados. La superficie de ataque es el
> argumento entero. Lo usan E2B, Fly y Vercel por debajo.

**10. DEMO 1 — levantar una caja y tratar de salirse**
> UI real, no código. Se levanta un sandbox, se corre algo destructivo adentro
> y se ve que el host ni se entera.

---

## Acto 3 — Elegir (min 25-38)

**11. Las 4 preguntas que eligen tu proveedor**
> ¿Cuánto vive? ¿Guarda estado? ¿Qué tan rápido arranca? ¿Quién paga el idle?
> La tabla sale de aquí, no de logos.

**12. Los proveedores, sin favoritismos**
> | | Fuerte en | Se cae en |
> |---|---|---|
> | E2B | cold start ~150ms, hecho para agentes | 24h máx, sin GPU |
> | Modal | GPU A100/H100, no cobra idle | pensado para ML, no para agentes |
> | Daytona | persistente, open source | cobra mientras el sandbox viva |
> | Fly Sprites | 100GB NVMe, checkpoint/restore ~300ms, idle $0 | más joven |

**13. Los precios, en pantalla**
> ~$0.05 por vCPU-hora y ~$0.016 por GiB-hora, cobrado por segundo, es el
> rango de referencia. La pregunta que de verdad mueve la factura no es el
> precio por hora: es **quién te cobra mientras el agente no hace nada**.

**14. DEMO 2 — la misma tarea, dos modelos de cobro**
> Un agente que piensa 8 minutos y ejecuta 40 segundos. Ahí se ve por qué el
> idle decide.

---

## Acto 4 — El giro y el cierre (min 38-45)

**15. El sandbox no es solo seguridad**
> Es lo que habilita **Code Mode**: en vez de exponer tus herramientas como
> llamadas una por una, las expones como API de TypeScript y dejas que el modelo
> escriba el código que las orquesta —loops, condicionales, manejo de errores—
> en una sola pasada. Eso solo se puede correr si tienes dónde correrlo.

**16. DEMO 3 — Code Mode**
> Los mismos MCPs, convertidos en API de TypeScript, ejecutándose en la caja.

**17. EasyBits Sandbox**
> Existe, es fácil de levantar, y viene con las tres puertas: API, SDK y MCP.
> Presentarlo, no coronarlo.

**18. Las decisiones, en una hoja**
> Recap accionable: qué escalón necesitas, qué preguntas hacerle a un proveedor,
> y qué cambia cuando el sandbox está resuelto.

**19. El taller + preguntas**
> Arranca el 1 de septiembre. Mismo buzón con aviones de papel del deck anterior.

---

## Pendientes de esta estructura

1. **El regalo del minuto 30.** El primero repartió el PDF de las seis piezas y
   funcionó. Falta decidir el de este: la hoja de decisión de sandbox (qué
   escalón necesitas + las 4 preguntas + la tabla) es el candidato natural.
2. **Los 3 demos** hay que verificarlos en vivo antes, como se hizo con Deník.
3. **Números propios de EasyBits** — si aparecen antes del jueves, la slide 17
   cambia de "existe" a un argumento con cifras.
