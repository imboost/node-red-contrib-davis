/**
 * Davis - Front-end Client Library (IIFE version)
 * For non-module usage via script tag
 */
(function (global) {
    'use strict';

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

        start(options = {}) {
            const pathname = window.location.pathname;
            const pathParts = pathname.split('/').filter(p => p);
            this.namespace = pathParts[0] || 'davis';

            const socketPath = '/davis/socket.io';

            if (typeof io === 'undefined') {
                this._loadSocketIO().then(() => this._connect(socketPath));
            } else {
                this._connect(socketPath);
            }

            return this;
        }

        _loadSocketIO() {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = '/davis/socket.io/socket.io.js';
                script.onload = resolve;
                script.onerror = () => {
                    script.src = 'https://cdn.socket.io/4.6.0/socket.io.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                };
                document.head.appendChild(script);
            });
        }

        _connect(socketPath) {
            try {
                this.socket = io('/' + this.namespace, {
                    path: socketPath,
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: Infinity,
                    reconnectionDelay: 1000
                });

                this.socket.on('connect', () => {
                    this.connected = true;
                    this._emit('connect');
                });

                this.socket.on('disconnect', (reason) => {
                    this.connected = false;
                    this._emit('disconnect', reason);
                });

                this.socket.on('connect_error', (error) => {
                    this._emit('error', error);
                });

                this.socket.on('davis:msg', (msg) => {
                    this._emit('message', msg);
                });

            } catch (error) {
                this._emit('error', error);
            }
        }

        send(msg) {
            if (!this.connected) return false;
            if (!msg || typeof msg !== 'object') msg = { payload: msg };
            this.socket.emit('davis:msg', msg);
            return true;
        }

        onmessage(cb) { if (typeof cb === 'function') this.callbacks.message.push(cb); return this; }
        onconnect(cb) { if (typeof cb === 'function') this.callbacks.connect.push(cb); return this; }
        ondisconnect(cb) { if (typeof cb === 'function') this.callbacks.disconnect.push(cb); return this; }
        onerror(cb) { if (typeof cb === 'function') this.callbacks.error.push(cb); return this; }

        _emit(event, ...args) {
            (this.callbacks[event] || []).forEach(cb => {
                try { cb(...args); } catch (e) { console.error(e); }
            });
        }

        isConnected() { return this.connected; }

        disconnect() {
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
                this.connected = false;
            }
        }

        toast(message, type = 'primary') {
            const container = document.querySelector('.toast-container') || this._createToastContainer();
            const toastId = 'toast-' + Date.now();
            const html = '<div id="' + toastId + '" class="toast align-items-center text-bg-' + type + ' border-0" role="alert">' +
                '<div class="d-flex"><div class="toast-body">' + message + '</div>' +
                '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>';
            container.insertAdjacentHTML('beforeend', html);
            var toastEl = document.getElementById(toastId);
            var toast = new bootstrap.Toast(toastEl);
            toast.show();
            toastEl.addEventListener('hidden.bs.toast', function () { toastEl.remove(); });
        }

        _createToastContainer() {
            var container = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
            return container;
        }
    }

    global.davis = new Davis();
    global.Davis = Davis;

})(typeof window !== 'undefined' ? window : this);
