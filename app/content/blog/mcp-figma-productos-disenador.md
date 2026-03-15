# De entregar archivos a entregar productos: lo que MCP cambia para un diseñador

Diseñar siempre terminó en "entregar" — un archivo, un link, un PDF. Alguien más lo construye. Alguien más decide qué se respeta y qué se ajusta.

**¿Y si tu diseño se construyera solo?**

Ya está pasando. La pieza que lo hace posible se llama **Figma MCP**.

---

## El Problema

### El archivo es un callejón sin salida

Conoces la historia porque la has vivido:

1. Pasas semanas diseñando en Figma — componentes nombrados, variables consistentes, tokens documentados.
2. Lo compartes. Un developer lo abre entre juntas y bugs de producción.
3. Empiezan las rondas: *"El border-radius es 12, no 8."* *"Ese componente ya existía."*
4. Para la ronda catorce nadie recuerda la intención original.

**El problema no es el developer. Tampoco eres tú. Es el formato de entrega.**

Un archivo de Figma tiene capas, colores, medidas — pero no tiene *intención ejecutable*. No dice "este token cambia en dark mode" ni "este layout es responsive con estas reglas". Todo eso vive en tu cabeza y muere en la traducción.

Algunos datos:

- **60%** del tiempo de implementación se va en interpretar diseños, no en escribir código
- El diseñador promedio pasa **3-4 horas semanales** solo en rondas de revisión
- Los design systems internos tienen **menos de 30%** de adopción real

No es problema de talento. Es problema de conexión.

---

🎬 En el canal de [YouTube](https://youtube.com/@BlissmoHQ) estamos documentando cada paso de estos flujos — desde configurar el MCP hasta ver el resultado en vivo.

---

## La Solución

### Conecta Figma a un agente y el diseño se ejecuta

En el [post anterior](/blog/mcp-disenadores-ia) explicamos que MCP es como un USB universal para agentes de IA. **Figma MCP** es el conector que le da a un agente acceso directo a tus archivos de diseño.

No acceso como el de un developer abriendo tu link. **Acceso estructurado:**

- 🧩 **Lee tu árbol de componentes** — qué existe, cómo se llama, cómo está anidado
- 🎨 **Extrae variables y tokens** — colores, tipografías, espaciados, directamente de Figma
- 📐 **Entiende la estructura** — frames, auto-layouts, constraints. Ve intención, no solo píxeles
- 📝 **Accede a metadata** — descripciones, notas, nombres de capas

Cuando le pides "implementa este diseño", **no está adivinando a partir de una imagen**. Está leyendo tu archivo de Figma con toda la información que pusiste ahí.

### El pipeline: diseño → código → publicación

Figma MCP es el primer eslabón. Lo poderoso es la cadena completa:

**Paso 1 → Figma MCP: el agente lee tu diseño.**
Conectas tu archivo. El agente extrae componentes, tokens, estructura.

**Paso 2 → El agente genera código.**
Produce componentes funcionales que usan *tus* tokens y respetan *tu* naming. `/ftc` ([github.com/blissito/figma-to-code](https://github.com/blissito/figma-to-code)) hace exactamente esto: toma tu diseño vía MCP y genera componentes pixel-perfect en HTML + Tailwind.

**Paso 3 → EasyBits MCP: el agente publica.**
[EasyBits.cloud](https://easybits.cloud) tiene su propio servidor MCP. El agente toma lo generado y crea una landing page, presentación o documentación lista para compartir. Sin deploy manual, sin hosting que configurar.

### ¿Qué tan real es esto hoy?

Muy real, con matices. Funciona mejor cuando:

- ✅ Tu Figma está bien estructurado (componentes nombrados, variables definidas, auto-layouts)
- ✅ Tus peticiones son específicas — *"implementa el hero del frame 'Landing v3'"*, no *"hazme una página"*
- ✅ Revisas y ajustas — el agente no es perfecto, pero el ciclo pasa de semanas a minutos

---

## El Resultado

### Un diseñador, cero dependencias

Cuando el pipeline funciona, tu día cambia:

- **Auditar accesibilidad** sin esperar a QA — contraste, headings, alt texts en segundos
- **Generar variantes** — *"versión dark mode con los tokens de Figma"* y listo
- **Documentar componentes** automáticamente — ejemplos, props, estados, guías de uso
- **Publicar sin intermediarios** — landing, pitch, prototipo funcional → link → compartir
- **Iterar al instante** — *"cambia el hero por la versión B"* → re-lee, re-genera, re-publica

> La autonomía no es no necesitar a nadie. Es poder avanzar sin que tu progreso dependa de la disponibilidad de otros.

Esto no elimina la colaboración con developers. **La eleva.** La conversación pasa de *"¿respetaste el padding?"* a *"¿cómo optimizamos el rendimiento?"*

Y hay un efecto inesperado: **los diseñadores que usan estos pipelines diseñan mejor**. Porque ven su diseño funcionando en minutos, no en semanas. Iteran sobre el producto real, no sobre un mockup.

---

## Conclusión

### El nuevo oficio no tiene nombre todavía

No es diseñador UX. No es product designer. No es diseñador-developer. Es algo nuevo — alguien que diseña sistemas visuales y orquesta agentes para materializarlos.

Los que lleguen primero van a definir la categoría. No porque sean los más técnicos, sino porque fueron los más curiosos en el momento justo.

Si quieres explorar, conecta [EasyBits.cloud](https://easybits.cloud) como MCP a tu agente de IA. Es una conexión y tienes capacidad de publicación directa. Combínalo con Figma MCP y tienes el pipeline completo.

En el siguiente post: diseñadores que ya trabajan así y qué están logrando.

Abrazo. bliss.
