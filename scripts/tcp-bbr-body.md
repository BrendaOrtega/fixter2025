Una tienda que hospedamos tardaba **diez segundos** en pintar la imagen principal. La imagen pesa 163 KB.

Lo interesante no es el final —una línea de configuración del kernel— sino que durante un buen rato *todo* apuntaba a que no había nada roto. Te cuento el diagnóstico completo, incluidas las tres hipótesis que resultaron falsas, porque el camino equivocado enseña más que la solución bonita.

## Todos los tableros decían que estaba bien

Cuando algo va lento uno mira el servidor. Miré:

| Qué medí | Resultado |
|---|---|
| La app, desde dentro de la máquina (`localhost`) | **122 MB/s** — el archivo en 1.3 ms |
| Internet, desde dentro de la máquina | 21.5 MB/s |
| TTFB desde el cliente | 0.5 s, normal |
| CPU y RAM | de sobra |
| **Lo que recibía el visitante** | **16 KB/s** |

La aplicación entregaba el archivo en **1.3 milisegundos**. Al visitante le llegaba en diez segundos.

Esa es la trampa de este tipo de fallas: **ninguna métrica de servidor se pone roja**. El problema no vive en el servidor ni en el cliente, sino en el camino entre los dos, que es justo el tramo que nadie instrumenta.

## Las tres hipótesis equivocadas

**"La imagen pesa mucho."** Y sí pesaba: 2.5 MB de PNG, una fotografía guardada sin pérdida —el peor formato posible para una foto—. La optimicé a 163 KB en AVIF. Mejoró bastante… y el techo seguía ahí. **Un problema real puede tapar a otro**, y arreglar el primero te hace creer que ya cerraste el caso.

**"La máquina es chica."** Corría en el tier más pequeño, con CPU compartida. Sonaba razonable hasta que medí desde dentro: 1.3 ms para servir el archivo, 21 MB/s de red. La máquina estaba de vacaciones.

**"El enlace interno."** La infra tiene el proxy en un servidor y algunas máquinas en otro, conectados por Tailscale. Un enlace cayendo a relay explicaría perfectamente el síntoma. Era la hipótesis más convincente — y era falsa: pedí el archivo **desde dentro de la máquina, a su propia URL pública**, forzando el recorrido completo (internet → proxy → enlace interno → máquina) y dio **1.47 MB/s**. El tramo interno estaba sano.

Descartadas las tres, quedaba un solo sospechoso: el trecho entre el servidor y el visitante.

## La prueba de 30 segundos

Esta es la parte que vale la pena que te robes. Descarga **el mismo archivo con N conexiones en paralelo** y mira si el total escala:

```bash
A=https://tu-sitio.com/algun-asset-grande.avif
for n in 1 5 10 20; do
  t0=$(date +%s.%N)
  for i in $(seq $n); do curl -s -o /dev/null "$A" & done; wait
  t1=$(date +%s.%N)
  echo "$n conexiones → $(echo "scale=0; $n*163000/($t1-$t0)" | bc) B/s"
done
```

Lo que me salió:

```
 1 conexión  →  19 KB/s
 5           →  87 KB/s
10           → 120 KB/s
20           → 241 KB/s
```

Aquí está todo el diagnóstico. **Si el total escala con las conexiones, no te falta ancho de banda.** El tubo da para doce veces más; lo que no da es *cada conexión por separado*. Si el total se quedara clavado en 19 KB/s sin importar cuántas abras, entonces sí sería un límite de ancho de banda o un shaper.

Un `ping` completó el cuadro: **150 ms de ida y vuelta** hasta el servidor (está en Francia, yo en México) y **~5% de pérdida de paquetes**.

## El culpable: cubic haciendo exactamente su trabajo

TCP tiene un algoritmo de control de congestión que decide cuántos datos manda sin esperar confirmación. Linux trae **cubic** de fábrica desde hace veinte años, y cubic pertenece a la familia *loss-based*: **interpreta cada paquete perdido como señal de congestión** y parte la ventana a la mitad.

Esa lógica es impecable dentro de un centro de datos, donde si se pierde un paquete es porque algo se saturó.

