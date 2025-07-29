import { Effect } from "effect";

// Error types
export class TextCleaningError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly stage: string
  ) {
    super(message);
    this.name = "TextCleaningError";
  }
}

// Spanish number conversion maps
const CARDINAL_NUMBERS = new Map([
  [0, "cero"],
  [1, "uno"],
  [2, "dos"],
  [3, "tres"],
  [4, "cuatro"],
  [5, "cinco"],
  [6, "seis"],
  [7, "siete"],
  [8, "ocho"],
  [9, "nueve"],
  [10, "diez"],
  [11, "once"],
  [12, "doce"],
  [13, "trece"],
  [14, "catorce"],
  [15, "quince"],
  [16, "dieciséis"],
  [17, "diecisiete"],
  [18, "dieciocho"],
  [19, "diecinueve"],
  [20, "veinte"],
  [21, "veintiuno"],
  [22, "veintidós"],
  [23, "veintitrés"],
  [24, "veinticuatro"],
  [25, "veinticinco"],
  [26, "veintiséis"],
  [27, "veintisiete"],
  [28, "veintiocho"],
  [29, "veintinueve"],
  [30, "treinta"],
  [40, "cuarenta"],
  [50, "cincuenta"],
  [60, "sesenta"],
  [70, "setenta"],
  [80, "ochenta"],
  [90, "noventa"],
  [100, "cien"],
  [200, "doscientos"],
  [300, "trescientos"],
  [400, "cuatrocientos"],
  [500, "quinientos"],
  [600, "seiscientos"],
  [700, "setecientos"],
  [800, "ochocientos"],
  [900, "novecientos"],
  [1000, "mil"],
]);

const ORDINAL_NUMBERS = new Map([
  [1, "primero"],
  [2, "segundo"],
  [3, "tercero"],
  [4, "cuarto"],
  [5, "quinto"],
  [6, "sexto"],
  [7, "séptimo"],
  [8, "octavo"],
  [9, "noveno"],
  [10, "décimo"],
]);

// Spanish abbreviations
const ABBREVIATIONS = new Map([
  ["Dr.", "Doctor"],
  ["Dra.", "Doctora"],
  ["Sr.", "Señor"],
  ["Sra.", "Señora"],
  ["Srta.", "Señorita"],
  ["Prof.", "Profesor"],
  ["Profa.", "Profesora"],
  ["Ing.", "Ingeniero"],
  ["Lic.", "Licenciado"],
  ["etc.", "etcétera"],
  ["S.A.", "Sociedad Anónima"],
  ["Ltda.", "Limitada"],
  ["Cía.", "Compañía"],
  ["Av.", "Avenida"],
  ["C/", "Calle"],
  ["Pza.", "Plaza"],
  ["Dpto.", "Departamento"],
]);

