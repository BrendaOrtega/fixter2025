# Interacciones sociales para Isla Menta: qué tomar de The Sims y de los juegos sociales

Investigación del 13-nov-2026. Sólo lectura: no se tocó código. Complementa a `TENDENCIAS-INTERACCION.md` (mecánicas del muro y las llamadas) y a `MUNDO-2D-EVALUACION.md` (si conviene tener mundo); aquí sólo se responde qué hacer **dentro** de la isla.

**Marcas de confianza.** **[leído]** abrí la fuente y de ahí sale el dato. **[extracto]** el dato viene del extracto que devolvió el buscador o de una fuente secundaria. **[sin verificar]** lo recuerdo o lo dice un tercero y no encontré la fuente primaria.

---

## 1. Resumen

1. La isla ya tiene muchas cosas que hacer solo (sentarse, mirar, bailar). Le faltan cosas que **salgan mejor entre dos o más** y que dejen algo para quien llega después.
2. Con decenas de miembros, lo primero es juntar gente a la misma hora: un ritual de 10 minutos antes y después de cada llamada en vivo (campana, gradas, fogata de cierre).
3. Lo segundo: que los objetos anuncien su cupo («falta 1 para zarpar») y que un robot lo complete cuando sólo hay una persona. Es la idea central de The Sims aplicada a miembros reales.
4. Lo tercero: huellas ligeras (la fogata sigue tibia, el cojín conserva el color de quien se sentó) para que la isla vacía cuente que alguien pasó.
5. Las tres caben en lo que hay: pose por posición, reloj compartido, sondeo de ~2.5 s y hasta 16 llaves de estado compartido. Relaciones entre miembros y notas escritas piden guardar en Mongo y van después.
6. De The Sims se toma «objetos listos» y un ánimo que cada quien elige; se dejan fuera las barras de necesidades que bajan solas.
7. No hacer: rachas que se pierden, tablas o rangos visibles, monedas e intercambio, medidor público de amistad, voz encendida por cercanía de entrada.
8. El almohadazo y la cosquilla ya existen y hoy le caen a cualquiera; conviene que el almohadazo pida que la otra persona también haya tomado almohadas.

---

## 2. Principios que explican por qué funcionan

### 2.1 Primero densidad en el tiempo, después contenido
El reporte de Project Horseshoe que firma Daniel Cook pone la **cercanía** como el primero de cuatro factores para que se forme una amistad (cercanía, similitud, reciprocidad, apertura) y dice que el atributo a balancear es la densidad: personas por espacio. Su consejo literal es pensar el juego como «concentrating player density across time», con eventos compartidos y recurrentes en horario publicado, y puntos de paso obligado donde la gente se tope. También pide identidad reconocible entre sesiones; cuando la gente espera no volver a verse trata peor al otro («disposable people»). [leído] <https://www.gamedeveloper.com/design/game-design-patterns-for-building-friendships>
Coincide con la evidencia de `MUNDO-2D-EVALUACION.md` §2: los mundos tipo Gather funcionan con hora fija y se vacían como lugar permanente. Un artículo académico sobre el uso de Gather reporta lo mismo: se perdió la masa crítica de usuarios y fue difícil sostener el uso (no leí en qué grupo ni por cuánto tiempo). [extracto] <https://spir.aoir.org/ojs/index.php/spir/article/download/12188/10324>
El club tiene una ventaja que casi ningún juego tiene: nombre y foto reales en cada muñequito.

### 2.2 Reciprocidad que empieza casi gratis y sube sola
Cook llama a la reciprocidad el «motor mecánico» de la amistad: intercambios de ida y vuelta, que empiezan con gestos baratos (acercarse, voltear hacia alguien, un emote) y suben de costo conforme hay confianza. Los primeros intercambios deben ser de bajo costo y de suma no cero; el paso más difícil es lograr que dos personas que jugaron juntas una vez lo hagan una segunda. [leído] misma URL.
Raph Koster ordena las mecánicas por la confianza que piden: juego en paralelo y acciones simétricas para desconocidos; cooperación ligera con roles acotados para conocidos; coordinación sin palabras y dependencia mutua sólo entre amigos. El juego «should only *invite* intimacy rather than force it», y un juego que sólo tiene mecánicas de confianza baja y de confianza alta, sin escalones, queda roto. En sus pruebas, los grupos que mejor funcionaron fueron de 3–4 personas en sesiones de 10–30 minutos. [leído] <https://www.raphkoster.com/?p=32038>

