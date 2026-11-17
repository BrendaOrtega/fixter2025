# Auditoría: los puntos del mapa del Mundo (16-nov-2026)

## Qué hay hoy (✓ leído en el código)

Los tres cartuchos (Archipiélago, GeekSector, Isla Menta) ponen los mismos puntos, cada uno con su piel
(`structure.ts` de cada cartucho):

| Punto | Al llegar (`WorldView.tsx`, franja de abajo) | Qué pasa al presionar |
|---|---|---|
| Faro · Sala en vivo | título del evento + `EnterCallButton` | sales del Mundo a la llamada |
| Mural | «Lo que el club publicó…» + «Entrar al Muro» | sales del Mundo a la pestaña Muro |
| Cine · Grabaciones | «N grabaciones» + «Ver grabaciones» | sales del Mundo a la pestaña Grabaciones |
| Escuelita · Cursos | «N cursos» + «Entrar a Cursos» | sales del Mundo a la pestaña Cursos |
| Islotes (mesas) | «Sentarte» | **te quedas en el Mundo** con voz y cámara |

La barra lateral del club (`ClubShell.tsx`) ya tiene Mundo, Muro, Eventos, Grabaciones, Cursos y Mi
membresía, a un clic.

## Problemas

1. **Cada isla es un menú más lento.** Llegar a una isla toma de 10 a 30 s de vuelo para abrir lo mismo
   que la barra lateral abre en un clic. El mapa repite la navegación en lugar de sumarle algo.
2. **Cada isla te saca del Mundo.** Lo que el Mundo tiene de valor es ver a la gente. Al presionar el
   botón dejas el mapa, dejas de verlos y ellos dejan de verte. Las mesas son los únicos puntos que te
   mantienen dentro, y son también los únicos que hacen algo que el resto del club no hace.
3. **Hay dos formas de platicar y no se ven conectadas.** Los islotes tienen voz y cámara dentro del
   mapa, y el Faro te manda a otra pantalla para la llamada.
4. **El mapa no te dice qué hay de nuevo.** Las islas se ven igual haya o no grabaciones nuevas, posts
   o una clase pendiente. Nada te jala a una isla en lugar de otra.
5. **Eventos no tiene isla**, aunque es lo que da horario y gente al Mundo. La evidencia
   (`MUNDO-2D-EVALUACION.md` §2) dice que estos mundos se llenan con algo a una hora fija y se vacían
   como lugar al que uno se asoma.

## Cómo lo resuelven otros (✓ fuentes en `MUNDO-2D-EVALUACION.md`; ✗ descripción propia donde se indica)

- **Gather y WorkAdventure**: los puntos son objetos que abren su contenido **encima del mapa**
  (página incrustada, pizarrón, video) y tú sigues ahí; los demás te ven parado frente a ese objeto
  (✗ de su documentación y su uso conocido, no verificado hoy). Las zonas cambian tu audio: entras al
  auditorio y oyes al ponente.
- **Pósters (NCCR, UCL)**: la gente va directo al póster. El punto vale por lo que tiene adentro y por
  quién está ahí, no por llevarte a otra página.
- **Skool y Circle** no tienen mapa: navegan por pestañas, igual que nuestra barra lateral. El mapa
  sólo vale la pena si hace algo que las pestañas no hacen.

## Propuesta: las islas se juegan dentro del Mundo

Regla: **una isla muestra su contenido dentro del Mundo y te deja ahí**. La página completa queda como
botón secundario, «Abrir completo».

| Isla | Propuesta |
|---|---|
| Faro | Sala en vivo **y** Eventos. Sin evento: cuenta regresiva y «Me apunto» en la franja. Con evento: el Faro se enciende, la llamada se abre en el panel junto al mapa (donde ya está el chat) y tu fantasma queda en el Faro, así se ve quién está en la sesión |
| Cine | La pantalla del cine muestra la portada de la última grabación. Al llegar se reproduce en un panel encima del mapa. Los que estén en el Cine la ven juntos, sincronizada con la llamada de audio de cerca. Una insignia en el mapa avisa cuántas grabaciones no has visto |
| Mural | Un letrero con los 3 últimos posts. El post se lee y se comenta en el panel, sin salir |
| Escuelita | «Sigue con: lección X» con tu avance y una insignia si hay curso nuevo. La lección se abre en el panel |
| Islotes | Se quedan igual: ya hacen lo correcto |

Esto va en el motor y en `WorldView`. Cada isla declara qué muestra (portada, contador, panel) y cada
piel sólo pinta su versión, así sirve igual con todas las pieles.

### Orden sugerido

1. Faro = Eventos + llamada en el panel. Es lo que más gente junta.
2. Insignias de «nuevo» en las islas. Es barato y da razón para volar.
3. Cine y Mural en panel.
4. Escuelita en panel.

### Pendiente de verificar

- Si `EnterCallButton` puede montar la sala dentro del panel sin remontar el iframe. El quiz ya tiene esa
  regla: «el iframe de la sala nunca se remonta».
- El ancho del panel en 375 px: en celular el panel tapa el mapa, así que se abre como hoja que sube
  desde abajo.