// Month names for date conversion
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// Emoji descriptions in Spanish
const EMOJI_DESCRIPTIONS = new Map([
  // Faces and emotions
  ["😀", "cara sonriente"],
  ["😃", "cara sonriente con ojos grandes"],
  ["😄", "cara sonriente con ojos sonrientes"],
  ["😁", "cara radiante con ojos sonrientes"],
  ["😆", "cara sonriente con ojos cerrados"],
  ["😅", "cara sonriente con sudor"],
  ["🤣", "cara rodando de risa"],
  ["😂", "cara con lágrimas de alegría"],
  ["🙂", "cara ligeramente sonriente"],
  ["🙃", "cara al revés"],
  ["😉", "cara guiñando"],
  ["😊", "cara sonriente con ojos sonrientes"],
  ["😇", "cara sonriente con aureola"],
  ["🥰", "cara sonriente con corazones"],
  ["😍", "cara sonriente con ojos de corazón"],
  ["🤩", "cara con ojos de estrella"],
  ["😘", "cara mandando un beso"],
  ["😗", "cara besando"],
  ["☺️", "cara sonriente"],
  ["😚", "cara besando con ojos cerrados"],
  ["😙", "cara besando con ojos sonrientes"],
  ["🥲", "cara sonriente con lágrima"],
  ["😋", "cara saboreando comida"],
  ["😛", "cara sacando la lengua"],
  ["😜", "cara guiñando y sacando la lengua"],
  ["🤪", "cara loca"],
  ["😝", "cara sacando la lengua con ojos cerrados"],
  ["🤑", "cara con ojos de dinero"],
  ["🤗", "cara abrazando"],
  ["🤭", "cara con mano sobre la boca"],
  ["🤫", "cara haciendo silencio"],
  ["🤔", "cara pensativa"],
  ["🤐", "cara con cremallera"],
  ["🤨", "cara con ceja alzada"],
  ["😐", "cara neutral"],
  ["😑", "cara sin expresión"],
  ["😶", "cara sin boca"],
  ["😏", "cara sonriendo con malicia"],
  ["😒", "cara sin gracia"],
  ["🙄", "cara poniendo los ojos en blanco"],
  ["😬", "cara haciendo mueca"],
  ["🤥", "cara mentirosa"],
  ["😔", "cara pensativa"],
  ["😕", "cara confundida"],
  ["🙁", "cara ligeramente fruncida"],
  ["☹️", "cara fruncida"],
  ["😣", "cara perseverante"],
  ["😖", "cara confundida"],
  ["😫", "cara cansada"],
  ["😩", "cara llorosa"],
  ["🥺", "cara suplicante"],
  ["😢", "cara llorando"],
  ["😭", "cara llorando a mares"],
  ["😤", "cara resoplando"],
  ["😠", "cara enojada"],
  ["😡", "cara muy enojada"],
  ["🤬", "cara con símbolos sobre la boca"],
  ["🤯", "cabeza explotando"],
  ["😳", "cara sonrojada"],
  ["🥵", "cara con calor"],
  ["🥶", "cara con frío"],
  ["😱", "cara gritando de miedo"],
  ["😨", "cara temerosa"],
  ["😰", "cara ansiosa con sudor"],
  ["😥", "cara triste pero aliviada"],
  ["😓", "cara con sudor frío"],
  ["🤗", "cara abrazando"],
  ["🤔", "cara pensativa"],
  ["😴", "cara durmiendo"],
  ["💤", "símbolo de sueño"],
  ["😪", "cara somnolienta"],
  ["😵", "cara mareada"],
  ["🤐", "cara con cremallera"],
  ["🥴", "cara mareada"],
  ["🤢", "cara con náuseas"],
  ["🤮", "cara vomitando"],
  ["🤧", "cara estornudando"],
  ["😷", "cara con mascarilla médica"],
  ["🤒", "cara con termómetro"],
  ["🤕", "cara con vendaje"],
  ["🤓", "geek"],

  // Hearts and love
  ["❤️", "corazón rojo"],
  ["🧡", "corazón naranja"],
  ["💛", "corazón amarillo"],
  ["💚", "corazón verde"],
  ["💙", "corazón azul"],
  ["💜", "corazón morado"],
  ["🖤", "corazón negro"],
  ["🤍", "corazón blanco"],
  ["🤎", "corazón marrón"],
  ["💔", "corazón roto"],
  ["❣️", "exclamación de corazón"],
  ["💕", "dos corazones"],
  ["💞", "corazones giratorios"],
  ["💓", "corazón latiendo"],
  ["💗", "corazón creciendo"],
  ["💖", "corazón brillante"],
  ["💘", "corazón con flecha"],
  ["💝", "corazón con lazo"],
  ["💟", "decoración de corazón"],

  // Hands and gestures
  ["👀", "ojos"],
  ["👍", "pulgar arriba"],
  ["👎", "pulgar abajo"],
  ["👌", "señal de ok"],
  ["✌️", "señal de victoria"],
  ["🤞", "dedos cruzados"],
  ["🤟", "gesto de te amo"],
  ["🤘", "cuernos"],
  ["🤙", "llamar"],
  ["👈", "dedo apuntando a la izquierda"],
  ["👉", "dedo apuntando a la derecha"],
  ["👆", "dedo apuntando arriba"],
  ["👇", "dedo apuntando abajo"],
  ["☝️", "dedo índice arriba"],
  ["✋", "mano alzada"],
  ["🤚", "dorso de la mano alzada"],
  ["🖐️", "mano con dedos separados"],
  ["🖖", "saludo vulcano"],
  ["👋", "mano saludando"],
  ["🤝", "apretón de manos"],
  ["🙏", "manos en oración"],
  ["✍️", "mano escribiendo"],
  ["👏", "manos aplaudiendo"],
  ["🙌", "manos celebrando"],
  ["👐", "manos abiertas"],
  ["🤲", "palmas hacia arriba"],
  ["🤜", "puño hacia la derecha"],
  ["🤛", "puño hacia la izquierda"],
  ["✊", "puño alzado"],
  ["👊", "puño"],
  ["🫶", "manos formando corazón"],

  // Common objects and symbols
  ["🔥", "fuego"],
  ["💯", "cien puntos"],
  ["🎉", "fiesta"],
  ["🎊", "confeti"],
  ["🪅", "piñata"],
  ["🥂", "brindis"],
  ["🍾", "champán"],
  ["💫", "estrella mareada"],
  ["⭐", "estrella"],
  ["🌟", "estrella brillante"],
  ["✨", "destellos"],
  ["⚡", "rayo"],
  ["💥", "explosión"],
  ["💢", "símbolo de enojo"],
  ["💨", "corriendo"],
  ["💦", "gotas de sudor"],
  ["💧", "gota"],
  ["🌈", "arcoíris"],
  ["☀️", "sol"],
  ["⛅", "sol parcialmente nublado"],
  ["☁️", "nube"],
  ["🌧️", "nube con lluvia"],
  ["⛈️", "nube con rayo"],
  ["🌩️", "nube con rayo"],
  ["❄️", "copo de nieve"],
  ["☃️", "muñeco de nieve"],
  ["⛄", "muñeco de nieve"],
  ["🌪️", "tornado"],
  ["🌊", "ola"],

  // Food and drinks
  ["🍎", "manzana"],
  ["🍌", "plátano"],
  ["🍓", "fresa"],
  ["🍇", "uvas"],
  ["🍉", "sandía"],
  ["🍊", "naranja"],
  ["🥑", "aguacate"],
  ["🍅", "tomate"],
  ["🥕", "zanahoria"],
  ["🌽", "maíz"],
  ["🥖", "baguette"],
  ["🍞", "pan"],
  ["🧀", "queso"],
  ["🥓", "tocino"],
  ["🍖", "carne"],
  ["🍗", "muslo de pollo"],
  ["🍕", "pizza"],
  ["🍔", "hamburguesa"],
  ["🌭", "hot dog"],
  ["🥪", "sándwich"],
  ["🌮", "taco"],
  ["🌯", "burrito"],
  ["🍜", "sopa"],
  ["🍝", "espaguetis"],
  ["🍚", "arroz"],
  ["🍛", "curry"],
  ["🍤", "camarón frito"],
  ["🍣", "sushi"],
  ["🍦", "helado"],
  ["🍰", "pastel"],
  ["🎂", "pastel de cumpleaños"],
  ["🍪", "galleta"],
  ["🍫", "chocolate"],
  ["🍬", "dulce"],
  ["🍭", "paleta"],
  ["☕", "café"],
  ["🍵", "té"],
  ["🥤", "bebida"],
  ["🍺", "cerveza"],
  ["🍷", "vino"],
  ["🥂", "brindis"],
  ["🍾", "champán"],

  // Animals
  ["🐶", "cara de perro"],
  ["🐱", "cara de gato"],
  ["🐭", "cara de ratón"],
  ["🐹", "cara de hámster"],
  ["🐰", "cara de conejo"],
  ["🦊", "cara de zorro"],
  ["🐻", "cara de oso"],
  ["🐼", "cara de panda"],
  ["🐨", "koala"],
  ["🐯", "cara de tigre"],
  ["🦁", "cara de león"],
  ["🐮", "cara de vaca"],
  ["🐷", "cara de cerdo"],
  ["🐸", "cara de rana"],
  ["🐵", "cara de mono"],
  ["🙈", "mono que no ve"],
  ["🙉", "mono que no oye"],
  ["🙊", "mono que no habla"],
  ["🐒", "mono"],
  ["🐔", "pollo"],
  ["🐧", "pingüino"],
  ["🐦", "pájaro"],
  ["🐤", "pollito"],
  ["🐣", "pollito saliendo del huevo"],
  ["🐥", "pollito de frente"],
  ["🦆", "pato"],
  ["🦅", "águila"],
  ["🦉", "búho"],
  ["🦇", "murciélago"],
  ["🐺", "lobo"],
  ["🐗", "jabalí"],
  ["🐴", "cara de caballo"],
  ["🦄", "unicornio"],
  ["🐝", "abeja"],
  ["🐛", "gusano"],
  ["🦋", "mariposa"],
  ["🐌", "caracol"],
  ["🐞", "mariquita"],
  ["🐜", "hormiga"],
  ["🦗", "grillo"],
  ["🕷️", "araña"],
  ["🦂", "escorpión"],
  ["🐢", "tortuga"],
  ["🐍", "serpiente"],
  ["🦎", "lagarto"],
  ["🐙", "pulpo"],
  ["🦑", "calamar"],
  ["🦐", "camarón"],
  ["🦀", "cangrejo"],
  ["🐡", "pez globo"],
  ["🐠", "pez tropical"],
  ["🐟", "pez"],
  ["🐬", "delfín"],
  ["🐳", "ballena"],
  ["🐋", "ballena"],
  ["🦈", "tiburón"],

  // Activities and sports
  ["⚽", "balón de fútbol"],
  ["🏀", "balón de baloncesto"],
  ["🏈", "balón de fútbol americano"],
  ["⚾", "béisbol"],
  ["🥎", "softball"],
  ["🎾", "tenis"],
  ["🏐", "voleibol"],
  ["🏉", "rugby"],
  ["🥏", "frisbee"],
  ["🎱", "bola ocho"],
  ["🪀", "yoyo"],
  ["🏓", "ping pong"],
  ["🏸", "bádminton"],
  ["🥅", "portería"],
  ["⛳", "golf"],
  ["🪁", "cometa"],
  ["🏹", "arco y flecha"],
  ["🎣", "pesca"],
  ["🤿", "buceo"],
  ["🥊", "boxeo"],
  ["🥋", "artes marciales"],
  ["🎽", "camiseta de correr"],
  ["🛹", "patineta"],
  ["🛷", "trineo"],
  ["⛸️", "patín de hielo"],
  ["🥌", "curling"],
  ["🎿", "esquí"],
  ["⛷️", "esquiador"],
  ["🏂", "snowboard"],
  ["🪂", "paracaídas"],
  ["🏋️", "levantamiento de pesas"],
  ["🤸", "voltereta"],
  ["🤼", "lucha"],
  ["🤽", "waterpolo"],
  ["🤾", "balonmano"],
  ["🤹", "malabarismo"],
  ["🧘", "meditación"],
  ["🛀", "baño"],
  ["🛌", "durmiendo"],

  // Travel and places
  ["🚗", "coche"],
  ["🚕", "taxi"],
  ["🚙", "SUV"],
  ["🚌", "autobús"],
  ["🚎", "trolebús"],
  ["🏎️", "coche de carreras"],
  ["🚓", "coche de policía"],
  ["🚑", "ambulancia"],
  ["🚒", "camión de bomberos"],
  ["🚐", "minibús"],
  ["🛻", "camioneta"],
  ["🚚", "camión"],
  ["🚛", "camión articulado"],
  ["🚜", "tractor"],
  ["🏍️", "motocicleta"],
  ["🛵", "scooter"],
  ["🚲", "bicicleta"],
  ["🛴", "patinete"],
  ["🚁", "helicóptero"],
  ["✈️", "avión"],
  ["🛩️", "avión pequeño"],
  ["🚀", "cohete"],
  ["🛸", "platillo volador"],
  ["🚢", "barco"],
  ["⛵", "velero"],
  ["🚤", "lancha"],
  ["⛴️", "ferry"],
  ["🛥️", "lancha motora"],
  ["🚂", "locomotora"],
  ["🚃", "vagón de tren"],
  ["🚄", "tren bala"],
  ["🚅", "tren bala con nariz"],
  ["🚆", "tren"],
  ["🚇", "metro"],
  ["🚈", "tren ligero"],
  ["🚉", "estación"],
  ["🚊", "tranvía"],
  ["🚝", "monorraíl"],
  ["🚞", "tren de montaña"],
  ["🚟", "tren suspendido"],
  ["🚠", "teleférico"],
  ["🚡", "tranvía aéreo"],
  ["🛰️", "satélite"],
  ["🚁", "helicóptero"],

  // Objects and tools
  ["📱", "teléfono móvil"],
  ["💻", "portátil"],
  ["🖥️", "ordenador de escritorio"],
  ["⌨️", "teclado"],
  ["🖱️", "ratón de ordenador"],
  ["🖲️", "trackball"],
  ["💽", "minidisc"],
  ["💾", "disquete"],
  ["💿", "CD"],
  ["📀", "DVD"],
  ["🧮", "ábaco"],
  ["🎥", "cámara de cine"],
  ["📹", "videocámara"],
  ["📷", "cámara"],
  ["📸", "cámara con flash"],
  ["📼", "videocasete"],
  ["🔍", "lupa"],
  ["🔎", "lupa hacia la derecha"],
  ["🕯️", "vela"],
  ["💡", "bombilla"],
  ["🔦", "linterna"],
  ["🏮", "farol rojo"],
  ["🪔", "lámpara de aceite"],
  ["📔", "cuaderno"],
  ["📕", "libro cerrado"],
  ["📖", "libro abierto"],
  ["📗", "libro verde"],
  ["📘", "libro azul"],
  ["📙", "libro naranja"],
  ["📚", "libros"],
  ["📓", "cuaderno"],
  ["📒", "libro de contabilidad"],
  ["📃", "página curvada"],
  ["📜", "pergamino"],
  ["📄", "página"],
  ["📰", "periódico"],
  ["🗞️", "periódico enrollado"],
  ["📑", "marcadores"],
  ["🔖", "marcapáginas"],
  ["🏷️", "etiqueta"],
  ["💰", "bolsa de dinero"],
  ["🪙", "moneda"],
  ["💴", "yen"],
  ["💵", "dólar"],
  ["💶", "euro"],
  ["💷", "libra"],
  ["💸", "dinero con alas"],
  ["💳", "tarjeta de crédito"],
  ["🧾", "recibo"],
  ["💎", "diamante"],
  ["⚖️", "balanza"],
  ["🪜", "escalera"],
  ["🧰", "caja de herramientas"],
  ["🔧", "llave inglesa"],
  ["🔨", "martillo"],
  ["⚒️", "martillo y pico"],
  ["🛠️", "martillo y llave"],
  ["⛏️", "pico"],
  ["🪓", "hacha"],
  ["🪚", "sierra"],
  ["🔩", "tuerca y tornillo"],
  ["⚙️", "engranaje"],
  ["🪤", "trampa para ratones"],
  ["🧲", "imán"],
  ["🪣", "cubo"],
  ["🧽", "esponja"],
  ["🧴", "botella de loción"],
  ["🧷", "imperdible"],
  ["🧹", "escoba"],
  ["🧺", "cesta"],
  ["🪑", "silla"],
  ["🚪", "puerta"],
  ["🪟", "ventana"],
  ["🛏️", "cama"],
  ["🛋️", "sofá"],
  ["🪑", "silla"],
  ["🚿", "ducha"],
  ["🛁", "bañera"],
  ["🚽", "inodoro"],
  ["🪠", "desatascador"],
  ["🧻", "papel higiénico"],
  ["🪥", "cepillo de dientes"],
  ["🧼", "jabón"],
  ["🪒", "maquinilla de afeitar"],
  ["🧴", "botella de loción"],
  ["🧽", "esponja"],
  ["🧯", "extintor"],
  ["🛒", "carrito de compras"],

  // Symbols and signs
  ["❗", "exclamación"],
  ["❓", "interrogación"],
  ["❔", "interrogación blanca"],
  ["❕", "exclamación blanca"],
  ["❌", "cruz"],
  ["⭕", "círculo rojo"],
  ["🚫", "prohibido"],
  ["💯", "cien puntos"],
  ["💢", "símbolo de enojo"],
  ["💥", "explosión"],
  ["💫", "estrella mareada"],
  ["💦", "gotas de sudor"],
  ["💨", "corriendo"],
  ["🕳️", "agujero"],
  ["💣", "bomba"],
  ["💬", "globo de diálogo"],
  ["👁️‍🗨️", "ojo en globo de diálogo"],
  ["🗨️", "globo de diálogo izquierdo"],
  ["🗯️", "globo de diálogo de enfado"],
  ["💭", "globo de pensamiento"],
  ["💤", "símbolo de sueño"],

  // Flags (some common ones)
  ["🏳️", "bandera blanca"],
  ["🏴", "bandera negra"],
  ["🏁", "bandera a cuadros"],
  ["🚩", "bandera triangular"],
  ["🏳️‍🌈", "bandera del arcoíris"],
  ["🏳️‍⚧️", "bandera transgénero"],

  // Time and calendar
  ["⏰", "despertador"],
  ["⏱️", "cronómetro"],
  ["⏲️", "temporizador"],
  ["🕐", "una en punto"],
  ["🕑", "dos en punto"],
  ["🕒", "tres en punto"],
  ["🕓", "cuatro en punto"],
  ["🕔", "cinco en punto"],
  ["🕕", "seis en punto"],
  ["🕖", "siete en punto"],
  ["🕗", "ocho en punto"],
  ["🕘", "nueve en punto"],
  ["🕙", "diez en punto"],
  ["🕚", "once en punto"],
  ["🕛", "doce en punto"],
  ["📅", "calendario"],
  ["📆", "calendario de mesa"],
  ["🗓️", "calendario espiral"],
  ["📇", "fichero"],
  ["🗃️", "archivador"],
  ["🗄️", "archivador"],
  ["🗂️", "separadores"],

  // Music and entertainment
  ["🎵", "nota musical"],
  ["🎶", "notas musicales"],
  ["🎼", "partitura"],
  ["🎹", "piano"],
  ["🥁", "tambor"],
  ["🎷", "saxofón"],
  ["🎺", "trompeta"],
  ["🎸", "guitarra"],
  ["🪕", "banjo"],
  ["🎻", "violín"],
  ["🎤", "micrófono"],
  ["🎧", "auriculares"],
  ["📻", "radio"],
  ["📺", "televisión"],
  ["🎬", "claqueta"],
  ["🎭", "máscaras de teatro"],
  ["🎪", "circo"],
  ["🎨", "paleta de pintor"],
  ["🎯", "diana"],
  ["🎲", "dado"],
  ["🎮", "videojuego"],
  ["🕹️", "joystick"],
  ["🎰", "máquina tragaperras"],
  ["🎳", "bolos"],

  // Magic and fantasy
  ["🪄", "varita mágica"],
  ["🔮", "bola de cristal"],
  ["🧿", "ojo turco"],
  ["🪬", "mano de Fátima"],
  ["🎃", "calabaza de Halloween"],
  ["👻", "fantasma"],
  ["💀", "calavera"],
  ["☠️", "calavera y huesos"],
  ["👽", "alienígena"],
  ["👾", "monstruo de videojuego"],
  ["🤖", "robot"],
  ["🎅", "Papá Noel"],
  ["🤶", "Mamá Noel"],
  ["🧙", "mago"],
  ["🧚", "hada"],
  ["🧛", "vampiro"],
  ["🧜", "sirena"],
  ["🧝", "elfo"],
  ["🧞", "genio"],
  ["🧟", "zombi"],
  ["🦸", "superhéroe"],
  ["🦹", "supervillano"],
  ["🤺", "esgrima"],
  ["🏇", "carrera de caballos"],
  ["⛷️", "esquí"],
  ["🏂", "snowboard"],
  ["🏌️", "golf"],
  ["🏄", "surf"],
  ["🚣", "remo"],
  ["🏊", "natación"],
  ["⛹️", "baloncesto"],
  ["🏋️", "levantamiento de pesas"],
  ["🚴", "ciclismo"],
  ["🚵", "ciclismo de montaña"],
  ["🤸", "voltereta"],
  ["🤼", "lucha"],
  ["🤽", "waterpolo"],
  ["🤾", "balonmano"],
  ["🤹", "malabarismo"],
  ["🧘", "meditación"],
  ["🛀", "baño"],
  ["🛌", "durmiendo"],
]);

