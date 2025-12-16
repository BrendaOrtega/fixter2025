#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { spawn } from "child_process";

function runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const process = spawn(command, args);
    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      resolve({ stdout, stderr, code: code || 0 });
    });

    process.on("error", (error) => {
      resolve({ stdout, stderr: error.message, code: -1 });
    });
  });
}

async function testFFmpeg() {
  console.log("🔍 Testing FFmpeg Installation and Functionality...\n");

  try {
    // Test 1: FFmpeg path
    console.log("📁 FFmpeg Path Info:");
    console.log(`   Path: ${ffmpegPath.path}`);
    console.log(`   Platform: ${process.platform}`);
    console.log(`   Architecture: ${process.arch}`);
    console.log();

    // Test 2: FFmpeg version
    console.log("🔧 Testing FFmpeg Version...");
    const versionResult = await runCommand(ffmpegPath.path, ["-version"]);
    
    if (versionResult.code === 0) {
      const firstLine = versionResult.stdout.split('\n')[0];
      console.log(`✅ FFmpeg is working: ${firstLine}`);
      
      // Check for important features
      const hasLibx264 = versionResult.stdout.includes('--enable-libx264');
      const hasHLS = versionResult.stdout.includes('hls');
      const hasAAC = versionResult.stdout.includes('aac');
      
      console.log(`   libx264 support: ${hasLibx264 ? '✅' : '❌'}`);
      console.log(`   HLS support: ${hasHLS ? '✅' : '❌'}`);  
      console.log(`   AAC support: ${hasAAC ? '✅' : '❌'}`);
    } else {
      console.log(`❌ FFmpeg failed with code ${versionResult.code}`);
      console.log(`   Error: ${versionResult.stderr}`);
    }
    console.log();

    // Test 3: Simple FFmpeg operation
    console.log("🧪 Testing Simple FFmpeg Operation...");
    const testResult = await runCommand(ffmpegPath.path, [
      "-f", "lavfi",
      "-i", "testsrc=duration=1:size=320x240:rate=1",
      "-t", "1",
      "-f", "null",
      "-"
    ]);
    
    if (testResult.code === 0) {
      console.log("✅ FFmpeg can process test input successfully");
    } else {
      console.log(`❌ FFmpeg test failed with code ${testResult.code}`);
      console.log(`   Error: ${testResult.stderr}`);
    }
    console.log();

    // Test 4: HLS encoding capability
    console.log("🎬 Testing HLS Encoding Capability...");
    const hlsTest = await runCommand(ffmpegPath.path, [
      "-f", "lavfi",
      "-i", "testsrc=duration=2:size=640x480:rate=10",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-f", "hls",
      "-hls_time", "1",
      "-hls_list_size", "0",
      "-t", "2",
      "/tmp/test_hls_%03d.ts",
      "/tmp/test_playlist.m3u8"
    ]);

    if (hlsTest.code === 0) {
      console.log("✅ FFmpeg can encode HLS successfully");
      
      // Clean up test files
      try {
        const fs = await import("fs/promises");
        await fs.unlink("/tmp/test_playlist.m3u8").catch(() => {});
        const files = await fs.readdir("/tmp").catch(() => []);
        for (const file of files) {
          if (file.startsWith("test_hls_")) {
            await fs.unlink(`/tmp/${file}`).catch(() => {});
          }
        }
        console.log("   Test files cleaned up");
      } catch (error) {
        console.log(`   Warning: Could not clean test files: ${error}`);
      }
    } else {
      console.log(`❌ FFmpeg HLS test failed with code ${hlsTest.code}`);
      console.log(`   Error: ${hlsTest.stderr}`);
    }
    console.log();

    // Test 5: Environment and dependencies
    console.log("🌍 Environment Check:");
    console.log(`   Node.js Version: ${process.version}`);
    console.log(`   Working Directory: ${process.cwd()}`);
    console.log(`   Temp Directory: ${require("os").tmpdir()}`);
    console.log(`   Available Memory: ${Math.round(require("os").freemem() / 1024 / 1024)} MB`);
    console.log();

    console.log("✨ FFmpeg testing completed!");

  } catch (error) {
    console.error("❌ Error during testing:");
    console.error(error);
    process.exit(1);
  }
}

testFFmpeg().catch(console.error);