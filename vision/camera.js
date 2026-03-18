/**
 * Layer 1: Capture Layer
 * Efficient frame capture using requestVideoFrameCallback for high-performance processing.
 */
export class Camera {
    constructor(videoElement) {
        this.video = videoElement;
        this.canvas = document.createElement('canvas'); // For frame extraction if needed
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
        this.isActive = false;
        
        // Professional defaults
        this.width = 640;
        this.height = 480;
    }

    async start() {
        if (this.isActive) return;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: this.width },
                    height: { ideal: this.height },
                    frameRate: { ideal: 30 }
                },
                audio: false
            });

            this.video.srcObject = this.stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    this.isActive = true;
                    console.log(`[Camera] Capture started at ${this.video.videoWidth}x${this.video.videoHeight}`);
                    resolve();
                };
            });
        } catch (err) {
            console.error("[Camera] Error accessing webcam:", err);
            throw err;
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }
        this.isActive = false;
        console.log("[Camera] Capture stopped");
    }

    /**
     * Optional: Get a raw canvas frame if required by legacy processing.
     * MediaPipe usually handles the video element directly.
     */
    getFrame() {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.ctx.drawImage(this.video, 0, 0);
        return this.canvas;
    }
}
