# Quiz en vivo de las comunidades

Quiz tipo Kahoot para cada comunidad: se usa dentro de la llamada y fuera de ella (evento presencial,
clase, transmisión). En producción desde el 12-nov-2026; **multi-comunidad** desde ese mismo día
(cada club es un cliente con sus quizzes, sus anfitriones y su marca).

Este documento es la entrada para quien tenga que modificarlo. La operación de la caja (ids,
comandos, secretos) está en el repo privado: `~/sandbox-host/docs/runbook-quiz-razzia.md`.

## Qué hace

- El dueño del club arma sus quizzes en Admin → «Quizzes» (editor propio) y nombra coanfitriones.
- El anfitrión lo lanza desde el panel «Quiz» de la llamada o, fuera de una llamada, desde
  `/comunidad/:slug/quiz/lanzar`. Elige el quiz y quién puede jugar:
  - **Cualquiera con el PIN** (default): el tablero enseña la dirección, el PIN y un QR.
  - **Sólo miembros del club**: sin PIN; se entra con la identidad firmada del club.
- El tablero se abre en otra pestaña (`quiz.fixtergeek.com`, un solo dominio para todas las
  comunidades; lo que cambia es el PIN y la marca). El anfitrión la comparte en la llamada.
- A cada miembro que está en la llamada le aparece el panel solo (sondeo cada 5 s) y entra con su
  nombre del club, sin PIN.
- «Terminar quiz» cierra el panel de todos y guarda el podio en Admin → «Quizzes» → Partidas.

## Piezas

```
FixterGeek (dueño de los datos)                     Razzia (motor de partidas, sin datos de clientes)
  CommunityQuiz (Mongo, por comunidad)  ──lanzar──▶  POST /api/games { quizz, branding, tenant, requireIdentity }
  Community.callSkin → marca                         ◀── { gameId, inviteCode, hostToken (sólo esa partida) }
  Community.quizHostEmails → permisos               GET /api/games/:id/branding  (tablero y jugador se pintan)
  CommunityQuizGame.results  ◀──terminar── GET /api/results?gameId=, y se borra de Razzia

www.fixtergeek.com/comunidad/:slug/llamada
 ├─ iframe de la sala (LiveKit)            ← no se toca, nunca se remonta
 └─ <QuizPanel>                            ← flota encima o va junto; nunca le quita ancho plegado
```

Razzia (MIT, antes Rahoot) es un fork: `github.com/blissito/Razzia`, rama `fixtergeek`, copia local
en `~/razzia`. Una sola instancia, partidas en memoria. Su API para la app está en `docs/embedding.md`
del fork.

## Archivos de FixterGeek

| Archivo | Qué tiene |
|---|---|
| `app/.server/services/club-quiz.server.ts` | Todo: validación y CRUD de quizzes, permisos (`canHostQuiz`), marca (`brandFor`), crear y cerrar partida, firma de identidad, lectura de resultados |
| `app/routes/comunidad.$slug.quiz.ts` | Ruta de recurso. `GET` estado (sondeo), `?list=1`, `?quiz=<id>`, `?play=1` (QR); `POST` `quiz-start`, `quiz-end`, `quiz-save`, `quiz-archive`, `hosts-save` |
| `app/components/community/QuizPanel.tsx` | Panel de la llamada: pastilla plegada, cajón del anfitrión, iframe del jugador. También `QuizHost` (página de lanzar) |
| `app/components/community/QuizAdmin.tsx` | Admin → «Quizzes»: lista, editor, partidas con podio, coanfitriones |
| `app/routes/comunidad.$slug.llamada.tsx` | Sólo monta `<QuizPanel slug>` junto a la sala |
| `app/routes/comunidad.$slug.quiz-lanzar.tsx` | Lanzar fuera de una llamada (`?quiz=<id>` preselecciona) |
| `prisma/schema.prisma` | `CommunityQuiz`, `CommunityQuizGame` (con copia del quiz lanzado), `Community.quizHostEmails` |
| `scripts/import-club-quiz.ts` | Importa un quiz en formato Razzia a una comunidad |
| `docs/club-rediseno/quiz/frames.html` | Style frames aprobados (llamada, admin, tablero, jugador; dos marcas) |

## Variables de entorno (FixterGeek)

