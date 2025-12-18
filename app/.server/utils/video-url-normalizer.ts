/**
 * Video URL Normalization Utilities
 * 
 * Provides consistent handling of video URL normalization across the application,
 * specifically addressing bucket duplication issues in Tigris S3 URLs.
 */

import { fixBucketDuplication } from "../services/s3-video";

interface VideoWithUrls {
  id?: string;
  m3u8?: string | null;
  storageLink?: string | null;
}

interface NormalizedVideoResult extends VideoWithUrls {
  _urlsChanged: boolean;
  _changes: {
    m3u8?: { before: string; after: string };
    storageLink?: { before: string; after: string };
  };
}

/**
 * Normalizes video URLs to fix bucket duplication and endpoint issues
 */
export const normalizeVideoUrls = <T extends VideoWithUrls>(video: T): T & NormalizedVideoResult => {
  if (!video) return video as T & NormalizedVideoResult;
  
  const bucketName = process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME || "wild-bird-2039";
  const tigrisEndpoint = process.env.AWS_ENDPOINT_URL_S3 || "https://fly.storage.tigris.dev";
  
  const result = { ...video } as T & NormalizedVideoResult;
  result._urlsChanged = false;
  result._changes = {};
  
  // Fix m3u8 URL
  if (video.m3u8) {
    let fixedM3u8 = video.m3u8;
    
    // First fix AWS endpoint to Tigris endpoint  
    if (fixedM3u8.includes('.s3.auto.amazonaws.com/')) {
      fixedM3u8 = fixedM3u8.replace(
        `https://${bucketName}.s3.auto.amazonaws.com/`,
        `${tigrisEndpoint}/${bucketName}/`
      );
    }
    
    // Then fix bucket duplication (in case endpoint replacement created it)
    fixedM3u8 = fixBucketDuplication(fixedM3u8, bucketName);
    
    if (fixedM3u8 !== video.m3u8) {
      result._urlsChanged = true;
      result._changes.m3u8 = { before: video.m3u8, after: fixedM3u8 };
      result.m3u8 = fixedM3u8;
    }
  }
  
  // Fix storageLink URL
  if (video.storageLink) {
    const fixedStorageLink = fixBucketDuplication(video.storageLink, bucketName);
    
    if (fixedStorageLink !== video.storageLink) {
      result._urlsChanged = true;
      result._changes.storageLink = { before: video.storageLink, after: fixedStorageLink };
      result.storageLink = fixedStorageLink;
    }
  }
  
  return result;
};

/**
 * Normalizes an array of videos and returns normalization statistics
 */
export const normalizeVideoArray = <T extends VideoWithUrls>(
  videos: T[]
): {
  normalizedVideos: (T & NormalizedVideoResult)[];
  statistics: {
    total: number;
    changed: number;
    m3u8Fixed: number;
    storageLinkFixed: number;
  };
} => {
  const normalizedVideos = videos.map(video => normalizeVideoUrls(video));
  
  const statistics = {
    total: videos.length,
    changed: normalizedVideos.filter(v => v._urlsChanged).length,
    m3u8Fixed: normalizedVideos.filter(v => v._changes.m3u8).length,
    storageLinkFixed: normalizedVideos.filter(v => v._changes.storageLink).length,
  };
  
  return { normalizedVideos, statistics };
};

/**
 * Type guard to check if a video has URL normalization data
 */
export const isNormalizedVideo = (video: any): video is VideoWithUrls & NormalizedVideoResult => {
  return video && typeof video._urlsChanged === 'boolean';
};

/**
 * Helper to log normalization changes
 */
export const logNormalizationChanges = (video: VideoWithUrls & NormalizedVideoResult, context = '') => {
  if (!video._urlsChanged) return;
  
  const prefix = context ? `[${context}]` : '';
  console.log(`🔧 ${prefix} URL normalization for video ${video.id || 'unknown'}:`);
  
  if (video._changes.m3u8) {
    console.log(`   m3u8: ${video._changes.m3u8.before} -> ${video._changes.m3u8.after}`);
  }
  
  if (video._changes.storageLink) {
    console.log(`   storageLink: ${video._changes.storageLink.before} -> ${video._changes.storageLink.after}`);
  }
};