// Convert number to Spanish words
const convertNumberToSpanish = (num: number): string => {
  if (num === 0) return "cero";
  if (num < 0) return `menos ${convertNumberToSpanish(-num)}`;

  if (CARDINAL_NUMBERS.has(num)) {
    return CARDINAL_NUMBERS.get(num)!;
  }

  if (num < 100) {
    const tens = Math.floor(num / 10) * 10;
    const units = num % 10;
    if (units === 0) return CARDINAL_NUMBERS.get(tens)!;
    return `${CARDINAL_NUMBERS.get(tens)} y ${CARDINAL_NUMBERS.get(units)}`;
  }

  if (num < 1000) {
    const hundreds = Math.floor(num / 100) * 100;
    const remainder = num % 100;
    if (remainder === 0) return CARDINAL_NUMBERS.get(hundreds)!;
    return `${CARDINAL_NUMBERS.get(hundreds)} ${convertNumberToSpanish(
      remainder
    )}`;
  }

  if (num < 1000000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    const thousandsText =
      thousands === 1 ? "mil" : `${convertNumberToSpanish(thousands)} mil`;
    if (remainder === 0) return thousandsText;
    return `${thousandsText} ${convertNumberToSpanish(remainder)}`;
  }

  // For larger numbers, return as is for now
  return num.toString();
};

