/**
 * Layer 4: AI Layer - WebSocket Handler
 * Manages low-level WebSocket connectivity with retry logic and state tracking.
 */
export class WebSocketHandler {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        
        this.onMessage = null;
        this.onOpen = null;
        this.onClose = null;
        this.onError = null;
    }

    async connect(url) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url);
                
                this.ws.onopen = (ev) => {
                    this.isConnected = true;
                    if (this.onOpen) this.onOpen(ev);
                    resolve();
                };

                this.ws.onmessage = (ev) => {
                    if (this.onMessage) this.onMessage(ev.data);
                };

                this.ws.onclose = (ev) => {
                    this.isConnected = false;
                    if (this.onClose) this.onClose(ev);
                };

                this.ws.onerror = (ev) => {
                    console.error("[WebSocket] Error detected:", ev);
                    if (this.onError) this.onError(ev);
                    reject(ev);
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    send(data) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
        } else {
            console.warn("[WebSocket] Cannot send: Not connected");
        }
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}
