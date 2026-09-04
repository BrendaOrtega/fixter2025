import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { Effect } from "effect";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { s3VideoService } from "./s3-video";
import type { HLSFile } from "./s3-video";

// Video processing service for HLS conversion
export interface VideoProcessorService {
  processVideoToHLS: (
    courseId: string,
    videoId: string,
    videoS3Key: string
  ) => Effect.Effect<HLSProcessingResult, VideoProcessingError>;
}

export interface HLSProcessingResult {
  masterPlaylistUrl: string;
  qualities: QualityVariant[];
  duration: number;
  processingTime: number;
}

export interface QualityVariant {
  resolution: string;
  bitrate: string;
  /// Techo real del codificador (-maxrate). Es lo que va en BANDWIDTH.
  maxrate: string;
  playlistPath: string;
}

export class VideoProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "VideoProcessingError";
  }
}

// FFmpeg configurations for different qualities
const QUALITY_CONFIGS = [
  {
    name: "1080p",
    resolution: "1920x1080",
    videoBitrate: "5000k",
    audioBitrate: "192k",
    maxrate: "5350k",
    bufsize: "7500k",
  },
  {
    name: "720p",
    resolution: "1280x720",
    videoBitrate: "2800k",
    audioBitrate: "128k",
    maxrate: "3000k",
    bufsize: "4200k",
  },
  {
    name: "480p",
    resolution: "852x480",
    videoBitrate: "1400k",
    audioBitrate: "128k",
    maxrate: "1500k",
    bufsize: "2100k",
  },
];

// Helper to run ffmpeg command
const runFFmpeg = (args: string[]): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath.path, args);
    let stdout = "";
    let stderr = "";

    ffmpeg.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
};

// Get video duration using ffprobe
const getVideoDuration = async (inputPath: string): Promise<number> => {
  try {
    const args = [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath
    ];
    
    const result = await runFFmpeg(args);
    return parseFloat(result.stdout.trim()) || 0;
  } catch {
    return 0;
  }
};