### 2.3 El objeto invita: la inteligencia vive en el entorno
En The Sims cada objeto trae sus comportamientos y un conjunto de «advertisements» que dicen qué necesidad satisface; el sim elige, entre todo lo que anuncian los objetos, lo que más sube su ánimo. La fuerza del anuncio se atenúa con la distancia y se modula con la personalidad. Una interacción social es un objeto invisible que se crea cuando dos sims interactúan. [leído] Forbus y Wright, «Some notes on programming objects in The Sims», 2001: <https://www.qrg.northwestern.edu/papers/Files/Programming_Objects_in_The_Sims.pdf>
Wright lo resume así: «make the people really dumb and make the environment and objects really smart»; los otros sims también se anuncian como forma de subir «social». [extracto] <https://gameindustrylibrary.com/documents/gmtk-the-genius-ai-behind-the-sims>
El mismo documento trae la advertencia: un objeto que anuncia muy fuerte y se usa a solas (su ejemplo, la «Joy Booth») acapara a los sims, que «socialize much less, thus weakening relationships». Para la isla: lo que más brille debe ser lo que se hace acompañado.
`things.ts` ya es este modelo (cosas con acciones y puntos); falta que el anuncio dependa de **quién más está ahí**.

### 2.4 Estar junto a otros haciendo cada quien lo suyo ya es socializar
Cook: «Being in the same space yields parallel play», y de ahí sale la reciprocidad barata. [leído] Koster pone el juego en paralelo como el escalón correcto para desconocidos. [leído]
Steinkuehler y Williams describen los mundos en línea como «tercer lugar» (ni casa ni trabajo) que sirve sobre todo para capital social «puente»: conocer gente distinta sin exigir amistad profunda. [extracto] <https://news.illinois.edu/some-online-video-games-found-to-promote-sociability-researchers-say/>
Ducheneaut y otros titularon «Alone together?» su estudio de World of Warcraft (CHI 2006); cito el título y no leí el texto. [sin verificar] <https://dx.doi.org/10.1145/1124772.1124834>

### 2.5 Rituales y eventos cíclicos
De las nueve estrategias de Amy Jo Kim, dos son «Promote cyclic EVENTS» e «Integrate the RITUALS of community life». [leído, lista citada por un tercero] <https://www.zengestrom.com/blog/2006/08/community-design-strategies.html>
Koster, en GDC 2011, puso los rituales entre las mecánicas sociales poco usadas: ceremonias al cambiar de rol, que «are powerfully social». [leído] <https://www.gamedeveloper.com/game-platforms/gdc-2011-koster-s-big-list-of-social-mechanics-for-social-games>
Club Penguin dejó el caso más claro de rito colectivo: durante años los jugadores se juntaron a intentar voltear el iceberg sin que el código lo permitiera; se volvió real hasta la fiesta de cierre de 2017. [extracto] <https://clubpenguin.fandom.com/wiki/Iceberg>
Cook añade que la experiencia compartida (una partida reñida, algo logrado entre varios) crea referencias comunes. [leído]

### 2.6 Huellas asíncronas con respuesta sólo positiva
Animal Crossing nació para que una familia compartiera un pueblo a distintas horas: Eguchi quería ser «part of what they were doing while I wasn't around». [extracto] <https://nintendoworldreport.com/interview/11229/animal-crossing-interview> Sobre la rutina: «a town with a to-do list, but the to-do list shouldn't feel like bad pressure». [leído] <https://www.gamedeveloper.com/design/an-inviting-mini-world-how-nintendo-made-i-animal-crossing-i->
Death Stranding deja en tu mundo las estructuras de otros jugadores y sólo permite dar «likes»; Kojima los describe como «unconditional love» y no hay forma de votar en contra. [extracto] <https://www.gameinformer.com/2019/09/16/likes-in-death-stranding-are-unconditional-love-not-currency>
Kind Words: cartas anónimas, quien recibe una respuesta sólo puede agradecer con una calcomanía y no puede seguir la conversación; el juego no muestra cuántas cartas llevas. [extracto] <https://www.pcgamer.com/uk/kind-words-is-a-sweet-game-about-supporting-strangers/> Su autor dice que evitaron a propósito casi toda medida cuantitativa y que moderan contenido, no personas. [extracto] <https://technotherapies.substack.com/p/a-conversation-with-ziba-scott-on>
Para una comunidad con 0–3 personas a la vez fuera de eventos, la huella es lo que hace que una visita a solas valga.

