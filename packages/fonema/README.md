# fonema 👄

Ultra-minimal Spanish text cleaning library for TTS. 100% Effect-TS, ESM-only, zero dependencies. Made by @blissito

## Installation

```bash
npm install fonema effect
```

## API

### `cleanTextForTTS(text: string)`

Main function that applies all Spanish text cleaning transformations in a single pipeline.

**Returns:** `Effect<string, TextCleaningError>`

### Utility Functions

- `convertSpanishNumber(num: number): string` - Convert numbers to Spanish words
- `expandSpanishAbbreviation(abbrev: string): string` - Expand Spanish abbreviations
- `convertEmojiToSpanish(emoji: string): string` - Convert emoji to Spanish description

## Features

- **Numbers**: `1,234` → `"mil doscientos treinta y cuatro"`
- **Ordinals**: `1º` → `"primero"`, `2ª` → `"segunda"`
- **Dates**: `15/03/2024` → `"quince de marzo de dos mil veinticuatro"`
- **Abbreviations**: `Dr.` → `"Doctor"`, `etc.` → `"etcétera"`
- **Percentages**: `25%` → `"veinticinco por ciento"`
- **Emojis**: `😀` → `"emoji de cara sonriente"`, `🚀` → `"emoji de cohete"`
- **Markdown**: `**bold**` → `"bold"`, `*italic*` → `"italic"`, removes headers, lists, links
- **Code blocks**: Removes ```blocks, preserves inline`code`
- **URLs/emails**: Complete removal
- **Punctuation**: RAE-compliant normalization

## Inicio Rápido

```typescript
import { cleanTextForTTS } from "fonema";
import { Effect } from "effect";

// Ejemplo que demuestra todas las capacidades de limpieza
const text = `
El Dr. García, experto en IA y PLN, ha estado utilizando fonema v1.2.3 en su investigación durante 5 años.
Nació el 15/03/1980 y atiende en C/ Mayor, 123, 2ºB.
Contacto: dr.garcia@clinica.com | https://drgarcia.es

Su último estudio muestra una mejora del 75% en la naturalidad del TTS usando la normalización de texto de fonema:

\`\`\`typescript
// Antes: "El Dr. García atiende en C/ Mayor, 123"
// Después de fonema: "El Doctor García atiende en Calle Mayor, ciento veintitrés"
const texto = "El Dr. García atiende en C/ Mayor, 123";
const textoLimpio = await Effect.runPromise(cleanTextForTTS(texto));
\`\`\`

¡Agenda tu cita al 555-123-4567!`;

const programa = cleanTextForTTS(text);

Effect.runSync(programa);
/* → 
"El Doctor García, experto en I A y P L N, ha estado utilizando fonema v uno punto dos punto tres en su investigación durante cinco años.
Nació el quince de marzo de mil novecientos ochenta y atiende en Calle Mayor, ciento veintitrés, segundo B.
Contacto: 

Su último estudio muestra una mejora del setenta y cinco por ciento en la naturalidad del T T S usando la normalización de texto de fonema:

¡Agenda tu cita al cinco cinco cinco, uno veintitrés, cuarenta y cinco, sesenta y siete!"
*/
```

### ¿Qué hizo fonema?

1. **Abreviaturas**: `Dr.` → `Doctor`
2. **Fechas**: `15/03/1980` → `quince de marzo de mil novecientos ochenta`
3. **Direcciones**: `C/ Mayor` → `Calle Mayor`
4. **Números**:
   - `123` → `ciento veintitrés`
   - `1.2.3` → `uno punto dos punto tres`
   - `5` → `cinco`
5. **Porcentajes**: `75%` → `setenta y cinco por ciento`
6. **Emojis**: `🚀` → `emoji de cohete`, `😀` → `emoji de cara sonriente`
7. **Eliminó**:
   - Email: `dr.garcia@clinica.com`
   - URL: `https://drgarcia.es`
   - Bloque de código completo
8. **Números de teléfono**: `555-123-4567` → `cinco cinco cinco, uno veintitrés, cuarenta y cinco, sesenta y siete`
9. **Formato de piso**: `2ºB` → `segundo B`
10. **Versiones**: `v1.2.3` → `v uno punto dos punto tres`
11. **Abreviaturas técnicas**: `IA` → `I A`, `PLN` → `P L N`, `TTS` → `T T S`

## Examples

### Standalone Usage

