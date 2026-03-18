/**
 * Layer 4: Mode Management
 * Handles strict state transitions between NAV, CMD, and ABC modes.
 * Implements the 2-second hold logic to prevent accidental switching.
 */
export class ModeManager {
    constructor() {
        this.modes = {
            NAV: 'NAV', // Navigation (Cursor)
            CMD: 'CMD', // Command (Scrolling/Media)
            ABC: 'ABC'  // Alphabet (Text/Voice)
        };
        this.activeMode = this.modes.NAV;
        
        this.holdStartTime = 0;
        this.holdingGesture = null;
        this.HOLD_DURATION = 2000; // 2 seconds

        this.onModeChange = null;
    }

    /**
     * Called every frame with the current detected gesture (even if not yet triggered).
     */
    update(gesture) {
        if (!gesture) {
            this.holdStartTime = 0;
            this.holdingGesture = null;
            return;
        }

        if (gesture === this.holdingGesture) {
            const duration = Date.now() - this.holdStartTime;
            
            if (duration >= this.HOLD_DURATION) {
                this.handleHoldComplete(gesture);
                this.holdStartTime = Date.now(); // Reset to prevent double-fire
            }
        } else {
            this.holdingGesture = gesture;
            this.holdStartTime = Date.now();
        }
    }

    handleHoldComplete(gesture) {
        let newMode = null;

        if (gesture === "SCROLL") newMode = this.modes.CMD;
        else if (gesture === "PAUSE") newMode = this.modes.NAV;
        else if (gesture === "CLICK") newMode = this.modes.ABC;

        if (newMode && newMode !== this.activeMode) {
            this.activeMode = newMode;
            console.log(`[ModeManager] Mode switched to: ${newMode}`);
            if (this.onModeChange) {
                this.onModeChange(newMode);
            }
        }
    }

    getMode() {
        return this.activeMode;
    }
}
