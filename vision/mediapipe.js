/**
 * Layer 2: Processing Layer - MediaPipe Wrapper
 * High-performance landmarks extraction using GPU.
 */

import { HandLandmarker, FilesetResolver } from '../lib/mediapipe/vision_bundle.mjs';

export class VisionProcessor {
    constructor() {
        this.handLandmarker = null;
        this.isProcessing = false;
        this.onResults = null;
    }

    async init() {
        if (this.handLandmarker) return;

        console.log("[VisionProcessor] Initializing MediaPipe with local WASM...");
        const vision = await FilesetResolver.forVisionTasks(
            chrome.runtime.getURL("lib/mediapipe/wasm")
        );

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
        console.log("[VisionProcessor] MediaPipe Ready (GPU)");
    }

    async processFrame(videoElement, timestamp) {
        if (!this.handLandmarker || this.isProcessing) return;

        this.isProcessing = true;
        try {
            const results = this.handLandmarker.detectForVideo(videoElement, timestamp);
            if (this.onResults) {
                this.onResults({
                    landmarks: results.landmarks,
                    worldLandmarks: results.worldLandmarks,
                    handedness: results.handednesses,
                    timestamp
                });
            }
        } catch (err) {
            console.error("[VisionProcessor] Detection error:", err);
        }
        this.isProcessing = false;
    }
}
