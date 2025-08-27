#!/usr/bin/env tsx

/**
 * Script para verificar que la configuración de audio esté correcta
 * Ejecutar con: npx tsx scripts/test-audio-setup.ts
 */

import { Effect } from "effect";
import { openRouterTTSService } from "../app/.server/services/openrouter";
import { s3Service } from "../app/.server/services/s3";

async function testAudioSetup() {
  console.log("🔍 Verificando configuración de audio...\n");

  // 1. Verificar variables de entorno
  console.log("1. Verificando variables de entorno:");
  const requiredEnvVars = [
    "OPEN_ROUTER_API_KEY",
    "OPEN_ROUTER_API_URL",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "AWS_S3_BUCKET",
    "DATABASE_URL",
  ];

  let envVarsOk = true;
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(
        `   ✅ ${envVar}: ${
          envVar.includes("KEY") || envVar.includes("URL") ? "***" : value
        }`
      );
    } else {
      console.log(`   ❌ ${envVar}: No configurada`);
      envVarsOk = false;
    }
  }

  if (!envVarsOk) {
    console.log("\n❌ Faltan variables de entorno. Revisa tu archivo .env");
    return;
  }

  // 2. Probar conexión con OpenRouter
  console.log("\n2. Probando conexión con OpenRouter:");
  try {
    const testText = "Hola, esto es una prueba de audio.";
    const audioResult = await Effect.runPromise(
      openRouterTTSService.generateSpeech(testText, {
        voice: "alloy",
        format: "mp3",
        speed: 1.0,
      })
    );

    if (audioResult.byteLength > 0) {
      console.log(
        `   ✅ OpenRouter TTS funcionando (${audioResult.byteLength} bytes generados)`
      );
    } else {
      console.log("   ❌ OpenRouter TTS no generó audio");
    }
  } catch (error) {
    console.log(`   ❌ Error con OpenRouter: ${error}`);
  }

  // 3. Probar conexión con S3
  console.log("\n3. Probando conexión con S3:");
  try {
    const testKey = `test/audio-test-${Date.now()}.mp3`;
    const testBuffer = new ArrayBuffer(1024); // 1KB test file

    const uploadResult = await Effect.runPromise(
      s3Service.uploadAudio(testKey, testBuffer, {
        test: "true",
        timestamp: new Date().toISOString(),
      })
    );

    console.log(`   ✅ S3 upload funcionando: ${uploadResult.url}`);

    // Verificar que el archivo existe
    const exists = await Effect.runPromise(s3Service.checkFileExists(testKey));

    if (exists) {
      console.log("   ✅ S3 file check funcionando");
    } else {
      console.log("   ❌ S3 file check falló");
    }
  } catch (error) {
    console.log(`   ❌ Error con S3: ${error}`);
  }

  console.log("\n✅ Verificación completada!");
  console.log(
    "\n💡 Si todo está funcionando, puedes probar el AudioPlayer en:"
  );
  console.log("   - Un post real del blog: /blog/[slug]");
  console.log("   - La página de demo: /audio-demo");
}

// Ejecutar el test
testAudioSetup().catch(console.error);
