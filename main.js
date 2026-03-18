/**
 * Neuro-Vibe Main Entry Point
 * Professional 4-Layer Architecture Orchestrator.
 */

// Layer 1 & 2: Vision
import { Camera } from './vision/camera.js';
import { VisionProcessor } from './vision/mediapipe.js';
import { GestureClassifier } from './vision/gestureClassifier.js';

// Layer 2: MediaPipe Core
import { HandLandmarker, FilesetResolver } from '../lib/mediapipe/vision_bundle.mjs';

// Layer 3: Interaction
import { ModeManager } from './interaction/modeManager.js';
import { GestureEngine } from './interaction/gestureEngine.js';
import { CursorController } from './interaction/cursorController.js';

// Layer 4: UI & AI
import { OverlayHUD } from './ui/overlayHUD.js';
import { ThemeManager } from './ui/themeManager.js';
import { GeminiClient } from './ai/geminiClient.js';

// --- System State ---
let elements = {};

function getElements() {
    return {
        apiKey: document.getElementById('api-key'),
        connectBtn: document.getElementById('connect-btn'),
        disconnectBtn: document.getElementById('disconnect-btn'),
        chatContainer: document.getElementById('chat-container'),
        chatInput: document.getElementById('chat-input'),
        sendBtn: document.getElementById('send-btn'),
        micBtn: document.getElementById('mic-btn'),
        cameraBtn: document.getElementById('camera-btn'),
        screenBtn: document.getElementById('screen-btn'),
        aslBtn: document.getElementById('asl-btn'),
        navModeBtn: document.getElementById('nav-mode-btn'),
        cmdModeBtn: document.getElementById('cmd-mode-btn'),
        abcModeBtn: document.getElementById('abc-mode-btn'),
        videoPreview: document.getElementById('video-preview'),
        cameraSection: document.getElementById('camera-section'),
        aslHud: document.getElementById('asl-hud'),
        targetTabInfo: document.getElementById('target-tab-info')
    };
}

// Orchestrator Components - Initialize globally but with null checks inside init
let camera, vision, classifier, modes, engine, cursor, hud, themes, ai;

// --- Initialization ---

