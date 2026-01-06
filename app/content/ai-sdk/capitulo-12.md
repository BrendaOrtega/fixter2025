# Capítulo 12: Audio y Speech — Voz e IA

Hasta ahora hemos trabajado con texto. Pero la voz es la interfaz más natural para los humanos. En este capítulo:

- Transcribir audio a texto (Speech-to-Text)
- Generar voz a partir de texto (Text-to-Speech)
- Combinar ambos para asistentes de voz

## Transcripción: Audio a Texto

```typescript
import { transcribe } from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFileSync } from 'fs';

const audioBuffer = readFileSync('./grabacion.mp3');

const { text, segments, language, duration } = await transcribe({
  model: openai.transcription('whisper-1'),
  audio: audioBuffer,
  providerOptions: {
    openai: {
      language: 'es',
      temperature: 0,
      timestampGranularities: ['segment'],
    },
  },
});

console.log('Transcripción:', text);
// "Hola, quiero hacer una reservación para este sábado..."

// Con timestamps
if (segments) {
  for (const seg of segments) {
    console.log(`[${seg.start}s - ${seg.end}s]: ${seg.text}`);
  }
}
```

La función `transcribe` envía el audio a Whisper y devuelve:
- `text`: La transcripción completa
- `segments`: Array con timestamps (si los pediste)
- `language`: Idioma detectado
- `duration`: Duración del audio

### Formatos Soportados

| Formato | Extensión | Notas |
|---------|-----------|-------|
| MP3 | `.mp3` | Más común |
| WAV | `.wav` | Sin compresión |
| WebM | `.webm` | Ideal para navegador |
| M4A | `.m4a` | Apple |
| FLAC | `.flac` | Sin pérdida |

## Transcripción desde el Navegador

En una app web, el audio viene del micrófono. El endpoint:

```typescript
// app/routes/api.transcribe.ts
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;

  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  const { text } = await transcribe({
    model: openai.transcription('whisper-1'),
    audio: audioBuffer,
    providerOptions: { openai: { language: 'es' } },
  });

  return Response.json({ text });
}
```

En el cliente, usas `MediaRecorder` para grabar:

```typescript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

const chunks: Blob[] = [];
mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

mediaRecorder.onstop = async () => {
  const audioBlob = new Blob(chunks, { type: 'audio/webm' });

  const formData = new FormData();
  formData.append('audio', audioBlob, 'grabacion.webm');

  const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
  const { text } = await res.json();
  console.log('Transcripción:', text);
};

mediaRecorder.start();
// ... después de grabar:
mediaRecorder.stop();
```

## Síntesis de Voz: Texto a Audio

El camino inverso:

```typescript
import { generateSpeech } from 'ai';
import { openai } from '@ai-sdk/openai';
import { writeFileSync } from 'fs';

const { audio } = await generateSpeech({
  model: openai.speech('tts-1'),
  text: 'Tu pedido está listo para recoger.',
  voice: 'nova',
});

// audio es un Uint8Array
writeFileSync('./respuesta.mp3', Buffer.from(audio));
```

### Voces Disponibles (OpenAI)

| Voz | Descripción | Ideal para |
|-----|-------------|------------|
| `alloy` | Neutral, balanceada | Uso general |
| `echo` | Masculina, grave | Narraciones |
| `fable` | Expresiva, cálida | Storytelling |
| `onyx` | Masculina, profunda | Autoridad |
| `nova` | Femenina, amigable | Asistentes |
| `shimmer` | Femenina, suave | Meditación |

### Parámetros

```typescript
const { audio } = await generateSpeech({
  model: openai.speech('tts-1'),     // o 'tts-1-hd' para mayor calidad
  text: 'Tu mensaje',
  voice: 'nova',
  providerOptions: {
    openai: {
      speed: 1.0,              // 0.25 a 4.0
      responseFormat: 'mp3',   // mp3, opus, aac, flac, wav
    },
  },
});
```

## API de Voz para el Navegador

```typescript
// app/routes/api.speak.ts
export async function action({ request }: Route.ActionArgs) {
  const { text, voice = 'nova' } = await request.json();

  const { audio } = await generateSpeech({
    model: openai.speech('tts-1'),
    text,
    voice,
  });

  return new Response(audio, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': audio.length.toString(),
    },
  });
}
```

En el cliente:

```typescript
async function reproducir(texto: string) {
  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texto, voice: 'nova' }),
  });

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  audio.onended = () => URL.revokeObjectURL(audioUrl);
  await audio.play();
}
```

## Asistente de Voz: El Flujo Completo

Combinar todo: usuario habla → transcribimos → LLM procesa → respondemos con voz.

