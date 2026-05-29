/**
 * Lightweight liveness gesture check. The user is shown a randomly-chosen
 * prompt (blink twice, turn head left/right) BEFORE we capture the descriptor —
 * a still photo can't satisfy it. This is "casual-grade" anti-spoof — it
 * blocks the printed-photo and unattended-screen attacks; a sophisticated
 * deep-fake video attack would still need real liveness vendor (FaceTec etc).
 *
 * We use face-api's landmark detector to track the face over a few hundred ms
 * and detect the gesture:
 *   • blink     → eye-aspect ratio (EAR) dips below threshold ≥2 times
 *   • turn_left → nose x-coord drifts well left of face centre and back
 *   • turn_right → mirror of left
 */

import { ensureFaceModels } from "./client";

export type LivenessGesture = "blink" | "turn_left" | "turn_right";

export function pickRandomGesture(): LivenessGesture {
  const gs: LivenessGesture[] = ["blink", "turn_left", "turn_right"];
  return gs[Math.floor(Math.random() * gs.length)];
}

export function gestureLabel(g: LivenessGesture): string {
  switch (g) {
    case "blink":      return "Blink twice";
    case "turn_left":  return "Turn your head left, then back";
    case "turn_right": return "Turn your head right, then back";
  }
}

/** Pixel-distance helper. */
function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
/** Eye aspect ratio — closed when ≲ 0.2, fully open ~ 0.3+. */
function eyeAspectRatio(eye: { x: number; y: number }[]) {
  // 6-point eye landmarks: vertical1 = pts[1]-pts[5], vertical2 = pts[2]-pts[4],
  // horizontal = pts[0]-pts[3].
  const v1 = dist(eye[1]!, eye[5]!);
  const v2 = dist(eye[2]!, eye[4]!);
  const h  = dist(eye[0]!, eye[3]!);
  return (v1 + v2) / (2 * h);
}

/**
 * Records up to `maxMs` of frames from the video element while watching for
 * the requested gesture. Resolves to true on success, false on timeout.
 */
export async function detectLiveness(
  video: HTMLVideoElement,
  gesture: LivenessGesture,
  maxMs: number = 4500,
): Promise<boolean> {
  const faceapi = (await import("@vladmandic/face-api")).default ?? (await import("@vladmandic/face-api"));
  await ensureFaceModels();
  const start = performance.now();
  let blinkLow = false;
  let blinks = 0;
  // For head-turn, watch the nose-tip x relative to face-bbox centre.
  let extreme = false;
  let returned = false;
  const minLeftFrac = 0.30;  // nose-x / face-width when fully left
  const maxRightFrac = 0.70; // nose-x / face-width when fully right

  while (performance.now() - start < maxMs) {
    const det = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
      .withFaceLandmarks();
    if (det) {
      const lm = det.landmarks;
      if (gesture === "blink") {
        const leftEAR = eyeAspectRatio(lm.getLeftEye() as any);
        const rightEAR = eyeAspectRatio(lm.getRightEye() as any);
        const ear = (leftEAR + rightEAR) / 2;
        if (ear < 0.20) blinkLow = true;
        if (blinkLow && ear > 0.27) { blinks++; blinkLow = false; }
        if (blinks >= 2) return true;
      } else {
        const box = det.detection.box;
        const nose = lm.getNose()[3]!; // tip
        const frac = (nose.x - box.x) / box.width;
        if (gesture === "turn_left") {
          if (frac < minLeftFrac) extreme = true;
          if (extreme && frac > 0.45) { returned = true; return true; }
        } else if (gesture === "turn_right") {
          if (frac > maxRightFrac) extreme = true;
          if (extreme && frac < 0.55) { returned = true; return true; }
        }
      }
    }
    // small yield so we don't peg the CPU
    await new Promise((r) => setTimeout(r, 90));
  }
  return false;
}
