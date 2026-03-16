/**
* GeminiLiveAPI: Handles direct WebSocket communication with Google Gemini API
*/
export class GeminiLiveAPI {
    constructor(apiKey, model = "gemini-2.5-flash-native-audio-preview-12-2025") {
        this.apiKey = apiKey;
        this.model = model;
        this.url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
        this.socket = null;
        this.onMessage = null;
        this.onOpen = null;
        this.onClose = null;
    }

    connect(config = {}) {
        return new Promise((resolve, reject) => {
            this.socket = new WebSocket(this.url);

            this.socket.onopen = () => {
                console.log("Connected to Gemini API");
                this.sendSetup(config);
                if (this.onOpen) this.onOpen();
                resolve();
            };

            this.socket.onmessage = async (event) => {
                let data = event.data;
                if (data instanceof Blob) {
                    data = await data.text();
                }
                const response = JSON.parse(data);
                if (this.onMessage) this.onMessage(response);
            };

            this.socket.onclose = (event) => {
                console.log("Disconnected from Gemini API", event);
                if (this.onClose) this.onClose(event);
            };

            this.socket.onerror = (error) => {
                console.error("Gemini API Error details:", error);
                if (this.onMessage) this.onMessage({ error: "WebSocket Error. Check API Key and internet connection." });
                reject(error);
            };
        });
    }

    sendSetup(config) {
        const setupMessage = {
            setup: {
                model: `models/${this.model}`,
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: config.voice || "Puck"
                            }
                        }
                    }
                },
                systemInstruction: {
                    parts: [{ text: config.systemInstruction || "You are a helpful assistant." }]
                },
                tools: config.tools || []
            }
        };
        this.send(setupMessage);
    }

    sendToolResponse(toolCallId, response) {
        this.send({
            toolResponse: {
                functionResponses: [
                    {
                        name: response.name,
                        id: toolCallId,
                        response: response.output
                    }
                ]
            }
        });
    }

    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }

    sendAudio(base64Data) {
        this.send({
            realtimeInput: {
                audio: {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64Data
                }
            }
        });
    }

    sendVideo(base64Data, mimeType = "image/jpeg") {
        this.send({
            realtimeInput: {
                video: {
                    mimeType: mimeType,
                    data: base64Data
                }
            }
        });
    }

    sendText(text) {
        this.send({
            realtimeInput: {
                text: text
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
}