// Remove code blocks but preserve inline code
const cleanCodeContent = (
  text: string
): Effect.Effect<string, TextCleaningError> =>
  Effect.try({
    try: () => {
      // Remove triple backtick code blocks
      let cleaned = text.replace(/```[\s\S]*?```/g, "");

      // Remove indented code blocks (4+ spaces)
      cleaned = cleaned.replace(/^[ \t]{4,}.*$/gm, "");

      // Preserve inline code content (remove backticks but keep content)
      cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

      return cleaned;
    },
    catch: (error) =>
      new TextCleaningError(
        `Code cleaning failed: ${error}`,
        "CODE_CLEANING_FAILED",
        "PRE_PROCESSING"
      ),
  });

// Clean markdown formatting
const cleanMarkdown = (
  text: string
): Effect.Effect<string, TextCleaningError> =>
  Effect.try({
    try: () => {
      let cleaned = text;

      // Remove headers but keep text
      cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
      cleaned = cleaned.replace(/#{1,6}\s+/g, ""); // Headers in middle of text

      // Remove bold/italic formatting but keep text
      cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1"); // **bold**
      cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1"); // *italic*
      cleaned = cleaned.replace(/__([^_]+)__/g, "$1"); // __bold__
      cleaned = cleaned.replace(/_([^_]+)_/g, "$1"); // _italic_

      // Remove strikethrough but keep text
      cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");

      // Remove links but keep text
      cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

      // Remove images completely
      cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");

      // Remove HTML tags but keep content
      cleaned = cleaned.replace(/<[^>]*>/g, "");

      // Remove blockquotes
      cleaned = cleaned.replace(/^>\s*/gm, "");

      // Remove list markers
      cleaned = cleaned.replace(/^[-*+]\s+/gm, "");
      cleaned = cleaned.replace(/^\d+\.\s+/gm, "");

      // Remove horizontal rules
      cleaned = cleaned.replace(/^[-*_]{3,}$/gm, "");

      // Remove remaining underscores that might be formatting artifacts
      cleaned = cleaned.replace(/_{2,}/g, " "); // Multiple underscores
      cleaned = cleaned.replace(/\b_+\b/g, " "); // Standalone underscores
      cleaned = cleaned.replace(/(\w)_+(\w)/g, "$1 $2"); // Underscores between words

      // Remove table formatting
      cleaned = cleaned.replace(/\|/g, " "); // Table separators

      // Remove footnote references
      cleaned = cleaned.replace(/\[\^[^\]]+\]/g, "");

      // Remove reference-style links
      cleaned = cleaned.replace(/^\[[^\]]+\]:\s*.+$/gm, "");

      return cleaned;
    },
    catch: (error) =>
      new TextCleaningError(
        `Markdown cleaning failed: ${error}`,
        "MARKDOWN_CLEANING_FAILED",
        "PRE_PROCESSING"
      ),
  });