- `QUIZ_API_URL`: base del quiz. **Sin ella todo el quiz queda apagado**. Es el interruptor de emergencia.
- `QUIZ_SERVICE_KEY`: la `SERVICE_KEY` de Razzia. Sólo la conoce el servidor; crea partidas y lee resultados.
- `QUIZ_IDENTITY_SECRET`: secreto compartido con Razzia (`IDENTITY_SECRET`) para firmar jugadores.
- `QUIZ_MANAGER_PASSWORD` ya no se usa en la app (sigue en la caja; es la contraseña del editor viejo de Razzia).

## Quién puede qué (por comunidad)

- **Lanzar y terminar** (`canHostQuiz`): el dueño de la comunidad, un ADMIN de la plataforma o un correo
  en `Community.quizHostEmails`. No depende de `CLUB_CALL_HOST_EMAILS` (eso es el anfitrión de la sala).
- **Crear, editar, archivar quizzes y nombrar coanfitriones** (`canModerate`): dueño o ADMIN.
- **Jugar**: miembro activo o invitado a la llamada de hoy. El anfitrión no juega: ve los controles.
- Los permisos se guardan en memoria 60 s por usuario; guardar coanfitriones limpia esa memoria.

## Aislamiento entre comunidades

- Toda lectura y escritura de quizzes filtra por `communityId` (`getQuiz`, `saveQuiz`, `archiveQuiz`).
- Razzia no guarda quizzes ni resultados de nadie: el quiz viaja en línea y el resultado se borra al leerlo.
- El `hostToken` que llega al navegador del anfitrión sólo maneja su partida (403 en todo lo demás).
- Una sola partida viva por comunidad; varias comunidades pueden jugar a la vez.

## Reglas que no se rompen

- **El iframe de la sala nunca se remonta.** Su `src` trae un ticket de un solo uso.
- **Plegado, el quiz no le quita ni un píxel a la sala** (pastilla `absolute`). La barra del anfitrión
  de la sala se corta si su iframe mide menos de ~1032 px (medido con `sala-anchos.mjs`): por eso el
  anfitrión abre un cajón ENCIMA y sólo el jugador tiene columna, y sólo desde 1024 px de ventana.
- **El panel usa `fetch` directo a su propia ruta**, no el `useFetcher` de la llamada.
- **El jugador sigue montado aunque el panel se pliegue.**
- **El token del anfitrión viaja en el hash.**
- **Razzia nunca llama a FixterGeek.** Los resultados se leen (pull).
- **En Mongo «sin archivar» es `archivedAt` null O sin escribir** (constante `ACTIVE`); con sólo `null`
  Prisma no encuentra los documentos recién creados.
- **Diseño**: sistema v2 del club (`v2/ui.tsx`); revisar en 375 px primero; nada de brutalismo.

## Cambios frecuentes

- **Textos o diseño del panel o del admin**: `QuizPanel.tsx`, `QuizAdmin.tsx`. `git push origin main`.
- **Límites de un quiz** (preguntas, largo, tiempos): `QUIZ_LIMITS` y `quizInput` en el servicio.
- **Marca de una comunidad**: sale de `Community.callSkin` (`brandFor`). Todavía no hay pantalla para editarla.
- **Tablero o pantalla del jugador**: es el fork, `~/razzia/packages/web`. Desplegarlo reinicia el quiz
  y tira las partidas en curso: sólo fuera de llamadas (ver runbook).
- **Apagarlo de emergencia**: quitar `QUIZ_API_URL` de los secretos de la caja de FixterGeek y reiniciar.

## Cómo probar

- `npx vitest run app/.server/services/__tests__/club-quiz.test.ts`, `npm run typecheck`, `npm run build`.
- Extremo a extremo: `~/sandbox-host/scripts/quiz-razzia/panel.mjs` (anfitrión = dueño del club, un
  miembro real; `PLAY=1` juega hasta el podio y comprueba que el resultado quede ligado al usuario y
  que en Razzia no quede nada). `shots-admin.mjs` y `shots.mjs` sacan capturas en 375 px y escritorio.

## Pendiente

- Prueba de carga (cuántos jugadores aguanta una partida y cuántas partidas a la vez) y su límite.
- Pantalla para que cada comunidad edite su marca (`callSkin`); dominio propio por cliente.
- Podio del último quiz e insignia en la página pública del club.
- Subir imágenes de pregunta desde el editor (hoy se pega una liga https).
- Probarlo en una llamada real con grabación.
- Una partida no sobrevive a un reinicio de la caja del quiz.
