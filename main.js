/**
 * Main Extension Controller
 */

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
                                                enum: ["remove", "set_text", "set_html", "set_attribute", "set_style", "append_html", "insert_before", "insert_after", "click"]
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

1. ASD (Autism Spectrum Disorder)
What to look for:
Face: "Flat affect" (expressionless face despite complex tasks), eye-contact avoidance, or repetitive mouth/hand movements (stimming).
Audio: Monotone prosody, literal language, long silences (potential shutdown), or high-pitched distress sounds.
UI Intervention:
Action: isolation_mode. Remove all non-functional decorative elements.
Visuals: Transition to "Low-Arousal" colors (muted greens/blues). Reduce contrast if squinting is detected.
Speech Response: Use a very calm, predictable, and low-energy voice. Avoid metaphors or sarcasm. Provide clear, step-by-step verbal guidance.

2. ADHD (Attention Deficit Hyperactivity Disorder)
What to look for:
Face: Rapid eye darting (distraction), frequent posture shifts, or "zoning out" (blank stare).
Audio: Rapid-fire speech, jumping between unrelated topics, or frequent interruptions of the AI.
UI Intervention:
Action: reading_ruler or focus_spotlight. Dim everything except the central content area.
Logic: Pause all background animations and auto-playing videos immediately.
Speech Response: Use an engaging, high-energy (but not loud) tone. If the user wanders off-topic, gently redirect them: "That's interesting, but should we finish this paragraph first?" Use bullet points in speech.

3. Sensory Distress (Overload)
What to look for:
Face: Jaw clenching, tightly shut eyes, brow lowering (pain response), or covering ears with hands.
Audio: Sudden cessation of speech or sharp, jagged breathing.
UI Intervention:
Action: dark_node_active. Switch to a "True Black" background with amber text.
Logic: Kill all audio from the website (mute the tab).
Speech Response: Speak only if necessary. Use a whisper-like volume. Say: "I've dimmed the lights and silenced the page. Take your time."

4. Dyslexia (Reading Support)
What to look for:
Face: Lean-in (squinting at text), mouth moving while reading silently, or signs of frustration (lip-biting).
Audio: Hesitant speech when reading aloud, or asking for definitions frequently.
UI Intervention:
Action: font_transform. Force the use of OpenDyslexic or heavy sans-serif fonts.
Visuals: Increase line-height to 2.0 and letter-spacing. Use a "line-focus" overlay that follows the mouse.
Speech Response: Offer to summarize long paragraphs into 3 simple bullet points. Read difficult words aloud if the user pauses on them for more than 2 seconds.

You have access to tools to perform UI interventions: 'apply_adaptive_css', 'scroll_page', and 'modify_dom'. Use these tools creatively to help the user navigate and transform their browsing experience as described above.`;

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
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (cssCode) => {
                            let style = document.getElementById('gemini-neuro-ui');
                            if (!style) {
                                style = document.createElement('style');
                                style.id = 'gemini-neuro-ui';
                                document.head.appendChild(style);
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
                api.sendToolResponse(fc.id, {
                    name: fc.name,
                    output: { success: false, error: err.message }
                });
            }
        } else if (fc.name === "scroll_page") {
            const amount = fc.args.amount;
            const smooth = fc.args.smooth !== false;

            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
                                    const elements = document.querySelectorAll(op.selector);
                                    if (elements.length === 0) {
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
