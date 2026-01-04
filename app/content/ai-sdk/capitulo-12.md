# Capítulo 12: Audio y Speech — Voz e IA

Hasta ahora hemos trabajado exclusivamente con texto. Pero la voz es la interfaz más natural para los humanos. En este capítulo aprenderás a:

- Transcribir audio a texto (Speech-to-Text)
- Generar voz a partir de texto (Text-to-Speech)
- Combinar ambos para crear asistentes de voz

## Código Primero: Transcripción

Convirtamos un archivo de audio a texto:

```typescript
import { transcribe } from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFileSync } from 'fs';

async function transcribirAudio() {
  // Leer archivo de audio
  const audioBuffer = readFileSync('./grabacion.mp3');

  const { text, segments } = await transcribe({
    model: openai.transcription('whisper-1'),
    audio: audioBuffer,
    // Opciones adicionales
    providerOptions: {
      openai: {
        language: 'es',           // Idioma del audio
        temperature: 0,           // Más determinístico
        timestampGranularities: ['segment'], // Incluir timestamps
      },
    },
  });

  console.log('Transcripción:', text);

  // Si pedimos timestamps, tenemos segmentos
  if (segments) {
    for (const seg of segments) {
      console.log(`[${seg.start}s - ${seg.end}s]: ${seg.text}`);
    }
  }
}

transcribirAudio();
```

Salida:

```
Transcripción: Hola, quiero hacer una reservación para este sábado a las ocho de la noche, somos cuatro personas.

[0.0s - 2.5s]: Hola, quiero hacer una reservación
[2.5s - 5.1s]: para este sábado a las ocho de la noche,
[5.1s - 6.8s]: somos cuatro personas.
```

## ¿Qué Acaba de Pasar?

La función `transcribe` envía el audio a un modelo de reconocimiento de voz (Whisper en este caso) y devuelve:

- `text`: La transcripción completa
- `segments`: Array con timestamps (si los solicitaste)
- `language`: Idioma detectado
- `duration`: Duración del audio

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Audio (MP3) │ -> │  Whisper    │ -> │   Texto     │
│ WAV, WEBM   │    │  (OpenAI)   │    │ + Timestamps│
└─────────────┘    └─────────────┘    └─────────────┘
```

## Formatos de Audio Soportados

| Formato | Extensión | Notas |
|---------|-----------|-------|
| MP3 | `.mp3` | Más común, buena compresión |
| WAV | `.wav` | Sin compresión, mejor calidad |
| WebM | `.webm` | Ideal para grabaciones del navegador |
| M4A | `.m4a` | Formato de Apple |
| FLAC | `.flac` | Sin pérdida |
| OGG | `.ogg` | Código abierto |

## Transcripción desde el Navegador

En una aplicación web, el audio viene del micrófono del usuario:

```typescript
// app/routes/api.transcribe.ts
import type { Route } from './+types/api.transcribe';
import { transcribe } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;

  if (!audioFile) {
    return Response.json({ error: 'No se recibió audio' }, { status: 400 });
  }

  // Convertir File a Buffer
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  const { text } = await transcribe({
    model: openai.transcription('whisper-1'),
    audio: audioBuffer,
    providerOptions: {
      openai: { language: 'es' },
    },
  });

  return Response.json({ text });
}
```

```tsx
// app/routes/grabar.tsx
import { useState, useRef } from 'react';