// Convert Spanish numbers
const convertNumbers = (
  text: string
): Effect.Effect<string, TextCleaningError> =>
  Effect.try({
    try: () => {
      let result = text;

      // Convert integers with commas (1,234)
      result = result.replace(/\b\d{1,3}(?:,\d{3})+\b/g, (match) => {
        const num = parseInt(match.replace(/,/g, ""));
        return convertNumberToSpanish(num);
      });

      // Convert simple integers
      result = result.replace(/\b\d+\b/g, (match) => {
        const num = parseInt(match);
        if (num >= 0 && num <= 999999) {
          return convertNumberToSpanish(num);
        }
        return match;
      });

      // Convert ordinals (1º, 2ª)
      result = result.replace(/\b(\d+)[ºª]\b/g, (match, numStr) => {
        const num = parseInt(numStr);
        return ORDINAL_NUMBERS.get(num) || `${convertNumberToSpanish(num)}º`;
      });

      // Convert percentages
      result = result.replace(/\b(\d+(?:\.\d+)?)%\b/g, (match, numStr) => {
        const num = parseFloat(numStr);
        return `${convertNumberToSpanish(Math.floor(num))} por ciento`;
      });

      return result;
    },
    catch: (error) =>
      new TextCleaningError(
        `Number conversion failed: ${error}`,
        "NUMBER_CONVERSION_FAILED",
        "NORMALIZATION"
      ),
  });

