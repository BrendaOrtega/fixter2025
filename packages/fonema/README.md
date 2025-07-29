# fonema 👄

Ultra-minimal Spanish text cleaning library for TTS. 100% Effect-TS, ESM-only, zero dependencies. Made by @blissito

## Installation

```bash
npm install fonema effect
```

## Quick Start

```typescript
import { cleanTextForTTS } from "fonema";
import { Effect } from "effect";

// Ejemplo que demuestra todas las capacidades de limpieza
const text = `
El Dr. García, especialista en IA, tiene 25 años de experiencia.
Nació el 15/03/1980 y atiende en la C/ Mayor, 123, 2ºB.
Su correo es dr.garcia@clinica.com y su web https://drgarcia.es

Su última investigación mostró un 75% de efectividad:

\`\`\`
function saludar() { return "Hola, soy el Dr. García"; }
\`\`\`

¡Agenda tu cita al 555-123-4567!`;

const program = cleanTextForTTS(text);

Effect.runSync(program);
/* → 
"El Doctor García, especialista en I A, tiene veinticinco años de experiencia.
Nació el quince de marzo de mil novecientos ochenta y atiende en la Calle Mayor, 
ciento veintitrés, segundo B.

Su última investigación mostró un setenta y cinco por ciento de efectividad:

¡Agenda tu cita al cinco cinco cinco, uno veintitrés, cuarenta y cinco, sesenta y siete!"
*/
```

### ¿Qué hizo fonema?

1. **Abreviaturas**: `Dr.` → `Doctor`
2. **Fechas**: `15/03/1980` → `quince de marzo de mil novecientos ochenta`
3. **Direcciones**: `C/ Mayor` → `Calle Mayor`
4. **Números**: `123` → `ciento veintitrés`
5. **Porcentajes**: `75%` → `setenta y cinco por ciento`
6. **Eliminó**:
   - Email: `dr.garcia@clinica.com`
   - URL: `https://drgarcia.es`
   - Bloque de código completo
7. **Números de teléfono**: `555-123-4567` → `cinco cinco cinco, uno veintitrés, cuarenta y cinco, sesenta y siete`
8. **Formato de piso**: `2ºB` → `segundo B`

## API

### `cleanTextForTTS(text: string)`

Main function that applies all Spanish text cleaning transformations in a single pipeline.

**Returns:** `Effect<string, TextCleaningError>`

### Utility Functions

- `convertSpanishNumber(num: number): string` - Convert numbers to Spanish words
- `expandSpanishAbbreviation(abbrev: string): string` - Expand Spanish abbreviations

## Features

- **Numbers**: `1,234` → `"mil doscientos treinta y cuatro"`
- **Ordinals**: `1º` → `"primero"`, `2ª` → `"segunda"`
- **Dates**: `15/03/2024` → `"quince de marzo de dos mil veinticuatro"`
- **Abbreviations**: `Dr.` → `"Doctor"`, `etc.` → `"etcétera"`
- **Percentages**: `25%` → `"veinticinco por ciento"`
- **Code blocks**: Removes ```blocks, preserves inline`code`
- **URLs/emails**: Complete removal
- **Punctuation**: RAE-compliant normalization

## Examples

### Standalone Usage

```typescript
import { cleanTextForTTS, convertSpanishNumber } from "fonema";
import { Effect } from "effect";

// Number conversion
convertSpanishNumber(1234); // → "mil doscientos treinta y cuatro"

// Full text cleaning
const program = Effect.gen(function* () {
  const result = yield* cleanTextForTTS(
    "El 15/03/2024 el Dr. Smith presentó el 50% del proyecto."
  );
  console.log(result);
  // → "El quince de marzo de dos mil veinticuatro el Doctor Smith presentó el cincuenta por ciento del proyecto."
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

## License

MIT [Fixtergeek.com](https://www.fixtergeek.com)
