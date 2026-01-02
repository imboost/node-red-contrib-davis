const fs = require('fs');
const path = require('path');

/**
 * Davis Custom Server API
 * @param {object} router - Express router mounted at /{url}
 * @param {object} server - Node.js HTTP server
 * @param {object} io - Socket.IO instance
 */
module.exports = function (router, server, io) {

    // Data Paths
    const DATA_DIR = path.join(__dirname, 'data');
    const DASHBOARDS_FILE = path.join(DATA_DIR, 'dashboards.json');
    const SAVED_CHARTS_FILE = path.join(DATA_DIR, 'saved_charts.json');
    const USERS_FILE = path.join(DATA_DIR, 'users.json');

    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
    }

    // Helper: Read JSON File
    function readJSON(filePath) {
        if (!fs.existsSync(filePath)) return {};
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.error('Error reading file:', filePath, e);
            return {};
        }
    }

    // Helper: Write JSON File
    function writeJSON(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (e) {
            console.error('Error writing file:', filePath, e);
            return false;
        }
    }

    // --- API Endpoints ---

    // Check Install Status
    router.get('/api/status', (req, res) => {
        const installed = fs.existsSync(USERS_FILE);
        res.json({ installed });
    });

    // Install (Create Admin)
    router.post('/api/install', (req, res) => {
        if (fs.existsSync(USERS_FILE)) {
            return res.status(403).json({ success: false, message: 'Already installed' });
        }

        const { fullname, email, password, company } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }

        // Create Admin User
        const users = {
            admin: {
                id: 'admin',
                fullname,
                email,
                password, // In production, hash this!
                company,
                role: 'admin',
                createdAt: new Date().toISOString()
            }
        };

        if (writeJSON(USERS_FILE, users)) {
            res.json({ success: true, message: 'Installation complete' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to write users file' });
        }
    });

    // Login
    router.post('/api/login', (req, res) => {
        const { email, password } = req.body;
        const users = readJSON(USERS_FILE);

        // Simple check (only admin for now)
        const user = Object.values(users).find(u => u.email === email && u.password === password);

        if (user) {
            // Return user info (excluding password)
            const { password, ...userInfo } = user;
            res.json({ success: true, user: userInfo });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    });

    // Dashboards API
    router.get('/api/dashboards', (req, res) => {
        const data = readJSON(DASHBOARDS_FILE);
        res.json(data);
    });

    router.post('/api/dashboards/:id', (req, res) => {
        const { id } = req.params;
        const dashboardData = req.body;

        const allDashboards = readJSON(DASHBOARDS_FILE);
        allDashboards[id] = dashboardData;

        if (writeJSON(DASHBOARDS_FILE, allDashboards)) {
            res.json({ success: true, message: 'Dashboard saved' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to save dashboard' });
        }
    });

    router.delete('/api/dashboards/:id', (req, res) => {
        const { id } = req.params;
        const allDashboards = readJSON(DASHBOARDS_FILE);

        if (allDashboards[id]) {
            delete allDashboards[id];
            if (writeJSON(DASHBOARDS_FILE, allDashboards)) {
                res.json({ success: true, message: 'Dashboard deleted' });
            } else {
                res.status(500).json({ success: false, message: 'Failed to delete dashboard' });
            }
        } else {
            res.status(404).json({ success: false, message: 'Dashboard not found' });
        }
    });

    // Saved Charts API
    router.get('/api/saved_charts', (req, res) => {
        // Saved charts is an array in current implementation
        const data = readJSON(SAVED_CHARTS_FILE);
        // If empty object (default readJSON return), return empty array
        if (!Array.isArray(data) && Object.keys(data).length === 0) {
            res.json([]);
            return;
        }
        res.json(data);
    });

    router.post('/api/saved_charts', (req, res) => {
        const chartsData = req.body; // Expects array
        if (writeJSON(SAVED_CHARTS_FILE, chartsData)) {
            res.json({ success: true, message: 'Charts saved' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to save charts' });
        }
    });
};