export default function Grabar() {
  const [grabando, setGrabando] = useState(false);
  const [transcripcion, setTranscripcion] = useState('');
  const [procesando, setProcesando] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const iniciarGrabacion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await enviarAudio(audioBlob);

        // Detener el stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setGrabando(true);
    } catch (error) {
      console.error('Error accediendo al micrófono:', error);
      alert('No se pudo acceder al micrófono');
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorderRef.current && grabando) {
      mediaRecorderRef.current.stop();
      setGrabando(false);
    }
  };

  const enviarAudio = async (audioBlob: Blob) => {
    setProcesando(true);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'grabacion.webm');

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const { text } = await response.json();
      setTranscripcion(text);
    } catch (error) {
      console.error('Error transcribiendo:', error);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Transcriptor de Voz</h1>

      <div className="flex justify-center mb-6">
        <button
          onClick={grabando ? detenerGrabacion : iniciarGrabacion}
          disabled={procesando}
          className={`
            w-24 h-24 rounded-full text-white font-bold
            transition-all duration-200
            ${grabando
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600'
            }
            disabled:opacity-50
          `}
        >
          {grabando ? 'Detener' : 'Grabar'}
        </button>
      </div>

      {procesando && (
        <p className="text-center text-gray-500 mb-4">
          Transcribiendo...
        </p>
      )}

      {transcripcion && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Transcripción:</h2>
          <p>{transcripcion}</p>
        </div>
      )}
    </div>
  );
}
```

## Síntesis de Voz (Text-to-Speech)

Ahora el camino inverso: convertir texto a audio.

```typescript
import { generateSpeech } from 'ai';
import { openai } from '@ai-sdk/openai';
import { writeFileSync } from 'fs';

async function generarVoz() {
  const { audio } = await generateSpeech({
    model: openai.speech('tts-1'),
    text: 'Hola, tu pedido está listo para recoger en la sucursal Centro.',
    voice: 'nova', // alloy, echo, fable, onyx, nova, shimmer
  });

  // audio es un Uint8Array
  writeFileSync('./respuesta.mp3', Buffer.from(audio));
  console.log('Audio generado: respuesta.mp3');
}

generarVoz();
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

### Parámetros de Síntesis

```typescript
const { audio } = await generateSpeech({
  model: openai.speech('tts-1'),  // o 'tts-1-hd' para mayor calidad
  text: 'Tu mensaje aquí',
  voice: 'nova',
  providerOptions: {
    openai: {
      speed: 1.0,           // 0.25 a 4.0
      responseFormat: 'mp3', // mp3, opus, aac, flac, wav, pcm
    },
  },
});
```

## Streaming de Audio

Para respuestas largas, puedes hacer streaming del audio:

```typescript
import { generateSpeech } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createWriteStream } from 'fs';

async function generarVozStreaming() {
  const result = await generateSpeech({
    model: openai.speech('tts-1'),
    text: `
      Bienvenido al sistema de atención telefónica.
      Para consultar su saldo, presione uno.
      Para reportar un problema, presione dos.
      Para hablar con un asesor, presione tres.
      Para repetir estas opciones, presione asterisco.
    `,
    voice: 'nova',
  });

  // Escribir en chunks para archivos grandes
  const writeStream = createWriteStream('./menu_telefonico.mp3');
  writeStream.write(Buffer.from(result.audio));
  writeStream.end();

  console.log('Audio del menú generado');
}
```

## API de Voz para el Navegador

```typescript
// app/routes/api.speak.ts
import type { Route } from './+types/api.speak';
import { generateSpeech } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function action({ request }: Route.ActionArgs) {
  const { text, voice = 'nova' } = await request.json();

  if (!text) {
    return Response.json({ error: 'Texto requerido' }, { status: 400 });
  }

  const { audio } = await generateSpeech({
    model: openai.speech('tts-1'),
    text,
    voice,
  });

  // Retornar como audio stream
  return new Response(audio, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': audio.length.toString(),
    },
  });
}
```

```tsx
// Componente que reproduce la respuesta
function ReproductorRespuesta({ texto }: { texto: string }) {
  const [reproduciendo, setReproduciendo] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const reproducir = async () => {
    setReproduciendo(true);

    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texto, voice: 'nova' }),
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setReproduciendo(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('Error reproduciendo:', error);
      setReproduciendo(false);
    }
  };

  const detener = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setReproduciendo(false);
    }
  };

  return (
    <button
      onClick={reproduciendo ? detener : reproducir}
      className="p-2 rounded-full bg-blue-500 text-white"
    >
      {reproduciendo ? '⏹️' : '🔊'}
    </button>
  );
}
```