### 2.7 El recién llegado necesita un anfitrión y un primer gesto fácil
Kim describe el ciclo visitante → novato → regular → líder → veterano, con una barrera entre cada etapa. [extracto] <https://p2pfoundation.net/Community_Participant_Lifecycle> Ya está en `TENDENCIAS-INTERACCION.md` el dato de Usenet: quien recibe respuesta a su primer mensaje sigue participando más (Arguello y otros, 2006).
En Animal Crossing los vecinos están diseñados para ser cálidos: «default to loving the player character». [leído] En New Horizons la amistad con un vecino sube +1 por la primera plática del día, con regalos y favores, y la página de referencia no lista ninguna pérdida por ausencia; lo que resta son acciones groseras. [leído] <https://nookipedia.com/wiki/Friendship> Stardew Valley sí descuenta puntos cada día sin hablar (2 por día con vecinos comunes). [extracto] <https://stardewvalleywiki.com/Friendship> Para sesiones cortas y esporádicas conviene el modelo de Animal Crossing.
Sky enseña a guiar: tomarse de la mano deja que una persona lleve a otra por el mundo; lo describen como su función más icónica. [leído] <https://www.gamedeveloper.com/design/using-emotion-to-drive-social-play-in-i-sky-children-of-the-light-i->
Cook advierte contra el emparejamiento automático y las «sugerencias de amigos» insistentes: mejor sistemas a los que uno se apunta. [leído]

### 2.8 Seguridad por diseño y estatus sin escalera
- **El poder social se gana y pide consentimiento.** En Sky el desconocido es una silueta hasta que ambos juntan sus velas; el chat con extraños sólo ocurre en bancas donde los dos se sientan. Jenova Chen: la moderación es «the ambulance at the bottom of the cliff». [leído] <https://mobilegamer.biz/jenova-chen-explains-why-theres-no-teabagging-in-sky-children-of-the-light/>
- **Lo indeseado no recibe respuesta del juego.** Chen sostiene que el jugador busca «maximum feedback»; se premia lo positivo y lo otro no produce efecto. [leído] misma URL. En Journey, la colisión entre jugadores se pensó para colaborar y los jugadores la usaron para empujarse a los pozos. [extracto] <https://www.shacknews.com/article/75483/interview-jenova-chen-looks-back-at-journey>
- **Apertura por pasos.** Cook lista como antipatrón la revelación prematura: voz encendida de entrada, ubicación visible. Las herramientas de apertura van «opt-in». [leído]
- **El rango visible divide.** Un análisis de r/VRChat encontró que los rangos de confianza visibles alimentan estereotipos, desalientan hablar entre rangos y generan discriminación contra los nuevos. [extracto] <https://link.springer.com/article/10.1007/s10606-024-09498-7> VRChat terminó ocultando por defecto los rangos altos. [extracto] <https://medium.com/@vrchat/vrchat-safety-and-trust-system-changes-and-feedback-a3a9e54ec572>
- **Escasez e intercambio traen estafas.** Cook: las interacciones de suma cero vuelven egoísta el inicio de una relación y los intercambios inseguros erosionan la confianza. [leído] Habbo mantiene una página oficial sobre estafas de furni. [extracto] <https://help.habbo.com/hc/en-us/articles/360011619259>
- **Estatus que sí sirve:** Cook propone mostrar a quienes encarnan la norma deseada en lugar de a los primeros de una tabla («Establish Aspirations»). [leído]
- Bartle: si un tipo de jugador crece de más ahuyenta a los otros; un poco de «killers» es pimienta, mucho arruina el plato. [extracto, fuente secundaria] <https://en.wikipedia.org/wiki/Bartle_taxonomy_of_player_types>
- Reglas de convivencia claras y aviso privado antes que regaño público (Victoria Tran, Kitfox). [leído] <https://www.gamedeveloper.com/business/how-to-better-design-your-game-communities-for-kindness>

