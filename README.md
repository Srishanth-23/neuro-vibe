# 🧠 Neuro-Vibe Assistant

**Neuro-Vibe Assistant** is a sophisticated, neuro-adaptive Chrome extension designed to transform the browsing experience for users with **ASD**, **ADHD**, and **Dyslexia**. Powered by the **Gemini 2.0/2.5 Multimodal Live API**, it monitors real-time multimodal streams (audio, video, and screen) to provide personalized, sensory-aware UI interventions.

## 🚀 Features

- **Neuro-Adaptive UI**: Dynamically modifies the appearance of webpages based on detected emotional or sensory states.
- **Multimodal Intelligence**: Uses Gemini's live API to process speech, camera input, and screen content simultaneously.
- **Biomarker Detection**: Leverages **MediaPipe Face Landmarker** to identify signs of sensory distress, focus loss, or frustration.
- **Adaptive Interventions**:
  - **ASD Support**: isolation_mode, low-arousal colors, calm speech.
  - **ADHD Support**: Focus spotlights, pausing background distractions, and engaging, structured redirection.
  - **Dyslexia Support**: Font transformations (e.g., OpenDyslexic), increased readability spacing, and text-to-speech summarization.
  - **Sensory Overload Protection**: Immediate dark mode activation and tab muting when distress is detected.
- **Fully Multilingual**: Responds fluently in the language the user speaks.

## 🛠️ Technology Stack

- **AI**: Gemini 2.0/2.5 Multimodal Live API (WebSocket-based).
- **Vision**: MediaPipe Tasks Vision (`face_landmarker`).
- **Web Technologies**: HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Extension Framework**: Chrome Extension Manifest V3.

## 📦 Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/swankystark/neuro-vibe-1.git
   cd neuro-vibe-1
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** (top right).
   - Click **Load unpacked** and select the `neuro-vibe-1` directory.

## 📖 Usage

1. Click the **Neuro-Vibe** extension icon or open the Chrome Side Panel.
2. Enter your **Gemini API Key** and click **Connect**.
3. Use the control bar to toggle:
   - 🎤 **Microphone**: For voice interaction.
   - 📷 **Camera**: For real-time biomarker tracking.
   - 🖥️ **Screen**: To share what you're reading/watching.
4. Interact naturally. The assistant will automatically adapt the webpages you visit to better suit your sensory needs.

## 🔧 Project Structure

- `manifest.json`: Extension configuration.
- `main.js`: Main controller logic and Gemini integration.
- `gemini-live-api.js`: Wrapper for the Gemini Multimodal Live WebSocket.
- `media-handlers.js`: Logic for audio, video, and screen capture.
- `sidepanel.html` & `style.css`: The assistant's user interface.
- `face_landmarker.task`: MediaPipe model for facial tracking.

---
*Built to make the web more accessible for every mind.*