async function init() {
    console.log("[Neuro-Vibe] Initializing Professional Multimodal OS...");
    
    try {
        elements = getElements();
        
        // Verify critical elements
        if (!elements.connectBtn || !elements.cameraBtn) {
            throw new Error("Critical UI elements missing from DOM. Check sidepanel.html IDs.");
        }

        // Initialize Components
        camera = new Camera(elements.videoPreview);
        vision = new VisionProcessor();
        classifier = new GestureClassifier();
        modes = new ModeManager();
        engine = new GestureEngine();
        cursor = new CursorController();
        hud = new OverlayHUD();
        themes = new ThemeManager();
        ai = new GeminiClient();
    
    // Load saved API key
    chrome.storage.local.get(['gemini_api_key'], (res) => {
        if (res.gemini_api_key) elements.apiKey.value = res.gemini_api_key;
    });

    // --- Wire Layers ---

    // Vision -> Classifier -> ModeManager -> Engine
    vision.onResults = (results) => {
        const rawGesture = classifier.classify(results);
        
        // Mode Management (requires raw stream for hold logic)
        modes.update(rawGesture);

        // Movement (Only in NAV mode for power saving)
        if (results.landmarks?.[0] && (modes.getMode() === 'NAV' || modes.getMode() === 'CMD')) {
            const indexTip = results.landmarks[0][8];
            const smoothed = cursor.update(indexTip.x, indexTip.y);
            
            // Relay to Active Tab
            relayToTab({ type: 'CURSOR_MOVE', ...smoothed });
        }
        
        // HUD Updates
        hud.updateGesture(rawGesture);
    };

    // Classifier -> Engine (Action Dispatching)
    classifier.onGesture = (gesture) => {
        engine.dispatch(gesture, modes.getMode(), { x: cursor.smoothX, y: cursor.smoothY });
    };

    // Mode Changes -> HUD
    modes.onModeChange = (newMode) => {
        hud.updateMode(newMode);
        addSystemMessage(`Interaction Mode: ${newMode}`);
    };

    // Engine -> Cursor Actions (Click/Right Click)
    engine.onCursorAction = (type, coords) => {
        relayToTab({ type, ...coords });
        hud.showAction(type.replace('VIRTUAL_', ''));
    };

    // Engine -> Browser Commands
    engine.onCommand = (cmd) => {
        handleCommand(cmd);
    };

    // Processing Loop
    const processLoop = () => {
        if (camera.isActive) {
            vision.processFrame(elements.videoPreview, performance.now());
            requestAnimationFrame(processLoop);
        }
    };

    // --- Media Control ---

    // User Instruction Guide
    addSystemMessage("Welcome to Gemini Live Multimodal OS.");
    addSystemMessage("👉 1. Connect Gemini 2.0 with your API key.");
    addSystemMessage("👉 2. Hold Fist ✊ for 2s to switch to Navigation (NAV).");
    addSystemMessage("👉 3. Hold Palm 🖐 for 2s for Scrolling (CMD).");
    addSystemMessage("👉 4. Hold Pinch 🤏 for 2s for Spelling (ABC).");

    elements.connectBtn.onclick = async () => {
        const key = elements.apiKey.value.trim();
        if (!key) return alert("Please enter an API Key");
        
        try {
            chrome.storage.local.set({ gemini_api_key: key });
            await ai.connect(key);
            setConnectedUI(true);
            addSystemMessage("Connected to Gemini 2.0 Multimodal Live");
        } catch (e) {
            addSystemMessage("Connection Failed: " + e.message);
        }
    };

    elements.disconnectBtn.onclick = () => {
        ai.disconnect();
        setConnectedUI(false);
        addSystemMessage("Disconnected");
    };

    elements.cameraBtn.onclick = async () => {
        if (!camera.isActive) {
            elements.cameraSection.style.display = 'block';
            await vision.init();
            await camera.start();
            processLoop();
            elements.cameraBtn.classList.add('active');
        } else {
            camera.stop();
            elements.cameraSection.style.display = 'none';
            elements.aslHud.style.display = 'none';
            elements.cameraBtn.classList.remove('active');
            elements.aslBtn.classList.remove('active');
            relayToTab({ type: 'CURSOR_HIDE' });
        }
    };

    elements.aslBtn.onclick = () => {
        const isHidden = elements.aslHud.style.display === 'none';
        elements.aslHud.style.display = isHidden ? 'flex' : 'none';
        elements.aslBtn.classList.toggle('active', isHidden);
        
        if (isHidden) modes.onModeChange('ABC');
        else modes.onModeChange('NAV');
    };

    // Manual Mode Buttons
    elements.navModeBtn.onclick = () => modes.onModeChange('NAV');
    elements.cmdModeBtn.onclick = () => modes.onModeChange('CMD');
    elements.abcModeBtn.onclick = () => {
        modes.onModeChange('ABC');
        elements.aslHud.style.display = 'flex';
        elements.aslBtn.classList.add('active');
    };
    
    } catch (err) {
        console.error("[Neuro-Vibe] BOOT ERROR:", err);
        // Show a visible error in the chat container if it exists
        const container = document.getElementById('chat-container');
        if (container) {
            const errDiv = document.createElement('div');
            errDiv.style.color = '#ef4444';
            errDiv.style.padding = '10px';
            errDiv.style.background = 'rgba(239, 68, 68, 0.1)';
            errDiv.style.borderRadius = '8px';
            errDiv.style.fontSize = '0.8rem';
            errDiv.textContent = "[Boot Error] " + err.message + ". Check Console for details.";
            container.appendChild(errDiv);
        }
    }

    // --- Helpers ---

    function setConnectedUI(connected) {
        elements.connectBtn.disabled = connected;
        elements.disconnectBtn.disabled = !connected;
        elements.micBtn.disabled = !connected;
        elements.cameraBtn.disabled = !connected;
        elements.screenBtn.disabled = !connected;
        elements.aslBtn.disabled = !connected;
        elements.navModeBtn.disabled = !connected;
        elements.cmdModeBtn.disabled = !connected;
        elements.abcModeBtn.disabled = !connected;
        elements.sendBtn.disabled = !connected;
        document.getElementById('connection-status').className = `status-badge ${connected ? 'connected' : 'disconnected'}`;
        document.getElementById('connection-status').textContent = connected ? 'Connected' : 'Disconnected';
    }

    function addSystemMessage(text) {
        const div = document.createElement('div');
        div.className = 'system-msg';
        div.textContent = `[System] ${text}`;
        elements.chatContainer.appendChild(div);
        elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
    }

    let activeTabId = null;
    let lastTabQuery = 0;
    async function relayToTab(msg) {
        try {
            const now = Date.now();
            // Refresh tab if we don't have one, or periodically (every 1s) to follow tab switches
            if (!activeTabId || now - lastTabQuery > 1000 || msg.type !== 'CURSOR_MOVE') {
                const queryInfo = { active: true, lastFocusedWindow: true };
                const [tab] = await chrome.tabs.query(queryInfo);
                if (tab) {
                    activeTabId = tab.id;
                    if (elements.targetTabInfo) {
                        elements.targetTabInfo.textContent = `Target: ${tab.title || tab.url}`;
                        elements.targetTabInfo.style.color = '#4ade80';
                    }
                } else {
                    if (elements.targetTabInfo) {
                        elements.targetTabInfo.textContent = "Target: No compatible tab active";
                        elements.targetTabInfo.style.color = '#ef4444';
                    }
                }
                lastTabQuery = now;
            }
            
            if (activeTabId) {
                chrome.tabs.sendMessage(activeTabId, msg).catch((err) => {
                    activeTabId = null; 
                });
            }
        } catch (e) {}
    }

    function handleCommand(cmd) {
        switch (cmd) {
            case 'SCROLL_DOWN': relayToTab({ type: 'SCROLL', amount: 300 }); break;
            case 'SCROLL_UP': relayToTab({ type: 'SCROLL', amount: -300 }); break;
            case 'MEDIA_PLAY_PAUSE': 
                // Relay specific media command
                break;
        }
        hud.showAction(cmd);
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
