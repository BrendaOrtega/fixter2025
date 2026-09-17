# Agentes durables con eve — guion literal (Ghosty narra, em_santa)

Una frase por línea. Entre `##` va el capítulo; las líneas que empiezan con `>` son pausas largas (1 s).
Anglicismos fonéticos sólo en `gen-voice.sh`; aquí va la ortografía normal (es lo que se muestra en subtítulos).

## 0 · Apertura
Soy Ghosty, y te hice un tutorial.
Este agente tiene una tarea de seis pasos, y va en el tres.
Le corto la luz.
Lo vuelvo a encender.
Y sigue en el paso cuatro, con otro número de proceso, sin repetir nada.
Ese comportamiento tiene nombre: agente durable.
En los siguientes diez minutos vemos quién lo ofrece así, cómo lo construyeron por dentro, y cómo correrlo en tu propia infraestructura.
El framework se llama eve, y lo hace Vercel.

## 1 · Lo que vende Vercel
En la versión administrada, el agente se pide con una frase.
Escribes qué debe hacer, entras con tu cuenta de Vercel, y Vercel genera la carpeta y la despliega.
Detrás hay cinco piezas, y las cinco son suyas.
Vercel Workflows guarda el estado y los checkpoints.
El AI Gateway hace las llamadas al modelo.
Vercel Sandbox ejecuta el código del agente aislado.
Vercel Connect maneja las conexiones a MCP y a HTTP.
Y el Chat SDK conecta el agente a Slack, Discord, WhatsApp, Telegram, Teams, cron o una API.
El código es Apache dos, así que lo puedes leer y correr donde quieras.
Lo que cobra Vercel es operar esas cinco piezas.
> 
La idea central del framework es que el agente es un directorio.
instructions punto md es el system prompt.
La carpeta tools trae funciones tipadas con Zod.
skills son procedimientos que se cargan cuando hacen falta.
channels es por dónde entra el mensaje.
schedules son crons.
Y memory declara qué recuerda y con qué proveedor.
Cada archivo se vuelve una capacidad por su ruta: tools, diagonal, get weather punto ts, es la tool get weather.

## 2 · Cómo funciona por dentro
Una sesión es la conversación completa, y puede durar días.
Un turno es un mensaje del usuario y todo lo que dispara hasta la respuesta.
Un step es una llamada al modelo más las tools que ejecuta en línea.
El step es el checkpoint.
> 
Cada sesión corre como un workflow del Workflow SDK, que también es de Vercel y también es abierto.
Cuando el proceso muere, el workflow se vuelve a ejecutar desde el principio.
Pero cada step que ya terminó devuelve su resultado guardado, en vez de volver a correr.
Por eso el modelo no se vuelve a llamar: se reproduce la respuesta que ya dio.
> 
Esta es la tool de la demo.
define workflow tool, y la primera línea del cuerpo es la cadena use workflow.
Ese cuerpo se vuelve a ejecutar en cada arranque, así que tiene que ser determinista.
Nada de Date, nada de Math random, nada de process env ahí.
Todo eso vive en funciones marcadas con use step.
run step imprime la hora y el pid.
Por eso en el log los pasos cuatro, cinco y seis salieron con otro pid: el cuerpo se reprodujo, los tres primeros steps devolvieron su resultado guardado, y el cuarto sí se ejecutó.
sleep de cinco segundos también es durable: el proceso puede morir durante la espera.
> 
Un step interrumpido a la mitad se vuelve a ejecutar completo.
Si ese step cobra una tarjeta o manda un correo, se cobra dos veces.
Para eso hay dos herramientas.
Una es hacer el step idempotente: cada cobro lleva un id único, y el banco ignora el repetido.
La otra es approval: la tool espera a que una persona apruebe antes de correr.
Esa espera estaciona la sesión sin gastar cómputo, minutos o días, y al llegar la respuesta sigue en el mismo punto.
ctx punto ask hace lo mismo cuando es el agente el que pregunta.

## 3 · Las piezas en crudo
Sin el branding, el estado durable es esto: una carpeta con seis subcarpetas.
runs, steps, events, hooks, streams y waits.
En el código esa carpeta se llama World.
Un World es la unión de tres interfaces.
Storage guarda runs, steps, eventos y hooks.
Queue encola el siguiente paso a ejecutar.
Y Streamer transmite los eventos al cliente.
Quien implemente esas tres interfaces puede correr eve.
Vercel tiene su world.
Hay uno local que escribe en disco, y uno de Postgres.
Y la comunidad ya publicó los suyos: Mongo, MySQL, Cloudflare, NATS, SurrealDB y Upstash.
> 
La segunda pieza es el sandbox, y también es un adaptador.
Tiene un nombre, un create, un prewarm, y el handle que devuelve tiene run, write text file, read text file, stop, delete y capture state.
eve trae cuatro: Vercel Sandbox, Docker, microsandbox y just bash, y los prueba en ese orden.
Lo demás del runtime es Nitro para las rutas HTTP y el AI SDK para el modelo.
Dos contratos: un World y un Sandbox Backend.

