import { GeminiLiveAPI } from "./gemini-live-api.js";
import { AudioHandler, VideoHandler, AudioPlayer } from "./media-handlers.js";

let api = null;
let audioHandler = null;
let videoHandler = null;
let audioPlayer = null;

const elements = {
    apiKey: document.getElementById('api-key'),
    connectBtn: document.getElementById('connect-btn'),
    disconnectBtn: document.getElementById('disconnect-btn'),
    status: document.getElementById('connection-status'),
    modelNameDisplay: document.getElementById('model-name'),
    chatContainer: document.getElementById('chat-container'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    micBtn: document.getElementById('mic-btn'),
    cameraBtn: document.getElementById('camera-btn'),
    screenBtn: document.getElementById('screen-btn')
};

// State
let isMicActive = false;
let isCameraActive = false;
let isScreenActive = false;

// Initialize
function init() {
    // Load saved API key
    chrome.storage.local.get(['gemini_api_key'], (result) => {
        if (result.gemini_api_key) {
            elements.apiKey.value = result.gemini_api_key;
        }
    });

    elements.connectBtn.onclick = connect;
    elements.disconnectBtn.onclick = disconnect;
    elements.sendBtn.onclick = sendMessage;
    elements.chatInput.addEventListener("keydown", (e) => {

        if (e.key === "Enter") {

            e.preventDefault();

            sendMessage();

        }

    });

    elements.micBtn.onclick = toggleMic;
    elements.cameraBtn.onclick = toggleCamera;
    elements.screenBtn.onclick = toggleScreen;
}

async function connect() {
    const key = elements.apiKey.value;
    if (!key) {
        addMessage('Please enter an API Key', 'system-msg');
        return;
    }

    // Save key
    chrome.storage.local.set({ gemini_api_key: key });

    const model = "gemini-2.5-flash-native-audio-preview-12-2025";
    api = new GeminiLiveAPI(key, model);
    elements.modelNameDisplay.textContent = model;
    audioPlayer = new AudioPlayer();

    api.onMessage = handleMessage;
    api.onOpen = () => {
        updateUIConnected(true);
        addMessage('Connected to Gemini Live', 'system-msg');
    };
    api.onClose = () => {
        updateUIConnected(false);
        addMessage('Disconnected', 'system-msg');
    };

    try {
        const tools = [
            {
                functionDeclarations: [
                    {
                        name: "apply_adaptive_css",
                        description: "Applies a CSS snippet to the current webpage to adapt the UI for the user's state. Use this to transform the page appearance.",
                        parameters: {
                            type: "object",
                            properties: {
                                css_code: {
                                    type: "string",
                                    description: "The CSS code to inject into the page. Be specific and premium."
                                }
                            },
                            required: ["css_code"]
                        }
                    },
                    {
                        name: "scroll_page",
                        description: "Scrolls the currently active tab by a specified amount.",
                        parameters: {
                            type: "object",
                            properties: {
                                amount: {
                                    type: "integer",
                                    description: "The amount to scroll in pixels. Positive for down, negative for up."
                                },
                                smooth: {
                                    type: "boolean",
                                    description: "Whether to scroll smoothly."
                                }
                            },
                            required: ["amount"]
                        }
                    },
                    {
                        name: "modify_dom",
                        description: "Safely modifies the DOM (HTML structure) of the active webpage without triggering browser security restrictions. Use this to add, remove, update, or restructure page elements sequentially.",
                        parameters: {
                            type: "object",
                            properties: {
                                operations: {
                                    type: "array",
                                    description: "List of DOM operations to perform.",
                                    items: {
                                        type: "object",
                                        properties: {
                                            action: {
                                                type: "string",
                                                description: "The action to perform.",
                                                enum: ["remove", "set_text", "set_html", "set_attribute", "set_style", "append_html", "insert_before", "insert_after", "click", "append_script", "append_style"]
                                            },
                                            selector: {
                                                type: "string",
                                                description: "CSS selector to target elements."
                                            },
                                            attribute: {
                                                type: "string",
                                                description: "Attribute name or style property if action is set_attribute or set_style."
                                            },
                                            value: {
                                                type: "string",
                                                description: "Value to set, HTML to append, or text content."
                                            }
                                        },
                                        required: ["action", "selector"]
                                    }
                                },
                                description: {
                                    type: "string",
                                    description: "Brief human-readable description of what this DOM change does."
                                }
                            },
                            required: ["operations", "description"]
                        }
                    }
                ]
            }
        ];

        const systemInstructionText = `Role: You are the Neuro-Vibe Engine, a real-time assistive intelligence for ASD, ADHD, and Dyslexic users. Your goal is to monitor the multimodal stream and execute DOM manipulations or speech adjustments to prevent sensory overload and facilitate focus.

Important Language Rule: Always respond fluently in the language the user is speaking. You are fully multilingual. Never force English if the user speaks differently.

--- SHOWCASE PHILOSOPHY ---
Your transformations must be STUNNING and MAJOR. Do not settle for subtle changes. Follow these "Showcase Excellence" guidelines:
1. Premium Aesthetics: Use glassmorphism (backdrop-filter: blur), elegant gradients (e.g., linear-gradient(135deg, #1a1a2e, #16213e)), and high-quality typography.
2. Structural Power: Don't just change colors. Hide entire distracting sections, add thick focus borders (e.g., 8px solid goldenrod), or inject large floating action banners.
3. Smooth Experience: Use opacity transitions and "Isolation Mode" that dims the entire viewport except for the critical content.

1. ASD (Autism Spectrum Disorder)
What to look for:
Face: "Flat affect", eye-contact avoidance, or repetitive mouth/hand movements.
Audio: Monotone prosody, literal language, long silences, or high-pitched distress sounds.
UI Intervention (Showcase Mode):
Action: extreme_isolation. Dim the entire page to 10% opacity except for the main article content. Apply a soft forest-green glow (#2d6a4f) to the text.
Speech Response: Use a whisper-like, rhythmic, and deeply calming tone. "The world is quiet now. Just focus on these words."

2. ADHD (Attention Deficit Hyperactivity Disorder)
What to look for:
Face: Rapid eye darting, frequent posture shifts, or "zoning out".
Audio: Rapid-fire speech, jumping topics, or frequent interruptions.
UI Intervention (Showcase Mode):
Action: cyberpunk_focus. Inject a neon-cyan border (4px dashed #00f2ff) around the active reading paragraph. Apply a slight "zoom" effect (transform: scale(1.02)) to the focused element.
Speech Response: Use an energetic, "coach-like" tone. "Stay with me! Focus on the cyan box. We're getting this done together."

3. Sensory Distress (Overload) / OVERWHELMED
What to look for:
System message: "[SYSTEM BIOMARKER DETECTED: User is OVERWHELMED/SENSORY OVERLOAD...]"
UI Intervention (Showcase Mode):
Action: void_mode. Replace the entire page body with a dark-slate gradient. Inject a single, large, high-contrast title: "BREATHE." Mute all tab audio immediately. Use 'apply_adaptive_css' to set extreme dark mode.
Speech Response: Extreme silence. If you must speak, say: "It's okay. I've cleared the noise for you."

4. Dyslexia / CONFUSED
What to look for:
System message: "[SYSTEM BIOMARKER DETECTED: User is CONFUSED/STRAINING...]"
UI Intervention (Showcase Mode):
Action: golden_scaler. Force OpenDyslexic font across the entire page. Increase font size by 20% and use a high-contrast yellow-on-dark-blue theme. Use 'apply_adaptive_css' to enhance readability.
Speech Response: Offer to read the highlighted section aloud in a clear, deliberate narrator voice. Summarize it into three punchy bullet points.

5. Irritated / Frustrated
What to look for:
System message: "[SYSTEM BIOMARKER DETECTED: User is IRRITATED/FRUSTRATED...]"
UI Intervention (Showcase Mode):
Action: soothing_ui. Use 'apply_adaptive_css' to instantly transform the webpage into a calming environment. Apply soft, cool-toned gradients (mint green, pale blue), round all sharp corners (border-radius: 16px), remove harsh borders, and add a subtle, slow-breathing pulse animation to the background. Make the website feel "perfect" and relaxing.
Speech Response: Speak in a very gentle, slow, and accommodating tone. "I can see you're getting frustrated. I've softened the screen for you. Let's take it easy."

You have access to tools to perform UI interventions: 'apply_adaptive_css', 'scroll_page', and 'modify_dom'. Use these tools creatively to deliver a WOW experience.`;

        await api.connect({
            systemInstruction: systemInstructionText,
            tools: tools
        });
    } catch (err) {
        addMessage(`Connection error: ${err.message}`, 'system-msg');
    }
}

function disconnect() {
    if (api) api.disconnect();
    stopAllMedia();
}

function handleMessage(response) {
    console.log('Gemini Response:', response);

    if (response.error) {
        addMessage(`Error: ${response.error}`, 'system-msg');
        return;
    }

    if (response.serverContent) {
        const content = response.serverContent;

        if (content.modelTurn) {
            content.modelTurn.parts.forEach(part => {
                if (part.text) {
                    addMessage(part.text, 'assistant-msg');
                }
                if (part.inlineData) {
                    audioPlayer.play(part.inlineData.data);
                }
            });
        }

        if (content.interrupted) {
            audioPlayer.interrupt();
        }
    }

    if (response.toolCall) {
        handleToolCall(response.toolCall);
    }
}

async function handleToolCall(toolCall) {
    for (const fc of toolCall.functionCalls) {
        if (fc.name === "apply_adaptive_css") {
            const css = fc.args.css_code;
            addMessage('✨ Applying Neuro-UI transformation...', 'system-msg');

            try {
                const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                if (tab) {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (cssCode) => {
                            let style = document.getElementById('gemini-neuro-ui');
                            if (!style) {
                                style = document.createElement('style');
                                style.id = 'gemini-neuro-ui';
                                document.head.appendChild(style);
                                
                                // Global transition for showcase effect
                                const globalStyle = document.createElement('style');
                                globalStyle.textContent = `* { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important; }`;
                                document.head.appendChild(globalStyle);
                            }
                            style.textContent = cssCode;
                        },
                        args: [css]
                    });

                    api.sendToolResponse(fc.id, {
                        name: fc.name,
                        output: { success: true, message: "CSS applied successfully to the active tab." }
                    });
                }
            } catch (err) {
                console.error("Failed to apply CSS:", err);
                addMessage(`❌ Cannot modify this page: ${err.message}. (Note: Chrome blocks extensions on New Tab pages and Web Stores)`, 'system-msg');
                api.sendToolResponse(fc.id, {
                    name: fc.name,
                    output: { success: false, error: err.message }
                });
            }
        } else if (fc.name === "scroll_page") {
            const amount = fc.args.amount;
            const smooth = fc.args.smooth !== false;

            try {
                const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                if (tab) {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (scrollAmount, isSmooth) => {
                            window.scrollBy({
                                top: scrollAmount,
                                behavior: isSmooth ? 'smooth' : 'auto'
                            });
                        },
                        args: [amount, smooth]
                    });

                    api.sendToolResponse(fc.id, {
                        name: fc.name,
                        output: { success: true, message: `Scrolled by ${amount}px.` }
                    });
                }
            } catch (err) {
                console.error("Failed to scroll page:", err);
                api.sendToolResponse(fc.id, {
                    name: fc.name,
                    output: { success: false, error: err.message }
                });
            }
        } else if (fc.name === "modify_dom") {
            const operations = fc.args.operations || [];
            const desc = fc.args.description || 'DOM modification';
            addMessage(`🔧 Modifying DOM: ${desc}`, 'system-msg');

            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (ops) => {
                            try {
                                let log = [];
                                for (const op of ops) {
                                    let elements = [];
                                    
                                    // Handle special selectors
                                    if (op.selector === 'body') elements = [document.body];
                                    else if (op.selector === 'head') elements = [document.head];
                                    else if (op.selector === 'html') elements = [document.documentElement];
                                    else elements = Array.from(document.querySelectorAll(op.selector));

                                    if (elements.length === 0 || elements[0] === null) {
                                        log.push(`No elements found for selector: ${op.selector}`);
                                        continue;
                                    }
                                    
                                    elements.forEach(el => {
                                        switch (op.action) {
                                            case 'remove':
                                                el.remove();
                                                break;
                                            case 'set_text':
                                                el.textContent = op.value || '';
                                                break;
                                            case 'set_html':
                                                el.innerHTML = op.value || '';
                                                break;
                                            case 'set_attribute':
                                                if (op.attribute) el.setAttribute(op.attribute, op.value || '');
                                                break;
                                            case 'set_style':
                                                if (op.attribute) el.style[op.attribute] = op.value || '';
                                                break;
                                            case 'append_html':
                                                el.insertAdjacentHTML('beforeend', op.value || '');
                                                break;
                                            case 'insert_before':
                                                el.insertAdjacentHTML('beforebegin', op.value || '');
                                                break;
                                            case 'insert_after':
                                                el.insertAdjacentHTML('afterend', op.value || '');
                                                break;
                                            case 'click':
                                                el.click();
                                                break;
                                            case 'append_script':
                                                const script = document.createElement('script');
                                                script.textContent = op.value || '';
                                                el.appendChild(script);
                                                break;
                                            case 'append_style':
                                                const style = document.createElement('style');
                                                style.textContent = op.value || '';
                                                el.appendChild(style);
                                                break;
                                        }
                                    });
                                    log.push(`Successfully applied ${op.action} to ${op.selector}`);
                                }
                                return { success: true, result: log.join('\n') };
                            } catch (e) {
                                return { success: false, error: e.message };
                            }
                        },
                        args: [operations]
                    });

                    const execResult = results?.[0]?.result;
                    api.sendToolResponse(fc.id, {
                        name: fc.name,
                        output: execResult ?? { success: false, error: 'No result returned' }
                    });
                }
            } catch (err) {
                console.error("Failed to modify DOM:", err);
                api.sendToolResponse(fc.id, {
                    name: fc.name,
                    output: { success: false, error: err.message }
                });
            }
        }
    }
}