---

## 3. Qué permite hoy el motor (leído en el código)

- **La pose sale de la posición** (`things.ts`): quien está quieto sobre un punto toma la pose en todas las pantallas, sin campo nuevo. Sirve para cualquier interacción que se deduzca de «quién está en qué punto».
- **Reloj compartido**: las rutas de los robots y el beat de la pista (108 BPM) salen del reloj Unix; todo lo que se sincronice por reloj se ve igual sin servidor.
- **Sondeo de ~2.5 s** (`cartridge.ts`, `ModeContext.shared`). Un gesto entre dos necesita ventana de varios segundos; los toques exactos se sincronizan por reloj, no por llegada del mensaje.
- **Eventos efímeros**: saludo, burbuja de chat y `nudge` (cosquilla; el servidor acepta `kind` `bonk` y `zap`, con vida de 6 s en `club-world.server.ts`).
- **Estado compartido**: hasta 16 llaves por mundo (`SHARED_MAX_KEYS`), cada una entero acotado, texto de hasta 80 caracteres o id de un miembro presente. Vive en memoria del proceso y se borra al cambiar de cartucho; también se pierde al reiniciar la app. Isla Menta **no declara** `shared` ni `mode` todavía (sólo existe el contrato).
- **Lo que no hay**: nada por pareja de miembros, nada que sobreviva a un reinicio, nada por miembro más allá del aspecto. Relaciones, notas y memoria de los robots piden una colección en Mongo.

---

## 4. Lista priorizada: 15 interacciones para Isla Menta

Esfuerzo para una persona que conoce el cartucho: **chico** = hasta 1 día, **mediano** = 2–4 días, **grande** = una semana o más. Son estimaciones propias.

### 1. Campana del Foro y fogata de cierre (ritual de cada llamada)
- **Qué hace el miembro:** diez minutos antes de la llamada suena la campana; se sienta en las gradas y su lugar enciende un farol. Al terminar la llamada, la fogata crece con cada persona que se sienta alrededor.
- **Qué ven los demás:** las gradas llenándose de faroles con cara y nombre; después, un fuego más alto mientras más gente se queda.
- **Por qué crea vínculo:** densidad concentrada en el tiempo y ritual cíclico (2.1, 2.5); el rato de fogata es el «momento tranquilo para platicar» que Cook pide para la apertura.
- **Técnica:** cabe. Faroles y tamaño del fuego se deducen de quién ocupa los puntos de `STANDS` y del aro de la fogata. Falta que el mundo reciba la hora de inicio del próximo evento (hoy `placeStatus` sólo trae `on` y un subtítulo) y un sonido nuevo.
- **Esfuerzo:** chico. **Sale de:** fiestas de Club Penguin, eventos recurrentes de Cook, festivales de Animal Crossing.

### 2. Objetos que anuncian cupo: «falta 1»
- **Qué hace:** ve sobre el barquito, la mesita del café o el telescopio una marca con la cara de quien espera y «falta 1». Toca y se suma.
- **Qué ven los demás:** la marca cambia a «2 de 4» y, al completarse, pasa algo que a solas no pasa (el barco zarpa con todos, la mesa brinda, el telescopio enseña una constelación a los dos).
- **Por qué:** el objeto hace la invitación en lugar de la persona (2.3); la entrada cuesta un toque (2.2).
- **Técnica:** cabe. La marca ya existe (`chips` en `actions.ts`); se le agrega el conteo de puntos ocupados. El «algo pasa» se dispara por posiciones y reloj.
- **Esfuerzo:** chico. **Sale de:** advertisements de The Sims.