```typescript
import {
  cleanTextForTTS,
  convertSpanishNumber,
  convertEmojiToSpanish,
} from "fonema";
import { Effect } from "effect";

// Number conversion
convertSpanishNumber(1234); // → "mil doscientos treinta y cuatro"

// Emoji conversion
convertEmojiToSpanish("🚀"); // → "emoji de cohete"
convertEmojiToSpanish("😀"); // → "emoji de cara sonriente"
convertEmojiToSpanish("❤️"); // → "emoji de corazón rojo"

// Full text cleaning
const program = Effect.gen(function* () {
  const result = yield* cleanTextForTTS(
    "El 15/03/2024 el Dr. Smith presentó el 50% del proyecto. ¡Fue increíble! 🚀😀"
  );
  console.log(result);
  // → "El quince de marzo de dos mil veinticuatro el Doctor Smith presentó el cincuenta por ciento del proyecto. ¡Fue increíble! emoji de cohete emoji de cara sonriente"
});

Effect.runSync(program);
```

### Error Handling

```typescript
import { cleanTextForTTS } from "fonema";
import { Effect } from "effect";

const program = cleanTextForTTS("Some text").pipe(
  Effect.catchAll((error) => Effect.succeed(`Fallback: ${error.message}`))
);

Effect.runSync(program);
```

### TTS Integration Examples

#### Google Cloud Text-to-Speech

```typescript
import { cleanTextForTTS } from "fonema";
import { Effect } from "effect";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

const client = new TextToSpeechClient();

const synthesizeSpanishText = (text: string) =>
  Effect.gen(function* () {
    // Clean text with fonema
    const cleanedText = yield* cleanTextForTTS(text);

    // Google TTS request
    const [response] = yield* Effect.tryPromise(() =>
      client.synthesizeSpeech({
        input: { text: cleanedText },
        voice: {
          languageCode: "es-ES",
          name: "es-ES-Neural2-A",
        },
        audioConfig: { audioEncoding: "MP3" },
      })
    );

    return response.audioContent;
  });

// Usage
const program = synthesizeSpanishText(
  "El Dr. García tiene 25 años y nació el 15/03/1998."
);

Effect.runPromise(program).then((audioBuffer) => {
  // Handle audio buffer
});
```

#### ElevenLabs Integration

```typescript
import { cleanTextForTTS } from "fonema";
import { Effect } from "effect";

const elevenLabsTTS = (text: string, voiceId: string) =>
  Effect.gen(function* () {
    const cleanedText = yield* cleanTextForTTS(text);

    const response = yield* Effect.tryPromise(() =>
      fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text: cleanedText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      })
    );

    return yield* Effect.tryPromise(() => response.arrayBuffer());
  });
```

#### OpenAI TTS Integration

```typescript
import { cleanTextForTTS } from "fonema";
import { Effect } from "effect";
import OpenAI from "openai";

const openai = new OpenAI();

const openAITTS = (text: string) =>
  Effect.gen(function* () {
    const cleanedText = yield* cleanTextForTTS(text);

    const mp3 = yield* Effect.tryPromise(() =>
      openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: cleanedText,
      })
    );

    return yield* Effect.tryPromise(() => mp3.arrayBuffer());
  });
```

#### Generic TTS Service Integration

```typescript
import { cleanTextForTTS } from "fonema";
import { Effect } from "effect";

interface TTSService {
  synthesize(text: string, options: any): Promise<ArrayBuffer>;
}

const createTTSPipeline =
  (service: TTSService) => (text: string, options: any) =>
    Effect.gen(function* () {
      // Always clean Spanish text first
      const cleanedText = yield* cleanTextForTTS(text);

      // Then pass to any TTS service
      return yield* Effect.tryPromise(() =>
        service.synthesize(cleanedText, options)
      );
    });

// Usage with any TTS service
const myTTSPipeline = createTTSPipeline(myTTSService);
const program = myTTSPipeline("Text with números 123 and Dr. abbreviations", {
  voice: "spanish-voice",
  speed: 1.0,
});
```

## Limpieza de Markdown

fonema limpia automáticamente el formato markdown preservando el contenido:

```typescript
import { cleanTextForTTS } from "fonema";
import { Effect } from "effect";

const markdownText = `
# Título Principal
## Subtítulo

Este texto tiene **negritas** y *cursivas*.
También __negritas__ y _cursivas_ con guiones bajos.
Y texto ~~tachado~~ que se limpia.

- Lista con viñetas
- Segundo elemento

1. Lista numerada
2. Segundo elemento

> Cita en blockquote

