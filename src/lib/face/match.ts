/**
 * Server-side face descriptor comparison (anti-buddy-punch).
 *
 * The browser (face-api.js) computes a 128-float "face print" / descriptor — a
 * non-reversible math representation, NOT a photo. We store the enrolled
 * descriptor and, at clock-in, compute the Euclidean distance between it and
 * the punch's descriptor. The threshold decision lives HERE on the server so a
 * client can't simply claim "match: true".
 *
 * face-api's faceRecognitionNet is calibrated such that a Euclidean distance
 * < ~0.6 between descriptors indicates the same person. We use 0.6.
 */
export const FACE_DESCRIPTOR_LEN = 128;
export const FACE_MATCH_THRESHOLD = 0.6;

export function isValidDescriptor(arr: unknown): arr is number[] {
  return (
    Array.isArray(arr) &&
    arr.length === FACE_DESCRIPTOR_LEN &&
    arr.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

export function parseDescriptor(json: string | null | undefined): number[] | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json);
    return isValidDescriptor(arr) ? arr : null;
  } catch {
    return null;
  }
}

export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Compare two descriptors. Lower distance = more similar; match if <= threshold. */
export function compareFaces(enrolled: number[], candidate: number[]): { distance: number; match: boolean } {
  const distance = euclideanDistance(enrolled, candidate);
  return { distance, match: distance <= FACE_MATCH_THRESHOLD };
}

export type FaceVerificationMode = "off" | "flag" | "block";
export function normalizeFaceMode(v: string | null | undefined): FaceVerificationMode {
  return v === "flag" || v === "block" ? v : "off";
}
