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
    elements.chatInput.onkeypress = (e) => e.key === 'Enter' && sendMessage();
    
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
        await api.connect({
            systemInstruction: "You are a helpful AI assistant in a browser extension side panel. You can see what the user shares via camera or screen."
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
}

function sendMessage() {
    const text = elements.chatInput.value.trim();
    if (!text || !api) return;

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
        videoHandler = new VideoHandler((data) => api.sendVideo(data));
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
    elements.chatInput.disabled = !connected;
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