## Asistente de Voz Completo

Combinemos todo: el usuario habla, transcribimos, procesamos con el LLM, y respondemos con voz.

```typescript
// lib/asistente-voz.ts
import { transcribe, generateText, generateSpeech } from 'ai';
import { openai } from '@ai-sdk/openai';

interface RespuestaVoz {
  transcripcion: string;
  respuestaTexto: string;
  respuestaAudio: Uint8Array;
}

export async function procesarConversacionVoz(
  audioBuffer: Buffer
): Promise<RespuestaVoz> {
  // 1. Transcribir el audio del usuario
  const { text: transcripcion } = await transcribe({
    model: openai.transcription('whisper-1'),
    audio: audioBuffer,
    providerOptions: {
      openai: { language: 'es' },
    },
  });

  // 2. Generar respuesta con el LLM
  const { text: respuestaTexto } = await generateText({
    model: openai('gpt-4o-mini'),
    system: `Eres un asistente de voz amigable.
Responde de manera concisa y natural, como si estuvieras hablando.
Usa frases cortas. Evita listas largas o formato complejo.
El usuario está hablando contigo, no leyendo.`,
    prompt: transcripcion,
  });

  // 3. Convertir respuesta a voz
  const { audio: respuestaAudio } = await generateSpeech({
    model: openai.speech('tts-1'),
    text: respuestaTexto,
    voice: 'nova',
  });

  return {
    transcripcion,
    respuestaTexto,
    respuestaAudio,
  };
}
```

```typescript
// app/routes/api.voice-chat.ts
import type { Route } from './+types/api.voice-chat';
import { procesarConversacionVoz } from '~/lib/asistente-voz';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;

  if (!audioFile) {
    return Response.json({ error: 'No se recibió audio' }, { status: 400 });
  }

  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  const resultado = await procesarConversacionVoz(audioBuffer);

  // Retornar todo: transcripción, respuesta texto, y audio
  return Response.json({
    transcripcion: resultado.transcripcion,
    respuesta: resultado.respuestaTexto,
    // Audio como base64 para simplicidad
    audio: Buffer.from(resultado.respuestaAudio).toString('base64'),
  });
}
```