function sendMessage() {
    const text = elements.chatInput.value.trim();
    if (!text) return;

    if (!api) {
        addMessage('Please connect first before sending a message.', 'system-msg');
        return;
    }

    addMessage(text, 'user-msg');
    api.sendText(text);
    elements.chatInput.value = '';
}

async function toggleMic() {
    if (!isMicActive) {
        audioHandler = new AudioHandler((data) => api.sendAudio(data));
        await audioHandler.start();
        isMicActive = true;
        elements.micBtn.classList.add('active');
    } else {
        if (audioHandler) audioHandler.stop();
        isMicActive = false;
        elements.micBtn.classList.remove('active');
    }
}

async function toggleCamera() {
    if (!isCameraActive) {
        if (isScreenActive) await toggleScreen();
        videoHandler = new VideoHandler(
            (data) => api.sendVideo(data),
            (biomarkerContext) => {
                // Whisper to Gemini on Biomarker detection
                if (api && document.getElementById('connection-status').classList.contains('connected')) {
                    api.sendText(biomarkerContext);
                    console.log("Sent Context Whisper to Gemini:", biomarkerContext);
                    addMessage("🧠 " + biomarkerContext, 'system-msg'); 
                }
            }
        );
        await videoHandler.start('camera');
        isCameraActive = true;
        elements.cameraBtn.classList.add('active');
    } else {
        if (videoHandler) videoHandler.stop();
        isCameraActive = false;
        elements.cameraBtn.classList.remove('active');
    }
}