// Expand abbreviations
const expandAbbreviations = (
  text: string
): Effect.Effect<string, TextCleaningError> =>
  Effect.try({
    try: () => {
      let result = text;

      for (const [abbrev, expansion] of ABBREVIATIONS) {
        const regex = new RegExp(`\\b${abbrev.replace(/\./g, "\\.")}`, "g");
        result = result.replace(regex, expansion);
      }

      return result;
    },
    catch: (error) =>
      new TextCleaningError(
        `Abbreviation expansion failed: ${error}`,
        "ABBREVIATION_EXPANSION_FAILED",
        "NORMALIZATION"
      ),
  });

// Convert dates (15/03/2024 → "quince de marzo de dos mil veinticuatro")
const convertDates = (text: string): Effect.Effect<string, TextCleaningError> =>
  Effect.try({
    try: () => {
      return text.replace(
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
        (match, day, month, year) => {
          const dayNum = parseInt(day);
          const monthNum = parseInt(month) - 1; // Convert to 0-indexed
          const yearNum = parseInt(year);

          if (monthNum >= 0 && monthNum < 12) {
            const dayText = convertNumberToSpanish(dayNum);
            const monthText = MONTHS[monthNum];
            const yearText = convertNumberToSpanish(yearNum);

            return `${dayText} de ${monthText} de ${yearText}`;
          }

          return match;
        }
      );
    },
    catch: (error) =>
      new TextCleaningError(
        `Date conversion failed: ${error}`,
        "DATE_CONVERSION_FAILED",
        "NORMALIZATION"
      ),
  });

