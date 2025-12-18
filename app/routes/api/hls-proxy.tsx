import { Effect } from "effect";
import { s3VideoService } from "~/.server/services/s3-video";

/**
 * HLS Proxy Endpoint
 *
 * This endpoint fetches m3u8 playlists from S3 and rewrites relative URLs
 * to absolute presigned URLs, solving the HLS playback issue with private buckets.
 */
export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const hlsPath = url.searchParams.get("path");

  if (!hlsPath) {
    return new Response("Missing 'path' parameter", { status: 400 });
  }

  try {
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
      // For segments, we generate presigned URLs directly (more efficient)
      const lines = m3u8Content.split('\n');
      const rewrittenLines = await Promise.all(
        lines.map(async (line) => {
          if (line.startsWith('#') || line.trim() === '') {
            return line;
          }
          // This is a segment reference
          const segmentPath = basePath + line.trim();
          try {
            const presignedUrl = await Effect.runPromise(
              s3VideoService.getHLSPresignedUrl(segmentPath, 3600)
            );
            return presignedUrl;
          } catch (err) {
            console.error(`Failed to presign segment: ${segmentPath}`, err);
            return line;
          }
        })
      );
      rewrittenContent = rewrittenLines.join('\n');
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