```typescript
// lib/asistente-voz.ts
import { transcribe, generateText, generateSpeech } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function procesarConversacionVoz(audioBuffer: Buffer) {
  // 1. Transcribir
  const { text: pregunta } = await transcribe({
    model: openai.transcription('whisper-1'),
    audio: audioBuffer,
    providerOptions: { openai: { language: 'es' } },
  });

  // 2. Generar respuesta
  const { text: respuesta } = await generateText({
    model: openai('gpt-4o-mini'),
    system: `Eres un asistente de voz. Responde de manera concisa y natural,
    como si estuvieras hablando. Usa frases cortas.`,
    prompt: pregunta,
  });

  // 3. Convertir a voz
  const { audio } = await generateSpeech({
    model: openai.speech('tts-1'),
    text: respuesta,
    voice: 'nova',
  });

  return { pregunta, respuesta, audio };
}
```

El flujo visual:

```
┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ Audio Usuario│ -> │  transcribe │ -> │    Texto     │
└──────────────┘    └─────────────┘    └──────────────┘
                                              │
                                              v
┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ Audio Resp.  │ <- │generateSpeech│<- │  generateText│
└──────────────┘    └─────────────┘    └──────────────┘
```

## Detección de Idioma

Whisper detecta automáticamente:

```typescript
const { text, language } = await transcribe({
  model: openai.transcription('whisper-1'),
  audio: audioBuffer,
});

console.log(`Idioma detectado: ${language}`); // "es", "en", "fr"
```

## Costos

| Servicio | Modelo | Precio |
|----------|--------|--------|
| Transcripción | whisper-1 | $0.006 / minuto |
| TTS | tts-1 | $15 / 1M caracteres |
| TTS HD | tts-1-hd | $30 / 1M caracteres |

### Optimización

```typescript
// 1. Grabar en calidad más baja (suficiente para voz)
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm',
  audioBitsPerSecond: 16000,
});

// 2. Cachear respuestas TTS comunes
const cacheVoz = new Map<string, Uint8Array>();

async function generarVozConCache(texto: string) {
  const key = texto.toLowerCase().trim();
  if (cacheVoz.has(key)) return cacheVoz.get(key)!;

  const { audio } = await generateSpeech({
    model: openai.speech('tts-1'),
    text: texto,
    voice: 'nova',
  });

  cacheVoz.set(key, audio);
  return audio;
}

// 3. Usar tts-1 en lugar de tts-1-hd
// La diferencia es mínima para voz conversacional
```

## Manejo de Errores

```typescript
async function transcribirSeguro(audioBuffer: Buffer): Promise<string> {
  try {
    const { text } = await transcribe({
      model: openai.transcription('whisper-1'),
      audio: audioBuffer,
    });
    return text;
  } catch (error) {
    if (error instanceof Error) {
      // Audio muy corto o silencio
      if (error.message.includes('audio too short')) {
        return '';
      }
      // Rate limit - esperar y reintentar
      if (error.message.includes('rate_limit')) {
        await new Promise(r => setTimeout(r, 1000));
        return transcribirSeguro(audioBuffer);
      }
    }
    throw error;
  }
}
```

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| `transcribe()` | Audio a texto con Whisper |
| `generateSpeech()` | Texto a audio con TTS |
| MediaRecorder | Grabar en el navegador |
| Voces | alloy, echo, fable, onyx, nova, shimmer |
| Timestamps | Segmentos con tiempo inicio/fin |

### Cuándo Usar Audio

| Transcripción | Síntesis de voz |
|---------------|-----------------|
| Dictado de texto | Asistentes de voz |
| Notas de voz | Accesibilidad |
| Subtítulos | Notificaciones |
| Búsqueda por voz | IVR telefónico |

---

## Cierre del Libro

Has recorrido el camino completo del AI SDK: desde tu primera inferencia hasta agentes autónomos con RAG y voz.

Lo que aprendiste:
- **Fundamentos**: Streaming, tokens, context window
- **Frontend**: useChat, optimización de renders, UI patterns
- **Backend**: React Router v7, endpoints de chat
- **Structured Output**: Respuestas tipadas con Zod
- **Tools**: Darle manos al modelo para ejecutar acciones
- **Agentes**: Loops autónomos que resuelven tareas complejas
- **Imágenes**: Generación con DALL-E y otros modelos
- **Embeddings y RAG**: Búsqueda semántica sobre tus documentos
- **Audio**: Transcripción y síntesis de voz

El AI SDK abstrae la complejidad de trabajar con múltiples proveedores de IA. Ya sea que uses OpenAI, Anthropic, Google o modelos open source, la API es consistente.

Ahora tienes las herramientas para construir aplicaciones de IA en producción. El siguiente paso es tuyo: elige un proyecto, empieza pequeño, e itera.

¡Buena suerte!

---

*Héctorbliss*
*[FixterGeek](https://fixtergeek.com)*
