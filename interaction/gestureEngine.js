/**
 * Layer 4: Gesture Engine
 * High-level action dispatcher. Maps stable gestures to browser/extension commands.
 */
export class GestureEngine {
    constructor() {
        this.onCommand = null;
        this.onCursorAction = null;
    }

    /**
     * Dispatch an action based on the gesture and active mode.
     * @param {string} gesture - The stable gesture triggered.
     * @param {string} mode - The active mode from ModeManager.
     * @param {object} coords - Smoothed {x, y} coordinates from CursorController.
     */
    dispatch(gesture, mode, coords) {
        if (!gesture) return;

        console.log(`[GestureEngine] Dispatching ${gesture} in ${mode} mode`);

        // Mode-Specific Handling
        switch (mode) {
            case 'NAV':
                this.handleNavMode(gesture, coords);
                break;
            case 'CMD':
                this.handleCmdMode(gesture);
                break;
            case 'ABC':
                this.handleAbcMode(gesture);
                break;
        }
    }

    handleNavMode(gesture, coords) {
        if (gesture === "CLICK" || gesture === "RIGHT_CLICK") {
            const type = (gesture === "CLICK") ? 'VIRTUAL_CLICK' : 'VIRTUAL_RIGHT_CLICK';
            if (this.onCursorAction) {
                this.onCursorAction(type, coords);
            }
        }
    }

    handleCmdMode(gesture) {
        switch (gesture) {
            case 'SCROLL':
                this.emitCommand('SCROLL_DOWN');
                break;
            case 'MOVE': // Index Up
                this.emitCommand('SCROLL_UP');
                break;
            case 'NEXT':
                this.emitCommand('BROWSER_FORWARD');
                break;
            case 'PREVIOUS':
                this.emitCommand('BROWSER_BACK');
                break;
            case 'PAUSE':
                this.emitCommand('MEDIA_PLAY_PAUSE');
                break;
        }
    }

    handleAbcMode(gesture) {
        // Voice typing is preferred here as per requirements.
        // We'll trigger the AI client.
        if (gesture === "CLICK") {
            this.emitCommand('VOICE_START_STOP');
        }
    }

    emitCommand(command) {
        if (this.onCommand) {
            this.onCommand(command);
        }
    }
}
