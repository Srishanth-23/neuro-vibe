# Neuro-Vibe Assistant (Gemini Live Edition)

A sophisticated, neuro-adaptive Chrome extension that transforms your browsing experience using the Gemini 2.0/2.5 Multimodal Live API.

## Features

- **Direct Gemini Live Integration**: Connects straight to Google's Bidi WebSocket API—no backend server required.
- **Multimodal Feedback**: Supports high-fidelity audio (speech-to-speech), text, and visual inputs (camera/screen sharing).
- **Adaptive Neuro-UI**: Automatically applies premium CSS transformations to your active tab based on your state and context.
- **Interactive Control**: Gemini can scroll the page and manipulate the UI on your behalf.
- **Privacy First**: Sensitive API keys are stored locally in Chrome's secure storage.

## Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/swankystark/neuro-vibe-1.git
    ```
2.  **Load in Chrome**:
    - Open Chrome and navigate to `chrome://extensions`.
    - Enable **Developer mode** in the top right.
    - Click **Load unpacked** and select the `gemini-live-extension` folder.
3.  **Setup**:
    - Open the side panel by clicking the extension icon.
    - Enter your [Gemini API Key](https://aistudio.google.com/app/apikey).
    - Click **Connect** and start your session!

## Technology Stack

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **API**: Google Gemini Multimodal Live API (WebSocket)
- **Permissions**: Side Panel API, Scripting API, MediaDevices API

## License

MIT