## 4 · Postgres
El world local escribe en disco y corre en un solo proceso.
Sirve para desarrollar y para un agente en una máquina.
Para dos procesos, o para sobrevivir un redeploy donde el disco se va, se necesita un world compartido.
El de referencia es Postgres.
Una sola base resuelve las tres interfaces.
Las tablas son el Storage.
La cola se hace con select for update skip locked, sobre graphile worker.
Y listen notify despierta al worker sin polling.
> 
Se instala el paquete world postgres.
Cuidado con la versión: en npm, latest es la línea cuatro, y eve usa la cinco punto cero beta.
Hay que pinnear la beta que trae eve, o el runtime rechaza el protocolo.
El bootstrap crea dos esquemas: workflow, con runs, steps, events, hooks, waits y stream chunks; y graphile worker, con la cola.
En agent punto ts se declara el world, y la URL de la base va en la variable de entorno.
> 
Misma prueba.
Arranca el agente, pide la tarea, y en la tabla steps van apareciendo filas.
Mato el proceso en el paso tres.
En la tabla quedan las filas completadas.
Arranco de nuevo, con otro pid, y aparecen las tres que faltaban.
El agente ya no depende del disco de la máquina.

## 5 · Docker como sandbox
El agente vive en dos lugares.
El app runtime es tu proceso Node: habla con el modelo, guarda las llaves, escribe los checkpoints y decide qué tool llamar.
El sandbox es donde corre bash: tiene su workspace, no tiene llaves, y su red la decides tú.
> 
Entre los dos hay una frontera.
De un lado va el comando: bash, write file.
Del otro vuelve el resultado: exit code, stdout, stderr.
Las llaves se quedan del lado del runtime.
El modelo nunca toca una.
> 
En el ejemplo oficial de self hosting los dos corren en la misma máquina: el runtime como proceso y el sandbox como contenedor de Docker.
El backend de Docker levanta un contenedor por sesión con la imagen de eve y lo deja vivo entre turnos.
Así el workspace conserva los archivos.
La política de red en Docker sólo sabe todo o nada: allow all o deny all.
Para un agente que ejecuta Python sobre un CSV, deny all alcanza.

## 6 · EasyBits
Ahora lo mismo en EasyBits, donde las dos son cajas.
La caja madre corre eve.
Es una microVM de Firecracker con Node veinticuatro, eve, y Postgres instalado adentro.
Cuando el modelo pide bash, eve le pide a EasyBits una caja hija.
Una caja por sesión.
> 
El adaptador se llama easybits eve sandbox.
En sandbox punto ts se declara backend easybits, y lee la llave del entorno.
prewarm hace un snapshot de la caja preparada.
create hace un fork de ese snapshot, en unos siete segundos.
stop la suspende, y resume la despierta en tres.
> 
Build, start, y se expone el puerto tres mil.
La caja recibe una URL pública que pasa todo el path al puerto, así que las dos rutas que eve necesita, diagonal eve y diagonal punto well known diagonal workflow, llegan sin proxy.
En el ejemplo de Vercel eso lo hacía Caddy con dos reglas.
Health responde, y un turno con bash corre en la caja hija.
> 
Y la última pieza también existe: easybits eve world, el World sobre la base de EasyBits, para que el estado viva ahí sin instalar Postgres.

## 7 · Tres formas de no perder el trabajo
Se va la luz con la ficha cuatro en la mano.
Hay tres formas de que el trabajo sobreviva.
La primera es el journal a mano: guardas el resultado de cada paso en una tabla, tú escribes run step, y al volver lees la tabla y sigues en el cuatro.
Te exige código determinista.
La segunda es el motor: eve con el Workflow SDK, Restate, Temporal.
Guarda lo mismo, pero el motor reproduce por ti.
Te exige marcar cada paso con use step.
La tercera es la imagen de la caja: EasyBits suspende la microVM completa, memoria y disco, con el proceso adentro.
Al volver, el proceso ni se enteró.
Te exige reintentar la llamada HTTP que estaba en vuelo, porque esa sí muere.
> 
En las tres, si la luz se va a mitad de un cobro, el cobro se hace otra vez.
Eso lo resuelve un id único por cobro, aparte del checkpoint.
> 
Si te gustaría construir la primera forma desde cero, en una sesión, dímelo en los comentarios.
Y si quieres armar agentes así, con su caja, su memoria y sus canales, el programa Sistemas Agénticos está en fixtergeek punto com.
Suscríbete al canal para el siguiente.
Soy Ghosty. Nos vemos.
