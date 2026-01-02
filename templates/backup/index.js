// Davis Client Script
import { davis } from '/davis/vendor/davis.esm.js';

// DOM Elements
const msgContainer = document.getElementById('msg-container');
const msgInput = document.getElementById('msg-input');
const sendForm = document.getElementById('send-form');
const statusEl = document.getElementById('status');

// Clear placeholder on first message
let hasMessages = false;

// Initialize davis connection
davis.start();

// Connection events
davis.onconnect(() => {
    statusEl.innerHTML = '<i class="bi bi-check-circle"></i> Connected';
    statusEl.className = 'badge bg-success';
    console.log('[davis] Connected to Node-RED');
});

davis.ondisconnect(() => {
    statusEl.innerHTML = '<i class="bi bi-x-circle"></i> Disconnected';
    statusEl.className = 'badge bg-danger';
    console.log('[davis] Disconnected from Node-RED');
});

davis.onerror((error) => {
    statusEl.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Error';
    statusEl.className = 'badge bg-warning';
    console.error('[davis] Error:', error);
});

// Handle incoming messages from Node-RED
davis.onmessage((msg) => {
    console.log('[davis] Message received:', msg);

    // Check for Davis commands
    if (msg._davis) {
        processDavisCommand(msg._davis);
    } else {
        addMessage(msg);
    }
});

// Send message form
sendForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (text) {
        davis.send({
            payload: text,
            topic: 'user-input',
            timestamp: new Date().toISOString()
        });
        msgInput.value = '';

        // Show toast feedback
        davis.toast('Message sent!', 'success');
    }
});

// Quick action button handler
window.sendAction = function (action) {
    davis.send({
        payload: action,
        topic: 'action',
        timestamp: new Date().toISOString()
    });
    davis.toast(`Action: ${action}`, 'info');
};

// Display a message in the container
function addMessage(msg) {
    // Clear placeholder on first message
    if (!hasMessages) {
        msgContainer.innerHTML = '';
        hasMessages = true;
    }

    const alertClass = getAlertClass(msg.topic);
    const icon = getIcon(msg.topic);

    // Format payload
    let content;
    if (typeof msg.payload === 'object') {
        content = JSON.stringify(msg.payload, null, 2);
    } else {
        content = String(msg.payload);
    }

    const div = document.createElement('div');
    div.className = `alert ${alertClass} d-flex align-items-start mb-2`;
    div.setAttribute('role', 'alert');
    div.innerHTML = `
        <i class="bi ${icon} me-2 mt-1"></i>
        <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong class="text-uppercase small">${msg.topic || 'message'}</strong>
                <small class="text-muted">${new Date().toLocaleTimeString()}</small>
            </div>
            <pre class="mb-0 small" style="white-space: pre-wrap;">${content}</pre>
        </div>
    `;

    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;

    // Limit messages
    while (msgContainer.children.length > 50) {
        msgContainer.removeChild(msgContainer.firstChild);
    }
}

function getAlertClass(topic) {
    const map = {
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'success': 'alert-success',
        'info': 'alert-info',
        'status': 'alert-secondary'
    };
    return map[topic] || 'alert-primary';
}

function getIcon(topic) {
    const map = {
        'error': 'bi-exclamation-triangle-fill',
        'warning': 'bi-exclamation-circle-fill',
        'success': 'bi-check-circle-fill',
        'info': 'bi-info-circle-fill',
        'status': 'bi-gear-fill'
    };
    return map[topic] || 'bi-chat-left-text-fill';
}

// Process Davis commands from _davis property
function processDavisCommand(davisCmd) {
    const { method, components } = davisCmd;

    if (!components || !Array.isArray(components)) return;

    components.forEach(comp => {
        switch (method) {
            case 'add':
                addElement(comp);
                break;
            case 'update':
                updateElement(comp);
                break;
            case 'remove':
                removeElement(comp);
                break;
            case 'replace':
                replaceElement(comp);
                break;
            case 'addClass':
                modifyClass(comp, 'add');
                break;
            case 'removeClass':
                modifyClass(comp, 'remove');
                break;
            case 'toggleClass':
                modifyClass(comp, 'toggle');
                break;
        }
    });
}

function addElement(comp) {
    const parent = document.querySelector(comp.parent || 'body');
    if (!parent) return;

    const el = document.createElement(comp.type || 'div');

    if (comp.id) el.id = comp.id;
    if (comp.class) el.className = comp.class;
    if (comp.slot) el.innerHTML = comp.slot;

    if (comp.attributes) {
        Object.entries(comp.attributes).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });
    }

    if (comp.events) {
        Object.entries(comp.events).forEach(([event, action]) => {
            el.addEventListener(event, () => {
                davis.send({ payload: action, topic: 'ui-event', element: comp.id });
            });
        });
    }

    if (comp.position === 'first') {
        parent.prepend(el);
    } else if (comp.position === 'replace') {
        parent.innerHTML = '';
        parent.appendChild(el);
    } else {
        parent.appendChild(el);
    }
}

function updateElement(comp) {
    const el = document.querySelector(comp.selector);
    if (!el) return;

    switch (comp.attribute) {
        case 'innerHTML':
            el.innerHTML = comp.value;
            break;
        case 'textContent':
            el.textContent = comp.value;
            break;
        case 'value':
            el.value = comp.value;
            break;
        case 'style':
            Object.assign(el.style, comp.value);
            break;
        default:
            el.setAttribute(comp.attribute, comp.value);
    }
}

function removeElement(comp) {
    const el = document.querySelector(comp.selector);
    if (el) el.remove();
}

function replaceElement(comp) {
    const el = document.querySelector(comp.selector);
    if (!el) return;

    const newEl = document.createElement(comp.type || 'div');
    if (comp.id) newEl.id = comp.id;
    if (comp.class) newEl.className = comp.class;
    if (comp.slot) newEl.innerHTML = comp.slot;

    el.replaceWith(newEl);
}

function modifyClass(comp, action) {
    const el = document.querySelector(comp.selector);
    if (!el) return;

    const classes = String(comp.value).split(' ');
    if (action === 'add') {
        el.classList.add(...classes);
    } else if (action === 'remove') {
        el.classList.remove(...classes);
    } else {
        classes.forEach(c => el.classList.toggle(c));
    }
}
