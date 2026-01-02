/**
 * Davis - Front-end Client Library (ES Module)
 * Provides WebSocket communication with Node-RED
 */

class Davis {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.namespace = null;
        this.callbacks = {
            message: [],
            connect: [],
            disconnect: [],
            error: []
        };
    }

    /**
     * Start the davis connection
     * @param {object} options - Configuration options
     */
    start(options = {}) {
        // Determine namespace from current URL path
        const pathname = window.location.pathname;
        const pathParts = pathname.split('/').filter(p => p);
        this.namespace = pathParts[0] || 'davis';

        const socketPath = '/davis/socket.io';

        // Load Socket.IO client dynamically if not present
        if (typeof io === 'undefined') {
            this._loadSocketIO().then(() => {
                this._connect(socketPath);
            });
        } else {
            this._connect(socketPath);
        }

        return this;
    }

    /**
     * Load Socket.IO client library
     * @private
     */
    _loadSocketIO() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/davis/socket.io/socket.io.js';
            script.onload = resolve;
            script.onerror = () => {
                // Try CDN fallback
                script.src = 'https://cdn.socket.io/4.6.0/socket.io.min.js';
                script.onload = resolve;
                script.onerror = reject;
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Establish Socket.IO connection
     * @private
     */
    _connect(socketPath) {
        try {
            this.socket = io(`/${this.namespace}`, {
                path: socketPath,
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000
            });

            // Connection events
            this.socket.on('connect', () => {
                this.connected = true;
                console.log('[davis] Connected to Node-RED');
                this._emit('connect');
            });

            this.socket.on('disconnect', (reason) => {
                this.connected = false;
                console.log('[davis] Disconnected:', reason);
                this._emit('disconnect', reason);
            });

            this.socket.on('connect_error', (error) => {
                console.error('[davis] Connection error:', error);
                this._emit('error', error);
            });

            // Message from Node-RED
            this.socket.on('davis:msg', (msg) => {
                console.debug('[davis] Message received:', msg);
                this._emit('message', msg);
            });

        } catch (error) {
            console.error('[davis] Failed to connect:', error);
            this._emit('error', error);
        }
    }

    /**
     * Send a message to Node-RED
     * @param {object} msg - Message object to send
     */
    send(msg) {
        if (!this.connected) {
            console.warn('[davis] Not connected, message queued');
            return false;
        }

        if (!msg || typeof msg !== 'object') {
            msg = { payload: msg };
        }

        this.socket.emit('davis:msg', msg);
        console.debug('[davis] Message sent:', msg);
        return true;
    }

    /**
     * Register callback for incoming messages
     * @param {function} callback - Function to call with received message
     */
    onmessage(callback) {
        if (typeof callback === 'function') {
            this.callbacks.message.push(callback);
        }
        return this;
    }

    /**
     * Register callback for connection event
     * @param {function} callback - Function to call on connect
     */
    onconnect(callback) {
        if (typeof callback === 'function') {
            this.callbacks.connect.push(callback);
        }
        return this;
    }

    /**
     * Register callback for disconnection event
     * @param {function} callback - Function to call on disconnect
     */
    ondisconnect(callback) {
        if (typeof callback === 'function') {
            this.callbacks.disconnect.push(callback);
        }
        return this;
    }

    /**
     * Register callback for error events
     * @param {function} callback - Function to call on error
     */
    onerror(callback) {
        if (typeof callback === 'function') {
            this.callbacks.error.push(callback);
        }
        return this;
    }

    /**
     * Emit event to registered callbacks
     * @private
     */
    _emit(event, ...args) {
        const callbacks = this.callbacks[event] || [];
        callbacks.forEach(cb => {
            try {
                cb(...args);
            } catch (error) {
                console.error(`[davis] Error in ${event} callback:`, error);
            }
        });
    }

    /**
     * Get connection status
     * @returns {boolean}
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    /**
     * Show a Bootstrap toast notification
     * @param {string} message - Toast message
     * @param {string} type - Bootstrap color (primary, success, danger, etc.)
     */
    toast(message, type = 'primary') {
        const toastContainer = document.querySelector('.toast-container') || this._createToastContainer();
        const toastId = `toast-${Date.now()}`;

        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastEl);
        toast.show();

        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    }

    _createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
        return container;
    }
}

// Create singleton instance
const davis = new Davis();

// Export for ES modules
export { davis, Davis };
export default davis;
