/**
 * Layer 3: Gesture Classification Layer
 * Detects hand poses from landmarks with confidence, stabilization, and cooldowns.
 */
export class GestureClassifier {
    constructor() {
        this.STABILIZATION_FRAMES = 5;
        this.CONFIDENCE_THRESHOLD = 0.85;
        this.GESTURE_COOLDOWN = 800; // ms

        this.frameCounter = 0;
        this.lastGesture = null;
        this.lastTriggerTime = 0;
        this.stableGesture = null;

        this.onGesture = null;
    }

    classify(results) {
        if (!results || !results.landmarks || results.landmarks.length === 0) {
            this.reset();
            return null;
        }

        // Professional requirement: High confidence only
        const worldLandmarks = results.worldLandmarks ? results.worldLandmarks[0] : null;
        const landmarks = results.landmarks[0];
        
        // Note: HandLandmarker results don't provide per-landmark confidence in the Task, 
        // but the overall detection has confidence.
        // We'll focus on the geometric stability.

        const gesture = this.detectPose(landmarks, worldLandmarks);
        
        if (gesture === this.lastGesture && gesture !== null) {
            this.frameCounter++;
        } else {
            this.frameCounter = 0;
            this.lastGesture = gesture;
        }

        // Logic: Stability check
        if (this.frameCounter >= this.STABILIZATION_FRAMES) {
            if (Date.now() - this.lastTriggerTime > this.GESTURE_COOLDOWN) {
                if (this.onGesture && gesture !== this.stableGesture) {
                    this.onGesture(gesture);
                    this.lastTriggerTime = Date.now();
                }
                this.stableGesture = gesture;
            }
        } else if (this.frameCounter === 0) {
            this.stableGesture = null;
        }

        return gesture;
    }

    reset() {
        this.frameCounter = 0;
        this.lastGesture = null;
        this.stableGesture = null;
    }

    detectPose(lm, wlm) {
        const ext = [
            this.isExtended(lm, 0), // Thumb
            this.isExtended(lm, 1), // Index
            this.isExtended(lm, 2), // Middle
            this.isExtended(lm, 3), // Ring
            this.isExtended(lm, 4)  // Pinky
        ];
        const extCount = ext.filter(x => x).length;

        // 1. ☝ MOVE (Index Extended, others folded)
        if (ext[1] && extCount === 1) return "MOVE";

        // 2. 🤏 CLICK (Pinch: Thumb and Index tips touching)
        if (this.dist(lm[4], lm[8]) < 0.04 && extCount <= 2) return "CLICK";

        // 3. 🤟 RIGHT_CLICK (Rock Sign: Index and Pinky extended)
        if (ext[1] && ext[4] && !ext[2] && !ext[3]) return "RIGHT_CLICK";

        // 4. 🖐 SCROLL (Open Palm: All extended)
        if (extCount >= 4) return "SCROLL";

        // 5. 👉 NEXT (Point Right: Index extended, horizontal orientation)
        if (ext[1] && extCount === 1 && Math.abs(lm[8].x - lm[5].x) > Math.abs(lm[8].y - lm[5].y)) {
             if (lm[8].x > lm[5].x) return "NEXT";
             if (lm[8].x < lm[5].x) return "PREVIOUS";
        }

        // 7. ✊ PAUSE (Fist: All folded)
        if (extCount === 0 && this.dist(lm[8], lm[0]) < 0.2) return "PAUSE";

        return null;
    }

    isExtended(lm, fingerIdx) {
        const tip = [4, 8, 12, 16, 20][fingerIdx];
        const pip = [2, 6, 10, 14, 18][fingerIdx];
        const mcp = [1, 5, 9, 13, 17][fingerIdx];
        const wrist = 0;

        // Rotation-invariant check: distance from wrist
        // 1.05 instead of 1.1 makes it slightly more lenient for noisy tracking
        return this.dist(lm[tip], lm[wrist]) > this.dist(lm[pip], lm[wrist]) * 1.05;
    }

    dist(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }
}