### 3. Huellas ligeras: la isla recuerda la última hora
- **Qué hace:** nada especial; usar las cosas deja rastro. La fogata queda tibia, el cojín de la banca toma el color de quien se sentó, la pista conserva las luces del último baile, el muelle muestra «3 pasaron hoy» con caras chicas.
- **Qué ven los demás:** al llegar a una isla vacía, señales de quién estuvo y dónde.
- **Por qué:** huella asíncrona (2.6); convierte la visita a solas en motivo para dejar algo.
- **Técnica:** cabe con llaves compartidas: `member` para «último en la banca», número para la hora de la última fogata y el conteo del día. Límite real: una llave `member` sólo acepta a alguien presente y todo se borra al reiniciar. Para caras de quien ya se fue hace falta una llave de texto con el nombre o persistencia chica.
- **Esfuerzo:** chico (mediano si se guarda en Mongo). **Sale de:** Death Stranding, pueblo compartido de Animal Crossing.

### 4. Robots que completan el cupo y proponen actividad
- **Qué hace:** si espera solo en el barquito o en una mesa, un robot llega, se sienta y la actividad arranca. A ciertas horas un robot se para junto a una cosa con burbuja «¿Quién se toma un café?».
- **Qué ven los demás:** un robot y una persona haciendo algo juntos, con lugar libre anunciado.
- **Por qué:** resuelve la densidad baja (2.1) y mantiene a los robots como anunciantes cálidos (2.3, 2.7).
- **Técnica:** las rutas son función pura del reloj (`BotDef.at`). Para que todos vean al robot desviarse hace falta una llave compartida por robot («ocupado en la cosa N») que el cliente del que espera propone. Cabe en las 16 llaves.
- **Esfuerzo:** mediano. **Sale de:** The Sims (los sims se anuncian entre sí), vecinos de Animal Crossing.

### 5. Gestos de a dos por mutuo acuerdo
- **Qué hace:** en el menú de una persona elige «Chócalas», «Brindis» o «Reverencia». A la otra le aparece la invitación unos segundos; si la acepta, ambos hacen el gesto a la vez.
- **Qué ven los demás:** el gesto completo sólo cuando los dos quisieron; una invitación ignorada no produce nada visible.
- **Por qué:** reciprocidad barata con consentimiento (2.2, 2.8).
- **Técnica:** un `kind` nuevo de `nudge` para invitar y otro para aceptar (cambio chico en el servidor); la animación se sincroniza al siguiente tiempo del reloj para tolerar el sondeo.
- **Esfuerzo:** chico–mediano. **Sale de:** Sky (acciones de dos), emotes de Cook.

### 6. Ánimo que cada quien elige
- **Qué hace:** escoge un estado junto a su nombre: «con ganas de platicar», «enfocado», «primera vez aquí», «vengo a ver».
- **Qué ven los demás:** un globito sobre su cabeza (los íconos de `Mood` ya existen). «Con ganas de platicar» funciona como anuncio sobre la persona; «enfocado» desactiva invitaciones.
- **Por qué:** versión de las necesidades de The Sims sin barras que bajen: la persona se anuncia sola (2.3) y decide cuánto abre (2.8).
- **Técnica:** un campo más en la presencia o reutilizar `note`. Cabe.
- **Esfuerzo:** chico. **Sale de:** motivos de The Sims, estados de Gather.

### 7. Ghosty anfitrión
- **Qué hace el recién llegado:** en su primera visita Ghosty camina hacia él, lo saluda por su nombre y le ofrece dos cosas: «te enseño la isla» (ver 10) o «te presento a Ana, también hace agentes de voz», usando el renglón «en qué trabajo».
- **Qué ven los demás:** a Ghosty acompañando a alguien con etiqueta «primera vez»; quien fue mencionado recibe un aviso discreto y decide si se acerca.
- **Por qué:** anfitrión y primera respuesta garantizada (2.7); la presentación es propuesta, nunca emparejamiento forzado.
- **Técnica:** llave `member` «invitado de Ghosty» para que todos lo vean ir hacia la misma persona. Saber quién es nuevo sale de `Membership.createdAt`. «Te vi el martes en la fogata» pide guardar última visita y última actividad por miembro (Mongo). Frases de plantilla, sin modelo de lenguaje.
- **Esfuerzo:** mediano. **Sale de:** vecinos de Animal Crossing, guías de Club Penguin [sin verificar], ciclo de membresía de Kim.

