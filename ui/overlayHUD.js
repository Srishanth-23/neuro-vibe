/**
 * Layer 3: UI Layer - Overlay HUD
 * Manages the visual feedback for the user (Mode, Gesture, Confidence).
 */
export class OverlayHUD {
    constructor() {
        this.container = document.getElementById('mode-hud');
        this.badge = document.getElementById('mode-badge');
        this.gestureOutput = document.getElementById('gesture-output');
        
        // Mode colors
        this.colors = {
            NAV: 'nav-mode',
            CMD: 'cmd-mode',
            ABC: 'abc-mode'
        };
    }

    updateMode(mode) {
        if (!this.badge) return;
        this.badge.textContent = mode;
        this.badge.className = `mode-badge ${this.colors[mode] || 'nav-mode'}`;
        
        // Visual feedback for switch
        this.badge.style.animation = 'none';
        this.badge.offsetHeight; // Reflow
        this.badge.style.animation = 'mode-glow 2.5s infinite ease-in-out';
    }

    updateGesture(gesture, confidence = 1.0) {
        if (!this.gestureOutput) return;
        
        if (gesture) {
            this.gestureOutput.textContent = `${gesture} (${Math.round(confidence * 100)}%)`;
            this.gestureOutput.style.display = 'block';
        } else {
            this.gestureOutput.style.display = 'none';
        }
    }

    /**
     * Shows a temporary action notification (e.g. "CLICKED")
     */
    showAction(action) {
        const notify = document.createElement('div');
        notify.className = 'action-notify';
        notify.textContent = action;
        this.container.appendChild(notify);
        setTimeout(() => notify.remove(), 1000);
    }
}