// Remove URLs and emails
const removeDigitalContent = (
  text: string
): Effect.Effect<string, TextCleaningError> =>
  Effect.try({
    try: () => {
      let cleaned = text;

      // Remove URLs
      cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, "");
      cleaned = cleaned.replace(/www\.[^\s]+/g, "");

      // Remove email addresses
      cleaned = cleaned.replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        ""
      );

      // Remove social media handles
      cleaned = cleaned.replace(/@\w+/g, "");
      cleaned = cleaned.replace(/#\w+/g, "");

      return cleaned;
    },
    catch: (error) =>
      new TextCleaningError(
        `Digital content removal failed: ${error}`,
        "DIGITAL_CONTENT_REMOVAL_FAILED",
        "PRE_PROCESSING"
      ),
  });

// Convert emojis to Spanish descriptions
const convertEmojis = (
  text: string
): Effect.Effect<string, TextCleaningError> =>
  Effect.try({
    try: () => {
      let result = text;

      // Convert known emojis to their Spanish descriptions
      for (const [emoji, description] of EMOJI_DESCRIPTIONS) {
        const regex = new RegExp(
          emoji.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "g"
        );
        result = result.replace(regex, ` emoji de ${description} `);
      }

      // Handle any remaining emojis with a generic approach
      // This regex matches most emoji characters
      const emojiRegex =
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

      result = result.replace(emojiRegex, " emoji ");

      // Clean up multiple spaces that might have been created
      result = result.replace(/\s+/g, " ");

      return result.trim();
    },
    catch: (error) =>
      new TextCleaningError(
        `Emoji conversion failed: ${error}`,
        "EMOJI_CONVERSION_FAILED",
        "NORMALIZATION"
      ),
  });

