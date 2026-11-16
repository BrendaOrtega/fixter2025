# Archipiélago — documento de diseño del juego

Regla (bliss, 16-nov-2026): **el Mundo se trata como un videojuego genuino**. Cada mecánica tiene ficha
antes de programarse. Tendremos muchas pieles: todo lo de juego (misiones, guía, progreso, acción) vive en
el motor y el modo; la piel sólo dibuja.

## Loop principal
Volar → descubrir (misión de Ghosty) → jugar con otros (carrera, tormenta, escondidillas, estrella dorada)
→ llegar a lo valioso del club (sala en vivo, grabaciones, cursos) → volver mañana (progreso guardado).

## Sistemas del motor (sirven a cualquier cartucho y piel)
| Sistema | Contrato | Dónde |
|---|---|---|
| Guía | `ctx.objective({x, y, label})`: marcador y flecha al borde, DOM encima del canvas | `world/engine.ts` |
| Misiones | `createQuests([...])`, pasos que avanzan con señales o eventos del modo | `world/quests.ts` |
| Progreso | `structure.progress` (sum/max/min) + `ctx.save()`; Mongo `world_progress` | `world/progress.ts`, `club-world-progress.server.ts` |
| Acción | clic derecho / Espacio / botón en celular (`copy.action`) → señal `action` | engine + `WorldView.tsx` |
| Estado compartido | `ctx.commit` atómico con `merge`; reintento con `want` en el modo | `club-world.server.ts` |

## Fichas
**Recorrido con Ghosty** (primera vez) · Objetivo: aprender a volar y conocer el club · Empieza: al cargar tu
progreso, Ghosty te saluda · Pasos: saludar a Ghosty → Faro (sala en vivo) → 3 estrellas → Grabaciones →
Cursos → aro de la carrera · Termina: +10 estrellas y no vuelve a salir · Sin compañía: sí · Celular: sí.

**Estrellas** · Objetivo: juntar · Tanda cada 30 s, iguales para todos · Récord del club con nombre
(`merge: max`) y estrellas de por vida guardadas · Sin compañía: sí.

**Carrera** · Empieza: entrar al aro coral la convoca, 10 s de cuenta regresiva grande · Corren los que estén
en la salida · Flecha del motor al aro que sigue · Termina: meta (tiempo y récord `merge: min`) o 90 s · Quien
no corre sólo ve la salida y «termina en N s» · Guarda carreras y mejor vuelta.

**Tormenta** · Cada 4 min, 100 s · Golpe = acción, sólo cuenta con otra persona cerca · 12 golpes del club ·
Recompensa +5 y `storms` guardado · Sin compañía: avisa «trae a alguien».

**Escondidillas** · Empieza: entrar al círculo menta (tú buscas) · 15 s con pantalla tapada, 90 s buscando con
vista de 280 · Atrapas tocando · Recompensas guardadas (`found`, `hides`).

**Estrella dorada, formación, estrella de dos, choca esas cinco**: ver `MUNDO-CARTUCHOS.md`.

## Pendiente (siguiente)
- Misiones del día rotativas (gana una carrera, tumba la tormenta, encuentra a 2).
- Fantasma grabado de la vuelta récord (vida con una sola persona).
- Ficha del miembro con sus logros guardados.
