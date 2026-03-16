/**
 * Handles Audio, Video, and Screen capture
 */
import { FilesetResolver, FaceLandmarker } from "./lib/mediapipe/vision_bundle.js";

export class AudioHandler {
    constructor(onAudioData) {
        this.onAudioData = onAudioData;
        this.stream = null;
        this.audioContext = null;
        this.processor = null;
    }

    async start() {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = new AudioContext({ sampleRate: 16000 });
        const source = this.audioContext.createMediaStreamSource(this.stream);
        
        // Use a ScriptProcessorNode for simplicity in this prototype
        // In a real app, use AudioWorklet
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
        
        this.processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = this.floatTo16BitPCM(inputData);
            const base64Data = this.arrayBufferToBase64(pcmData);
            this.onAudioData(base64Data);
        };

        source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }

    floatTo16BitPCM(input) {
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}

export class VideoHandler {
    constructor(onFrame, onBiomarkerDetected) {
        this.onFrame = onFrame;
        this.onBiomarkerDetected = onBiomarkerDetected;
        this.stream = null;
        this.videoElement = document.getElementById('video-preview');
        this.canvas = document.getElementById('video-canvas');
        this.container = document.getElementById('camera-section');
        this.timer = null;
        this.faceLandmarker = null;
        this.lastVideoTime = -1;
        this.isDetecting = false;
        this.activeLabels = new Set();
        this.labelTimeout = null;
        this.fps = 0;
        this.lastFrameTime = performance.now();
        this.latency = 0;
        this.topBlendshapes = [];
        this.cognitiveStages = [];
    }
    async initMediaPipe() {
        try {
            const wasmPath = chrome.runtime.getURL("lib/mediapipe/wasm");
            const modelPath = chrome.runtime.getURL("lib/mediapipe/face_landmarker.task");
            
            const vision = await FilesetResolver.forVisionTasks(wasmPath);
            this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: modelPath,
                    delegate: "CPU"
                },
                outputFaceBlendshapes: true,
                runningMode: "VIDEO",
                numFaces: 1
            });
            console.log("MediaPipe Face Landmarker loaded from local extension path!");
        } catch (e) {
            console.error("Failed to load Face Landmarker", e);
        }
    }

    async start(type = 'camera') {
        if (!this.faceLandmarker && type === 'camera') {
            await this.initMediaPipe();
        }

        if (type === 'camera') {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
        } else {
            this.stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        }

        this.videoElement.srcObject = this.stream;
        if (this.container) this.container.style.display = 'block';

        // Wait for video to be ready before starting loops
        this.videoElement.onloadedmetadata = () => {
             // Gemini Loop (1 FPS)
            this.timer = setInterval(() => {
                this.captureFrame();
            }, 1000); 

            // MediaPipe Loop (Continuous)
            if (type === 'camera' && this.faceLandmarker) {
                this.isDetecting = true;
                this.predictWebcam();
            }
        }
    }

    async predictWebcam() {
        if (!this.isDetecting || !this.videoElement) return;

        let startTimeMs = performance.now();
        if (this.lastVideoTime !== this.videoElement.currentTime) {
            this.lastVideoTime = this.videoElement.currentTime;
            
            // Throttling: Only run detection at ~15 FPS (66ms interval)
            const now = performance.now();
            if (now - this.lastFrameTime >= 66) { 
                // Sync canvas resolution to video resolution
                if (this.canvas.width !== this.videoElement.videoWidth || this.canvas.height !== this.videoElement.videoHeight) {
                    this.canvas.width = this.videoElement.videoWidth;
                    this.canvas.height = this.videoElement.videoHeight;
                }

                try {
                    const startTime = performance.now();
                    const results = this.faceLandmarker.detectForVideo(this.videoElement, startTimeMs);
                    this.latency = performance.now() - startTime;
                    
                    this.fps = Math.round(1000 / (now - this.lastFrameTime));
                    this.lastFrameTime = now;

                    this.analyzeBiomarkers(results);
                    this.drawResults(results);
                } catch(e) {
                    // Ignore silent mediapipe errors
                }
            }
        }

        // Keep looping
        window.requestAnimationFrame(() => this.predictWebcam());
    }

    analyzeBiomarkers(results) {
        if (!results.faceBlendshapes || results.faceBlendshapes.length === 0) return;
        if (!this.onBiomarkerDetected) return;

        this.topBlendshapes = [...results.faceBlendshapes[0].categories]
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);

        const shapes = results.faceBlendshapes[0].categories;
        const now = Date.now();

        // Find relevant blendshape scores
        let squintLeft = 0, squintRight = 0, frownLeft = 0, frownRight = 0, eyeClosedLeft = 0, eyeClosedRight = 0;
        let browInnerUp = 0, browDownLeft = 0, browDownRight = 0, mouthPucker = 0, mouthPressLeft = 0, mouthPressRight = 0;
        
        shapes.forEach(shape => {
            if (shape.categoryName === 'eyeSquintLeft') squintLeft = shape.score;
            if (shape.categoryName === 'eyeSquintRight') squintRight = shape.score;
            if (shape.categoryName === 'mouthFrownLeft') frownLeft = shape.score;
            if (shape.categoryName === 'mouthFrownRight') frownRight = shape.score;
            if (shape.categoryName === 'eyeBlinkLeft') eyeClosedLeft = shape.score;
            if (shape.categoryName === 'eyeBlinkRight') eyeClosedRight = shape.score;
            if (shape.categoryName === 'browInnerUp') browInnerUp = shape.score;
            if (shape.categoryName === 'browDownLeft') browDownLeft = shape.score;
            if (shape.categoryName === 'browDownRight') browDownRight = shape.score;
            if (shape.categoryName === 'mouthPucker') mouthPucker = shape.score;
            if (shape.categoryName === 'mouthPressLeft') mouthPressLeft = shape.score;
            if (shape.categoryName === 'mouthPressRight') mouthPressRight = shape.score;
        });

        // Calculate 5 Stages (0.0 to 1.0)
        let focused = Math.min(1.0, (squintLeft + squintRight) / 2 * 1.5);
        let confused = Math.min(1.0, (browInnerUp + browDownLeft + browDownRight + mouthPucker + squintLeft) / 3);
        let irritated = Math.min(1.0, (browDownLeft + browDownRight + mouthPressLeft + mouthPressRight + frownLeft + frownRight) / 3);
        let overwhelmed = Math.min(1.0, (eyeClosedLeft + eyeClosedRight) / 2 * 1.5);
        let neutral = Math.max(0, 1.0 - (focused + confused + irritated + overwhelmed));

        // Store stages
        this.cognitiveStages = [
            { name: "NEUTRAL", score: neutral, color: "#94a3b8" },
            { name: "FOCUSED", score: focused, color: "#3b82f6" },
            { name: "CONFUSED", score: confused, color: "#eab308" },
            { name: "IRRITATED", score: irritated, color: "#ef4444" },
            { name: "OVERWHELMED", score: overwhelmed, color: "#8b5cf6" }
        ].sort((a,b) => b.score - a.score); // Sort by highest

        const dominant = this.cognitiveStages[0];
        const cooldownMs = 5000; 

        if (dominant.score > 0.4) {
            if (dominant.name === "IRRITATED") {
                this.setLabel("IRRITATED");
                if (now - this.lastFrownTime > cooldownMs) {
                    this.lastFrownTime = now;
                    console.log("Biomarker Trigger: IRRITATED");
                    this.onBiomarkerDetected("[SYSTEM BIOMARKER DETECTED: User is IRRITATED/FRUSTRATED. Generate soothing, cool-toned CSS (blues, greens) with soft borders to calm them down.]");
                }
            } else if (dominant.name === "CONFUSED") {
                this.setLabel("CONFUSED");
                if (now - this.lastSquintTime > cooldownMs) {
                    this.lastSquintTime = now;
                    console.log("Biomarker Trigger: CONFUSED");
                    this.onBiomarkerDetected("[SYSTEM BIOMARKER DETECTED: User is CONFUSED/STRAINING. Enhance readability with larger text, higher contrast, and clearer layout.]");
                }
            } else if (dominant.name === "OVERWHELMED") {
                this.setLabel("OVERWHELMED");
                if (now - this.lastEyeClosedTime > cooldownMs) {
                    this.lastEyeClosedTime = now;
                    console.log("Biomarker Trigger: OVERWHELMED");
                    this.onBiomarkerDetected("[SYSTEM BIOMARKER DETECTED: User is OVERWHELMED/SENSORY OVERLOAD. Dim the interface, use dark mode, minimize movement, and simplify the screen drastically.]");
                }
            }
        }
    }

    setLabel(text) {
        this.activeLabels.add(text);
        if (this.labelTimeout) clearTimeout(this.labelTimeout);
        this.labelTimeout = setTimeout(() => {
            this.activeLabels.delete(text);
        }, 2000);
    }

    drawResults(results) {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw Recognition HUD (Lite Mode)
        if (results.faceLandmarks) {
            results.faceLandmarks.forEach(landmarks => {
                let minX = 1, minY = 1, maxX = 0, maxY = 0;
                
                landmarks.forEach(point => {
                    if (point.x < minX) minX = point.x;
                    if (point.y < minY) minY = point.y;
                    if (point.x > maxX) maxX = point.x;
                    if (point.y > maxY) maxY = point.y;
                });

                // RESTORED: Draw Landmark Dots (Optimized Batch)
                ctx.fillStyle = "rgba(0, 242, 255, 0.8)";
                ctx.beginPath();
                landmarks.forEach(point => {
                    const px = point.x * this.canvas.width;
                    const py = point.y * this.canvas.height;
                    ctx.moveTo(px, py);
                    ctx.arc(px, py, 1, 0, 2 * Math.PI);
                });
                ctx.fill();

                // Draw Bounding Box (High Performance)
                ctx.strokeStyle = "rgba(0, 242, 255, 0.6)";
                ctx.lineWidth = 2;
                const bx = minX * this.canvas.width - 15;
                const by = minY * this.canvas.height - 15;
                const bw = (maxX - minX) * this.canvas.width + 30;
                const bh = (maxY - minY) * this.canvas.height + 30;
                
                const cornerLen = 15;
                ctx.beginPath();
                ctx.moveTo(bx, by + cornerLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cornerLen, by);
                ctx.moveTo(bx + bw - cornerLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cornerLen);
                ctx.moveTo(bx + bw, by + bh - cornerLen); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - cornerLen, by + bh);
                ctx.moveTo(bx + cornerLen, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - cornerLen);
                ctx.stroke();

                ctx.fillStyle = "rgba(0, 242, 255, 0.8)";
                ctx.font = "bold 10px monospace";
                ctx.fillText("FACIAL ID: ACTIVE", bx, by - 5);

                // Draw Structural Outline (Low Overhead)
                ctx.strokeStyle = "rgba(0, 242, 255, 0.3)";
                ctx.lineWidth = 1;
                const outlineIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
                ctx.beginPath();
                outlineIndices.forEach((idx, i) => {
                    const p = landmarks[idx];
                    if (i === 0) ctx.moveTo(p.x * this.canvas.width, p.y * this.canvas.height);
                    else ctx.lineTo(p.x * this.canvas.width, p.y * this.canvas.height);
                });
                ctx.closePath();
                ctx.stroke();
            });
        }

        // 2. Cognitive State HUD (Right Side)
        ctx.font = "10px monospace";
        let scoreY = 30;
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(this.canvas.width - 150, 10, 140, 110);
        
        ctx.fillStyle = "#ffffff";
        ctx.fillText("COGNITIVE STATE", this.canvas.width - 140, 25);
        
        if (this.cognitiveStages) {
            // Take top 3 for UI or show all 5. Let's show all 5 sorted.
            this.cognitiveStages.forEach(stage => {
                const barWidth = stage.score * 70;
                ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                ctx.fillRect(this.canvas.width - 80, scoreY - 8, 70, 6);
                
                ctx.fillStyle = stage.color;
                ctx.fillRect(this.canvas.width - 80, scoreY - 8, barWidth, 6);
                
                ctx.fillStyle = "#fff";
                ctx.fillText(stage.name.substring(0, 8), this.canvas.width - 140, scoreY);
                scoreY += 15;
            });
        }

        // 3. Pipeline Metrics & Modules (Top Left)
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(10, 10, 150, 100);
        
        ctx.fillStyle = "#00f2ff";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`FPS: ${this.fps}`, 20, 25);
        ctx.fillText(`LATENCY: ${this.latency.toFixed(1)}ms`, 20, 40);
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.fillText("MODULE STATUS:", 20, 60);
        
        ctx.fillStyle = "#10b981"; // Success green
        ctx.fillText("● FaceDetector [OK]", 20, 75);
        ctx.fillText("● FaceMesh-V2  [OK]", 20, 85);
        ctx.fillText("● Blendshape   [OK]", 20, 95);

        // 4. Active Labels (Bottom Left)
        let yOffset = this.canvas.height - 40;
        ctx.font = "bold 18px Outfit, sans-serif";
        this.activeLabels.forEach(label => {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            const metrics = ctx.measureText(label);
            ctx.fillRect(10, yOffset - 22, metrics.width + 16, 30);
            ctx.fillStyle = "#fff";
            ctx.fillText(label, 18, yOffset);
            yOffset -= 35;
        });
    }

    captureFrame() {
        if (!this.stream) return;
        const ctx = this.canvas.getContext('2d');
        this.canvas.width = 640;
        this.canvas.height = 480;
        ctx.drawImage(this.videoElement, 0, 0, 640, 480);
        const base64 = this.canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
        this.onFrame(base64);
    }

    stop() {
        this.isDetecting = false;
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
        }
        clearInterval(this.timer);
        this.videoElement.hidden = true;
        if (this.container) this.container.style.display = 'none';
    }
}

export class AudioPlayer {
    constructor() {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
        this.nextStartTime = 0;
    }

    play(base64Data) {
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / 32768;
        }

        const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        const startTime = Math.max(this.audioContext.currentTime, this.nextStartTime);
        source.start(startTime);
        this.nextStartTime = startTime + audioBuffer.duration;
    }

    interrupt() {
        // Implementation for interrupting playback
        this.nextStartTime = 0;
    }
}
