#!/usr/bin/env npx tsx

async function testAPIDynamic() {
  console.log("🔍 Testing new dynamic API endpoint...\n");

  const originalUrl = "https://t3.storage.dev/wild-bird-2039/fixtergeek/videos/692e5ded0917a1d2896c5eb9/6933379c88a49ff14e1bad14/original/1_Introducción.mov";
  
  try {
    console.log("📹 Testing API with:", originalUrl);
    
    const response = await fetch('http://localhost:3000/api/video-preview-dynamic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalUrl, expiresIn: 3600 })
    });

    const result = await response.json();
    
    console.log("📡 API Response:");
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Success: ${result.success}`);
    
    if (result.success) {
      console.log(`   ✅ Presigned URL: ${result.presignedUrl.substring(0, 150)}...`);
      
      // Test the presigned URL
      console.log("\n🌐 Testing presigned URL access...");
      const testResponse = await fetch(result.presignedUrl, { method: 'HEAD' });
      console.log(`   Access: ${testResponse.status} ${testResponse.statusText}`);
      
      if (testResponse.ok) {
        console.log("   🎉 SUCCESS! End-to-end flow works!");
      } else {
        console.log(`   ⚠️ Presigned URL generated but access denied (${testResponse.status})`);
        console.log("   This might be normal if credentials don't work with T3 storage");
      }
    } else {
      console.log(`   ❌ API Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testAPIDynamic();