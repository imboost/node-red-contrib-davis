/**
 * Microbase - Home Page Logic
 * Manages the dashboard catalog listing
 */

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const userSession = localStorage.getItem('microbase_user');
    if (!userSession) {
        window.location.href = 'index.html';
        return;
    }

    const grid = document.getElementById('dashboardGrid');
    const emptyStatus = document.getElementById('emptyStatus');
    const searchInput = document.getElementById('dashboardSearch');
    const totalCountEl = document.getElementById('totalDashboards');

    const newDashboardBtn = document.getElementById('newDashboardLink');

    // Handle New Dashboard Creation
    const handleNewDashboard = (e) => {
        e.preventDefault();
        // Generate a unique ID for the new dashboard
        const newId = 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('microbase_pending_id', newId);
        window.location.href = `ui-builder.html?id=${newId}`;
    };

    if (newDashboardBtn) {
        newDashboardBtn.addEventListener('click', handleNewDashboard);
    }

    // Sign Out Handler
    const signOutBtn = document.getElementById('signOutBtn');
    const signOutModal = document.getElementById('signOutModal');
    const cancelSignOut = document.getElementById('cancelSignOut');
    const confirmSignOut = document.getElementById('confirmSignOut');

    if (signOutBtn && signOutModal) {
        // Open Modal
        signOutBtn.addEventListener('click', () => {
            signOutModal.classList.add('active');
        });

        // Close Modal
        const closeModal = () => {
            signOutModal.classList.remove('active');
        };

        if (cancelSignOut) {
            cancelSignOut.addEventListener('click', closeModal);
        }

        // Close on backdrop click
        signOutModal.addEventListener('click', (e) => {
            if (e.target === signOutModal) closeModal();
        });

        // Confirm Action
        if (confirmSignOut) {
            confirmSignOut.addEventListener('click', () => {
                localStorage.removeItem('microbase_user');
                window.location.href = 'index.html';
            });
        }
    }

    /* 
    const createFirstBtn = document.getElementById('createFirstDashBtn');
    if (createFirstBtn) {
        createFirstBtn.addEventListener('click', handleNewDashboard);
    }
    */

    // Load Data
    let layoutsMap = {};
    let dashboards = [];
    let charts = [];
    let currentView = 'dashboards'; // 'dashboards' or 'charts'

    // Async Initialization
    async function init() {
        // Load Dashboards & Charts
        const [dashData, chartsData] = await Promise.all([
            API.getDashboards(),
            API.getSavedCharts()
        ]);

        layoutsMap = dashData;

        // Handle Charts Data (Array or Object)
        charts = Array.isArray(chartsData) ? chartsData : [];

        // Migration logic for dashboards (legacy)
        if (Object.keys(layoutsMap).length === 0) {
            const legacyData = localStorage.getItem('microbase_ui_layout');
            if (legacyData) {
                try {
                    const parsed = JSON.parse(legacyData);
                    const id = 'id_' + Date.now() + '_legacy';
                    const migrated = {
                        id: id,
                        title: parsed.title || 'Untitled Page',
                        lastModified: new Date().toISOString(),
                        layout: parsed.layout || parsed
                    };
                    await API.saveDashboard(id, migrated);
                    layoutsMap = await API.getDashboards(); // Reload
                } catch (e) {
                    console.warn('[Home] Failed to migrate legacy data', e);
                }
            }
        }

        updateList();
    }

    function updateList() {
        dashboards = Object.values(layoutsMap).sort((a, b) =>
            new Date(b.lastModified) - new Date(a.lastModified)
        );
        // Sort charts by modification time (if available) or create time? 
        // Charts structure from server isn't guaranteed to have dates, let's assume they might.
        // For now, no sorting on charts or simple reverse
        // charts.reverse(); 

        applyFilters();
    }

    // Initial Render
    init();

    // Search Handler
    searchInput.addEventListener('input', (e) => {
        applyFilters();
    });

    // Valid statuses for filtering
    let currentFilter = 'all';

    // View Switching (Dashboards vs Charts)
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update UI
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Apply View
            currentView = btn.dataset.view;
            applyFilters();
        });
    });

    function applyFilters() {
        const term = searchInput.value.toLowerCase();

        if (currentView === 'dashboards') {
            const filtered = dashboards.filter(d => {
                return (d.title || 'Untitled').toLowerCase().includes(term);
            });
            renderDashboards(filtered);
            updateStats(filtered.length);
        } else {
            const filtered = charts.filter(c => {
                return (c.title || 'Untitled Chart').toLowerCase().includes(term);
            });
            renderCharts(filtered);
            updateStats(filtered.length);
        }
    }

    function renderDashboards(list) {
        grid.innerHTML = '';
        grid.className = 'dashboard-list';

        if (list.length === 0) {
            showEmpty('No dashboards found', 'Create a new dashboard to get started.', 'ui-builder.html', 'Create Dashboard');
            return;
        }
        hideEmpty();

        list.forEach(dash => {
            const card = document.createElement('div');
            card.className = 'dashboard-item-row';

            const lastMod = new Date(dash.lastModified).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric'
            });

            const isPublished = dash.publishSettings && dash.publishSettings.isPublic;

            card.innerHTML = `
                    <div class="list-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                        </svg>
                    </div>
                    <div class="list-info">
                        <div class="list-title">${dash.title || 'Untitled Dashboard'}</div>
                        <div class="list-meta">Modified ${lastMod}</div>
                    </div>
                    <div class="list-status">
                         ${isPublished ? '<span class="badge-published">Published</span>' : ''}
                    </div>
                    <div class="list-actions">
                         ${isPublished ? `<a href="viewer.html?id=${dash.id}" target="_blank" class="action-btn">View</a>` : ''}
                         <a href="ui-builder.html?id=${dash.id}" class="action-btn" title="Edit">Edit</a>
                         <button class="action-btn delete-dash" data-id="${dash.id}" title="Delete">
                            Delete
                         </button>
                    </div>
            `;

            // Card Click (Navigate to editor)
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.action-btn') && !e.target.closest('a')) {
                    localStorage.setItem('microbase_pending_id', dash.id);
                    window.location.href = `ui-builder.html?id=${dash.id}`;
                }
            });

            // Edit Link Intercept
            const editLinks = card.querySelectorAll('a.action-btn[href*="ui-builder"]');
            editLinks.forEach(link => {
                link.addEventListener('click', () => {
                    localStorage.setItem('microbase_pending_id', dash.id);
                });
            });

            // Delete Handler
            const deleteBtn = card.querySelector('.delete-dash');
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                confirmDelete(dash.id, dash.title, 'dashboard');
            });

            grid.appendChild(card);
        });
    }

    function renderCharts(list) {
        grid.innerHTML = '';
        grid.className = 'dashboard-list'; // Reuse same list styling

        if (list.length === 0) {
            showEmpty('No charts found', 'Create a new query to visualize your data.', 'query-builder.html', 'New Query');
            return;
        }
        hideEmpty();

        list.forEach(chart => {
            const card = document.createElement('div');
            card.className = 'dashboard-item-row';

            // Chart Icon (use Utils if available, or fallback)
            const iconSvg = Utils.getChartIcon ? Utils.getChartIcon(chart.type) : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>';

            card.innerHTML = `
                    <div class="list-icon">
                        ${iconSvg}
                    </div>
                    <div class="list-info">
                        <div class="list-title">${chart.title || 'Untitled Chart'}</div>
                        <div class="list-meta">${chart.datasetId ? 'Dataset: ' + chart.datasetId : 'Configured Chart'}</div>
                    </div>
                    <div class="list-status">
                         <!-- No status needed for charts -->
                    </div>
                    <div class="list-actions">
                         <button class="action-btn delete-chart" data-id="${chart.id}" title="Delete">
                            Delete
                         </button>
                    </div>
            `;

            // Card Click - Removed as per request "only can delete"
            // Charts are managed here but edited/used via Query Builder or Dashboard Builder
            /*
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.action-btn') && !e.target.closest('a')) {
                    window.location.href = `query-builder.html?id=${chart.id}`;
                }
            });
            */

            // Delete Handler
            const deleteBtn = card.querySelector('.delete-chart');
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                confirmDelete(chart.id, chart.title, 'chart');
            });

            grid.appendChild(card);
        });
    }

    // Helper: Show Empty State
    function showEmpty(title, msg, btnLink, btnText) {
        emptyStatus.style.display = 'flex';
        emptyStatus.querySelector('h3').textContent = title;
        emptyStatus.querySelector('p').textContent = msg;
        const btn = emptyStatus.querySelector('.btn');
        btn.href = btnLink;
        btn.textContent = btnText;

        // Update new dashboard/query handler for the empty button if needed
        if (btnLink.includes('ui-builder')) {
            btn.onclick = handleNewDashboard;
        } else {
            btn.onclick = null;
        }
    }

    function hideEmpty() {
        emptyStatus.style.display = 'none';
    }

    // Consolidated Delete Logic
    function confirmDelete(id, title, type) {
        const deleteModal = document.getElementById('deleteConfirmModal');
        const cancelBtn = document.getElementById('cancelDelete');
        const confirmBtn = document.getElementById('confirmDelete');
        const targetNameEl = document.getElementById('deleteTargetName');
        const modalTitle = deleteModal.querySelector('.modal-header h3');

        if (deleteModal) {
            targetNameEl.textContent = title || 'Untitled Item';
            modalTitle.textContent = type === 'dashboard' ? 'Delete Dashboard' : 'Delete Chart';
            deleteModal.classList.add('active');

            // Clean up previous listeners
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            const closeModal = () => deleteModal.classList.remove('active');

            newCancelBtn.addEventListener('click', closeModal);
            deleteModal.onclick = (ev) => { if (ev.target === deleteModal) closeModal(); };

            newConfirmBtn.addEventListener('click', () => {
                if (type === 'dashboard') {
                    deleteDashboard(id);
                } else {
                    deleteChart(id);
                }
                closeModal();
            });
        } else if (confirm(`Delete "${title}"?`)) {
            if (type === 'dashboard') deleteDashboard(id);
            else deleteChart(id);
        }
    }

    async function deleteDashboard(id) {
        const result = await API.deleteDashboard(id);
        if (result.success) {
            delete layoutsMap[id];
            updateList();
        } else {
            alert('Failed to delete: ' + result.message);
        }
    }

    async function deleteChart(id) {
        // Need to remove chart from the list and save back the array
        const newCharts = charts.filter(c => c.id !== id);
        const result = await API.saveSavedCharts(newCharts);
        if (result.success) {
            charts = newCharts; // Update local state
            updateList();
        } else {
            alert('Failed to delete chart: ' + result.message);
        }
    }

    function updateStats(count) {
        totalCountEl.textContent = count !== undefined ? count : (currentView === 'dashboards' ? dashboards.length : charts.length);
    }
});