// Video Processor Service implementation
export const VideoProcessorServiceLive: VideoProcessorService = {
  processVideoToHLS: (courseId: string, videoId: string, videoS3Key: string) =>
    Effect.gen(function* () {
      const startTime = Date.now();
      const tempDir = path.join(os.tmpdir(), `video-${videoId}-${Date.now()}`);
      
      try {
        // Create temp directory
        yield* Effect.tryPromise({
          try: () => fs.mkdir(tempDir, { recursive: true }),
          catch: (error) =>
            new VideoProcessingError(
              `Failed to create temp directory: ${error}`,
              "TEMP_DIR_ERROR",
              error
            ),
        });

        // Download video from S3
        console.log(`📥 Downloading video from S3: ${videoS3Key}`);
        const videoBuffer = yield* s3VideoService.downloadVideo(videoS3Key);
        const inputPath = path.join(tempDir, "input.mp4");
        
        yield* Effect.tryPromise({
          try: () => fs.writeFile(inputPath, Buffer.from(videoBuffer)),
          catch: (error) =>
            new VideoProcessingError(
              `Failed to write video file: ${error}`,
              "WRITE_ERROR",
              error
            ),
        });

        // Get video duration. getVideoDuration ya devuelve 0 si falla, así que
        // no puede rechazar: con tryPromise, el `catch: () => 0` metía `number`
        // en el canal de error del Effect y rompía la firma del servicio.
        const duration = yield* Effect.promise(() => getVideoDuration(inputPath));

        console.log(`🎬 Processing video to HLS (duration: ${duration}s)`);

        // Process each quality variant
        const qualities: QualityVariant[] = [];
        const hlsFiles: HLSFile[] = [];

        for (const config of QUALITY_CONFIGS) {
          const outputDir = path.join(tempDir, config.name);
          yield* Effect.tryPromise({
            try: () => fs.mkdir(outputDir, { recursive: true }),
            catch: (error) =>
              new VideoProcessingError(
                `Failed to create output directory: ${error}`,
                "MKDIR_ERROR",
                error
              ),
          });

          const playlistName = `${config.name}.m3u8`;
          const outputPath = path.join(outputDir, playlistName);

          console.log(`  🎯 Processing ${config.name}...`);

          // FFmpeg command for HLS conversion - configuración ultra-simple para Mac
          const [width, height] = config.resolution.split('x');
          console.log(`    📐 Target resolution: ${width}x${height}`);
          
          const ffmpegArgs = [
            "-i", inputPath,
            "-c:v", "libx264",
            "-c:a", "aac",
            // Video settings ultra-simples - solo scale básico sin expresiones complejas
            "-vf", `scale=${width}:${height}`,
            "-b:v", config.videoBitrate,
            // Sin techo, un tramo con mucho movimiento dispara el segmento a
            // varias veces el bitrate objetivo y el reproductor se queda sin
            // búfer justo ahí. maxrate/bufsize ya estaban en la config y no se
            // estaban pasando.
            "-maxrate", config.maxrate,
            "-bufsize", config.bufsize,
            "-b:a", config.audioBitrate,
            // HLS settings mínimos
            "-f", "hls",
            "-hls_time", "10", // segmentos más largos para menos complejidad
            "-hls_list_size", "0",
            "-hls_segment_filename", path.join(outputDir, "seg_%03d.ts"),
            "-preset", "ultrafast", // fastest preset para menos procesamiento
            outputPath,
          ];

          // Log completo del comando para debug en Mac
          console.log(`    🔧 FFmpeg command: ${ffmpegPath.path} ${ffmpegArgs.join(' ')}`);

          yield* Effect.tryPromise({
            try: () => runFFmpeg(ffmpegArgs),
            catch: (error) =>
              new VideoProcessingError(
                `FFmpeg conversion failed for ${config.name}: ${error}`,
                "FFMPEG_ERROR",
                error
              ),
          });

          // Read generated files
          const files = yield* Effect.tryPromise({
            try: () => fs.readdir(outputDir),
            catch: (error) =>
              new VideoProcessingError(
                `Failed to read output directory: ${error}`,
                "READ_DIR_ERROR",
                error
              ),
          });

          // Prepare files for upload
          for (const file of files) {
            const filePath = path.join(outputDir, file);
            const content = yield* Effect.tryPromise({
              try: () => fs.readFile(filePath),
              catch: (error) =>
                new VideoProcessingError(
                  `Failed to read file ${file}: ${error}`,
                  "READ_FILE_ERROR",
                  error
                ),
            });

            hlsFiles.push({
              key: `${config.name}/${file}`,
              content,
              contentType: file.endsWith(".m3u8")
                ? "application/x-mpegURL"
                : "video/MP2T",
            });
          }

          qualities.push({
            resolution: config.resolution,
            bitrate: config.videoBitrate,
            maxrate: config.maxrate,
            playlistPath: `${config.name}/${playlistName}`,
          });
        }

        // Generate master playlist
        console.log("  📝 Generating master playlist...");
        const masterPlaylist = generateMasterPlaylist(qualities);
        hlsFiles.push({
          key: "master.m3u8",
          content: Buffer.from(masterPlaylist),
          contentType: "application/x-mpegURL",
        });

        // Upload all HLS files to S3
        console.log("  ☁️ Uploading HLS files to S3...");
        const uploadResult = yield* s3VideoService.uploadHLSFiles(
          courseId,
          videoId,
          hlsFiles
        );

        const processingTime = (Date.now() - startTime) / 1000;
        console.log(`✅ HLS processing completed in ${processingTime}s`);

        return {
          masterPlaylistUrl: uploadResult.masterPlaylistUrl,
          qualities,
          duration,
          processingTime,
        };
      } finally {
        // Clean up temp directory - do it asynchronously, no need to wait
        fs.rm(tempDir, { recursive: true, force: true }).catch((error) => {
          console.error("Failed to clean up temp directory:", error);
        });
      }
    }),
};

// Generate master playlist for adaptive bitrate streaming
//
// BANDWIDTH lleva el TECHO de cada calidad, no su promedio: la especificación de
// HLS pide el pico, y declarar el promedio hace que el reproductor escoja una
// calidad que no puede sostener — el video se congela en los segmentos pesados
// hasta que el usuario adelanta. Las variantes van de menor a mayor para que el
// arranque sea por la ligera.
function generateMasterPlaylist(qualities: QualityVariant[]): string {
  let playlist = "#EXTM3U\n#EXT-X-VERSION:3\n";

  const toBps = (value: string) => parseInt(value) * 1000;
  const sorted = [...qualities].sort(
    (a, b) => Number(a.resolution.split("x")[1]) - Number(b.resolution.split("x")[1])
  );

  for (const quality of sorted) {
    const bandwidth = toBps(quality.maxrate ?? quality.bitrate);
    const average = toBps(quality.bitrate);

    playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},AVERAGE-BANDWIDTH=${average},RESOLUTION=${quality.resolution}\n`;
    playlist += `${quality.playlistPath}\n`;
  }

  return playlist;
}

// Export service instance
export const videoProcessorService = VideoProcessorServiceLive;