### 8. Secreto colectivo
- **Qué hace:** descubre que con cinco personas bailando a tiempo la pista enciende luces, o que con el barquito lleno aparece una ballena.
- **Qué ven los demás:** un efecto grande y raro que sólo ocurre en grupo, y gente pidiendo en el chat «falta uno».
- **Por qué:** experiencia compartida y mito de la casa (2.5).
- **Técnica:** cabe; todo sale de posiciones y reloj.
- **Esfuerzo:** chico por secreto. **Sale de:** iceberg de Club Penguin.

### 9. Invitar un café
- **Qué hace:** toma una taza en el puesto y se la lleva a alguien; esa persona la recibe y ambos quedan con la pose de tomar café.
- **Qué ven los demás:** la entrega y el globito de taza sobre los dos.
- **Por qué:** regalo que no le cuesta nada a quien da y abre un ciclo de reciprocidad (2.2). Sin inventario: Cook advierte que con premios la gente siente que le pagan por ser amiga.
- **Técnica:** otro `kind` de `nudge`; la taza en mano es estado local hasta entregarla. Cabe.
- **Esfuerzo:** chico. **Sale de:** regalos de Animal Crossing y Sky.

### 10. «Sígueme»: llevar a alguien por la isla
- **Qué hace:** un miembro ofrece «te llevo»; quien acepta camina solo detrás del guía hasta que toca cualquier parte del mapa.
- **Qué ven los demás:** dos muñequitos en fila, el guía con un banderín.
- **Por qué:** escalón de confianza media, elegido por quien sigue (2.2, 2.7); es la manera natural de dar el recorrido.
- **Técnica:** del lado del seguidor, `walkTo` repetido hacia la posición del guía; no pide servidor. Con sondeo de 2.5 s el seguidor va un paso atrás, lo cual se ve bien.
- **Esfuerzo:** chico–mediano. **Sale de:** tomarse de la mano en Sky.

### 11. Mesa de enfoque (trabajar en paralelo)
- **Qué hace:** se sienta en una mesa del campamento y arranca un reloj de 25 minutos; otros se suman al mismo reloj. Al terminar todos se estiran y la mesa pregunta «¿qué avanzaste?» con respuesta de un renglón.
- **Qué ven los demás:** una mesa con reloj de arena y cuántos van.
- **Por qué:** juego en paralelo, el escalón correcto para desconocidos (2.4); la pregunta final abre una plática corta.
- **Técnica:** una llave numérica con la hora de fin por mesa. Cabe. Usarla en sesiones anunciadas, no como sala permanente (ver `TENDENCIAS-INTERACCION.md` §4.16).
- **Esfuerzo:** chico. **Sale de:** escalón bajo de Koster.

### 12. Foto del grupo al cerrar un evento
- **Qué hace:** al final de la llamada o del hackatón el anfitrión toca «Foto»; cuenta regresiva, todos posan en las gradas.
- **Qué ven los demás:** la foto queda publicada en el muro con los nombres, y enmarcada junto al mural hasta el siguiente evento.
- **Por qué:** ritual de cierre y recuerdo que persiste (2.5, 2.6).
- **Técnica:** captura del lienzo de three.js y subida como imagen de una publicación; pide permiso de anfitrión y revisar la captura en celular.
- **Esfuerzo:** mediano. **Sale de:** fotos de Animal Crossing, ceremonias de Koster.

### 13. Farolitos con recado
- **Qué hace:** deja en el muelle un farol con un renglón de hasta 80 caracteres («hoy desplegué mi primer agente»). Quien lo encuentra puede encender una chispa de agradecimiento; no hay respuesta escrita.
- **Qué ven los demás:** faroles flotando con nombre y antigüedad; los más viejos se apagan solos a los 7 días.
- **Por qué:** apertura voluntaria con respuesta sólo positiva (2.6, 2.8).
- **Técnica:** pide colección en Mongo, tope por persona, y que el anfitrión pueda ocultar uno. El texto libre es lo único de la lista que necesita moderación.
- **Esfuerzo:** mediano. **Sale de:** Kind Words, Death Stranding.

