export class GestureRecognizer {
    constructor(videoElement, onGestureDetected) {
        this.videoElement = videoElement;
        this.onGestureDetected = onGestureDetected;
        this.handsConfig = null;
        this.camera = null;
        this.isDetecting = false;
        
        this.lastGesture = null;
        this.gestureFrames = 0;
        this.gestureThreshold = 10; // Reduced to 10 frames (0.3s) for easier triggering
        this.cooldownFrames = 0;
        
        // Add drawing setup
        this.canvasElement = document.getElementById('video-canvas');
        this.canvasCtx = this.canvasElement ? this.canvasElement.getContext('2d') : null;
        
        this.init();
    }

    async init() {
        console.log("Initializing Gesture Recognizer...");
        
        this.handsConfig = new window.Hands({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }});

        this.handsConfig.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
        });

        this.handsConfig.onResults(this.onResults.bind(this));
        console.log("MediaPipe Hands initialized.");
    }

    start() {
        if (this.isDetecting) return;
        this.isDetecting = true;
        
        if (!this.camera) {
             this.camera = new window.Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.isDetecting) {
                        try {
                            await this.handsConfig.send({image: this.videoElement});
                        } catch (e) {
                            // ignore frame errors
                        }
                    }
                },
                width: 640,
                height: 480
            });
        }
        this.camera.start();
        console.log("Gesture Recognizer started.");
    }

    stop() {
        this.isDetecting = false;
        if (this.camera) {
            this.camera.stop();
        }
        const gestureOutput = document.getElementById('gesture-output');
        if (gestureOutput) gestureOutput.style.display = 'none';
        console.log("Gesture Recognizer stopped.");
    }

    onResults(results) {
        if (!this.isDetecting) return;

        if (this.cooldownFrames > 0) {
            this.cooldownFrames--;
            return;
        }

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            
            // Draw landmarks for visual feedback
            if (this.canvasCtx) {
                // We don't clear the whole canvas because face landmarks might be there
                // The drawing_utils library will just overlay
                for (const landmarks of results.multiHandLandmarks) {
                    window.drawConnectors(this.canvasCtx, landmarks, window.HAND_CONNECTIONS,
                                          {color: '#00FF00', lineWidth: 2});
                    window.drawLandmarks(this.canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1});
                }
            }

            const landmarks = results.multiHandLandmarks[0];
            const handedness = results.multiHandedness[0].label;
            
            const gesture = this.classifyGesture(landmarks, handedness);
            
            if (gesture) {
                if (gesture === this.lastGesture) {
                    this.gestureFrames++;
                    if (this.gestureFrames === this.gestureThreshold) {
                        this.onGestureDetected(gesture);
                        this.cooldownFrames = 60; // 2 seconds cooldown at 30fps
                        this.lastGesture = null;
                        this.gestureFrames = 0;
                    }
                } else {
                    this.lastGesture = gesture;
                    this.gestureFrames = 1;
                }
            } else {
                this.lastGesture = null;
                this.gestureFrames = 0;
            }
        } else {
            this.lastGesture = null;
            this.gestureFrames = 0;
        }
    }

    classifyGesture(landmarks, handedness) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        
        const indexMcp = landmarks[5];
        const middleMcp = landmarks[9];
        const ringMcp = landmarks[13];
        const pinkyMcp = landmarks[17];
        const wrist = landmarks[0];

        const isIndexOpen = indexTip.y < indexMcp.y;
        const isMiddleOpen = middleTip.y < middleMcp.y;
        // Relax ring and pinky slightly by comparing to their PIP joints instead of MCP
        const isRingOpen = ringTip.y < landmarks[14].y; 
        const isPinkyOpen = pinkyTip.y < landmarks[18].y;
        
        // Thumb open heuristic depends on hand (relaxing threshold)
        const isThumbOpen = handedness === 'Right' ? thumbTip.x < indexMcp.x + 0.05 : thumbTip.x > indexMcp.x - 0.05;
        
        const allFingersOpen = isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen;
        const allFingersClosed = (!isIndexOpen) && (!isMiddleOpen) && (!isRingOpen) && (!isPinkyOpen);

        // 1. HELLO: All fingers and thumb open (Open Palm)
        if (allFingersOpen && isThumbOpen) {
            return "HELLO";
        }
        
        // 2. YES: Thumbs up (Fingers closed, thumb above index)
        if (allFingersClosed && thumbTip.y < indexMcp.y && Math.abs(thumbTip.y - wrist.y) > 0.1) {
             return "YES";
        }

        // 3. NO: Thumbs down (Fingers closed, thumb below wrist)
        if (allFingersClosed && thumbTip.y > wrist.y + 0.05) {
            return "NO"; 
        }

        // 4. THANK YOU: Peace Sign (Index and middle open, others closed)
        if (isIndexOpen && isMiddleOpen && (!isRingOpen) && (!isPinkyOpen)) {
            return "THANK YOU";
        }

        // 5. HELP: Closed fist
        if (allFingersClosed && (!isThumbOpen)) {
            // Ensure hand is raised (wrist lower than fingers)
            if (wrist.y > indexMcp.y) {
                return "HELP";
            }
        }

        return null;
    }
}