```tsx
// app/routes/asistente-voz.tsx
import { useState, useRef, useEffect } from 'react';

interface Mensaje {
  tipo: 'usuario' | 'asistente';
  texto: string;
  audio?: string; // base64
}

export default function AsistenteVoz() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [grabando, setGrabando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const iniciarGrabacion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await procesarAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setGrabando(true);
    } catch (error) {
      console.error('Error con micrófono:', error);
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorderRef.current && grabando) {
      mediaRecorderRef.current.stop();
      setGrabando(false);
    }
  };

  const procesarAudio = async (audioBlob: Blob) => {
    setProcesando(true);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'grabacion.webm');

    try {
      const response = await fetch('/api/voice-chat', {
        method: 'POST',
        body: formData,
      });

      const { transcripcion, respuesta, audio } = await response.json();

      // Agregar mensaje del usuario
      setMensajes(prev => [...prev, {
        tipo: 'usuario',
        texto: transcripcion,
      }]);

      // Agregar respuesta del asistente
      setMensajes(prev => [...prev, {
        tipo: 'asistente',
        texto: respuesta,
        audio,
      }]);

      // Reproducir automáticamente la respuesta
      reproducirAudio(audio);

    } catch (error) {
      console.error('Error procesando:', error);
    } finally {
      setProcesando(false);
    }
  };

  const reproducirAudio = (base64Audio: string) => {
    const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(audioUrl);
  };

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Asistente de Voz
      </h1>

      {/* Mensajes */}
      <div className="flex-1 space-y-4 mb-6 overflow-y-auto">
        {mensajes.map((m, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg ${
              m.tipo === 'usuario'
                ? 'bg-blue-100 ml-8'
                : 'bg-gray-100 mr-8'
            }`}
          >
            <p className="text-sm text-gray-500 mb-1">
              {m.tipo === 'usuario' ? 'Tú dijiste:' : 'Asistente:'}
            </p>
            <p>{m.texto}</p>
            {m.audio && (
              <button
                onClick={() => reproducirAudio(m.audio!)}
                className="mt-2 text-blue-500 text-sm"
              >
                🔊 Reproducir de nuevo
              </button>
            )}
          </div>
        ))}

        {procesando && (
          <div className="bg-gray-100 mr-8 p-4 rounded-lg animate-pulse">
            Pensando...
          </div>
        )}
      </div>

      {/* Botón de grabación */}
      <div className="flex justify-center">
        <button
          onClick={grabando ? detenerGrabacion : iniciarGrabacion}
          disabled={procesando}
          className={`
            w-20 h-20 rounded-full text-3xl
            transition-all duration-200 shadow-lg
            ${grabando
              ? 'bg-red-500 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600'
            }
            disabled:opacity-50
          `}
        >
          {grabando ? '⏹️' : '🎤'}
        </button>
      </div>

      <p className="text-center text-gray-500 mt-4 text-sm">
        {grabando ? 'Hablando...' : 'Toca para hablar'}
      </p>
    </div>
  );
}
```

## Transcripción en Tiempo Real

Para transcripción mientras el usuario habla (útil para subtítulos en vivo):

```typescript
// Dividir grabación en chunks y transcribir incrementalmente
export function useTranscripcionEnVivo() {
  const [transcripcion, setTranscripcion] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const iniciar = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm',
    });

    mediaRecorderRef.current = mediaRecorder;

    // Enviar chunks cada 3 segundos
    mediaRecorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const formData = new FormData();
        formData.append('audio', e.data, 'chunk.webm');

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        const { text } = await response.json();
        setTranscripcion(prev => prev + ' ' + text);
      }
    };

    // Grabar en intervalos de 3 segundos
    mediaRecorder.start(3000);
  };

  const detener = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  return { transcripcion, iniciar, detener };
}
```

## Detección de Idioma

Whisper detecta automáticamente el idioma:

```typescript
const { text, language } = await transcribe({
  model: openai.transcription('whisper-1'),
  audio: audioBuffer,
});

console.log(`Idioma detectado: ${language}`); // "es", "en", "fr", etc.
console.log(`Texto: ${text}`);
```

## Casos de Uso Prácticos

### 1. Dictado para Formularios

```tsx
function CampoConDictado({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [grabando, setGrabando] = useState(false);

  const grabarYTranscribir = async () => {
    // ... lógica de grabación
    const texto = await transcribir(audioBlob);
    onChange(value + ' ' + texto);
  };

  return (
    <div className="flex gap-2">
      <label className="flex-1">
        {label}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </label>
      <button
        onClick={grabarYTranscribir}
        className="p-2 bg-blue-500 text-white rounded"
      >
        🎤
      </button>
    </div>
  );
}
```

### 2. Notas de Voz con Resumen

```typescript
async function procesarNotaVoz(audioBuffer: Buffer) {
  // Transcribir
  const { text: transcripcion } = await transcribe({
    model: openai.transcription('whisper-1'),
    audio: audioBuffer,
    providerOptions: { openai: { language: 'es' } },
  });

  // Generar resumen
  const { text: resumen } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Resume esta nota de voz en 2-3 bullet points:

${transcripcion}`,
  });

  // Extraer tareas si las hay
  const { text: tareas } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Extrae las tareas o pendientes de esta nota (si no hay, responde "Sin tareas"):

${transcripcion}`,
  });

  return {
    transcripcion,
    resumen,
    tareas: tareas === 'Sin tareas' ? [] : tareas.split('\n'),
  };
}
```

### 3. Atención al Cliente Automatizada

```typescript
const asistenteAtencion = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),

  instructions: `Eres el asistente de atención al cliente de una tienda en línea.

El cliente está hablando por teléfono, así que:
- Sé conciso y claro
- Confirma información importante repitiendo
- Usa frases naturales de conversación
- Si necesitas buscar algo, di "Un momento, déjame revisar"`,

  tools: {
    buscarPedido: tool({
      description: 'Busca un pedido por número',
      inputSchema: z.object({ numeroPedido: z.string() }),
      execute: async ({ numeroPedido }) => {
        // Buscar en base de datos...
        return { status: 'En camino', fechaEntrega: '15 de enero' };
      },
    }),
  },
});

