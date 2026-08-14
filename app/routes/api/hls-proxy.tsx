import { Effect } from "effect";
import { s3VideoService } from "~/.server/services/s3-video";
import { generateHlsToken, validateHlsToken } from "~/utils/tokens";

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
    // Check if this is a direct video file (.mp4, .webm, etc.) - not HLS
    const isDirectVideo = /\.(mp4|webm|mov|avi)$/i.test(hlsPath) ||
      // Also handle paths without extension (legacy video-xxx format)
      (!hlsPath.includes('.') && hlsPath.includes('video-'));

    if (isDirectVideo) {
      // Generate presigned URL and redirect to it
      const presignedUrl = await Effect.runPromise(
        s3VideoService.getHLSPresignedUrl(hlsPath, 3600) // 1 hour
      );

      // For videos, redirect to presigned URL directly
      // This allows the browser to handle range requests properly
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': presignedUrl,
        },
      });
    }

    // Los segmentos y los playlists de calidad vienen firmados desde el master.
    // El master (la primera petición) es el único que entra sin token.
    const isSubRequest = hlsPath.endsWith('.ts') || hlsPath.endsWith('.m3u8');
    if (isSubRequest) {
      const token = url.searchParams.get('t');
      const { isValid, error } = validateHlsToken(token, hlsPath);
      // Sin token: puede ser el master. Con token inválido: se rechaza siempre.
      if (token && !isValid) {
        return new Response(error, { status: 403, headers: corsHeaders });
      }
      if (!token && hlsPath.endsWith('.ts')) {
        return new Response('Falta el token de acceso', { status: 403, headers: corsHeaders });
      }
    }

    // Segmentos: 302 al presigned. Los bytes salen de Tigris, no de esta máquina.
    // Tigris atiende los Range requests directo y el bucket ya tiene CORS abierto,
    // que es lo que permite que hls.js siga el redirect desde un XHR.
    if (hlsPath.endsWith('.ts')) {
      const presignedUrl = await Effect.runPromise(
        s3VideoService.getHLSPresignedUrl(hlsPath, 3600) // 1 hour for segments
      );

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': presignedUrl,
        },
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
    // IMPORTANT: Always use HTTPS to avoid Mixed Content errors
    // In production (Fly.io), SSL terminates at load balancer, so request may come as HTTP
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const protocol = isLocalhost ? url.protocol : 'https:';
    const proxyBaseUrl = `${protocol}//${url.host}/api/hls-proxy?path=`;

    // La línea apunta al proxy (corta, ~50 chars de token) y no al presigned de Tigris
    // (~700 chars por línea, que es lo que rompía Safari). El proxy sólo redirige.
    const proxyLink = (fullPath: string) => {
      const prefix = fullPath.substring(0, fullPath.lastIndexOf('/') + 1);
      const token = generateHlsToken(prefix);
      return `${proxyBaseUrl}${encodeURIComponent(fullPath)}&t=${token}`;
    };

    let rewrittenContent = m3u8Content;

    if (isMasterPlaylist) {
      // Master playlist: rewrite quality playlist references (e.g., 720p/720p.m3u8)
      rewrittenContent = m3u8Content.replace(
        /^([^#\s].+\.m3u8)$/gm,
        (match) => proxyLink(basePath + match)
      );
    } else {
      // Media playlist: rewrite segment references (e.g., seg_001.ts)
      rewrittenContent = m3u8Content.replace(
        /^([^#\s].+\.ts)$/gm,
        (match) => proxyLink(basePath + match)
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
