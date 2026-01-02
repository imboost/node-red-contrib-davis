# Node-RED Davis

A Node-RED plugin designed for creating Data Visualization.

## Features

- 📊 **Data Visualization** - Visualize your data easily
- 🔌 **Real-time Communication** - Bidirectional WebSocket messaging via Socket.IO
- 📦 **No-code Elements** - Create UI elements from Node-RED without writing code
- 🔄 **Dynamic Updates** - Update existing UI elements in real-time
- 🍞 **Built In Charts Templates** - Built-in Apache ECharts templates

## Installation

### From npm
```bash
cd ~/.node-red
npm install node-red-contrib-davis
```

### From source
```bash
cd ~/.node-red
npm install /{your-directory}/node-red-contrib-davis
```

## Quick Start

1. **Add a davis node** to your flow
2. **Set a URL** (e.g., `dashboard`)
3. **Deploy** the flow
4. **Open** `http://localhost:1880/dashboard` in your browser

## Nodes

| Node | Description |
|------|-------------|
| **davis** | Main node - serves Bootstrap web content |
| **davis-element** | Create HTML elements (no-code) |
| **davis-update** | Update existing elements dynamically |

## Front-end Usage

```javascript
import { davis } from '/davis/vendor/davis.esm.js';

// Start connection
davis.start();

// Receive messages
davis.onmessage((msg) => {
    console.log('Received:', msg);
});

// Send messages
davis.send({ payload: 'Hello Node-RED!' });

// Show Bootstrap toast
davis.toast('Success!', 'success');
```

## File Structure

```text
~/.node-red/davis/{directory}/
├── server.js           ← Custom Backend API
└── src/
    ├── css/                ← Stylesheets
    ├── data/               ← JSON Data storage
    ├── js/                 ← Client-side scripts
    ├── echarts/            ← Apache ECharts library
    ├── home.html           ← Main Dashboard
    ├── index.html          ← Login Page
    ├── install.html        ← Setup Page
    ├── query-builder.html  ← Chart Builder
    ├── ui-builder.html     ← Dashboard Builder
    └── viewer.html         ← Dashboard Viewer
```

## License

Apache-2.0