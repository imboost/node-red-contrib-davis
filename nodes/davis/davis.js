/**
 * Node-RED Davis - Main Node
 * Serves static web content and provides real-time WebSocket communication
 */
'use strict';

const path = require('path');
const fs = require('fs-extra');
const express = require('express');
const { Server } = require('socket.io');

// Global configuration
const davis = {
    instances: {},
    rootFolder: null,
    RED: null,
    io: null,
    expressApp: null,
    httpServer: null
};

/**
 * Main module export - called by Node-RED on startup
 * @param {object} RED - Node-RED runtime API
 */
module.exports = function (RED) {
    davis.RED = RED;

    // Setup on first load
    setupModule(RED);

    // Register the node type
    RED.nodes.registerType('davis', Davis);
};

/**
 * One-time module setup
 * @param {object} RED - Node-RED runtime API
 */
function setupModule(RED) {
    // Get the userDir for storing davis app files
    davis.rootFolder = path.join(RED.settings.userDir, 'davis');

    // Ensure root folder exists
    fs.ensureDirSync(davis.rootFolder);

    // Get Express app and HTTP server from Node-RED
    davis.expressApp = RED.httpNode || RED.httpAdmin;
    davis.httpServer = RED.server;

    // Initialize Socket.IO if not already done
    if (!davis.io) {
        davis.io = new Server(davis.httpServer, {
            path: '/davis/socket.io',
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        RED.log.info('[davis] Socket.IO server initialized');
    }

    // Serve front-end library files
    const frontEndPath = path.join(__dirname, '../../front-end');
    davis.expressApp.use('/davis/vendor', express.static(frontEndPath));

    RED.log.info(`[davis] Root folder: ${davis.rootFolder}`);
}

/**
 * Davis Node Constructor
 * @param {object} config - Node configuration from editor
 */
function Davis(config) {
    const RED = davis.RED;
    RED.nodes.createNode(this, config);

    const node = this;

    // Node configuration
    node.url = config.url || 'davis';
    node.name = config.name || node.url;
    node.topic = config.topic || '';
    node.fwdInMessages = config.fwdInMessages !== false;
    node.allowScripts = config.allowScripts !== false;
    node.allowStyles = config.allowStyles !== false;
    node.copyIndex = config.copyIndex !== false;

    // Create folder for this instance
    node.instanceFolder = path.join(davis.rootFolder, node.url);

    // Ensure instance folder exists with default files
    setupInstanceFolder(node);

    // Store instance reference
    davis.instances[node.id] = {
        url: node.url,
        node: node
    };

    // Setup Express route for this instance
    setupExpressRoute(node);

    // Setup Socket.IO namespace for this instance
    setupSocketIO(node);

    // Handle incoming messages from Node-RED flow
    node.on('input', function (msg, send, done) {
        send = send || function () { node.send.apply(node, arguments); };

        // Add topic if not present
        if (!msg.topic && node.topic) {
            msg.topic = node.topic;
        }

        // Send to all connected clients
        if (node.ioNamespace) {
            node.ioNamespace.emit('davis:msg', msg);
            node.status({ fill: 'green', shape: 'dot', text: 'Sent to UI' });
        }

        // Forward to output if enabled
        if (node.fwdInMessages) {
            send(msg);
        }

        if (done) done();
    });

    // Handle node close/redeploy
    node.on('close', function (removed, done) {
        // Remove Express route
        if (node.router) {
            // Find and remove the route
            const routes = davis.expressApp._router.stack;
            for (let i = routes.length - 1; i >= 0; i--) {
                if (routes[i].name === `davis_${node.url}`) {
                    routes.splice(i, 1);
                }
            }
        }

        // Close Socket.IO namespace
        if (node.ioNamespace) {
            node.ioNamespace.disconnectSockets(true);
        }

        // Remove from instances
        delete davis.instances[node.id];

        // Delete instance folder if node is removed
        if (removed) {
            try {
                fs.removeSync(node.instanceFolder);
                RED.log.info(`[davis:${node.url}] Instance folder removed`);
            } catch (err) {
                RED.log.error(`[davis:${node.url}] Failed to remove instance folder: ${err.message}`);
            }
        }

        RED.log.info(`[davis:${node.url}] Instance closed`);

        if (done) done();
    });

    node.status({ fill: 'blue', shape: 'dot', text: `Ready: /${node.url}` });
    RED.log.info(`[davis:${node.url}] Instance created`);
}

/**
 * Setup instance folder with default files
 * @param {object} node - Node instance
 */
function setupInstanceFolder(node) {
    const srcFolder = path.join(node.instanceFolder, 'src');

    // Ensure src folder exists
    fs.ensureDirSync(srcFolder);

    // Recursive copy function
    const copyRecursiveSync = function (src, dest) {
        const exists = fs.existsSync(src);
        const stats = exists && fs.statSync(src);
        if (stats && stats.isDirectory()) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest);
            fs.readdirSync(src).forEach(function (childItemName) {
                copyRecursiveSync(path.join(src, childItemName),
                    path.join(dest, childItemName));
            });
        } else if (!fs.existsSync(dest)) {
            fs.copySync(src, dest);
        }
    };

    if (node.copyIndex) {
        const templateDir = path.join(__dirname, '../../templates/blank');
        try {
            copyRecursiveSync(templateDir, srcFolder);
        } catch (err) {
            RED.log.error(`[davis:${node.url}] Error copying template: ${err.message}`);
        }
        //         if (fs.existsSync(templateDir)) {
        //             try {
        //                 copyRecursiveSync(templateDir, srcFolder);
        //             } catch (err) {
        //                 RED.log.error(`[davis:${node.url}] Error copying template: ${err.message}`);
        //             }
        //         } else {
        //             // Fallback to generating default files if template doesn't exist
        //             // Create default index.html
        //             const indexPath = path.join(srcFolder, 'index.html');
        //             if (!fs.existsSync(indexPath)) {
        //                 const defaultHtml = `<!DOCTYPE html>
        // <html lang="en">
        // <head>
        //     <meta charset="UTF-8">
        //     <meta name="viewport" content="width=device-width, initial-scale=1.0">
        //     <title>Davis - ${node.url}</title>
        //     <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
        //     <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
        //     <link rel="stylesheet" href="./index.css">
        // </head>
        // <body>
        //     <div id="app" class="container py-4">
        //         <header class="text-center mb-4">
        //             <h1><i class="bi bi-bootstrap text-primary"></i> Davis</h1>
        //             <p class="text-muted">Instance: <code>${node.url}</code></p>
        //         </header>

        //         <main class="row g-4">
        //             <div class="col-12">
        //                 <div class="card">
        //                     <div class="card-header">
        //                         <h5 class="mb-0"><i class="bi bi-inbox"></i> Messages from Node-RED</h5>
        //                     </div>
        //                     <div class="card-body" id="msg-container" style="max-height: 400px; overflow-y: auto;"></div>
        //                 </div>
        //             </div>

        //             <div class="col-12">
        //                 <div class="card">
        //                     <div class="card-header">
        //                         <h5 class="mb-0"><i class="bi bi-send"></i> Send to Node-RED</h5>
        //                     </div>
        //                     <div class="card-body">
        //                         <form id="send-form" class="d-flex gap-2">
        //                             <input type="text" id="msg-input" class="form-control" placeholder="Type a message...">
        //                             <button type="submit" class="btn btn-primary">Send</button>
        //                         </form>
        //                     </div>
        //                 </div>
        //             </div>
        //         </main>

        //         <footer class="text-center mt-4 text-muted">
        //             <small>Status: <span id="status" class="badge bg-warning">Connecting...</span></small>
        //         </footer>
        //     </div>

        //     <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
        //     <script type="module" src="./index.js"></script>
        // </body>
        // </html>`;
        //                 fs.writeFileSync(indexPath, defaultHtml);
        //             }

        //             // Create default index.css
        //             const cssPath = path.join(srcFolder, 'index.css');
        //             if (!fs.existsSync(cssPath)) {
        //                 const defaultCss = `/* Davis Instance Custom Styles */

        // body {
        //     background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
        //     min-height: 100vh;
        // }

        // .card {
        //     border: none;
        //     box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075);
        // }

        // .card-header {
        //     background: white;
        //     border-bottom: 1px solid rgba(0,0,0,0.05);
        // }

        // .message {
        //     padding: 0.75rem 1rem;
        //     margin-bottom: 0.5rem;
        //     background: #f8f9fa;
        //     border-left: 3px solid var(--bs-primary);
        //     border-radius: 0 0.25rem 0.25rem 0;
        //     animation: slideIn 0.3s ease;
        // }

        // @keyframes slideIn {
        //     from { opacity: 0; transform: translateX(-10px); }
        //     to { opacity: 1; transform: translateX(0); }
        // }

        // .message pre {
        //     margin: 0;
        //     font-size: 0.85rem;
        //     white-space: pre-wrap;
        //     word-break: break-all;
        // }

        // .message .msg-topic {
        //     font-size: 0.7rem;
        //     font-weight: 600;
        //     color: var(--bs-primary);
        //     text-transform: uppercase;
        // }

        // .message .msg-time {
        //     font-size: 0.7rem;
        //     color: var(--bs-secondary);
        //     text-align: right;
        // }
        // `;
        //                 fs.writeFileSync(cssPath, defaultCss);
        //             }

        //             // Create default index.js
        //             const jsPath = path.join(srcFolder, 'index.js');
        //             if (!fs.existsSync(jsPath)) {
        //                 const defaultJs = `// Davis Client Script
        // import { davis } from '/davis/vendor/davis.esm.js';

        // // DOM Elements
        // const msgContainer = document.getElementById('msg-container');
        // const msgInput = document.getElementById('msg-input');
        // const sendForm = document.getElementById('send-form');
        // const statusEl = document.getElementById('status');

        // // Initialize davis
        // davis.start();

        // // Handle connection status
        // davis.onconnect(() => {
        //     statusEl.textContent = 'Connected';
        //     statusEl.className = 'badge bg-success';
        //     console.log('[davis] Connected to Node-RED');
        // });

        // davis.ondisconnect(() => {
        //     statusEl.textContent = 'Disconnected';
        //     statusEl.className = 'badge bg-danger';
        //     console.log('[davis] Disconnected from Node-RED');
        // });

        // // Handle incoming messages from Node-RED
        // davis.onmessage((msg) => {
        //     console.log('[davis] Message received:', msg);
        //     addMessage(msg);
        // });

        // // Send message to Node-RED
        // sendForm.addEventListener('submit', (e) => {
        //     e.preventDefault();
        //     const text = msgInput.value.trim();
        //     if (text) {
        //         davis.send({ payload: text, topic: 'user-input' });
        //         msgInput.value = '';
        //     }
        // });

        // // Helper function to display messages
        // function addMessage(msg) {
        //     const div = document.createElement('div');
        //     div.className = 'message';
        //     div.innerHTML = \`
        //         <div class="msg-topic">\${msg.topic || 'message'}</div>
        //         <pre>\${JSON.stringify(msg.payload, null, 2)}</pre>
        //         <div class="msg-time">\${new Date().toLocaleTimeString()}</div>
        //     \`;
        //     msgContainer.appendChild(div);
        //     msgContainer.scrollTop = msgContainer.scrollHeight;
        // }
        // `;
        //                 fs.writeFileSync(jsPath, defaultJs);
        //             }
        //         }
    }
}

