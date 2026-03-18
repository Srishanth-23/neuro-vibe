/**
 * Layer 4: AI Layer - Gemini Client
 * High-level Multimodal Live API client. Handles multimodal streams and model AI responses.
 */
import { WebSocketHandler } from './websocketHandler.js';

export class GeminiClient {
    constructor() {
        this.handler = new WebSocketHandler();
        this.config = null;
        
        this.onText = null;
        this.onAudio = null;
        this.onCall = null;
    }

    async connect(apiKey, model = "gemini-2.0-flash-exp") {
        this.config = {
            model: `models/${model}`,
            generation_config: { response_modalities: ["audio", "text"] }
        };

        const host = "generativelanguage.googleapis.com";
        const url = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

        this.handler.onOpen = () => {
            console.log("[GeminiClient] Handshake initiated");
            this.sendConfig();
        };

        this.handler.onMessage = (data) => this.processMessage(data);

        return this.handler.connect(url);
    }

    sendConfig() {
        this.handler.send(JSON.stringify({ setup: this.config }));
    }

    sendMedia(base64Data, mimeType = "image/jpeg") {
        const payload = {
            realtime_input: {
                media_chunks: [
                    { mime_type: mimeType, data: base64Data }
                ]
            }
        };
        this.handler.send(JSON.stringify(payload));
    }

    sendText(text) {
        const payload = {
            realtime_input: {
                text: text
            }
        };
        this.handler.send(JSON.stringify(payload));
    }

    async processMessage(data) {
        if (data instanceof Blob) {
            // Raw PCM audio data (from the model)
            if (this.onAudio) this.onAudio(data);
            return;
        }

        try {
            const msg = JSON.parse(data);
            if (msg.server_content?.model_turn?.parts) {
                const parts = msg.server_content.model_turn.parts;
                for (const part of parts) {
                    if (part.text && this.onText) this.onText(part.text);
                    if (part.inline_data && this.onAudio) {
                        this.onAudio(part.inline_data.data); // Base64 audio
                    }
                }
            }
            if (msg.tool_call && this.onCall) {
                this.onCall(msg.tool_call);
            }
        } catch (err) {
            console.error("[GeminiClient] Message parse error:", err);
        }
    }

    disconnect() {
        this.handler.close();
    }
}
