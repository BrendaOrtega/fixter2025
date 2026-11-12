# Quiz en vivo del club

Quiz tipo Kahoot para el club: se usa dentro de la llamada y fuera de ella (evento presencial, clase,
transmisión). En producción desde el 12-nov-2026.

Este documento es la entrada para quien tenga que modificarlo. La operación de la caja (ids,
comandos, secretos) está en el repo privado: `~/sandbox-host/docs/runbook-quiz-razzia.md`.

## Qué hace

- El anfitrión lo lanza desde el panel «Quiz» de la llamada o, fuera de una llamada, desde
  `/comunidad/:slug/quiz/lanzar`. Elige el quiz y quién puede jugar:
  - **Cualquiera con el PIN** (default): el tablero enseña la dirección, el PIN y un QR, como Kahoot.
  - **Sólo miembros del club**: sin PIN; se entra con la identidad firmada del club.
- El tablero se abre en otra pestaña (`quiz.fixtergeek.com`). El anfitrión la comparte en la llamada:
  ahí salen las preguntas, el ranking y el podio, y así queda en la grabación.
- A cada miembro que está en la llamada le aparece el panel solo (sondeo cada 5 s) y entra con su
  nombre del club, sin PIN, sea cual sea el modo.
- En modo «sólo miembros» el QR del tablero lleva a FixterGeek: quien lo escanea juega desde su
  celular con su sesión del club.
- «Terminar quiz» cierra el panel de todos y guarda el podio. Se ve en Admin → «Quizzes».

## Piezas

```
www.fixtergeek.com/comunidad/:slug/llamada
 ├─ iframe de la sala (LiveKit)            ← no se toca, nunca se remonta
 └─ <QuizPanel>                            ← hermano del iframe
      ├─ anfitrión: controles
      └─ miembro: iframe quiz.fixtergeek.com/?pin&name&id=<firmado>&lng=es&mute=1

servidor de FixterGeek ──HTTP──▶ quiz.fixtergeek.com/api   (crear partida, listar, leer resultados)
tablero del anfitrión: quiz.fixtergeek.com/embed/manager#token&gameId&join
```

Son dos servicios separados:

1. **FixterGeek** (este repo). Manda: crea la partida, guarda el estado en Mongo y firma la identidad
   de cada jugador.
2. **Razzia** (MIT, antes Rahoot), fork en `github.com/blissito/Razzia`, rama `fixtergeek`, copia
   local en `~/razzia`. Corre en su propia caja con el dominio `quiz.fixtergeek.com`. Una sola
   instancia, partidas en memoria.

## Archivos de FixterGeek

| Archivo | Qué tiene |
|---|---|
| `app/.server/services/club-quiz.server.ts` | Todo el trato con Razzia: sesión de manager, crear y cerrar partida, firma de identidad, URLs, lectura de resultados |
| `app/routes/comunidad.$slug.quiz.ts` | Ruta de recurso. `GET` estado (sondeo), `?list=1`, `?editor=1`, `?play=1` (QR); `POST` `quiz-start` / `quiz-end` |
| `app/components/community/QuizPanel.tsx` | El panel: pestaña plegada, controles del anfitrión, iframe del jugador, ilustración |
| `app/routes/comunidad.$slug.llamada.tsx` | Sólo monta `<QuizPanel slug>` junto a la sala |
| `app/routes/comunidad.$slug.quiz-lanzar.tsx` | Página para lanzar fuera de una llamada; monta `<QuizHost slug>` (mismos controles) |
| `app/routes/comunidad.$slug.admin.tsx` | Pestaña «Quizzes»: liga al editor e historial con podio |
| `prisma/schema.prisma` | Modelo `CommunityQuizGame` (colección `community_quiz_games`, sin relaciones) |
| `app/.server/services/__tests__/club-quiz.test.ts` | Pruebas de firma, URLs, nombres y podio |

## Variables de entorno (FixterGeek)

- `QUIZ_API_URL`: base del quiz. **Sin ella todo el quiz queda apagado** y la página de la llamada
  es idéntica a la de antes. Es el interruptor de emergencia.
- `QUIZ_MANAGER_PASSWORD`: contraseña de manager de Razzia. Sólo la conoce el servidor.
- `QUIZ_IDENTITY_SECRET`: secreto compartido con Razzia (`IDENTITY_SECRET`) para firmar jugadores.

## Quién puede qué

- **Anfitrión**: `isHostEmail` (misma regla que la sala). Lanza, termina y edita. No juega su propia
  partida: Razzia lo rechaza porque la creó con su sesión de manager.
- **Jugador**: miembro activo o invitado a la llamada de hoy (`canParticipate` / `isCallGuestToday`).
- **Editor de quizzes**: anfitrión o moderador.
- Los permisos se guardan en memoria 60 s por usuario (el sondeo pega cada 5 s).

## Flujos

**Lanzar.** `POST quiz-start` → sesión de manager en Razzia → `POST /api/games` → fila `live` en
Mongo → responde `managerUrl`. El panel abrió la ventana del tablero dentro del mismo clic (si no,
el navegador la bloquea) y ahí la manda. Una sola partida viva por comunidad.

