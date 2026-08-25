# Entrega 5 — Por qué el agente escribe código en vez de llamar herramientas

Video de la secuencia de preparación. Duración objetivo: 3:00–3:30.
Voz: Kokoro `em_santa`. Español mexicano.

Fuente del dato duro: Anthropic, *Code execution with MCP* —
150,000 tokens → 2,000 tokens, 98.7% de ahorro en el mismo flujo.

---

## 1 · El menú (0:00 – 0:35)

> Conectas tu agente a MCP y le das veinte herramientas. Antes de escribir la
> primera línea, esas veinte definiciones ya están dentro de su contexto:
> nombre, parámetros, tipos, descripción. Cada una.
>
> Con veinte se nota. Con doscientas, el agente gasta media ventana leyendo el
> menú antes de decidir qué pedir.

**Visual (Blender):** una pared de tarjetas flotando frente a la cámara, cada
una una definición de tool. La cámara retrocede y la pared no termina. Contador
de tokens subiendo en una esquina.

## 2 · El segundo cobro (0:35 – 1:15)

> Y el menú es la mitad del costo. La otra mitad son los resultados.
>
> El agente baja la transcripción de una junta y la mete a un CRM. Esa
> transcripción entra al contexto cuando la lee, y vuelve a entrar cuando la
> escribe en la llamada siguiente. El mismo texto, dos veces.
>
> Una junta de dos horas son cincuenta mil tokens extra. No por pensar: por
> pasar el dato de una mano a la otra.

**Visual:** el mismo bloque de texto viajando de la tool A a la tool B pasando
por el modelo — un rodeo evidente.

## 3 · El cambio (1:15 – 2:10)

> Code mode le da la vuelta. En vez de exponer las herramientas como un menú,
> las expones como una API: archivos que el agente importa cuando los necesita.
>
> El agente ya no pide "llama a esta herramienta con estos parámetros". Escribe
> el programa que hace el trabajo:
>
> ```ts
> const doc = await drive.getDocument(id);
> await crm.update(deal, { notes: doc.text.slice(0, 500) });
> ```
>
> Ahí adentro pasan dos cosas. Descubre las herramientas leyendo la carpeta,
> así que sólo carga las que va a usar. Y la transcripción nunca sale del
> proceso: se lee, se recorta y se guarda sin tocar el contexto ni una vez.

**Visual:** la pared de tarjetas colapsa en un árbol de archivos; el texto se
queda dentro de una caja y sólo sale un renglón de resultado.

## 4 · El número (2:10 – 2:35)

> Anthropic midió ese mismo flujo de las dos formas. Ciento cincuenta mil
> tokens contra dos mil. Noventa y ocho punto siete por ciento menos.
>
> Es el escritorio de la entrega dos: no ordenas mejor lo que pusiste encima,
> dejas de subirlo.

**Visual:** dos barras. La grande ocupa la pantalla, la chica cabe en un dedo.

## 5 · Lo que cuesta (2:35 – 3:10)

> Nada de esto es gratis. Para que el agente escriba código, alguien tiene que
> ejecutarlo, y ese código lo escribió un modelo.
>
> Ahí entra el sandbox: una caja con sistema de archivos, red controlada y
> tiempo de vida propio, donde el peor programa posible sólo se rompe a sí
> mismo. Es de lo que hablamos en el webinar del jueves, y es el piso de todo
> el taller.

**Visual:** la caja se cierra alrededor del código; adentro sigue corriendo.

## 6 · Cierre (3:10 – 3:25)

> MCP resolvió cómo se conectan las herramientas. Code mode resuelve cuántas
> caben.

**Visual:** logo FixterGeek con halo.
