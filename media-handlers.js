/**
 * Handles Audio, Video, and Screen capture
 */

class AudioHandler {
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

class VideoHandler {
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
        this.lastSquintTime = 0;
        this.lastFrownTime = 0;
        this.lastEyeClosedTime = 0;
    }

    async initMediaPipe() {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                    delegate: "GPU"
                },
                outputFaceBlendshapes: true,
                runningMode: "VIDEO",
                numFaces: 1
            });
            console.log("MediaPipe Face Landmarker loaded!");
        } catch (e) {
            console.error("Failed to load Face Landmarker", e);
        }
    }

    async start(type = 'camera') {
        if (!this.faceLandmarker && type === 'camera') {
            await this.initMediaPipe();
        }

        if (type === 'camera') {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
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
            
            try {
                const results = this.faceLandmarker.detectForVideo(this.videoElement, startTimeMs);
                this.analyzeBiomarkers(results);
            } catch(e) {
                // Ignore silent mediapipe errors during rapid frames
            }
        }

        // Keep looping
        window.requestAnimationFrame(() => this.predictWebcam());
    }

    analyzeBiomarkers(results) {
        if (!results.faceBlendshapes || results.faceBlendshapes.length === 0) return;
        if (!this.onBiomarkerDetected) return;

        const shapes = results.faceBlendshapes[0].categories;
        const now = Date.now();

        // Find relevant blendshape scores
        let squintLeft = 0, squintRight = 0, frownLeft = 0, frownRight = 0, eyeClosedLeft = 0, eyeClosedRight = 0;
        
        shapes.forEach(shape => {
            if (shape.categoryName === 'eyeSquintLeft') squintLeft = shape.score;
            if (shape.categoryName === 'eyeSquintRight') squintRight = shape.score;
            if (shape.categoryName === 'mouthFrownLeft') frownLeft = shape.score;
            if (shape.categoryName === 'mouthFrownRight') frownRight = shape.score;
            if (shape.categoryName === 'eyeBlinkLeft') eyeClosedLeft = shape.score;
            if (shape.categoryName === 'eyeBlinkRight') eyeClosedRight = shape.score;
        });

        const frownThreshold = 0.5;
        const squintThreshold = 0.45;
        const closedThreshold = 0.6;
        const cooldownMs = 15000; // Only trigger a specific state once every 15s

        // 1. Sensory Distress / Pain (Severe Frowning / Eyes shut tight)
        if ((frownLeft > frownThreshold && frownRight > frownThreshold) || 
            (eyeClosedLeft > closedThreshold && eyeClosedRight > closedThreshold)) {
            if (now - this.lastFrownTime > cooldownMs) {
                this.lastFrownTime = now;
                console.log("Biomarker Trigger: Sensory Distress");
                this.onBiomarkerDetected("[SYSTEM BIOMARKER DETECTED: User is showing severe facial distress/frowning. They may be experiencing sensory overload. Intervene immediately.]");
            }
        }
        // 2. Dyslexia / Focus Strain (Squinting)
        else if (squintLeft > squintThreshold && squintRight > squintThreshold) {
            if (now - this.lastSquintTime > cooldownMs) {
                this.lastSquintTime = now;
                console.log("Biomarker Trigger: Squinting");
                this.onBiomarkerDetected("[SYSTEM BIOMARKER DETECTED: User is squinting intensely at the screen. They may be straining to read (Dyslexia flag). Provide reading assistance or modify fonts.]");
            }
        }
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

class AudioPlayer {
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
