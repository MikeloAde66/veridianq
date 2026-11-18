import { fal } from "@fal-ai/client";

// Server-side only. FAL_KEY must never be exposed to the client —
// this file is only ever imported from app/api/** route handlers.
if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

export { fal };

export const MODELS = {
  // Text-to-image / image-to-image (Flux)
  textToImage: "fal-ai/flux/dev",
  imageToImage: "fal-ai/flux/dev/image-to-image",
  // Image -> real rotatable 3D mesh (glb)
  imageTo3D: "fal-ai/trellis",
} as const;