**Entrar.** El sondeo del miembro recibe `playerUrl`, con `id=<payload>.<firma>`:
`payload = base64url({sub: userId, name, exp, pin})`, `firma = hex(HMAC-SHA256(payload, secreto))`.
Razzia verifica, impone el nombre firmado y guarda el `sub` junto al resultado.

**Abierta o sólo miembros.** Se decide por partida: `startGame(..., { membersOnly })` manda
`requireIdentity` en `POST /api/games` y lo guarda en `CommunityQuizGame.membersOnly`. En una partida
cerrada Razzia rechaza con 403 a quien llegue sin firma, aunque tenga el PIN. En una abierta entra
cualquiera con el PIN tecleando su nombre, y los miembros siguen entrando firmados (sus resultados
quedan ligados a su usuario; los de invitados quedan con `userId` vacío). La variable
`REQUIRE_IDENTITY=1` de la caja forzaría «sólo miembros» en todas: en producción va apagada.

**QR.** En partidas cerradas `managerUrl` lleva `join=https://www.fixtergeek.com/comunidad/:slug/quiz?play=1`. El tablero
lo pinta como QR. Esa ruta redirige: sin sesión → login y regresa; miembro con partida viva → su
`playerUrl`; cualquier otro caso → página del club.

**Terminar.** `POST quiz-end` → lee `GET /api/results` de Razzia, busca el del `gameId`, guarda
`results` (`userId`, `username`, `points`, `rank`) y marca `ended`. Si la partida no llegó al podio,
`results` queda vacío y el admin dice «Se terminó antes del podio». Una partida de más de 3 h se
cierra sola.

## Reglas que no se rompen

- **El iframe de la sala nunca se remonta.** Su `src` trae un ticket de un solo uso; sin `key`, sin
  desmontaje condicional, sin navegar la página. El panel es hermano, no envoltorio.
- **El panel usa `fetch` directo a su propia ruta**, no el `useFetcher` de la llamada: aquel reenvía
  cada respuesta a la sala como estado de grabación.
- **El action de `llamada.tsx` no se toca** para el quiz.
- **El jugador sigue montado aunque el panel se pliegue**, para no perder su lugar en la partida.
- **El token de manager viaja en el hash**, nunca en query ni en el servidor de FixterGeek hacia el
  cliente por otra vía.
- **Razzia nunca llama a FixterGeek.** Los resultados se leen (pull).
- **Diseño**: el panel usa los tokens de la comunidad (`background`, `backface`, `colorOutline`,
  `brand-500`), botón lleno como «Publicar» y acciones fijas al pie. Revisar en 375 px primero.

## Cambios frecuentes

- **Textos o diseño del panel**: `QuizPanel.tsx`. Se despliega con `git push origin main`.
- **Agregar o editar quizzes**: «Editar quizzes» en el panel o en Admin (editor de Razzia). Viven en
  la caja del quiz, en `/app/data/config/quizz/*.json`; no en este repo.
- **Logo, colores, nombre y letrero del tablero**: `theme.json` en la caja del quiz (ver runbook).
  Campos: `appName`, `colors`, `logo`, `favicon`, `background`, `joinHint`.
- **Algo de la pantalla del jugador o del tablero** (preguntas, podio, sala de espera): es el fork,
  `~/razzia/packages/web`. Sus añadidos están en `docs/embedding.md` del fork. Desplegarlo reinicia
  el quiz y tira las partidas en curso: sólo fuera de llamadas.
- **Apagarlo de emergencia**: quitar `QUIZ_API_URL` de los secretos de la caja de FixterGeek y
  reiniciar el contenedor.

## Cómo probar

- `npx vitest run app/.server/services/__tests__/club-quiz.test.ts`, `npm run typecheck`, `npm run build`.
- Extremo a extremo: scripts en `~/sandbox-host/scripts/quiz-razzia/` (`panel.mjs` corre el flujo
  completo contra local o producción con dos navegadores; con `PLAY=1` juega hasta el podio y
  comprueba que el resultado quede ligado al usuario). Borran sus filas de prueba al terminar.
- A mano: la página de la llamada exige un `?u=` con URL `https`. La llamada real sólo se abre
  15 min antes de un evento; para ver el panel fuera de ese horario se puede pasar cualquier URL
  `https` neutra como sala de relleno.

## Pendiente

- Podio del último quiz e insignia en la página pública del club (`comunidad.$slug.tsx`).
- Probarlo en una llamada real con grabación (lo hecho usó una sala de relleno).
- El tablero y la pantalla del jugador conservan la interfaz de Razzia con colores y logo de la casa;
  llevarlos al estilo del sitio es trabajo en el fork.
- Un quiz por comunidad: hoy todos los clubes verían la misma lista de quizzes.
- Liga a `/comunidad/:slug/quiz/lanzar` desde el admin del club (hoy se entra por URL directa).
- Sólo el anfitrión (`isHostEmail`) lanza; abrirlo a moderadores es cambiar `canHost` en la ruta.