/**
 * Setup Express route for serving static files
 * @param {object} node - Node instance
 */
function setupExpressRoute(node) {
    const router = express.Router();

    // Load custom server API if exists (Precedence over static files)
    let serverPath = path.join(node.instanceFolder, 'server.js');
    const serverPathInSrc = path.join(node.instanceFolder, 'src', 'server.js');

    // Check if server.js is in src folder (from template copy) and move it to root
    if (!fs.existsSync(serverPath) && fs.existsSync(serverPathInSrc)) {
        try {
            fs.moveSync(serverPathInSrc, serverPath);
            davis.RED.log.info(`[davis:${node.url}] Moved server.js from src to instance root`);
        } catch (err) {
            davis.RED.log.warn(`[davis:${node.url}] Failed to move server.js: ${err.message}`);
            // Fallback to using it from src if move failed
            serverPath = serverPathInSrc;
        }
    }

    if (fs.existsSync(serverPath)) {
        try {
            // Clear require cache to ensure fresh load
            delete require.cache[require.resolve(serverPath)];
            const customServer = require(serverPath);

            if (typeof customServer === 'function') {
                customServer(router, davis.httpServer, davis.io);
                davis.RED.log.info(`[davis:${node.url}] Custom server loaded`);
            } else {
                davis.RED.log.warn(`[davis:${node.url}] Custom server.js must export a function`);
            }
        } catch (err) {
            davis.RED.log.error(`[davis:${node.url}] Error loading server.js: ${err.message}`);
        }
    }

    // Serve src folder for this instance
    const srcFolder = path.join(node.instanceFolder, 'src');
    router.use('/', express.static(srcFolder));

    // Mount the router
    const routePath = `/${node.url}`;
    davis.expressApp.use(routePath, router);

    node.router = router;

    davis.RED.log.info(`[davis:${node.url}] Serving from ${srcFolder}`);
}

