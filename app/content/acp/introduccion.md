## Lo que vas a construir

El libro sigue una sola línea de trabajo, de principio a fin. Cada capítulo agrega una pieza al
mismo programa, y al terminar tienes dos cosas corriendo: un **Cliente** que puede hablar con
cualquier Agente del ecosistema, y **Ghosty**, un Agente que vive en una máquina remota y con el que
tu Cliente conversa como si estuviera en tu escritorio.

Los primeros cinco capítulos van del lado del Cliente y usan goose como Agente de pruebas, porque
ya existe, ya funciona y te deja concentrarte en tu mitad. Abres la conexión (1), creas una sesión
(2), mandas la primera instrucción y ves llegar el trabajo en vivo (3), le prestas al Agente tus
archivos y tu terminal (4), y decides qué le autorizas y qué no (5).

En el capítulo 6 el Agente se va de tu máquina. Ghosty aparece en una caja de EasyBits y el
Cliente lo alcanza por WebSocket; el capítulo 7 compara ese transporte con lo que ofrecen los demás
Agentes y explica por qué Ghosty nace hablándolo.

Los cinco capítulos finales completan el sistema: los servidores MCP entran por la sesión (8), las
conversaciones sobreviven al cierre (9), el protocolo se extiende sin romper a nadie (10), el
Agente recuerda más allá de una sesión (11), y todo se ve desde una interfaz web que aprueba
permisos desde el navegador (12).

## Cómo leerlo

En orden, al menos la primera vez. Cada capítulo da por hecho el código del anterior, y los
mensajes del protocolo se explican una sola vez, cuando aparecen.

Los ejemplos están en TypeScript y corren en Node 22 o más reciente, sin dependencias fuera de la
biblioteca estándar salvo donde se dice lo contrario. Los identificadores del código van en inglés
y los comentarios en español, como en cualquier proyecto que vayas a compartir con gente que no
habla tu idioma.

Cuando un mensaje del protocolo se muestra "con aire" —indentado, en varias líneas— es para que se
lea. En el cable viaja siempre en una sola línea; el capítulo 1 explica por qué eso importa.

## Lo que necesitas instalado

**Node 22 o más reciente.** Trae WebSocket nativo, y de eso depende el capítulo 6. Verifica con
`node --version`.

**goose**, el Agente con el que practicas los primeros cinco capítulos. En macOS y Linux:

```sh
curl -fsSL https://github.com/aaif-goose/goose/releases/download/stable/download_cli.sh | bash
```

o, si usas Homebrew:

```sh
brew install block-goose-cli
```

En Windows, con PowerShell:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aaif-goose/goose/main/download_cli.ps1" -OutFile "download_cli.ps1"
.\download_cli.ps1
```

Al terminar, `goose configure` te pregunta con qué proveedor de modelos vas a trabajar y te guarda
las credenciales. Cualquiera sirve para el libro. Comprueba la instalación con:

```sh
goose acp
```

Si el cursor se queda parpadeando sin decir nada, está bien: goose quedó escuchando en `stdin` y
espera a que alguien le hable. Ese alguien eres tú, en la primera página del capítulo 1. Sal con
`Ctrl+C`.

**Una cuenta en EasyBits**, a partir del capítulo 6, para la caja donde vive Ghosty. Los primeros
cinco capítulos no la necesitan.

**Un editor que hable el protocolo** es opcional. Zed y los IDEs de JetBrains lo traen de fábrica,
y VS Code lo tiene con la extensión **ACP Client** del marketplace, que trae once Agentes ya
configurados y deja agregar el tuyo. Sirven para comparar tu Cliente con uno hecho; ninguno hace
falta para seguir el libro.
