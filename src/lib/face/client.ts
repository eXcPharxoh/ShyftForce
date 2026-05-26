/**
 * Browser-only face helpers (anti-buddy-punch). Loads face-api.js + its model
 * weights lazily from a CDN the first time they're needed, then computes a
 * 128-float descriptor ("face print") from a camera frame. Only the descriptor
 * (numbers) ever leaves the device — never the photo.
 *
 * Everything is dynamically imported so face-api (which touches `window`) is
 * never evaluated during SSR and ships as its own on-demand client chunk.
 */

// Model weights are served straight from the published package on jsDelivr, so
// we don't have to commit ~6MB of binaries. Pinned to the installed version.
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

let faceapiPromise: Promise<typeof import("@vladmandic/face-api")> | null = null;
let modelsPromise: Promise<void> | null = null;

function getFaceApi() {
  if (!faceapiPromise) faceapiPromise = import("@vladmandic/face-api");
  return faceapiPromise;
}

/** Idempotently load the three nets we need (detector + landmarks + recognition). */
export async function ensureFaceModels(): Promise<void> {
  if (modelsPromise) return modelsPromise;
  modelsPromise = (async () => {
    const faceapi = await getFaceApi();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  })().catch((e) => {
    modelsPromise = null; // allow retry on failure
    throw e;
  });
  return modelsPromise;
}

export type FaceResult =
  | { ok: true; descriptor: number[] }
  | { ok: false; reason: "no_face" | "load_failed" };

/** Detect a single face in the frame and return its 128-float descriptor. */
export async function computeFaceDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<FaceResult> {
  let faceapi: typeof import("@vladmandic/face-api");
  try {
    faceapi = await getFaceApi();
    await ensureFaceModels();
  } catch {
    return { ok: false, reason: "load_failed" };
  }
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection?.descriptor) return { ok: false, reason: "no_face" };
  return { ok: true, descriptor: Array.from(detection.descriptor as Float32Array) };
}