/**
 * Setup Socket.IO namespace for real-time communication
 * @param {object} node - Node instance
 */
function setupSocketIO(node) {
    const namespace = `/${node.url}`;
    node.ioNamespace = davis.io.of(namespace);

    node.ioNamespace.on('connection', (socket) => {
        davis.RED.log.info(`[davis:${node.url}] Client connected: ${socket.id}`);

        // Update node status
        const clientCount = node.ioNamespace.sockets.size;
        node.status({
            fill: 'green',
            shape: 'dot',
            text: `${clientCount} client${clientCount !== 1 ? 's' : ''} connected`
        });

        // Handle messages from client
        socket.on('davis:msg', (msg) => {
            // Add metadata
            msg._socketId = socket.id;
            msg._davisInstance = node.url;

            // Send to Node-RED flow output
            node.send(msg);

            davis.RED.log.debug(`[davis:${node.url}] Message from client:`, msg);
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            davis.RED.log.info(`[davis:${node.url}] Client disconnected: ${socket.id} (${reason})`);

            const clientCount = node.ioNamespace.sockets.size;
            if (clientCount > 0) {
                node.status({
                    fill: 'green',
                    shape: 'dot',
                    text: `${clientCount} client${clientCount !== 1 ? 's' : ''} connected`
                });
            } else {
                node.status({ fill: 'blue', shape: 'dot', text: `Ready: /${node.url}` });
            }
        });
    });
}
