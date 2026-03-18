/**
 * Layer 3: UI Layer - Theme Manager
 * Handles accessibility interventions: Focus, Reading, and Dyslexia modes.
 */
export class ThemeManager {
    constructor() {
        this.activeThemes = new Set();
    }

    /**
     * Toggles an accessibility theme via the content script.
     * @param {string} theme - 'FOCUS', 'READING', 'DYSLEXIA'
     */
    async toggleTheme(theme) {
        let action = 'APPLY_THEME';
        if (this.activeThemes.has(theme)) {
            this.activeThemes.delete(theme);
            action = 'REMOVE_THEME';
        } else {
            this.activeThemes.add(theme);
        }

        console.log(`[ThemeManager] ${action} for ${theme}`);
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                chrome.tabs.sendMessage(tab.id, { type: action, theme: theme });
            }
        } catch (err) {
            console.warn("[ThemeManager] Could not send theme message to tab:", err);
        }
    }

    /**
     * Resets everything to 'CLEAN' mode.
     */
    async reset() {
        this.activeThemes.clear();
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                chrome.tabs.sendMessage(tab.id, { type: 'APPLY_THEME', theme: 'CLEAN' });
            }
        } catch (e) {}
    }
}
