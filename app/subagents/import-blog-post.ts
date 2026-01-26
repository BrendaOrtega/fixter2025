import { readFileSync, existsSync } from "fs";
import { db } from "~/.server/db";

interface BlogPostData {
  id?: string;
  slug: string;
  title: string;
  published: boolean;
  coverImage?: string;
  body?: string;
  authorAt?: string;
  photoUrl?: string;
  isFeatured?: boolean;
  metaImage?: string;
  youtubeLink?: string;
  authorAtLink?: string;
  authorName?: string;
  mainTag?: string;
  tags?: string[];
  category?: string[];
}

/**
 * Parse React Router serialized JSON from Wayback Machine HTML
 * The JSON is stored in window.__reactRouterContext.streamController.enqueue("[...]")
 */
function parseWaybackJSON(htmlContent: string): BlogPostData | null {
  try {
    // Find the start of the JSON
    const startMarker = 'enqueue("';
    const startIdx = htmlContent.indexOf(startMarker);
    
    if (startIdx === -1) {
      console.error("❌ Could not find streamController.enqueue marker");
      return null;
    }

    // Find the end of the JSON (");)
    const jsonStart = startIdx + startMarker.length;
    const endIdx = htmlContent.indexOf('");', jsonStart);
    
    if (endIdx === -1) {
      console.error("❌ Could not find end marker");
      return null;
    }

    // Extract the JSON string (with escaped quotes)
    const escapedJsonString = htmlContent.substring(jsonStart, endIdx);
    
    // Unescape the JSON string
    const jsonString = JSON.parse(`"${escapedJsonString}"`);
    const jsonArray = JSON.parse(jsonString);

    // The array is structured as React Router serialization
    // We need to find the string keys and extract their adjacent values
    const post: BlogPostData = {
      tags: [],
      category: [],
    };

    // Find keys and map to their values
    for (let i = 0; i < jsonArray.length; i++) {
      const item = jsonArray[i];
      
      // Skip if not a string (objects are serialization metadata)
      if (typeof item !== "string") continue;
      
      // Get the next element as the value
      const value = jsonArray[i + 1];
      
      switch (item) {
        case "slug":
          post.slug = value;
          break;
        case "title":
          post.title = value;
          break;
        case "published":
          post.published = value;
          break;
        case "coverImage":
          post.coverImage = value;
          break;
        case "body":
          post.body = value;
          break;
        case "authorAt":
          post.authorAt = value;
          break;
        case "photoUrl":
          post.photoUrl = value;
          break;
        case "isFeatured":
          post.isFeatured = value;
          break;
        case "metaImage":
          post.metaImage = value;
          break;
        case "youtubeLink":
          post.youtubeLink = value;
          break;
        case "authorAtLink":
          post.authorAtLink = value;
          break;
        case "authorName":
          post.authorName = value;
          break;
        case "mainTag":
          post.mainTag = value;
          break;
        case "tags":
          // Tags can be array of strings or array of numbers (indices to resolve)
          if (Array.isArray(value)) {
            if (typeof value[0] === "number") {
              // Resolve indices
              post.tags = value.map((idx: number) => jsonArray[idx]).filter((v: any) => typeof v === "string");
            } else {
              post.tags = value;
            }
          }
          break;
        case "category":
          // Category can be array of strings or array of numbers (indices to resolve)
          if (Array.isArray(value)) {
            if (typeof value[0] === "number") {
              // Resolve indices
              post.category = value.map((idx: number) => jsonArray[idx]).filter((v: any) => typeof v === "string");
            } else {
              post.category = value;
            }
          }
          break;
      }
    }

    return post;
  } catch (error) {
    console.error("❌ Failed to parse JSON:", error);
    return null;
  }
}

/**
 * Validate post data before inserting
 */
function validatePostData(post: BlogPostData): boolean {
  const errors: string[] = [];

  if (!post.slug) errors.push("Missing slug");
  if (!post.title) errors.push("Missing title");
  if (!post.published === undefined) errors.push("Missing published status");
  if (!post.body) errors.push("Missing body");

  if (errors.length > 0) {
    console.error("❌ Validation errors:");
    errors.forEach((e) => console.error(`  - ${e}`));
    return false;
  }

  return true;
}

/**
 * Import blog post from Wayback Machine HTML
 */
async function importBlogPost(htmlContent: string): Promise<void> {
  console.log("🚀 Starting blog post import...\n");

  // 1. Parse JSON from HTML
  console.log("📄 Parsing HTML JSON...");
  const postData = parseWaybackJSON(htmlContent);

  if (!postData) {
    console.error("Failed to parse post data");
    process.exit(1);
  }

  console.log(`✅ Parsed post: "${postData.title}"`);
  console.log(`   Slug: ${postData.slug}\n`);

  // 2. Validate data
  console.log("🔍 Validating post data...");
  if (!validatePostData(postData)) {
    console.error("Validation failed");
    process.exit(1);
  }
  console.log("✅ Validation passed\n");

  // 3. Check if post already exists
  console.log("🔎 Checking if post already exists...");
  const existing = await db.post.findUnique({
    where: { slug: postData.slug },
  });

  if (existing) {
    console.warn(
      `⚠️  Post with slug "${postData.slug}" already exists in database`
    );
    console.warn(`   ID: ${existing.id}`);
    console.warn(`   Title: "${existing.title}"`);
    console.log("\n📌 SKIPPING - No changes made\n");
    process.exit(0);
  }

  console.log("✅ Post is new (not in database)\n");

  // 4. Insert post into database
  console.log("💾 Inserting post into database...");
  try {
    const created = await db.post.create({
      data: {
        slug: postData.slug,
        title: postData.title,
        published: postData.published,
        coverImage: postData.coverImage,
        body: postData.body,
        authorAt: postData.authorAt,
        photoUrl: postData.photoUrl,
        isFeatured: postData.isFeatured || false,
        metaImage: postData.metaImage,
        youtubeLink: postData.youtubeLink || "",
        authorAtLink: postData.authorAtLink,
        authorName: postData.authorName,
        mainTag: postData.mainTag,
        tags: postData.tags || [],
        category: postData.category || [],
      },
    });

    console.log("✅ Post created successfully!");
    console.log(`   ID: ${created.id}`);
    console.log(`   URL: https://www.fixtergeek.com/blog/${created.slug}\n`);
    console.log("🎉 Import complete!\n");
  } catch (error) {
    console.error("❌ Failed to create post:", error);
    process.exit(1);
  }
}

// Main execution
const htmlContent = process.argv[2];

if (!htmlContent) {
  console.log(
    "Usage: npx tsx app/subagents/import-blog-post.ts <html-file-or-string>"
  );
  console.log(
    "\nExample: npx tsx app/subagents/import-blog-post.ts /path/to/wayback.html"
  );
  process.exit(1);
}

// Check if it's a file path or direct HTML string
let content = htmlContent;
try {
  if (existsSync(htmlContent)) {
    content = readFileSync(htmlContent, "utf-8");
    console.log(`📖 Reading from file: ${htmlContent}\n`);
  }
} catch {
  // Not a file, treat as direct HTML string
}

importBlogPost(content).catch(console.error);