### 14. Vínculos que crecen al hacer cosas juntos
- **Qué hace:** nada explícito. La tercera vez que coincide con alguien en una actividad, el juego les desbloquea a los dos un gesto nuevo (abrazo, baile en pareja) y un detalle visible sólo entre ellos.
- **Qué ven los demás:** el gesto, sin número ni nivel.
- **Por qué:** habilidades que se abren para ambos al invertir en la relación, como en Sky (2.2); ataca el paso de «jugamos una vez» a «jugamos otra vez» de Cook.
- **Técnica:** pide una colección por pareja `{a, b, veces, últimaVez}` escrita por el servidor cuando ve a dos personas en puntos de la misma cosa. Sin decaimiento y sin lista pública.
- **Esfuerzo:** mediano–grande. **Sale de:** relaciones de The Sims, velas de Sky, corazones de Stardew.

### 15. Obra en común de la semana
- **Qué hace:** cada visita puede poner una pieza en el mural o regar el jardín una vez al día. Cuando se completa, el resultado se estrena en la siguiente llamada.
- **Qué ven los demás:** el avance con las caras de quienes pusieron pieza, sin contar cuántas puso cada quien.
- **Por qué:** meta de suma no cero y huella que termina en ritual (2.2, 2.5, 2.6).
- **Técnica:** documento chico por comunidad en Mongo para que dure la semana; el dibujo final es trabajo de arte.
- **Esfuerzo:** mediano–grande. **Sale de:** proyectos de pueblo de Animal Crossing, caminos de Death Stranding.

---

## 5. Las tres primeras, en orden

