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
    constructor(onFrame) {
        this.onFrame = onFrame;
        this.stream = null;
        this.videoElement = document.getElementById('video-preview');
        this.canvas = document.getElementById('video-canvas');
        this.timer = null;
    }

    async start(type = 'camera') {
        if (type === 'camera') {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        } else {
            this.stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        }

        this.videoElement.srcObject = this.stream;
        this.videoElement.hidden = false;

        this.timer = setInterval(() => {
            this.captureFrame();
        }, 1000); // 1 FPS for efficiency
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
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
        }
        clearInterval(this.timer);
        this.videoElement.hidden = true;
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