En un enlace intercontinental es un desastre. Ahí la pérdida es **ruido del camino** —fibra, saltos, peering—, no congestión. Y con 150 ms de ida y vuelta, cada repliegue tarda muchísimo en recuperarse. El resultado: la conexión vive permanentemente encogida, con unos 2 KB en vuelo, replegándose antes de haber levantado.

No estaba fallando nada. Cubic hacía exactamente lo que se le pidió, con una suposición que no aplicaba.

### Y HTTP/2 lo empeora

HTTP/2 multiplexa **todos** los recursos de una página sobre **una sola** conexión TCP. Es una virtud: elimina el costo de abrir conexiones.

Salvo cuando esa única conexión es la que se arrastra. Todo el sitio —HTML, CSS, JS, imágenes— viajaba por el único tubo estrangulado, y el navegador no podía compensar. Con HTTP/1.1, que abre seis conexiones, el sitio habría ido *más rápido*. La prueba de las 20 conexiones en paralelo era, sin querer, una simulación de eso.

## La solución: BBR

[BBR](https://research.google/pubs/pub45646/), de Google, ataca justo esto: **no usa la pérdida como señal de congestión**. Mide el ancho de banda real del cuello de botella y el RTT mínimo, y manda a esa tasa. Enlaces largos con pérdida son su caso de uso canónico.

Estaba en el kernel desde hacía años. Solo había que encenderlo:

```bash
modprobe tcp_bbr
sysctl -w net.ipv4.tcp_congestion_control=bbr
```

Para que sobreviva a un reinicio, dos archivos:

```bash
echo tcp_bbr > /etc/modules-load.d/bbr.conf
echo "net.ipv4.tcp_congestion_control = bbr" > /etc/sysctl.d/99-bbr.conf
```

Verifica que `net.core.default_qdisc` esté en `fq` o `fq_codel` — es buena pareja para BBR.

### El antes y después

Diez muestras de una conexión, contra el mismo archivo:

| | antes (cubic) | después (BBR) |
|---|---|---|
| Mediana | 41.8 KB/s | **117 KB/s** |
| Peor caso | 21.8 KB/s | **58.7 KB/s** |
| La imagen de 163 KB | ~10 s | **1.1–2.1 s** |

Casi el triple, y el suelo —el peor momento, que es el que arruina la experiencia— también se triplicó.

### Sin downtime, y reversible

Vale la pena decir por qué esto es tan barato de probar:

- **Solo afecta conexiones nuevas.** Las abiertas siguen con el algoritmo con el que nacieron.
- **No reinicia nada.** `modprobe` carga un módulo; `sysctl` escribe un parámetro. Después del cambio verifiqué los uptimes: el proxy seguía con sus 19 días, las microVMs con los suyos. Ningún proceso se reinició.
- **Se revierte con una línea.**

Y si corres microVMs: **las máquinas invitadas ni se enteran**, porque tienen su propio kernel. Esto vive en el kernel del anfitrión, que es quien termina las conexiones con los visitantes.

## Por qué no lo tenía

Porque es un **default**, y los defaults solo se ven cuando duelen. BBR está en Linux desde 2016, pero ninguna distro lo activa: el módulo estaba ahí, en `/lib/modules/`, esperando un `modprobe` que nadie tenía razón de escribir.

Hay algo estructural también. En Vercel, Cloudflare o Fly esto no te pasa: terminan el TCP en un punto de presencia a milisegundos de tu usuario y sus kernels ya vienen afinados. Correr tu propio fierro significa heredar los defaults de la distro, con todo lo bueno —y con esto.

## Qué me llevo

**Mide desde adentro y desde afuera al mismo tiempo.** Lo que aisló el problema no fue una métrica sino la *contradicción* entre dos: la app volando en `localhost` y el visitante recibiendo migajas. Cada medición por separado parecía normal.

**Un problema real puede tapar a otro.** La imagen sí pesaba de más. Arreglarlo mejoró las cosas y casi me hace cerrar el caso antes de tiempo.

**Sospecha de esto cuando** algo se sienta lento *solo desde lejos*, el TTFB esté bien pero la transferencia mal, y el throughput escale con conexiones paralelas. Son treinta segundos de `curl` para descartarlo.

Si tienes un servidor propio sirviendo a gente en otro continente, corre la prueba de las conexiones en paralelo hoy mismo. Es muy probable que estés dejando ahí la mitad de tu velocidad sin saberlo.
