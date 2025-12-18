#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import { Effect } from "effect";
import { s3VideoService } from "../app/.server/services/s3-video";

async function testDynamic() {
  console.log("🔍 Testing Dynamic Presigned URL Generation...\n");

  const originalUrl = "https://t3.storage.dev/wild-bird-2039/fixtergeek/videos/692e5ded0917a1d2896c5eb9/6933379c88a49ff14e1bad14/original/1_Introducción.mov";
  
  try {
    console.log("📹 Original URL:", originalUrl);
    
    // Test new dynamic function
    console.log("\n🔧 Using getVideoPreviewUrlDynamic...");
    const dynamicUrl = await Effect.runPromise(
      s3VideoService.getVideoPreviewUrlDynamic(originalUrl, 3600)
    );
    
    console.log(`✅ Dynamic URL generated: ${dynamicUrl.substring(0, 150)}...`);
    
    // Test access
    console.log("\n🌐 Testing access...");
    const response = await fetch(dynamicUrl, { method: 'HEAD' });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   Content-Length: ${response.headers.get('content-length')} bytes`);
    
    if (response.ok) {
      console.log("   ✅ SUCCESS! Dynamic presigned URL works!");
    } else if (response.status === 403) {
      console.log("   ⚠️ Still 403 - may be credentials or file doesn't exist");
    } else {
      console.log("   ❌ Other error");
    }
    
  } catch (error) {
    console.error("❌ Error testing dynamic URL:", error);
  }
}

testDynamic();