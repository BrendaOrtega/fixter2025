# Audio Posts Setup Guide

Esta guía te ayudará a configurar la funcionalidad de audio para posts del blog.

## Requisitos

1. **OpenRouter API Key**: Para generar audio usando TTS
2. **AWS S3**: Para almacenar los archivos de audio
3. **MongoDB**: Para cachear metadatos de audio

## Configuración

### 1. Variables de Entorno

Copia `.env.example` a `.env` y configura las siguientes variables:

```bash
# OpenRouter API Configuration
OPEN_ROUTER_API_KEY=your_openrouter_api_key_here
OPEN_ROUTER_API_URL=https://openrouter.ai/api/v1

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name
AWS_ENDPOINT_URL_S3=https://s3.amazonaws.com

# Database Configuration
DATABASE_URL=your_mongodb_connection_string
```

### 2. OpenRouter Setup

1. Ve a [OpenRouter.ai](https://openrouter.ai)
2. Crea una cuenta y obtén tu API key
3. Configura `OPEN_ROUTER_API_KEY` en tu `.env`

### 3. AWS S3 Setup

1. Crea un bucket en AWS S3
2. Configura las credenciales de AWS
3. Asegúrate de que el bucket tenga permisos de lectura/escritura

### 4. Database Schema

Los modelos necesarios ya están en `prisma/schema.prisma`:

- `AudioCache`: Para cachear metadatos de audio
- `BlogAnalytics`: Para tracking de eventos de audio

Ejecuta las migraciones si es necesario:

```bash
npx prisma db push
```

## Verificación

Ejecuta el script de verificación para probar que todo esté configurado:

```bash
npx tsx scripts/test-audio-setup.ts
```

## Uso

### En Posts del Blog

El AudioPlayer se integra automáticamente en todos los posts del blog que tengan contenido en el campo `body`.

### API Endpoints

- `GET /api/audio?postId=<id>`: Obtener audio cacheado
- `POST /api/audio`: Generar nuevo audio o trackear eventos

### Componentes

- `AudioPlayer`: Componente principal del reproductor
- `useAudioGeneration`: Hook para generar audio
- `useAudioTracking`: Hook para tracking de eventos

## Arquitectura

```
Blog Post → AudioPlayer → useAudioGeneration → API Route → Audio Service
                                                    ↓
                                            OpenRouter TTS → S3 Storage
                                                    ↓
                                              Database Cache
```

## Costos Estimados

- **OpenRouter TTS**: ~$0.08 por post promedio
- **AWS S3**: ~$0.02/mes por 1000 archivos de audio
- **Bandwidth**: Mínimo para entrega de audio

## Troubleshooting

### Error: "Audio not found in cache"

- Normal para posts nuevos, el audio se genera on-demand

### Error: "OpenRouter API error"

- Verifica tu API key
- Revisa los límites de rate limiting

### Error: "S3 upload failed"

- Verifica credenciales de AWS
- Revisa permisos del bucket

### Error: "Post not found"

- Asegúrate de que el post existe y está publicado
- Verifica que el `postId` sea correcto

## Desarrollo

Para desarrollo local, puedes usar LocalStack para simular S3:

```bash
# Instalar LocalStack
pip install localstack

# Ejecutar LocalStack
localstack start

# Configurar endpoint local
AWS_ENDPOINT_URL_S3=http://localhost:4566
```

## Monitoreo

Los eventos de audio se trackean automáticamente:

- `audio_generated`: Cuando se genera audio
- `audio_play`: Cuando se reproduce
- `audio_pause`: Cuando se pausa
- `audio_complete`: Cuando se completa la reproducción

Puedes ver las métricas en el dashboard de admin (próximamente).
