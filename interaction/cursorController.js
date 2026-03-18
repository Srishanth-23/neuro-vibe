/**
 * Layer 4: Cursor Controller
 * Implements jitter-free Air Mouse control using Exponential Moving Average (EMA).
 */
export class CursorController {
    constructor() {
        this.smoothX = 0.5;
        this.smoothY = 0.5;
        this.prevX = 0.5;
        this.prevY = 0.5;

        // Professional alpha for EMA (0.1 = very smooth/slow, 0.9 = jerky/fast)
        this.ALPHA = 0.3; 
        
        this.onMove = null;
    }

    /**
     * Updates the cursor position with smoothing.
     * @param {number} x - Normalized X coordinate (0 to 1)
     * @param {number} y - Normalized Y coordinate (0 to 1)
     */
    update(x, y) {
        // EMA Smoothing: smooth = prev * (1 - alpha) + current * alpha
        this.smoothX = this.prevX * (1 - this.ALPHA) + x * this.ALPHA;
        this.smoothY = this.prevY * (1 - this.ALPHA) + y * this.ALPHA;

        // Store for next frame
        this.prevX = this.smoothX;
        this.prevY = this.smoothY;

        if (this.onMove) {
            this.onMove(this.smoothX, this.smoothY);
        }

        return { x: this.smoothX, y: this.smoothY };
    }

    reset() {
        // Optional: snap to current if needed, or keep last
    }
}