1. **Campana del Foro y fogata de cierre (#1).** Va primero porque todo lo demás necesita gente a la vez y el único momento en que la hay es alrededor de la llamada. Se prueba en la siguiente sesión en vivo. Medir: personas en la isla 10 minutos antes y 10 después, contra hoy.
2. **Objetos que anuncian cupo (#2), con el brindis y el zarpe como primeros efectos.** Le da a esa gente reunida algo que hacer entre dos con un toque. Medir: cuántas veces se completa un cupo por evento y cuántas parejas distintas lo hicieron.
3. **Huellas ligeras (#3).** Cubre el tiempo entre eventos, que es casi todo. Medir: visitas fuera de horario de llamada y cuántas usan una cosa con huella reciente.

Después: robots que completan cupo (#4), que vuelve útil el punto 2 cuando sólo hay una persona, y Ghosty anfitrión (#7) cuando haya llegada constante de miembros nuevos.

**Ajuste a lo que ya existe:** el almohadazo hoy alcanza a cualquier persona. Dejarlo sólo entre quienes tomaron almohadas (o dentro del campamento) lo convierte en juego consentido; con Journey quedó claro qué pasa cuando un gesto físico se puede usar contra quien no lo pidió. La cosquilla de cerca es más leve; bastaría con que «enfocado» (#6) y «Tranquilo» la apaguen.

---

## 6. Qué NO hacer

| Mecánica | Razón |
|---|---|
| Barras de necesidades que bajan solas (hambre, energía, social) | En The Sims son la tarea del jugador; aquí serían mantenimiento en sesiones de minutos. Eguchi: la lista de pendientes no debe sentirse como presión. |
| Rachas de visita que se pierden | El ritmo del club es semanal y castiga al que tiene otro horario. El dato de Duolingo a favor (ver `TENDENCIAS-INTERACCION.md`) viene de una racha fácil de conservar. La ansiedad por rachas sólo la encontré en blogs, sin estudio. [sin verificar] |
| Amistad que decae si no vuelves | Stardew la usa con personajes de un juego diario; entre personas reales es un reproche. |
| Tabla de posiciones, niveles o rango visible en la isla | VRChat: los rangos visibles generan estereotipos y discriminación contra los nuevos. Hanus y Fox (ya citado en el otro documento) midieron menos motivación con tabla e insignias. |
| Medidor público de amistad o lista de «mejores amigos» | Expone quién no tiene; en decenas de miembros todos lo ven. Si existe (#14), que sea visible sólo para la pareja. |
| Monedas, tienda, objetos raros o intercambio | Cook: la suma cero vuelve egoísta el inicio de la relación; Habbo documenta estafas de furni. Además pide soporte y antifraude. |
| Voz o cámara que se enciende sola por cercanía | Revelación prematura (Cook). Las mesas con voz ya son la versión con consentimiento: uno se sienta. |
| Empujar, bloquear el paso o cualquier colisión entre personas | Journey la quitó porque se usó para tirar a otros. |
| Emparejar o presentar sin que ambos quieran | Cook: las relaciones automatizadas se sienten utilitarias. Ghosty propone y cada quien decide. |
| Un minijuego solitario muy atractivo | La «Joy Booth» de Forbus y Wright: los sims la usan tanto que dejan de socializar. Lo mejor de la isla debe pedir a otra persona. |
| Robots que platican con un modelo de lenguaje libre | Hablarían a nombre del club sin revisión; las plantillas alcanzan para saludar, recordar y proponer. Es criterio propio, sin fuente. |
| Prometer la isla como lugar siempre vivo | Con 0–3 personas a la vez fuera de eventos, la promesa se rompe sola (`MUNDO-2D-EVALUACION.md`). La isla se anuncia alrededor de las llamadas. |

---

## 7. Lo que no pude verificar

- **Amy Jo Kim:** no leí el libro. Las nueve estrategias vienen de una lista citada en un blog y el ciclo de membresía de un resumen de terceros. No confirmé que hable de «greeters».
- **Bartle:** sólo fuente secundaria (Wikipedia); no abrí el artículo de 1996.
- **«Alone together?» (Ducheneaut y otros):** sólo título y ficha; el contenido no se leyó.
- **Journey y la colisión:** viene del extracto de una entrevista; no vi la charla de GDC 2013.
- **Sky:** el artículo leído confirma siluetas, velas, mano y habilidades que se abren para los dos. Que el chat se desbloquee dentro del árbol de amistad y las puertas que piden varios jugadores quedaron sin confirmar; thatgamecompany reorganizó el árbol en niveles y las guías viejas pueden estar desactualizadas.
- **Kind Words:** las mecánicas vienen de reseñas, no de una charla del autor.
- **Animal Crossing:** no encontré fuente primaria sobre cartas ni sobre vecinos que recuerdan o mencionan a otros jugadores; los puntos de amistad son de Nookipedia (sólo New Horizons).
- **The Sims:** la cita de Wright llegó por extracto; no confirmé las reglas exactas de aceptar o rechazar una interacción ni los puntajes diario y de por vida de The Sims 2.
- **Club Penguin:** fiestas mensuales, guías y agentes secretos como roles de jugador los recuerdo, sin fuente abierta.
- **Habbo, Webkinz, Roblox, Tomodachi Life, WorkAdventure:** no encontré literatura de diseño que aporte más allá de lo citado (chat prefabricado para niños, estafas de intercambio, encuestas pagadas por la empresa). No sostienen ninguna recomendación de este documento.
- **Efecto medido:** ninguna de las fuentes de diseño trae datos de retención; son marcos y casos. Las únicas cifras experimentales siguen siendo las de `TENDENCIAS-INTERACCION.md` §3.
- **Código:** no revisé cómo llega la hora del próximo evento al mundo ni si la captura del lienzo funciona en celular; los esfuerzos son estimaciones. No medí cuánta gente usa hoy la isla.

## Pendiente: investigar más a fondo Animal Crossing y Club Penguin (anotado el 13-nov-2026)

bliss pidió profundizar en estos dos antes de seguir diseñando rituales. Preguntas a responder:
- Qué hacía que la gente llegara a la misma hora (fiestas de Club Penguin, festivales y visitas de Animal Crossing) y qué recibía cada quien por estar ahí.
- Qué objetos y adornos tenían una función para el jugador y cuáles eran sólo decoración. Los faroles de las gradas quedaron en duda por esto: no le dan nada a quien los enciende.
- Qué se puede copiar con lo que el motor ya tiene y qué pide guardar datos.