// El flujo completo
async function atenderLlamada(audioCliente: Buffer) {
  // 1. Transcribir lo que dijo el cliente
  const { text: pregunta } = await transcribe({
    model: openai.transcription('whisper-1'),
    audio: audioCliente,
  });

  // 2. Procesar con el agente
  const { text: respuesta } = await asistenteAtencion.generate({
    prompt: pregunta,
  });

  // 3. Convertir respuesta a voz
  const { audio } = await generateSpeech({
    model: openai.speech('tts-1'),
    text: respuesta,
    voice: 'nova',
  });

  return { pregunta, respuesta, audio };
}
```

## Costos y Optimización

### Precios (OpenAI, enero 2025)

| Servicio | Modelo | Precio |
|----------|--------|--------|
| Transcripción | whisper-1 | $0.006 / minuto |
| TTS | tts-1 | $15 / 1M caracteres |
| TTS HD | tts-1-hd | $30 / 1M caracteres |

### Estrategias de Optimización

```typescript
// 1. Comprimir audio antes de enviar
// El navegador puede grabar en calidad más baja
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm',
  audioBitsPerSecond: 16000, // Suficiente para voz
});

// 2. Limitar duración de grabaciones
const MAX_DURACION_MS = 60000; // 1 minuto máximo

// 3. Cachear respuestas de TTS comunes
const cacheVoz = new Map<string, Uint8Array>();

async function generarVozConCache(texto: string): Promise<Uint8Array> {
  const cacheKey = texto.toLowerCase().trim();

  if (cacheVoz.has(cacheKey)) {
    return cacheVoz.get(cacheKey)!;
  }

  const { audio } = await generateSpeech({
    model: openai.speech('tts-1'),
    text: texto,
    voice: 'nova',
  });

  cacheVoz.set(cacheKey, audio);
  return audio;
}

// 4. Usar tts-1 en lugar de tts-1-hd para la mayoría de casos
// La diferencia de calidad es mínima para voz conversacional
```

## Manejo de Errores

```typescript
async function transcribirConReintentos(
  audioBuffer: Buffer,
  maxIntentos: number = 3
): Promise<string> {
  for (let intento = 1; intento <= maxIntentos; intento++) {
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
          return ''; // Retornar vacío en lugar de error
        }

        // Rate limit
        if (error.message.includes('rate_limit')) {
          await new Promise(r => setTimeout(r, 1000 * intento));
          continue;
        }
      }

      if (intento === maxIntentos) throw error;
    }
  }

  return '';
}
```

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| `transcribe()` | Convertir audio a texto con Whisper |
| `generateSpeech()` | Convertir texto a audio con TTS |
| MediaRecorder | Grabar audio en el navegador |
| Voces OpenAI | alloy, echo, fable, onyx, nova, shimmer |
| Timestamps | Segmentos con tiempo inicio/fin |
| Streaming de audio | Respuestas largas en chunks |
| Asistente de voz | Combinar STT + LLM + TTS |

### Flujo de Asistente de Voz

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

### Cuándo usar audio

| Usa transcripción | Usa síntesis de voz |
|-------------------|---------------------|
| Dictado de texto | Asistentes de voz |
| Notas de voz | Accesibilidad |
| Subtítulos en vivo | Notificaciones |
| Atención telefónica | Audio libros |
| Búsqueda por voz | IVR (menús telefónicos) |

---

En el próximo y último capítulo exploraremos **Multi-Provider**: cómo usar diferentes modelos (OpenAI, Anthropic, Google) en la misma aplicación, cambiar entre ellos dinámicamente, y elegir el mejor modelo para cada tarea.