async function toggleScreen() {
    if (!isScreenActive) {
        if (isCameraActive) await toggleCamera();
        videoHandler = new VideoHandler((data) => api.sendVideo(data));
        await videoHandler.start('screen');
        isScreenActive = true;
        elements.screenBtn.classList.add('active');
    } else {
        if (videoHandler) videoHandler.stop();
        isScreenActive = false;
        elements.screenBtn.classList.remove('active');
    }
}

function stopAllMedia() {
    if (audioHandler) audioHandler.stop();
    if (videoHandler) videoHandler.stop();
    isMicActive = isCameraActive = isScreenActive = false;
    elements.micBtn.classList.remove('active');
    elements.cameraBtn.classList.remove('active');
    elements.screenBtn.classList.remove('active');
}

function updateUIConnected(connected) {
    elements.connectBtn.disabled = connected;
    elements.disconnectBtn.disabled = !connected;
    elements.chatInput.disabled = false; // always allow typing
    elements.sendBtn.disabled = !connected;
    elements.micBtn.disabled = !connected;
    elements.cameraBtn.disabled = !connected;
    elements.screenBtn.disabled = !connected;
    elements.status.textContent = connected ? 'Connected' : 'Disconnected';
    elements.status.className = `status-badge ${connected ? 'connected' : 'disconnected'}`;
}

function addMessage(text, className) {
    const div = document.createElement('div');
    div.className = className;
    div.textContent = text;
    elements.chatContainer.appendChild(div);
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

init();
