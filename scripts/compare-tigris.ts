#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import { getReadURL } from "../app/.server/tigrs";
import { Effect } from "effect";
import { s3VideoService } from "../app/.server/services/s3-video";

async function compare() {
  console.log("🔍 Comparando tigrs.ts (que funciona) vs s3-video.ts\n");

  const testKey = "fixtergeek/videos/692e5ded0917a1d2896c5eb9/6933379c88a49ff14e1bad14/original/1_Introduccio%CC%81n.mov";
  
  try {
    // Test 1: tigrs.ts (debe funcionar)
    console.log("1️⃣ Probando tigrs.ts (que ya funciona):");
    const tigrisUrl = await getReadURL(testKey, 3600, false); // isAnimations=false para no añadir prefix
    console.log(`   URL: ${tigrisUrl.substring(0, 100)}...`);
    
    const tigrisResponse = await fetch(tigrisUrl, { method: 'HEAD' });
    console.log(`   Status: ${tigrisResponse.status} ${tigrisResponse.statusText}`);
    
    // Test 2: s3-video.ts (problema aquí)
    console.log("\n2️⃣ Probando s3-video.ts (el que no funciona):");
    const s3VideoUrl = await Effect.runPromise(
      s3VideoService.getVideoPreviewUrl(testKey, 3600)
    );
    console.log(`   URL: ${s3VideoUrl.substring(0, 100)}...`);
    
    const s3VideoResponse = await fetch(s3VideoUrl, { method: 'HEAD' });
    console.log(`   Status: ${s3VideoResponse.status} ${s3VideoResponse.statusText}`);
    
    // Compare URLs
    console.log("\n🔍 Comparando URLs:");
    console.log(`tigrs.ts:    ${tigrisUrl}`);
    console.log(`s3-video.ts: ${s3VideoUrl}`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

compare();