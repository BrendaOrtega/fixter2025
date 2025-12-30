import { Effect } from "effect";
import { s3VideoService } from "~/.server/services/s3-video";

/**
 * HLS Proxy Endpoint
 *
 * This endpoint fetches m3u8 playlists from S3 and rewrites relative URLs
 * to absolute presigned URLs, solving the HLS playback issue with private buckets.
 *
 * Supports Range Requests for iOS Safari compatibility.
 */

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};

// Handle CORS preflight for iOS Safari
export const action = async ({ request }: { request: Request }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  return new Response('Method not allowed', { status: 405 });
};

export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const hlsPath = url.searchParams.get("path");

  if (!hlsPath) {
    return new Response("Missing 'path' parameter", { status: 400 });
  }

  try {
    // Check if this is a segment request (.ts file)
    if (hlsPath.endsWith('.ts')) {
      // Stream the segment directly
      const presignedUrl = await Effect.runPromise(
        s3VideoService.getHLSPresignedUrl(hlsPath, 3600) // 1 hour for segments
      );

      // Forward Range header if present (critical for iOS Safari)
      const fetchHeaders: HeadersInit = {};
      const rangeHeader = request.headers.get('Range');
      if (rangeHeader) {
        fetchHeaders['Range'] = rangeHeader;
      }

      const response = await fetch(presignedUrl, { headers: fetchHeaders });
      if (!response.ok && response.status !== 206) {
        throw new Error(`Failed to fetch segment: ${response.status}`);
      }

      // Build response headers - pass through important ones from S3
      const responseHeaders = new Headers({
        'Content-Type': 'video/MP2T',
        'Cache-Control': 'private, max-age=1800',
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes',
      });

      // Pass through size headers for proper seeking
      const contentLength = response.headers.get('Content-Length');
      const contentRange = response.headers.get('Content-Range');
      if (contentLength) responseHeaders.set('Content-Length', contentLength);
      if (contentRange) responseHeaders.set('Content-Range', contentRange);

      return new Response(response.body, {
        status: response.status, // 200 or 206 for partial content
        headers: responseHeaders,
      });
    }

    // Get presigned URL and fetch the m3u8 content
    const presignedUrl = await Effect.runPromise(
      s3VideoService.getHLSPresignedUrl(hlsPath, 300) // 5 min expiry for proxy
    );

    const response = await fetch(presignedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch m3u8: ${response.status}`);
    }

    const m3u8Content = await response.text();

    // Check if this is a master playlist or a media playlist
    const isMasterPlaylist = m3u8Content.includes('#EXT-X-STREAM-INF');

    // Get the base path for resolving relative URLs
    const basePath = hlsPath.substring(0, hlsPath.lastIndexOf('/') + 1);

    // Rewrite relative URLs to use the proxy
    const proxyBaseUrl = `${url.origin}/api/hls-proxy?path=`;

    let rewrittenContent = m3u8Content;

    if (isMasterPlaylist) {
      // Master playlist: rewrite quality playlist references (e.g., 720p/720p.m3u8)
      rewrittenContent = m3u8Content.replace(
        /^([^#\s].+\.m3u8)$/gm,
        (match) => {
          const fullPath = basePath + match;
          return `${proxyBaseUrl}${encodeURIComponent(fullPath)}`;
        }
      );
    } else {
      // Media playlist: rewrite segment references (e.g., seg_001.ts)
      // Route segments through proxy too (Safari has issues with long presigned URLs)
      rewrittenContent = m3u8Content.replace(
        /^([^#\s].+\.ts)$/gm,
        (match) => {
          const fullPath = basePath + match;
          return `${proxyBaseUrl}${encodeURIComponent(fullPath)}`;
        }
      );
    }

    return new Response(rewrittenContent, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error("HLS Proxy error:", error);
    return new Response(
      `Error loading HLS content: ${error instanceof Error ? error.message : 'Unknown'}`,
      { status: 500 }
    );
  }
};