// Normalize punctuation according to RAE rules
const normalizePunctuation = (
  text: string
): Effect.Effect<string, TextCleaningError> =>
  Effect.try({
    try: () => {
      let normalized = text;

      // Spanish quotation marks
      normalized = normalized.replace(/"([^"]+)"/g, "«$1»");

      // Proper spacing around punctuation
      normalized = normalized.replace(/\s*([.,;:!?])\s*/g, "$1 ");

      // Ellipsis normalization
      normalized = normalized.replace(/\.{3,}/g, "…");

      // Em-dash handling
      normalized = normalized.replace(/--/g, "—");
      normalized = normalized.replace(/\s*—\s*/g, " — ");

      // Clean up multiple spaces
      normalized = normalized.replace(/\s+/g, " ");

      return normalized.trim();
    },
    catch: (error) =>
      new TextCleaningError(
        `Punctuation normalization failed: ${error}`,
        "PUNCTUATION_NORMALIZATION_FAILED",
        "POST_PROCESSING"
      ),
  });

// Main text cleaning function
export const cleanTextForTTS = (
  text: string
): Effect.Effect<string, TextCleaningError> =>
  Effect.gen(function* () {
    // Pipeline: each stage processes the text sequentially
    const afterCodeCleaning = yield* cleanCodeContent(text);
    const afterMarkdownCleaning = yield* cleanMarkdown(afterCodeCleaning);
    const afterDigitalRemoval = yield* removeDigitalContent(
      afterMarkdownCleaning
    );
    const afterEmojis = yield* convertEmojis(afterDigitalRemoval);
    const afterAbbreviations = yield* expandAbbreviations(afterEmojis);
    const afterDates = yield* convertDates(afterAbbreviations);
    const afterNumbers = yield* convertNumbers(afterDates);
    const final = yield* normalizePunctuation(afterNumbers);

    return final;
  });

// Utility function for standalone number conversion
export const convertSpanishNumber = (num: number): string =>
  convertNumberToSpanish(num);

// Utility function for standalone abbreviation expansion
export const expandSpanishAbbreviation = (abbrev: string): string =>
  ABBREVIATIONS.get(abbrev) || abbrev;

// Utility function for standalone emoji conversion
export const convertEmojiToSpanish = (emoji: string): string => {
  const description = EMOJI_DESCRIPTIONS.get(emoji);
  return description ? `emoji de ${description}` : "emoji";
};
