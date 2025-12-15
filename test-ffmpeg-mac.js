#!/usr/bin/env node

// Script para probar FFmpeg en Mac con el video problemático
import { spawn } from "child_process";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

console.log(`🔧 FFmpeg path: ${ffmpegPath.path}`);

// Primero vamos a probar si FFmpeg funciona básicamente
const testArgs = ["-version"];

console.log(`🧪 Testing FFmpeg with: ${ffmpegPath.path} ${testArgs.join(' ')}`);

const ffmpeg = spawn(ffmpegPath.path, testArgs);

ffmpeg.stdout.on('data', (data) => {
  console.log(`📤 stdout: ${data}`);
});

ffmpeg.stderr.on('data', (data) => {
  console.log(`📤 stderr: ${data}`);
});

ffmpeg.on('close', (code) => {
  console.log(`🏁 FFmpeg version test finished with code ${code}`);
  
  if (code === 0) {
    console.log(`✅ FFmpeg is working on Mac!`);
  } else {
    console.log(`❌ FFmpeg failed with code ${code}`);
  }
});

ffmpeg.on('error', (err) => {
  console.error(`💥 FFmpeg error: ${err}`);
});