#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

async function testTigris() {
  console.log("🔍 Testing Tigris connection...\n");

  try {
    const s3Client = new S3Client({
      region: "auto",
      endpoint: "https://fly.storage.tigris.dev",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    });

    // Test bucket access
    console.log("📦 Testing bucket access: wild-bird-2039");
    
    const headBucketCommand = new HeadBucketCommand({
      Bucket: "wild-bird-2039"
    });
    
    await s3Client.send(headBucketCommand);
    console.log("✅ Bucket access successful!");
    
  } catch (error) {
    console.error("❌ Tigris connection failed:");
    console.error(error);
  }
}

testTigris();