[Enlace a sitio web](https://example.com)
![Imagen](imagen.jpg)

Código \`inline\` se preserva.
`;

const programa = cleanTextForTTS(markdownText);
Effect.runSync(programa);

/* Resultado:
"Título Principal Subtítulo Este texto tiene negritas y cursivas. También negritas y cursivas con guiones bajos. Y texto tachado que se limpia. Lista con viñetas Segundo elemento Lista numerada Segundo elemento Cita en blockquote Enlace a sitio web Código inline se preserva."
*/
```

### Elementos Markdown Soportados

- ✅ **Negritas**: `**texto**` y `__texto__` → `texto`
- ✅ **Cursivas**: `*texto*` y `_texto_` → `texto`
- ✅ **Tachado**: `~~texto~~` → `texto`
- ✅ **Títulos**: `# Título` → `Título`
- ✅ **Listas**: `- item` y `1. item` → `item`
- ✅ **Blockquotes**: `> cita` → `cita`
- ✅ **Enlaces**: `[texto](url)` → `texto`
- ✅ **Imágenes**: `![alt](url)` → (se eliminan)
- ✅ **Código inline**: `` `código` `` → `código`
- ✅ **Código en bloque**: ` ```código``` ` → (se elimina)
- ✅ **HTML tags**: `<tag>contenido</tag>` → `contenido`

## Manejo de Emojis

fonema convierte automáticamente emojis a descripciones en español natural para TTS:

```typescript
import { cleanTextForTTS, convertEmojiToSpanish } from "fonema";
import { Effect } from "effect";

// Conversión individual de emojis
convertEmojiToSpanish("🚀"); // → "emoji de cohete"
convertEmojiToSpanish("😀"); // → "emoji de cara sonriente"
convertEmojiToSpanish("❤️"); // → "emoji de corazón rojo"
convertEmojiToSpanish("🎉"); // → "emoji de fiesta"

// Texto con múltiples emojis
const textoConEmojis =
  "¡Hola! 😀 Me encanta programar 🚀 y usar React ❤️ para crear apps increíbles 🎉";

const programa = cleanTextForTTS(textoConEmojis);
Effect.runSync(programa);

/* Resultado:
"¡Hola! emoji de cara sonriente Me encanta programar emoji de cohete y usar React emoji de corazón rojo para crear apps increíbles emoji de fiesta"
*/
```

### Emojis Soportados

fonema incluye más de 400 emojis comunes con descripciones en español:

- **Caras y emociones**: 😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 ☺️ 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😔 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 😴 💤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕
- **Corazones**: ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟
- **Gestos y manos**: 👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤝 🙏 ✍️ 👏 🙌 👐 🤲 🤜 🤛 ✊ 👊 🫶
- **Objetos y símbolos**: 🔥 💯 💫 ⭐ 🌟 ✨ ⚡ 💥 💢 💨 💦 💧 🌈 ☀️ ⛅ ☁️ 🌧️ ⛈️ 🌩️ ❄️ ☃️ ⛄ 🌪️ 🌊
- **Comida y bebidas**: 🍎 🍌 🍓 🍇 🍉 🍊 🥑 🍅 🥕 🌽 🥖 🍞 🧀 🥓 🍖 🍗 🍕 🍔 🌭 🥪 🌮 🌯 🍜 🍝 🍚 🍛 🍤 🍣 🍦 🍰 🎂 🍪 🍫 🍬 🍭 ☕ 🍵 🥤 🍺 🍷 🥂 🍾
- **Animales**: 🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦗 🕷️ 🦂 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈
- **Actividades y deportes**: ⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤸 🤼 🤽 🤾 🤹 🧘 🛀 🛌
- **Viajes y lugares**: 🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🏍️ 🛵 🚲 🛴 🚁 ✈️ 🛩️ 🚀 🛸 🚢 ⛵ 🚤 ⛴️ 🛥️ 🚂 🚃 🚄 🚅 🚆 🚇 🚈 🚉 🚊 🚝 🚞 🚟 🚠 🚡 🛰️
- **Objetos y herramientas**: 📱 💻 🖥️ ⌨️ 🖱️ 🖲️ 💽 💾 💿 📀 🧮 🎥 📹 📷 📸 📼 🔍 🔎 🕯️ 💡 🔦 🏮 🪔 📔 📕 📖 📗 📘 📙 📚 📓 📒 📃 📜 📄 📰 🗞️ 📑 🔖 🏷️ 💰 🪙 💴 💵 💶 💷 💸 💳 🧾 💎 ⚖️ 🪜 🧰 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪓 🪚 🔩 ⚙️ 🪤 🧲 🪣 🧽 🧴 🧷 🧹 🧺 🪑 🚪 🪟 🛏️ 🛋️ 🚿 🛁 🚽 🪠 🧻 🪥 🧼 🪒 🧯 🛒
- **Música y entretenimiento**: 🎵 🎶 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻 🎤 🎧 📻 🎬 🎭 🎪 🎨 🎯 🎲 🎮 🕹️ 🎰 🎳
- **Magia y fantasía**: 🪄 🔮 🧿 🪬 🎃 👻 💀 ☠️ 👽 👾 🤖 🎅 🤶 🧙 🧚 🧛 🧜 🧝 🧞 🧟 🦸 🦹

Los emojis no reconocidos se convierten automáticamente en "emoji" genérico.

## License

MIT [Fixtergeek.com](https://www.fixtergeek.com)
