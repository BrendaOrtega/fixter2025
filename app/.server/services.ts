import { Layer } from "effect";
import { S3ServiceLive } from "./s3.service";
import { OpenRouterTTSServiceLive } from "./openrouter.service";

// Combined services layer
export const ServicesLive = Layer.mergeAll(
  S3ServiceLive,
  OpenRouterTTSServiceLive
);

// Re-export service interfaces and tags
export { S3Service, type S3Service as S3ServiceInterface } from "./s3.service";
export {
  OpenRouterTTSService,
  type OpenRouterTTSService as OpenRouterTTSServiceInterface,
} from "./openrouter.service";
