/**
 * UI Builder Application
 */
class UIBuilder {
    constructor() {
        // Auth Check
        const userSession = localStorage.getItem('microbase_user');
        if (!userSession) {
            window.location.href = 'index.html';
            return;
        }
        document.body.style.display = 'block';

        this.selectedElement = null; // Currently selected element for config
        this.draggedItem = null;
        this.pageLayout = []; // Store the JSON structure

        // Dashboard Persistence State
        const urlParams = new URLSearchParams(window.location.search);
        this.layoutId = urlParams.get('id');

        // Robustness: Check for pending ID from Home Page (handles redirect data loss)
        const pendingId = localStorage.getItem('microbase_pending_id');
        if (pendingId) {
            console.log('[UIBuilder] Found pending load ID:', pendingId);
            // If URL id is missing or mismatch, trust pending (user intent)
            if (!this.layoutId || this.layoutId !== pendingId) {
                this.layoutId = pendingId;
                const newUrl = `${window.location.pathname}?id=${this.layoutId}`;
                window.history.replaceState({ path: newUrl }, '', newUrl);
                console.log('[UIBuilder] Restored ID from pending state:', this.layoutId);
            }
            localStorage.removeItem('microbase_pending_id');
        }

        // Initialize as empty map, load in init()
        this.layoutsMap = {};

        this.init();
    }

    async init() {
        console.log('[UIBuilder] Initializing with ID:', this.layoutId);

        // Load layouts from API
        this.layoutsMap = await API.getDashboards();
        console.log('[UIBuilder] Loaded layouts map. Keys:', Object.keys(this.layoutsMap));

        this.setupEventListeners();
        await this.loadLayout();
        this.loadSidebarCharts();
        this.loadMaps();
    }

    // ... (rest of methods)

    loadMaps() {
        // Load Indonesia GeoJSON and register with ECharts (same as DashboardViewer)
        fetch('https://code.highcharts.com/mapdata/countries/id/id-all.geo.json')
            .then(response => response.json())
            .then(geoJSON => {
                echarts.registerMap('indonesia', geoJSON);
            })
            .catch(err => {
                console.warn('Could not load Indonesia map:', err);
            });
    }

    // Dynamic map loading for GeoMap charts
    async loadMapForRegion(region) {
        if (!region) return false;

        // Check if already registered
        if (echarts.getMap(region)) return true;

        try {
            // Load map registry from data/maps.json
            const registryRes = await fetch('data/maps.json');
            if (!registryRes.ok) throw new Error('Failed to load maps registry');
            const mapRegistry = await registryRes.json();

            // Find the map entry
            const mapEntry = mapRegistry.find(m => m.id === region);
            if (!mapEntry) {
                console.warn('[UIBuilder] Unknown map region:', region);
                return false;
            }

            // Fetch and register the map
            const response = await fetch(mapEntry.path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const geoJSON = await response.json();
            echarts.registerMap(region, geoJSON);
            console.log(`[UIBuilder] ${region} map registered from ${mapEntry.path}`);
            return true;
        } catch (err) {
            console.warn(`[UIBuilder] Could not load ${region} map:`, err);
            return false;
        }
    }

    async loadSidebarCharts() {
        const container = document.getElementById('savedChartsGroup');
        let savedCharts = [];

        try {
            savedCharts = await API.getSavedCharts();
        } catch (e) {
            console.error('[UIBuilder] Failed to load saved charts', e);
        }

        if (savedCharts.length === 0) {
            container.innerHTML = '<div class="empty-state-sidebar" style="grid-column: span 2; font-size: 11px; color: #94a3b8; text-align: center; padding: 10px;">No saved charts</div>';
            return;
        }

        container.innerHTML = savedCharts.map(chart => `
            <div class="draggable-item" draggable="true" data-type="saved-chart" data-id="${chart.id}">
                <div class="item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 20V10" />
                        <path d="M12 20V4" />
                        <path d="M6 20V14" />
                    </svg>
                </div>
                <span>${chart.title}</span>
            </div>
        `).join('');

        // Re-attach listeners to new items
        container.querySelectorAll('.draggable-item').forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleDragStart(e));
        });
    }

    setupEventListeners() {
        this.setupTabs();

        // Drag Source Events (Sidebar)
        const draggables = document.querySelectorAll('.draggable-item');
        draggables.forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleDragStart(e));
        });

        // Drop Zone Events (Canvas)
        const canvas = document.querySelector('.builder-canvas');
        canvas.addEventListener('dragover', (e) => this.handleDragOver(e));
        canvas.addEventListener('drop', (e) => this.handleDrop(e));
        canvas.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        canvas.addEventListener('dragleave', (e) => this.handleDragLeave(e));

        // Save Layout
        document.getElementById('saveLayoutBtn').addEventListener('click', () => this.saveLayout());

        // Modals
        document.getElementById('closeChartSelectModal').addEventListener('click', () => {
            document.getElementById('chartSelectModal').classList.remove('active');
        });

        // Title Rename
        const titleEl = document.querySelector('.query-title');
        if (titleEl) {
            titleEl.addEventListener('click', () => {
                if (this.isPreviewMode) return; // Disable rename in preview
                titleEl.contentEditable = 'true';
                titleEl.focus();
            });

            titleEl.addEventListener('blur', () => {
                titleEl.contentEditable = 'false';
            });

            titleEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    titleEl.blur();
                }
            });
        }

        // Preview Toggle
        document.getElementById('previewBtn').addEventListener('click', () => this.togglePreview());

        // Publish Modal
        const publishModal = document.getElementById('publishModal');
        document.getElementById('publishBtn').addEventListener('click', () => {
            this.openPublishModal();
        });
        document.getElementById('closePublishModal').addEventListener('click', () => {
            publishModal.classList.remove('active');
        });
        document.getElementById('savePublishBtn').addEventListener('click', () => {
            this.savePublishSettings();
        });

        // Toggle PIN/Link visibility based on checkbox
        const toggle = document.getElementById('publishToggle');
        toggle.addEventListener('change', () => {
            const isPublic = toggle.checked;
            document.getElementById('pinGroup').style.display = isPublic ? 'block' : 'none';
            document.getElementById('linkGroup').style.display = isPublic ? 'block' : 'none';
        });

        document.getElementById('copyLinkBtn').addEventListener('click', () => {
            const linkInput = document.getElementById('publicLink');
            linkInput.select();
            document.execCommand('copy');
            Utils.showToast('Link copied to clipboard', 'success');
        });
    }

    openPublishModal() {
        if (!this.layoutId) {
            Utils.showToast('Please save the dashboard once before publishing.', 'warning');
            return;
        }

        const modal = document.getElementById('publishModal');
        const toggle = document.getElementById('publishToggle');
        const pinInput = document.getElementById('publishPin');
        const linkInput = document.getElementById('publicLink');
        const openLinkBtn = document.getElementById('openLinkBtn');

        // Load existing settings
        const currentData = this.layoutsMap[this.layoutId] || {};
        const settings = currentData.publishSettings || { isPublic: false, pin: '' };

        toggle.checked = settings.isPublic;
        pinInput.value = settings.pin || '';

        // Generate Link
        const origin = window.location.origin;
        let path = window.location.pathname;

        // Adopt current URL style to avoid server redirects
        if (path.includes('ui-builder.html')) {
            path = path.replace('ui-builder.html', 'viewer.html');
        } else {
            path = path.replace('ui-builder', 'viewer');
        }

        const link = `${origin}${path}?id=${this.layoutId}`;

        linkInput.value = link;
        openLinkBtn.href = link;

        // UI State
        const display = settings.isPublic ? 'block' : 'none';
        document.getElementById('pinGroup').style.display = display;
        document.getElementById('linkGroup').style.display = display;

        modal.classList.add('active');
    }

    async savePublishSettings() {
        if (!this.layoutId) return;

        const isPublic = document.getElementById('publishToggle').checked;
        const pin = document.getElementById('publishPin').value;

        // Update local map data
        if (!this.layoutsMap[this.layoutId]) {
            this.layoutsMap[this.layoutId] = { id: this.layoutId, layout: [] };
        }

        this.layoutsMap[this.layoutId].publishSettings = {
            isPublic,
            pin
        };

        // Persist via API
        try {
            const res = await API.saveDashboard(this.layoutId, this.layoutsMap[this.layoutId]);
            if (res.success) {
                Utils.showToast('Publish settings saved', 'success');
                document.getElementById('publishModal').classList.remove('active');
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            console.error('Failed to save publish settings', e);
            Utils.showToast('Failed to save settings', 'error');
        }
    }

    togglePreview() {
        this.isPreviewMode = !this.isPreviewMode;
        const container = document.querySelector('.builder-container');
        const btn = document.getElementById('previewBtn');

        if (this.isPreviewMode) {
            container.classList.add('preview-mode');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; margin-right: 4px;">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
            `;
            // Deselect any active element
            if (this.selectedElement) {
                // Logic to clear selection (remove .selected class)
                // We need a helper for deselecting or just rely on CSS hiding the config panel
                document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                this.selectedElement = null;
                this.updateConfigPanel(); // Should clear it
            }
        } else {
            container.classList.remove('preview-mode');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; margin-right: 4px;">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
                Preview
            `;
        }
    }


    // --- Drag & Drop Handlers ---

    handleDragStart(e) {
        this.draggedItem = e.target;
        e.dataTransfer.setData('text/plain', e.target.dataset.type);
        if (e.target.dataset.id) {
            e.dataTransfer.setData('application/microbase-id', e.target.dataset.id);
        }
        e.dataTransfer.effectAllowed = 'copy';
        e.target.style.opacity = '0.5';
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    handleDragEnter(e) {
        e.preventDefault();
        const target = e.target.closest('.builder-row, .builder-column, .drop-zone-root');
        if (target) {
            target.classList.add('highlight-drop');
        }
    }

    handleDragLeave(e) {
        const target = e.target.closest('.builder-row, .builder-column, .drop-zone-root');
        if (target) {
            target.classList.remove('highlight-drop');
        }
    }

    async handleDrop(e) {
        e.preventDefault();

        // Cleanup styles
        document.querySelectorAll('.highlight-drop').forEach(el => el.classList.remove('highlight-drop'));
        const draggedType = e.dataTransfer.getData('text/plain');

        // Reset sidebar drag style
        if (this.draggedItem) {
            this.draggedItem.style.opacity = '1';
        }

        const dropTarget = e.target;

        // Logic to determine where to drop
        // 1. Dropping a Row (Container) onto the Root or between rows
        if (draggedType === 'row' || draggedType.startsWith('col-')) {
            this.createRow(draggedType);
        } else if (draggedType === 'column') {
            // Reordering existing columns
            // Only allow move if dropping onto another column in a row (same or different row)
            const targetCol = dropTarget.closest('.builder-column');
            const targetRow = dropTarget.closest('.builder-row');

            if (targetCol && targetRow && this.draggedItem) {
                // Determine insertion point (left/right)
                const rect = targetCol.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;

                if (e.clientX < midX) {
                    targetRow.insertBefore(this.draggedItem, targetCol);
                } else {
                    // Insert after: insertBefore nextSibling
                    targetRow.insertBefore(this.draggedItem, targetCol.nextSibling);
                }
            } else if (targetRow && !targetCol) {
                // Dropped into row but not on a specific column (e.g. empty space or end)
                targetRow.appendChild(this.draggedItem);
            }
        } else {
            // 2. Dropping a Component (Chart, Form, List)

            // We need to identify if we are inside a column
            const col = dropTarget.closest('.builder-column');
            if (col) {
                // Determine insertion point
                let referenceNode = null;
                const closestComponent = dropTarget.closest('.rendered-component');
                if (closestComponent && col.contains(closestComponent)) {
                    // Check if dropping top or bottom half
                    const rect = closestComponent.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        referenceNode = closestComponent; // Insert before
                    } else {
                        referenceNode = closestComponent.nextSibling; // Insert after
                    }
                }

                if (draggedType === 'saved-chart') {
                    const chartId = e.dataTransfer.getData('application/microbase-id');
                    try {
                        const savedCharts = await API.getSavedCharts();
                        const chartData = savedCharts.find(c => c.id === chartId);
                        if (chartData) {
                            this.renderChartComponent(col, chartData, referenceNode);
                        }
                    } catch (e) {
                        console.error('Failed to load dropped chart', e);
                    }
                } else {
                    this.addComponentToColumn(col, draggedType, referenceNode);
                }
            } else {
                // Auto-create container (Row + 1 Col)
                const newRow = this.createRow('row');
                const targetCol = newRow.querySelector('.builder-column');

                if (targetCol) {
                    if (draggedType === 'saved-chart') {
                        const chartId = e.dataTransfer.getData('application/microbase-id');
                        try {
                            const savedCharts = await API.getSavedCharts();
                            const chartData = savedCharts.find(c => c.id === chartId);
                            if (chartData) {
                                this.renderChartComponent(targetCol, chartData);
                            }
                        } catch (e) {
                            console.error('Failed to load dropped chart', e);
                        }
                    } else {
                        this.addComponentToColumn(targetCol, draggedType);
                    }
                }
            }
        }

        // Hide empty state
        document.getElementById('canvasEmptyState').style.display = 'none';
        this.saveLayout(); // Auto save state? Or wait for button.
        this.renderTree();
    }

    // --- Render Logic ---

    createRow(type) {
        const root = document.getElementById('dropZoneRoot');
        const row = document.createElement('div');
        row.className = 'builder-row';
        row.dataset.id = Date.now();

        // Determine columns
        let cols = [];
        if (type === 'row') cols = [12]; // 1 col full width
        if (type === 'col-6') cols = [6, 6]; // 2 cols
        if (type === 'col-4') cols = [4, 4, 4]; // 3 cols
        if (type === 'col-3') cols = [3, 3, 3, 3]; // 4 cols
        if (type === 'col-2-4') cols = [2.4, 2.4, 2.4, 2.4, 2.4]; // 5 cols (using flex values)
        if (type === 'col-2') cols = [2, 2, 2, 2, 2, 2]; // 6 cols

        // Add click listener for selection
        row.addEventListener('click', (e) => this.selectElement(row, 'row'));

        cols.forEach(span => {
            const col = document.createElement('div');
            col.className = 'builder-column';
            col.style.flex = span;

            // Add click listener for selection
            col.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row selection from triggering
                this.selectElement(col, 'column')
            });

            // Make column draggable for reordering
            col.draggable = true;
            col.dataset.type = 'column';
            col.addEventListener('dragstart', (e) => this.handleDragStart(e));

            // Allow dropping into column (handled by root/row delegation but good to be explicit for component drops)
            // The root drop handler covers it, but dragstart is needed on the element.
            // selectElement has event stop logic if passed.

            // Add placeholder text? or leave empty
            // col.innerHTML = '<div class="add-item-zone">+ Drop Component</div>';

            row.appendChild(col);
        });

        // Add delete row button?

        root.appendChild(row);
        return row;
    }

    addComponentToColumn(column, type, referenceNode = null) {
        if (type === 'heading') {
            this.renderTextComponent(column, 'h2', 'Heading Text', referenceNode);
        } else if (type === 'text') {
            this.renderTextComponent(column, 'p', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', referenceNode);
        } else if (type === 'button') {
            this.renderButtonComponent(column, 'Button', referenceNode);
        } else if (type === 'combobox') {
            this.renderComboboxComponent(column, [], referenceNode);
        } else if (type === 'line') {
            this.renderLineComponent(column, referenceNode);
        }
    }

    renderButtonComponent(container, label, referenceNode = null) {
        const wrapper = document.createElement('div');
        wrapper.className = 'rendered-component';
        wrapper.dataset.componentType = 'button';
        wrapper.addEventListener('click', (e) => this.selectElement(wrapper, 'button'));

        const header = document.createElement('div');
        header.className = 'component-header';
        header.innerHTML = `<span>Button</span><span class="remove-btn">×</span>`;
        header.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showConfirmModal('Delete Button?', 'Are you sure you want to delete this button?', () => {
                wrapper.remove();
                this.renderTree();
            });
        });

        const content = document.createElement('div');
        content.className = 'component-content';
        content.style.padding = '0';
        content.style.width = '100%'; // Ensure full width for flex
        content.style.justifyContent = 'flex-start'; // Default alignment

        const btn = document.createElement('a');
        btn.href = '#';
        btn.textContent = label;
        btn.dataset.editable = "true"; // Allow text editing
        btn.dataset.isButton = "true"; // Identify as button for href config

        // Default Button Styles (inline so they show up in config)
        btn.style.display = 'inline-block';
        btn.style.padding = '10px 20px';
        btn.style.backgroundColor = '#3b82f6';
        btn.style.color = '#ffffff';
        btn.style.borderRadius = '4px';
        btn.style.textDecoration = 'none';
        btn.style.fontWeight = '500';
        btn.style.transition = 'background 0.2s';

        // Disable click navigation in builder
        btn.addEventListener('click', (e) => e.preventDefault());

        content.appendChild(btn);
        wrapper.appendChild(header);
        wrapper.appendChild(content);

        if (referenceNode) {
            container.insertBefore(wrapper, referenceNode);
        } else {
            container.appendChild(wrapper);
        }
    }

    renderLineComponent(container, referenceNode = null) {
        const wrapper = document.createElement('div');
        wrapper.className = 'rendered-component';
        wrapper.dataset.componentType = 'line';

        wrapper.addEventListener('click', (e) => this.selectElement(wrapper, 'line'));

        const header = document.createElement('div');
        header.className = 'component-header';
        header.innerHTML = `<span>Line</span><span class="remove-btn">×</span>`;
        header.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showConfirmModal('Delete Line?', 'Are you sure you want to delete this line?', () => {
                wrapper.remove();
                this.renderTree();
            });
        });

        const content = document.createElement('div');
        content.className = 'component-content';
        content.style.padding = '10px 0'; // Default padding for separator
        content.style.width = '100%';

        const hr = document.createElement('hr');
        hr.style.margin = '0';
        hr.style.border = 'none';
        hr.style.borderTop = '1px solid #cbd5e1'; // Default style
        hr.style.width = '100%';

        content.appendChild(hr);
        wrapper.appendChild(header);
        wrapper.appendChild(content);

        if (referenceNode) {
            container.insertBefore(wrapper, referenceNode);
        } else {
            container.appendChild(wrapper);
        }
    }

    renderComboboxComponent(container, options = [], referenceNode = null) {
        const wrapper = document.createElement('div');
        wrapper.className = 'rendered-component';
        wrapper.dataset.componentType = 'combobox';
        // Store options in dataset for persistence
        wrapper.dataset.options = JSON.stringify(options);

        wrapper.addEventListener('click', (e) => this.selectElement(wrapper, 'combobox'));

        const header = document.createElement('div');
        header.className = 'component-header';
        header.innerHTML = `<span>Combobox</span><span class="remove-btn">×</span>`;
        header.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showConfirmModal('Delete Combobox?', 'Are you sure you want to delete this combobox?', () => {
                wrapper.remove();
                this.renderTree();
            });
        });

        const content = document.createElement('div');
        content.className = 'component-content';
        content.style.padding = '0';
        content.style.width = '100%';

        const select = document.createElement('select');
        select.className = 'combobox-select';
        select.style.width = '100%';
        select.style.padding = '8px 12px';
        select.style.borderRadius = '4px';
        select.style.border = '1px solid #e2e8f0';
        select.style.backgroundColor = '#ffffff';
        select.style.color = '#334155';
        select.style.fontSize = '14px';
        select.style.outline = 'none';

        // Populate options
        if (options && options.length > 0) {
            options.forEach(opt => {
                const option = document.createElement('option');
                option.text = opt.label;
                option.value = opt.url;
                select.appendChild(option);
            });
        } else {
            const placeholder = document.createElement('option');
            placeholder.text = 'Select an option...';
            select.appendChild(placeholder);
        }

        // Disable interaction in builder
        select.addEventListener('mousedown', (e) => e.preventDefault());

        content.appendChild(select);
        wrapper.appendChild(header);
        wrapper.appendChild(content);

        if (referenceNode) {
            container.insertBefore(wrapper, referenceNode);
        } else {
            container.appendChild(wrapper);
        }
    }

    renderTextComponent(container, tag, defaultText, referenceNode = null) {
        const wrapper = document.createElement('div');
        wrapper.className = 'rendered-component';
        wrapper.dataset.componentType = 'text'; // Marker for config
        wrapper.addEventListener('click', (e) => this.selectElement(wrapper, 'text')); // Pass type 'text'

        const header = document.createElement('div');
        header.className = 'component-header';
        header.innerHTML = `<span>Text</span><span class="remove-btn">×</span>`;
        header.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showConfirmModal('Delete Text?', 'Are you sure you want to delete this text block?', () => {
                wrapper.remove();
                this.renderTree();
            });
        });

        const content = document.createElement('div');
        content.className = 'component-content';
        content.style.padding = '0'; // Override default padding

        const textEl = document.createElement(tag);
        textEl.textContent = defaultText;
        textEl.style.margin = '0'; // Reset browser default
        textEl.style.width = '100%'; // Ensure text align works
        textEl.dataset.editable = "true"; // Marker for config binding

        content.appendChild(textEl);
        wrapper.appendChild(header);
        wrapper.appendChild(content);

        if (referenceNode) {
            container.insertBefore(wrapper, referenceNode);
        } else {
            container.appendChild(wrapper);
        }
    }

    renderErrorComponent(container, message, referenceNode = null) {
        const wrapper = document.createElement('div');
        wrapper.className = 'rendered-component';
        wrapper.style.border = '1px solid #ef4444';
        wrapper.style.backgroundColor = '#fef2f2';

        const header = document.createElement('div');
        header.className = 'component-header';
        header.style.backgroundColor = '#fee2e2';
        header.innerHTML = `<span style="color:#b91c1c">Error</span><span class="remove-btn">×</span>`;
        header.querySelector('.remove-btn').addEventListener('click', () => {
            wrapper.remove();
            this.renderTree();
        });

        const content = document.createElement('div');
        content.className = 'component-content';
        content.style.padding = '10px';
        content.innerHTML = `<div style="color: #b91c1c; font-size: 12px;">${message}</div>`;

        wrapper.appendChild(header);
        wrapper.appendChild(content);

        if (referenceNode) {
            container.insertBefore(wrapper, referenceNode);
        } else {
            container.appendChild(wrapper);
        }
    }

    async renderChartComponent(container, chartData, referenceNode = null) {
        // Resolve ID to Config if necessary
        if (typeof chartData === 'string') {
            try {
                const savedCharts = await API.getSavedCharts();
                const found = savedCharts.find(c => c.id === chartData);

                if (!found) {
                    // Render error state if chart not found
                    this.renderErrorComponent(container, `Chart ID not found: ${chartData}`, referenceNode);
                    return;
                }
                chartData = found;
            } catch (e) {
                console.error('Failed to resolve chart ID:', chartData, e);
                this.renderErrorComponent(container, `Error loading chart: ${chartData}`, referenceNode);
                return;
            }
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'rendered-component';
        // Add chart ID to dataset for persistence
        wrapper.dataset.chartId = chartData.id;
        wrapper.dataset.type = 'chart';

        wrapper.addEventListener('click', (e) => this.selectElement(wrapper, 'chart'));

        const header = document.createElement('div');
        header.className = 'component-header';
        header.innerHTML = `<span>${chartData.title}</span><span class="remove-btn">×</span>`;
        header.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // explicit stop mapping
            this.showConfirmModal('Delete Chart?', 'Are you sure you want to delete this chart?', () => {
                wrapper.remove();
                this.renderTree();
            });
        });

        const content = document.createElement('div');
        content.className = 'component-content';
        content.style.padding = '0'; // Ensure zero padding
        content.innerHTML = '<div style="color: #cbd5e1; font-size: 12px;">Loading chart...</div>';

        const chartDiv = document.createElement('div');
        chartDiv.className = 'chart-wrapper';
        chartDiv.style.margin = '0';
        chartDiv.style.padding = '0';

        wrapper.appendChild(header);
        wrapper.appendChild(content);

        if (referenceNode) {
            container.insertBefore(wrapper, referenceNode);
        } else {
            container.appendChild(wrapper);
        }

        try {
            // Use the exact same logic as DashboardViewer
            const { chartType, config, dataset, palette, queryState } = chartData;

            // For GeoMap charts, load the required map first
            if (['geomap', 'geomapPie'].includes(chartType)) {
                const mapRegion = config.mapRegion || 'indonesia';
                const mapLoaded = await this.loadMapForRegion(mapRegion);
                if (!mapLoaded) {
                    content.innerHTML = `<div style="color: #f59e0b; font-size: 11px; padding: 10px;">GeoMap requires "${mapRegion}" map data which could not be loaded.</div>`;
                    return;
                }
            }

            // Fetch data using the same pattern as DashboardViewer
            const indexRes = await fetch('data/index.json');
            if (!indexRes.ok) throw new Error('Failed to load data index');
            const registry = await indexRes.json();
            const datasetEntry = registry.find(d => d.id === dataset);

            if (!datasetEntry) throw new Error(`Dataset '${dataset}' not found`);

            const dataRes = await fetch(datasetEntry.path);
            if (!dataRes.ok) throw new Error(`Failed to load ${datasetEntry.path}`);
            let rawData = await dataRes.json();
            let data = Array.isArray(rawData) ? rawData : [rawData];

            // Apply filters from queryState (like DashboardViewer.executeSavedQuery)
            if (queryState && queryState.filters && queryState.filters.length > 0) {
                let query = NowDB.from(data);
                queryState.filters.forEach((filter) => {
                    const { field, operator, value, valueType } = filter;
                    let compareValue = value;
                    if (valueType === 'number') compareValue = parseFloat(value) || 0;

                    switch (operator) {
                        case 'equals': query = query.equals(field, compareValue); break;
                        case 'notEquals': query = query.notEquals(field, compareValue); break;
                        case 'contains': query = query.contains(field, compareValue); break;
                        case 'starts': query = query.starts(field, compareValue); break;
                        case 'ends': query = query.ends(field, compareValue); break;
                        case 'greater': query = query.greater(field, compareValue); break;
                        case 'greaterEquals': query = query.greaterEquals(field, compareValue); break;
                        case 'less': query = query.less(field, compareValue); break;
                        case 'lessEquals': query = query.lessEquals(field, compareValue); break;
                        case 'empty': query = query.empty(field); break;
                        case 'is': query = query.is(field); break;
                    }
                });
                data = query.select();
            }

            // Apply sorts
            if (queryState && queryState.sorts && queryState.sorts.length > 0) {
                let query = NowDB.from(data);
                queryState.sorts.forEach(sort => {
                    if (sort.direction === 'asc') query = query.asc(sort.field);
                    else query = query.desc(sort.field);
                });
                data = query.select();
            }

            // Apply limit
            if (queryState && queryState.limit) {
                data = data.slice(0, queryState.limit);
            }

            if (!data || data.length === 0) {
                content.innerHTML = '<div style="color: #94a3b8; font-size: 11px;">No data</div>';
                return;
            }

            // Transform data based on chart type
            let xAxisData = [];
            let seriesData = [];
            let matrixX = [], matrixY = [], matrixData = [];
            let indicators = [];
            let graphNodes = [], graphLinks = [], graphCategories = [];
            let sankeyNodes = [], sankeyLinks = [];
            let chordNodes = [], chordLinks = [];
            let treeData = null;
            let sunburstData = null;

            // For specialized charts, compute data from saved config
            const specialChartTypes = ['matrix', 'geomap', 'geomapPie', 'graph', 'circularGraph', 'sankey', 'chord', 'tree', 'radialTree', 'calendar', 'radar', 'gauge', 'number', 'candlestick'];

            if (chartType === 'matrix' && chartData.matrixConfig) {
                // Compute matrix data from saved matrixConfig
                const { xField, yField, valueField } = chartData.matrixConfig;
                if (xField && yField && valueField) {
                    matrixX = [...new Set(data.map(r => r[xField]))].sort();
                    matrixY = [...new Set(data.map(r => r[yField]))].sort();
                    matrixData = data.map(r => {
                        const xIdx = matrixX.indexOf(r[xField]);
                        const yIdx = matrixY.indexOf(r[yField]);
                        const val = parseFloat(r[valueField]) || 0;
                        if (xIdx >= 0 && yIdx >= 0) return [xIdx, yIdx, val];
                        return null;
                    }).filter(d => d !== null);
                }
                console.log('[UIBuilder] Matrix data computed:', { matrixX, matrixY, matrixData });
            } else if (chartType === 'radar') {
                // Radar charts need indicators and pivoted series data
                xAxisData = data.map(row => row[config.xAxisField]);
                const activeSeries = config.series.filter(s => s.visible);

                // Calculate indicators from active series (metrics)
                indicators = activeSeries.map(s => {
                    const values = data.map(r => r[s.id]).filter(v => typeof v === 'number');
                    const max = values.length > 0 ? Math.max(...values) : 100;
                    return { name: s.name, max: Math.ceil(max * 1.1) };
                });

                // Pivot: Each row (entity) becomes a series with values for each indicator
                seriesData = xAxisData.map((entityName, rowIndex) => {
                    const values = activeSeries.map(s => {
                        const val = data[rowIndex][s.id];
                        let num = typeof val === 'number' ? val : parseFloat(val);
                        return isNaN(num) ? 0 : num;
                    });
                    return {
                        name: entityName ? String(entityName) : 'Unknown',
                        data: values
                    };
                });

                if (indicators.length === 0) {
                    indicators = [{ name: 'No Metrics', max: 100 }];
                }
                console.log('[UIBuilder] Radar data computed:', { indicators, seriesData });
            } else if (chartType === 'candlestick') {
                // Candlestick needs OHLC data: [[Open, Close, Low, High], ...]
                xAxisData = data.map(row => row[config.xAxisField]);
                let activeSeries = config.series ? config.series.filter(s => s.visible) : [];

                // Auto-detect OHLC fields if no series saved
                if (activeSeries.length < 4 && data.length > 0) {
                    const fields = Object.keys(data[0]);
                    const openField = fields.find(f => /open/i.test(f));
                    const closeField = fields.find(f => /close/i.test(f));
                    const lowField = fields.find(f => /low/i.test(f));
                    const highField = fields.find(f => /high/i.test(f));

                    if (openField && closeField && lowField && highField) {
                        activeSeries = [
                            { id: openField, name: 'Open', visible: true },
                            { id: closeField, name: 'Close', visible: true },
                            { id: lowField, name: 'Low', visible: true },
                            { id: highField, name: 'High', visible: true }
                        ];
                        console.log('[UIBuilder] Candlestick OHLC auto-detected:', { openField, closeField, lowField, highField });
                    }
                }

                // Group series in sets of 4 (Open, Close, Low, High)
                for (let i = 0; i < activeSeries.length; i += 4) {
                    const group = activeSeries.slice(i, i + 4);
                    if (group.length < 4) break; // Incomplete candle

                    const openField = group[0].id;
                    const closeField = group[1].id;
                    const lowField = group[2].id;
                    const highField = group[3].id;

                    let name = group[0].name.split('_')[0] || 'Candlestick ' + (i / 4 + 1);

                    const candleData = data.map(r => [
                        r[openField],
                        r[closeField],
                        r[lowField],
                        r[highField]
                    ]);

                    seriesData.push({
                        name: name,
                        data: candleData,
                        color: group[0].color
                    });
                }
                console.log('[UIBuilder] Candlestick data computed:', { xAxisData, seriesData });
            } else if (['graph', 'circularGraph', 'sankey', 'chord'].includes(chartType)) {
                // Graph/Sankey/Chord need nodes and links from Source/Target/Value fields
                if (data.length > 0) {
                    const fields = Object.keys(data[0]);
                    console.log('[UIBuilder] Graph fields in data:', fields);
                    const sourceField = fields.find(f => /source/i.test(f));
                    const targetField = fields.find(f => /target/i.test(f));
                    const valueField = fields.find(f => /value/i.test(f));
                    console.log('[UIBuilder] Graph detected fields:', { sourceField, targetField, valueField });

                    if (sourceField && targetField) {
                        const nodesSet = new Set();
                        const linksArray = []; // Use temporary variable

                        data.forEach(r => {
                            const source = r[sourceField];
                            const target = r[targetField];
                            const val = valueField ? parseFloat(r[valueField]) : 1;

                            if (source && target) {
                                nodesSet.add(source);
                                nodesSet.add(target);
                                linksArray.push({ source, target, value: isNaN(val) ? 1 : val });
                            }
                        });

                        // Calculate degrees for sizing (same as QueryBuilder)
                        const degrees = {};
                        linksArray.forEach(l => {
                            degrees[l.source] = (degrees[l.source] || 0) + 1;
                            degrees[l.target] = (degrees[l.target] || 0) + 1;
                        });

                        graphNodes = Array.from(nodesSet).map((name) => ({
                            name,
                            id: name,
                            category: 0, // Default to 0, matching QueryBuilder default
                            value: degrees[name] || 0,
                            symbolSize: 10 + (degrees[name] || 0) * 2
                        }));
                        graphLinks = linksArray; // Assign to outer variable

                        // Generate categories if not in config
                        if (config.graphCategories && config.graphCategories.length > 0) {
                            graphCategories = config.graphCategories;
                        } else {
                            graphCategories = [
                                { name: 'Node' }
                            ];
                        }

                        // For buildConfig
                        sankeyNodes = graphNodes;
                        sankeyLinks = linksArray;
                        chordNodes = graphNodes;
                        chordLinks = linksArray;

                        console.log('[UIBuilder] Graph data auto-detected:', { graphNodes, graphLinks, graphCategories });
                    }
                }
            } else if (['tree', 'radialTree', 'sunburst', 'treemap'].includes(chartType)) {
                // Tree/Treemap/Sunburst charts expect hierarchical data with name/children structure
                if (rawData && typeof rawData === 'object') {
                    // Check if data is already hierarchical (has 'children' or 'name' property)
                    if (rawData.name || rawData.children) {
                        if (chartType === 'sunburst') {
                            sunburstData = rawData;
                        } else {
                            treeData = { data: rawData };
                        }
                        console.log('[UIBuilder] Hierarchical data detected:', chartType);
                    } else if (data.length > 0 && data[0].name) {
                        // First item might be the root
                        if (chartType === 'sunburst') {
                            sunburstData = data[0];
                        } else {
                            treeData = { data: data[0] };
                        }
                    }
                }
            } else if (['geomap', 'geomapPie'].includes(chartType)) {
                // GeoMap needs data in {name, value} format where name matches map region names
                if (data.length > 0) {
                    xAxisData = data.map(row => row[config.xAxisField]);

                    // Find value field - either from series or first number field
                    let valueField = null;
                    if (config.series && config.series.length > 0) {
                        valueField = config.series[0].id;
                    } else {
                        const fields = Object.keys(data[0]);
                        valueField = fields.find(k => typeof data[0][k] === 'number');
                    }

                    if (valueField) {
                        const mapData = data.map(row => ({
                            name: row[config.xAxisField], // Region name
                            value: row[valueField]        // Value
                        }));

                        seriesData.push({
                            name: valueField,
                            type: 'map',
                            map: config.mapRegion || 'indonesia',
                            data: mapData
                        });
                        console.log('[UIBuilder] GeoMap data computed:', mapData);
                    }
                }
            } else if (['gauge', 'gaugeSpeed', 'number'].includes(chartType)) {
                // Gauge/Number need a single value - find a numeric field
                console.log('[UIBuilder] Processing Number/Gauge chart data:', { length: data.length, firstRow: data[0] });

                if (data.length > 0) {
                    // Use valueField from config or auto-detect first numeric field
                    const valueField = config.valueField ||
                        Object.keys(data[0]).find(k => typeof data[0][k] === 'number');

                    console.log('[UIBuilder] Detected field:', valueField);

                    if (valueField) {
                        // Get the last value (or sum/average depending on use case)
                        const value = data[data.length - 1][valueField];
                        seriesData = [{
                            name: valueField,
                            data: [value],
                            visible: true
                        }];
                        console.log('[UIBuilder] Gauge/Number value extracted:', { valueField, value, seriesData });
                    } else {
                        console.warn('[UIBuilder] No numeric field found for gauge/number chart');
                    }
                } else {
                    console.warn('[UIBuilder] No data for gauge/number chart');
                }
            } else if (specialChartTypes.includes(chartType)) {
                // Other specialized charts - pass through config as-is
                console.log('[UIBuilder] Special chart type:', chartType);
            } else {
                // Get xAxisData first (used for both standard and pie charts)
                xAxisData = data.map(row => row[config.xAxisField]);

                // Check if this is a pie-type chart (needs {name, value} format)
                const pieChartTypes = ['pie', 'donut', 'halfDonut', 'nightingale', 'treemap', 'sunburst', 'funnel'];

                if (pieChartTypes.includes(chartType)) {
                    // Transform to {name, value} format like QueryBuilder
                    seriesData = config.series
                        .filter(s => s.visible)
                        .map(s => ({
                            id: s.id,
                            name: s.name,
                            color: s.color,
                            data: xAxisData.map((name, i) => ({
                                name,
                                value: data[i][s.id]
                            }))
                        }));
                    console.log('[UIBuilder] Pie chart data transformed:', seriesData);
                } else {
                    // Standard axis-based charts (bar, line, area, etc.)
                    seriesData = config.series
                        .filter(s => s.visible)
                        .map(s => ({
                            id: s.id,
                            name: s.name,
                            color: s.color,
                            data: data.map(row => row[s.id])
                        }));
                }
            }

            // Build options using ChartConfig.buildChartOptions (same as DashboardViewer)
            const buildConfig = {
                ...config,
                xAxisData,
                series: seriesData.length > 0 ? seriesData : config.series,
                palette: palette || config.palette || 'default',
                animation: true,
                // Matrix specific
                matrixX, matrixY, matrixData,
                // Radar specific
                indicators,
                // Graph/Sankey/Chord specific
                graphNodes, graphLinks, graphCategories, sankeyNodes, sankeyLinks, chordNodes, chordLinks,
                // Tree/Sunburst specific
                treeData, sunburstData,
                // Gauge specific (map from saved gaugeConfig to expected names)
                gaugeMin: chartData.gaugeConfig?.min ?? 0,
                gaugeMax: chartData.gaugeConfig?.max ?? 100,
                gaugeStartAngle: chartData.gaugeConfig?.startAngle ?? 180,
                gaugeEndAngle: chartData.gaugeConfig?.endAngle ?? 0,
                gaugeSplitNumber: chartData.gaugeConfig?.splitNumber ?? 10
            };

            console.log('[UIBuilder] Rendering chart type:', chartType, 'Config:', buildConfig);

            // Skip unsupported chart types that require data not saved in config
            const unsupportedTypes = {
                'matrix': !buildConfig.matrixData?.length || !buildConfig.matrixX?.length || !buildConfig.matrixY?.length,
                'geomap': !echarts.getMap('indonesia'),
                'geomapPie': !echarts.getMap('indonesia'),
                'graph': !buildConfig.graphNodes?.length,
                'circularGraph': !buildConfig.graphNodes?.length,
                'sankey': !buildConfig.sankeyNodes?.length,
                'chord': !buildConfig.chordNodes?.length,
                'tree': !buildConfig.treeData?.data,
                'radialTree': !buildConfig.treeData?.data,
                'sunburst': !buildConfig.sunburstData,
                'treemap': !buildConfig.treeData?.data,
                'calendar': !buildConfig.calendarData,
                'radar': !buildConfig.indicators?.length,
                'candlestick': false, // Let it try and show error if data is bad
                'gauge': false, // Usually works
                'number': false // Usually works
            };

            if (unsupportedTypes[chartType]) {
                content.innerHTML = `<div style="color: #f59e0b; font-size: 11px; padding: 10px;">Chart type "${chartType}" requires configuration not available. Please re-save the chart from Query Builder.</div>`;
                return;
            }

            const options = ChartConfig.buildChartOptions(chartType, buildConfig);

            console.log('[UIBuilder] Chart options:', options);

            // Remove geo configuration if map isn't registered (prevents 'regions' error)
            const mapName = options.geo?.map || 'indonesia';
            const mapRegistered = echarts.getMap(mapName);

            if (!mapRegistered) {
                // Remove geo config
                if (options.geo) {
                    console.warn('[UIBuilder] Removing geo config - map not registered:', mapName);
                    delete options.geo;
                }

                // Remove ALL series that reference maps
                if (options.series) {
                    options.series = options.series.filter(s => {
                        if (s.type === 'map') {
                            console.warn('[UIBuilder] Removing map series - map not registered');
                            return false;
                        }
                        if (s.map) {
                            console.warn('[UIBuilder] Removing series with map property');
                            return false;
                        }
                        if (s.geoIndex !== undefined) {
                            console.warn('[UIBuilder] Removing series with geoIndex');
                            return false;
                        }
                        if (s.coordinateSystem === 'geo') {
                            console.warn('[UIBuilder] Removing series with geo coordinateSystem');
                            return false;
                        }
                        return true;
                    });
                }

                // If no series left, show error
                if (!options.series || options.series.length === 0) {
                    content.innerHTML = '<div style="color: #f59e0b; font-size: 11px; padding: 10px;">GeoMap not available. Map data not loaded.</div>';
                    return;
                }
            }

            // Render
            content.innerHTML = '';
            content.appendChild(chartDiv);

            const chart = echarts.init(chartDiv);
            chart.setOption(options);

            // Attach chart instance to wrapper for external resizing (e.g. from config panel)
            wrapper._chartInstance = chart;

            // Use ResizeObserver for responsive window/layout changes
            new ResizeObserver(() => {
                chart.resize();
            }).observe(wrapper);

        } catch (err) {
            console.error('Chart Load Error', err);
            content.innerHTML = `<div style="color: #ef4444; font-size: 11px; padding: 10px;">Error: ${err.message}</div>`;
        }
    }

    // --- Persistence ---

    async saveLayout() {
        const root = document.getElementById('dropZoneRoot');
        const rowsFound = root.querySelectorAll('.builder-row').length;

        console.log('[UIBuilder] saveLayout triggered. Rows found:', rowsFound);

        if (rowsFound === 0 && this.layoutId) {
            console.warn('[UIBuilder] WARNING: Saving EMPTY layout to existing ID:', this.layoutId);
        }

        // Serialize DOM to JSON (simplified)
        const rows = [];
        root.querySelectorAll('.builder-row').forEach(row => {
            const cols = [];
            row.querySelectorAll('.builder-column').forEach(col => {
                const colData = {
                    style: col.style.cssText, // Save flex/width
                    components: []
                };

                col.querySelectorAll('.rendered-component').forEach(comp => {
                    const compData = {
                        style: comp.style.cssText, // Save wrapper styles
                        type: comp.dataset.type || comp.dataset.componentType || 'placeholder'
                    };

                    // Save type-specific data
                    if (compData.type === 'chart') {
                        compData.chartId = comp.dataset.chartId; // Chart ID
                        // We rely on loading config from chartConfig based on ID, 
                        // or should we save current override options? 
                        // For now, ID is enough to re-fetch saved chart.
                    } else if (compData.type === 'text') {
                        const textEl = comp.querySelector('[data-editable="true"]');
                        if (textEl) {
                            compData.content = textEl.innerHTML; // Allow HTML? or textContent? innerHTML handles newlines better
                            compData.textStyle = textEl.style.cssText;
                        }
                    } else if (compData.type === 'button') {
                        const btnEl = comp.querySelector('a[data-is-button="true"]');
                        if (btnEl) {
                            compData.content = btnEl.textContent;
                            compData.href = btnEl.getAttribute('href');
                            compData.btnStyle = btnEl.style.cssText; // Capture button implementation styles if any
                        }
                    } else if (compData.type === 'combobox') {
                        compData.options = JSON.parse(comp.dataset.options || '[]');
                        const selectEl = comp.querySelector('select');
                        if (selectEl) {
                            compData.selectStyle = selectEl.style.cssText;
                        }
                    } else if (compData.type === 'line') {
                        const hr = comp.querySelector('hr');
                        if (hr) {
                            compData.lineStyle = hr.style.cssText;
                        }
                    }

                    // Capture inner content (padding/margin) if customized
                    const inner = comp.querySelector('.component-content');
                    if (inner) {
                        compData.innerStyle = inner.style.cssText;
                    }

                    colData.components.push(compData);
                });
                cols.push(colData);
            });

            const rowData = { columns: cols };
            if (row.style.cssText) {
                rowData.style = row.style.cssText;
            }
            rows.push(rowData);
        });

        // Save Page Title
        const titleEl = document.querySelector('.query-title');
        const pageTitle = titleEl ? titleEl.textContent : 'Untitled Page';

        // Create data object
        const data = {
            id: this.layoutId,
            title: pageTitle,
            lastModified: new Date().toISOString(),
            layout: rows
        };

        // Preserve existing settings (like publishSettings)
        if (this.layoutsMap[this.layoutId]) {
            data.publishSettings = this.layoutsMap[this.layoutId].publishSettings;
        }

        // If new dashboard, generate ID
        if (!this.layoutId) {
            this.layoutId = Utils.generateId();
            data.id = this.layoutId;

            // Update URL without reload
            const newUrl = `${window.location.pathname}?id=${this.layoutId}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
        }

        // Update Map
        this.layoutsMap[this.layoutId] = data;

        // Persist via API
        try {
            const res = await API.saveDashboard(this.layoutId, data);
            if (res.success) {
                Utils.showToast('Layout saved successfully', 'success');
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            console.error('[UIBuilder] Failed to save layout:', e);
            Utils.showToast('Failed to save layout', 'error');
        }

    }

    async loadLayout() {
        let data = null;

        // 1. Try loading by ID from Map
        if (this.layoutId && this.layoutsMap[this.layoutId]) {
            data = this.layoutsMap[this.layoutId];
            console.log('[UIBuilder] Loading dashboard by ID:', this.layoutId);
        }
        // 2. Fallback to legacy single key if no ID OR if ID not found in map (safety net)
        if (!data) {
            const dataStr = localStorage.getItem('microbase_ui_layout');
            if (dataStr) {
                const legacyData = JSON.parse(dataStr);
                // Only use legacy if we have no ID, OR if legacy ID matches current ID
                if (!this.layoutId || legacyData.id === this.layoutId) {
                    data = legacyData;
                    console.log('[UIBuilder] recovered data from legacy fallback');
                }
            }
        }

        if (!data) {
            console.warn('[UIBuilder] No layout data found to load matching ID:', this.layoutId);
            console.log('[UIBuilder] Available keys in map:', Object.keys(this.layoutsMap));
            return;
        }

        // Sync ID if loaded from fallback
        if (!this.layoutId && data.id) {
            this.layoutId = data.id;
            const newUrl = `${window.location.pathname}?id=${this.layoutId}`;
            window.history.replaceState({ path: newUrl }, '', newUrl);
            console.log('[UIBuilder] Restored previous session ID:', this.layoutId);
        }

        try {
            let layout = [];
            let title = 'Untitled Page';

            // Support both old and new data structures
            if (Array.isArray(data)) {
                // Legacy array format
                layout = data;
            } else if (data.layout) {
                // Object format
                layout = data.layout;
                title = data.title || 'Untitled Page';
            }

            // Restore Title
            const titleEl = document.querySelector('.query-title');
            if (titleEl) titleEl.textContent = title;

            // Full Layout Restoration
            if (layout.length > 0) {
                const root = document.getElementById('dropZoneRoot');
                root.innerHTML = ''; // Clear canvas

                for (const rowData of layout) {
                    const row = this.createRow();
                    if (rowData.style) {
                        row.style.cssText = rowData.style;
                    }
                    root.appendChild(row);

                    // Reconstruct Columns
                    if (rowData.columns) {
                        // Clear default column if any (createRow makes empty row? No, createRow makes container)
                        // Actually createRow returns <div class="builder-row"></div>
                        // We need to re-add columns.

                        for (const colData of rowData.columns) {
                            const col = document.createElement('div');
                            col.className = 'builder-column';
                            col.draggable = true;
                            col.dataset.type = 'column';

                            // Restore column style (flex/width)
                            if (colData.style) {
                                col.style.cssText = colData.style;
                            } else {
                                col.style.flex = '1'; // Default
                            }

                            // Event Listeners (Drag/Drop/Click)
                            col.addEventListener('dragstart', (e) => {
                                e.stopPropagation();
                                this.draggedItem = col;
                                e.dataTransfer.effectAllowed = 'move';
                                col.classList.add('dragging');
                            });
                            col.addEventListener('dragend', () => {
                                col.classList.remove('dragging');
                                this.draggedItem = null;
                                document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
                            });
                            col.addEventListener('click', (e) => {
                                e.stopPropagation();
                                this.selectElement(col, 'column');
                            });

                            // Add Drop Zone listeners (from setupEventListeners logic, but simplified/delegated)
                            // Actually best to re-use a helper for column creation if we had one.
                            // Since we don't have a standalone "createColumn" helper with events, we must ensure events interact correctly.
                            // The global "handleDrop" works on drop zones. We just need to make sure basic drag attributes are set.

                            row.appendChild(col);

                            // Reconstruct Components
                            if (colData.components) {
                                for (const compData of colData.components) {
                                    // Use referenceNode = null to append
                                    if (compData.type === 'chart' && compData.chartId) {
                                        // Fix: Pass container first
                                        await this.renderChartComponent(col, compData.chartId, null);
                                        // Apply overwrites after render? renderChart is async-ish in logic but sync in DOM
                                        const rendered = col.lastElementChild;
                                        if (rendered && compData.style) rendered.style.cssText = compData.style;
                                    }
                                    else if (compData.type === 'text') {
                                        // Fix: Pass container first, and provide required tag/default params
                                        // We default to 'p' if unknown, and empty string if content is set later
                                        this.renderTextComponent(col, 'p', '', null);

                                        const rendered = col.lastElementChild;
                                        if (rendered) {
                                            if (compData.style) rendered.style.cssText = compData.style;

                                            const textEl = rendered.querySelector('[data-editable="true"]');
                                            if (textEl) {
                                                if (compData.content) textEl.innerHTML = compData.content;
                                                if (compData.textStyle) textEl.style.cssText = compData.textStyle;

                                                // Try to guess tag from content if poss? simpler to just use p since it's just a wrapper mostly
                                            }
                                        }
                                    }
                                    else if (compData.type === 'button') {
                                        this.renderButtonComponent(col, '', '', null);
                                        const rendered = col.lastElementChild;
                                        if (rendered) {
                                            if (compData.style) rendered.style.cssText = compData.style;

                                            const btnEl = rendered.querySelector('a[data-is-button="true"]');
                                            if (btnEl) {
                                                if (compData.content) btnEl.textContent = compData.content;
                                                if (compData.href) btnEl.setAttribute('href', compData.href);
                                                if (compData.btnStyle) btnEl.style.cssText = compData.btnStyle;
                                            }
                                        }
                                    }
                                    else if (compData.type === 'combobox') {
                                        const options = compData.options || [];
                                        this.renderComboboxComponent(col, options, null);
                                        const rendered = col.lastElementChild;

                                        if (rendered) {
                                            if (compData.style) rendered.style.cssText = compData.style;
                                            if (compData.innerStyle) {
                                                const content = rendered.querySelector('.component-content');
                                                if (content) content.style.cssText = compData.innerStyle;
                                            }
                                            if (compData.selectStyle) {
                                                const select = rendered.querySelector('select');
                                                if (select) select.style.cssText = compData.selectStyle;
                                            }
                                        }
                                    } else if (compData.type === 'line') {
                                        this.renderLineComponent(col, null);
                                        const rendered = col.lastElementChild;

                                        if (rendered) {
                                            if (compData.style) rendered.style.cssText = compData.style;
                                            if (compData.lineStyle) {
                                                const hr = rendered.querySelector('hr');
                                                if (hr) hr.style.cssText = compData.lineStyle;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            console.log('[UIBuilder] Layout restored successfully');
            this.renderTree();
        } catch (e) {
            console.error('Failed to load layout:', e);
        }
    }

    // --- Configuration Side Panel Logic ---

    selectElement(element, type = 'component') {
        // Deselect previous
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');

        this.selectedElement = element;
        this.renderConfigPanel(type);
        this.renderTree();

        // Stop propagation so we don't select parent
        if (event) event.stopPropagation();
    }

    showConfirmModal(title, message, onConfirm) {
        const modal = document.getElementById('confirmDeleteModal');
        const titleEl = modal.querySelector('.confirm-dialog-title');
        const msgEl = modal.querySelector('.confirm-dialog-message');
        const confirmBtn = document.getElementById('confirmDeleteBtn');

        if (title) titleEl.textContent = title;
        if (message) msgEl.textContent = message;

        // Clone button to remove old listeners
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

        newBtn.addEventListener('click', () => {
            onConfirm();
            this.closeConfirmModal();
        });

        modal.classList.add('active');
    }

    closeConfirmModal() {
        document.getElementById('confirmDeleteModal').classList.remove('active');
    }

    setupTabs() {
        // Tab Switching Logic
        const tabs = document.querySelectorAll('.sidebar-tab');
        const panels = document.querySelectorAll('.sidebar-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Deactivate all
                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));

                // Activate clicked
                tab.classList.add('active');
                const targetId = tab.dataset.tab === 'layers' ? 'layersPanel' : 'configPanel';
                const target = document.getElementById(targetId);
                if (target) target.classList.add('active');
            });
        });
    }

    renderTree() {
        const root = document.getElementById('layerTreeRoot');
        if (!root) return;
        root.innerHTML = '';

        const canvasRoot = document.getElementById('dropZoneRoot');
        // If empty?
        if (canvasRoot.children.length === 0) {
            root.innerHTML = '<div class="empty-config">No layers found</div>';
            return;
        }

        const buildNode = (element, depth = 0) => {
            // Determine type/label based on classes
            let label = 'Unknown';
            let icon = '';
            let type = '';

            if (element.classList.contains('builder-row')) {
                type = 'row';
                label = 'Row';
                icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
            } else if (element.classList.contains('builder-column')) {
                type = 'column';
                label = 'Column';
                icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="3" width="6" height="18" rx="1"/></svg>`;
            } else if (element.classList.contains('rendered-component')) {
                type = element.dataset.type || 'component';
                label = type.charAt(0).toUpperCase() + type.slice(1);
                icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;

                // Specific Icons (Optional, for polish)
                if (type === 'chart') icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 16V13"/><path d="M12 16V10"/><path d="M17 16V7"/></svg>`;
                if (type === 'line') icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
            } else {
                return null; // Skip non-structural divs
            }

            const node = document.createElement('div');
            node.className = 'tree-node';
            if (this.selectedElement === element) {
                node.classList.add('selected');
            }

            // Indentation
            for (let i = 0; i < depth; i++) {
                const indent = document.createElement('span');
                indent.className = 'tree-indent';
                node.appendChild(indent);
            }

            // Icon
            const iconSpan = document.createElement('span');
            iconSpan.className = 'node-icon';
            iconSpan.innerHTML = icon;
            node.appendChild(iconSpan);

            // Label
            const labelSpan = document.createElement('span');
            labelSpan.className = 'node-label';
            labelSpan.textContent = label;
            node.appendChild(labelSpan);

            // Click Handler
            node.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Select element
                this.selectElement(element, type);

                // Automatically switch to Settings tab
                const settingsTab = document.querySelector('[data-tab="settings"]');
                if (settingsTab) settingsTab.click();
            });

            root.appendChild(node);

            // Recursion
            Array.from(element.children).forEach(child => {
                if (child.classList.contains('builder-column') ||
                    child.classList.contains('rendered-component')) {
                    buildNode(child, depth + 1);
                } else if (element.classList.contains('builder-row')) {
                    // Rows have columns directly
                    if (child.classList.contains('builder-column')) buildNode(child, depth + 1);
                } else if (element.classList.contains('builder-column')) {
                    // Columns have components directly
                    if (child.classList.contains('rendered-component')) buildNode(child, depth + 1);
                }
            });
            // Double check: if Row has columns, they usually are direct children.
        };

        // Start with Rows
        Array.from(canvasRoot.children).forEach(child => {
            if (child.classList.contains('builder-row')) {
                buildNode(child, 0);
            }
        });
    }

    renderConfigPanel(type) {
        const panel = document.getElementById('configPanel');
        if (!panel) return;
        panel.innerHTML = '';

        const style = this.selectedElement.style;
        const computed = window.getComputedStyle(this.selectedElement);

        // Helper to create color input (picker + text)
        const createColorInput = (label, prop, placeholder = 'transparent', targetElement = this.selectedElement) => {
            const row = document.createElement('div');
            row.className = 'style-input-row';

            const lbl = document.createElement('label');
            lbl.className = 'style-label';
            lbl.textContent = label;

            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.gap = '8px';
            container.style.flex = '1';

            // Color Picker
            const picker = document.createElement('input');
            picker.type = 'color';
            picker.className = 'style-color-picker';
            picker.style.width = '24px';
            picker.style.height = '24px';
            picker.style.padding = '0';
            picker.style.border = 'none';
            picker.style.cursor = 'pointer';

            // Text Input
            const input = document.createElement('input');
            input.className = 'style-input';
            input.type = 'text';
            input.placeholder = placeholder;
            input.style.flex = '1';

            const currentVal = targetElement.style[prop] || '';
            input.value = currentVal;

            // Try to set picker value if currentVal is valid hex
            if (currentVal && /^#[0-9A-F]{6}$/i.test(currentVal)) {
                picker.value = currentVal;
            }

            // Events
            picker.addEventListener('input', (e) => {
                input.value = e.target.value;
                targetElement.style[prop] = e.target.value;
            });

            input.addEventListener('input', (e) => {
                targetElement.style[prop] = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    picker.value = e.target.value;
                }
            });

            container.appendChild(picker);
            container.appendChild(input);
            row.appendChild(lbl);
            row.appendChild(container);
            return row;
        };

        // Helper to create input helper
        const createInput = (label, prop, placeholder = '0px', targetElement = this.selectedElement) => {
            const row = document.createElement('div');
            row.className = 'style-input-row';

            const lbl = document.createElement('label');
            lbl.className = 'style-label';
            lbl.textContent = label;

            const input = document.createElement('input');
            input.className = 'style-input';
            input.type = 'text';
            input.placeholder = placeholder;

            input.value = targetElement.style[prop] || '';

            input.addEventListener('input', (e) => {
                let val = e.target.value;
                // If value is purely numeric, append px
                if (val && /^-?\d+(\.\d+)?$/.test(val.trim())) {
                    val += 'px';
                }
                targetElement.style[prop] = val;

                // Force Chart Resize if applicable
                if (this.selectedElement._chartInstance) {
                    this.selectedElement._chartInstance.resize();
                }
            });

            row.appendChild(lbl);
            row.appendChild(input);
            row.appendChild(input);
            return row;
        };

        const createSpacingInput = (label, propertyPrefix, targetElement = this.selectedElement) => {
            const container = document.createElement('div');
            container.style.marginBottom = '12px';

            const header = document.createElement('div');
            header.className = 'style-label';
            header.style.marginBottom = '4px';
            header.textContent = label;
            container.appendChild(header);

            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = '1fr 1fr';
            grid.style.gap = '8px';

            ['Top', 'Right', 'Bottom', 'Left'].forEach(side => {
                const wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.alignItems = 'center';
                wrapper.style.gap = '4px';

                const lbl = document.createElement('span');
                lbl.textContent = side.charAt(0);
                lbl.style.fontSize = '11px';
                lbl.style.color = '#94a3b8';
                lbl.style.width = '10px';

                const input = document.createElement('input');
                input.className = 'style-input';
                input.style.width = '100%';
                input.placeholder = '-';

                const prop = propertyPrefix + side; // e.g. marginTop
                input.value = targetElement.style[prop] || '';

                input.addEventListener('input', (e) => {
                    let val = e.target.value;
                    if (val && !isNaN(val) && val !== '0') val += 'px';
                    targetElement.style[prop] = val;
                    // Auto resize chart if needed
                    if (this.selectedElement._chartInstance) this.selectedElement._chartInstance.resize();
                });

                wrapper.appendChild(lbl);
                wrapper.appendChild(input);
                grid.appendChild(wrapper);
            });

            container.appendChild(grid);
            return container;
        };

        const group = (title) => {
            const div = document.createElement('div');
            div.className = 'config-group';
            div.innerHTML = `<div class="config-group-title">${title}</div>`;
            return div;
        };

        // Row Layout Settings
        if (type === 'row') {
            const rowGroup = group('Row Settings');

            // Height with min-height override
            const heightRow = createInput('Height', 'height', 'auto');
            const heightInput = heightRow.querySelector('input');
            heightInput.addEventListener('input', (e) => {
                if (e.target.value) {
                    this.selectedElement.style.minHeight = '0px';
                } else {
                    this.selectedElement.style.minHeight = '';
                }
            });
            rowGroup.appendChild(heightRow);

            // Background
            rowGroup.appendChild(createColorInput('Background', 'backgroundColor'));



            panel.appendChild(rowGroup);


        }

        // Column Layout Settings
        if (type === 'column') {
            const layoutGroup = group('Column Settings');

            // Width Mode Select
            const modeRow = document.createElement('div');
            modeRow.className = 'style-input-row';
            modeRow.innerHTML = '<label class="style-label">Mode</label>';

            const modeSelect = document.createElement('select');
            modeSelect.className = 'style-input';
            modeSelect.innerHTML = `
                <option value="auto">Auto (Fluid)</option>
                <option value="grid">Grid (1-12)</option>
                <option value="percent">Percentage (%)</option>
            `;

            // Detect current mode
            let currentMode = 'auto';
            let currentVal = '';
            const flexStyle = this.selectedElement.style.flex || '';

            if (flexStyle.includes('%')) {
                currentMode = 'percent';
                currentVal = flexStyle.split(' ')[2].replace('%', '');
            } else if (flexStyle.startsWith('0 0') && flexStyle.endsWith('%')) {
                // Explicit fixed width %
                currentMode = 'percent';
                currentVal = flexStyle.split(' ')[2].replace('%', '');
            } else if (flexStyle === '0 0 8.33%') { currentMode = 'grid'; currentVal = '1'; }
            else if (flexStyle === '0 0 16.66%') { currentMode = 'grid'; currentVal = '2'; }
            else if (flexStyle === '0 0 25%') { currentMode = 'grid'; currentVal = '3'; }
            else if (flexStyle === '0 0 33.33%') { currentMode = 'grid'; currentVal = '4'; }
            else if (flexStyle === '0 0 41.66%') { currentMode = 'grid'; currentVal = '5'; }
            else if (flexStyle === '0 0 50%') { currentMode = 'grid'; currentVal = '6'; }
            else if (flexStyle === '0 0 58.33%') { currentMode = 'grid'; currentVal = '7'; }
            else if (flexStyle === '0 0 66.66%') { currentMode = 'grid'; currentVal = '8'; }
            else if (flexStyle === '0 0 75%') { currentMode = 'grid'; currentVal = '9'; }
            else if (flexStyle === '0 0 83.33%') { currentMode = 'grid'; currentVal = '10'; }
            else if (flexStyle === '0 0 91.66%') { currentMode = 'grid'; currentVal = '11'; }
            else if (flexStyle === '0 0 100%') { currentMode = 'grid'; currentVal = '12'; }
            else if (flexStyle && flexStyle !== '1 1 0%') {
                // If it's just a number like "2 1 0%", treat as Auto/Ratio but maybe advanced?
                // For simplicity, default to Auto if it acts fluidly.
                currentMode = 'auto';
            }

            modeSelect.value = currentMode;
            modeRow.appendChild(modeSelect);
            layoutGroup.appendChild(modeRow);

            // Container for dynamic value input
            const valueRow = document.createElement('div');
            valueRow.className = 'style-input-row';
            valueRow.id = 'widthValueRow';
            valueRow.innerHTML = '<label class="style-label">Value</label>';

            const renderValueInput = () => {
                valueRow.innerHTML = '<label class="style-label">Value</label>'; // Reset
                const mode = modeSelect.value;

                if (mode === 'auto') {
                    valueRow.innerHTML += '<span style="font-size:11px; color:#94a3b8; padding:6px 0;">Auto-sized to fill space</span>';
                    this.selectedElement.style.flex = '1 1 0%'; // Reset to fluid
                } else if (mode === 'grid') {
                    const select = document.createElement('select');
                    select.className = 'style-input';
                    for (let i = 1; i <= 12; i++) {
                        const pct = (i / 12 * 100).toFixed(2);
                        select.innerHTML += `<option value="${i}">${i} Col (${pct}%)</option>`;
                    }
                    select.value = currentMode === 'grid' ? (currentVal || '6') : '6';

                    select.addEventListener('change', (e) => {
                        const cols = parseInt(e.target.value);
                        const pct = (cols / 12 * 100).toFixed(2);
                        this.selectedElement.style.flex = `0 0 ${pct}%`; // Fixed grid width
                    });
                    // Trigger initial set if switching? No, only on user action or load.
                    if (currentMode !== 'grid') {
                        // If just switched to grid, set default
                        const cols = 6;
                        this.selectedElement.style.flex = `0 0 50%`;
                        select.value = '6';
                    }
                    valueRow.appendChild(select);
                } else if (mode === 'percent') {
                    const input = document.createElement('input');
                    input.className = 'style-input';
                    input.type = 'number';
                    input.min = '1';
                    input.max = '100';
                    input.placeholder = '0-100';
                    input.value = currentMode === 'percent' ? (currentVal || '50') : '50';

                    input.addEventListener('input', (e) => {
                        this.selectedElement.style.flex = `0 0 ${e.target.value}%`;
                    });
                    if (currentMode !== 'percent') {
                        this.selectedElement.style.flex = `0 0 50%`;
                    }
                    valueRow.appendChild(input);
                }
            };

            modeSelect.addEventListener('change', () => {
                currentMode = modeSelect.value; // Update logical tracking
                currentVal = ''; // Reset value context
                renderValueInput();
            });

            // Initial Render
            renderValueInput();

            layoutGroup.appendChild(valueRow);
            panel.appendChild(layoutGroup);
        }

        // Text Content & Font Properties (shown if it's a text component)
        // We need a way to identify if selected element is text wrapper or contains text
        // Fix: Only look for editable elements if we are NOT in a row/column container
        let textElement = null;
        let buttonElement = null;

        if (type === 'text' || type === 'button' || type === 'component') {
            textElement = this.selectedElement.querySelector('[data-editable="true"]');
            buttonElement = this.selectedElement.querySelector('[data-is-button="true"]');
        }

        if (buttonElement) {
            const btnGroup = group('Button Settings');

            // Link URL
            const row = document.createElement('div');
            row.className = 'style-input-row';
            row.innerHTML = '<label class="style-label">URL</label>';
            const input = document.createElement('input');
            input.className = 'style-input';
            input.type = 'text';
            input.placeholder = 'https://...';
            input.value = buttonElement.getAttribute('href') || '#';
            input.addEventListener('input', (e) => buttonElement.setAttribute('href', e.target.value));

            row.appendChild(input);
            btnGroup.appendChild(row);
            panel.appendChild(btnGroup);
            row.appendChild(input);
            btnGroup.appendChild(row);
            panel.appendChild(btnGroup);
        }



        // Line Settings
        if (type === 'line') {
            const lineGroup = group('Line Settings');
            const hr = this.selectedElement.querySelector('hr');
            if (hr) {
                // Color
                lineGroup.appendChild(createColorInput('Color', 'borderTopColor', 'inherit', hr));

                // Style
                const styleRow = document.createElement('div');
                styleRow.className = 'style-input-row';
                styleRow.innerHTML = '<label class="style-label">Style</label>';
                const styleSelect = document.createElement('select');
                styleSelect.className = 'style-input';
                ['solid', 'dashed', 'dotted', 'double'].forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s;
                    opt.textContent = s;
                    styleSelect.appendChild(opt);
                });
                styleSelect.value = hr.style.borderTopStyle || 'solid';
                styleSelect.addEventListener('change', (e) => hr.style.borderTopStyle = e.target.value);
                styleRow.appendChild(styleSelect);
                lineGroup.appendChild(styleRow);

                // Thickness
                const thickRow = document.createElement('div');
                thickRow.className = 'style-input-row';
                thickRow.innerHTML = '<label class="style-label">Thickness</label>';
                const thickInput = document.createElement('input');
                thickInput.className = 'style-input';
                thickInput.value = hr.style.borderTopWidth || '1px';
                thickInput.addEventListener('change', (e) => {
                    let val = e.target.value;
                    if (val && !isNaN(val)) val += 'px';
                    hr.style.borderTopWidth = val;
                });
                thickRow.appendChild(thickInput);
                lineGroup.appendChild(thickRow);

                panel.appendChild(lineGroup);
            }
        }

        // Combobox Options Configuration
        if (type === 'combobox') {
            const optsGroup = group('Options');
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '8px';

            const options = JSON.parse(this.selectedElement.dataset.options || '[]');

            const renderOptionsList = () => {
                container.innerHTML = '';

                options.forEach((opt, index) => {
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.gap = '4px';
                    row.style.alignItems = 'center';

                    // Label Input
                    const labelInput = document.createElement('input');
                    labelInput.type = 'text';
                    labelInput.placeholder = 'Label';
                    labelInput.value = opt.label;
                    labelInput.className = 'style-input';
                    labelInput.style.flex = '1';
                    labelInput.addEventListener('change', (e) => {
                        options[index].label = e.target.value;
                        updateComponent();
                    });

                    // URL Input
                    const urlInput = document.createElement('input');
                    urlInput.type = 'text';
                    urlInput.placeholder = 'URL';
                    urlInput.value = opt.url;
                    urlInput.className = 'style-input';
                    urlInput.style.flex = '1';
                    urlInput.addEventListener('change', (e) => {
                        options[index].url = e.target.value;
                        updateComponent();
                    });

                    // Remove Button
                    const removeBtn = document.createElement('button');
                    removeBtn.innerHTML = '&times;';
                    removeBtn.style.background = 'none';
                    removeBtn.style.border = 'none';
                    removeBtn.style.color = '#ef4444';
                    removeBtn.style.cursor = 'pointer';
                    removeBtn.style.fontSize = '18px';
                    removeBtn.addEventListener('click', () => {
                        options.splice(index, 1);
                        renderOptionsList();
                        updateComponent();
                    });

                    row.appendChild(labelInput);
                    row.appendChild(urlInput);
                    row.appendChild(removeBtn);
                    container.appendChild(row);
                });

                // Add Option Button
                const addBtn = document.createElement('button');
                addBtn.textContent = '+ Add Option';
                addBtn.className = 'btn btn-secondary';
                addBtn.style.width = '100%';
                addBtn.style.marginTop = '8px';
                addBtn.style.fontSize = '12px';
                addBtn.addEventListener('click', () => {
                    options.push({ label: 'New Option', url: '#' });
                    renderOptionsList();
                    updateComponent();
                });

                container.appendChild(addBtn);
            };

            const updateComponent = () => {
                // Update dataset
                this.selectedElement.dataset.options = JSON.stringify(options);

                // Re-render select inside component
                const select = this.selectedElement.querySelector('select');
                select.innerHTML = '';

                if (options.length > 0) {
                    options.forEach(opt => {
                        const option = document.createElement('option');
                        option.text = opt.label;
                        option.value = opt.url;
                        select.appendChild(option);
                    });
                } else {
                    const placeholder = document.createElement('option');
                    placeholder.text = 'Select an option...';
                    select.appendChild(placeholder);
                }
            };

            renderOptionsList();
            optsGroup.appendChild(container);
            panel.appendChild(optsGroup);
        }

        if (textElement) {
            const textGroup = group('Text Content'); // textElement handles both Text and Button text

            // Content Input
            const contentRow = document.createElement('div');
            contentRow.className = 'style-input-row';
            contentRow.style.flexDirection = 'column';
            contentRow.style.alignItems = 'stretch';

            const textArea = document.createElement('textarea');
            textArea.className = 'style-input';
            textArea.style.width = '100%';
            textArea.style.height = '60px';
            textArea.style.resize = 'vertical';
            textArea.value = textElement.textContent;

            textArea.addEventListener('input', (e) => {
                textElement.textContent = e.target.value;
            });

            contentRow.appendChild(textArea);
            textGroup.appendChild(contentRow);
            panel.appendChild(textGroup);

            // Font Config
            const fontGroup = group('Font Settings');

            // Family
            const fontRow = document.createElement('div');
            fontRow.className = 'style-input-row';
            fontRow.innerHTML = '<label class="style-label">Family</label>';
            const fontSelect = document.createElement('select');
            fontSelect.className = 'style-input';
            ['Inter', 'Arial', 'Helvetica', 'Times New Roman', 'Courier New'].forEach(f => {
                const opt = document.createElement('option');
                opt.value = f;
                opt.textContent = f;
                fontSelect.appendChild(opt);
            });
            fontSelect.value = textElement.style.fontFamily.replace(/"/g, '') || 'Inter';
            fontSelect.addEventListener('change', (e) => textElement.style.fontFamily = e.target.value);
            fontRow.appendChild(fontSelect);
            fontGroup.appendChild(fontRow);

            // Weight components
            const weightRow = document.createElement('div');
            weightRow.className = 'style-input-row';
            weightRow.innerHTML = '<label class="style-label">Weight</label>';
            const weightSelect = document.createElement('select');
            weightSelect.className = 'style-input';
            ['400', '500', '600', '700', 'bold', 'normal'].forEach(w => {
                const opt = document.createElement('option');
                opt.value = w;
                opt.textContent = w;
                weightSelect.appendChild(opt);
            });
            weightSelect.value = textElement.style.fontWeight || '400';
            weightSelect.addEventListener('change', (e) => textElement.style.fontWeight = e.target.value);
            weightRow.appendChild(weightSelect);
            fontGroup.appendChild(weightRow);

            // Alignment
            const alignRow = document.createElement('div');
            alignRow.className = 'style-input-row';
            alignRow.innerHTML = '<label class="style-label">Align</label>';
            const alignSelect = document.createElement('select');
            alignSelect.className = 'style-input';
            ['left', 'center', 'right', 'justify'].forEach(a => {
                const opt = document.createElement('option');
                opt.value = a;
                opt.textContent = a;
                alignSelect.appendChild(opt);
            });

            if (buttonElement) {
                // For Button (Flex Item), map alignment to justify-content
                const map = { 'left': 'flex-start', 'center': 'center', 'right': 'flex-end', 'justify': 'space-between' };
                const revMap = { 'flex-start': 'left', 'center': 'center', 'flex-end': 'right', 'space-between': 'justify' };

                const container = buttonElement.parentElement;
                const currentJustify = container.style.justifyContent || 'flex-start';

                alignSelect.value = revMap[currentJustify] || 'left';
                alignSelect.addEventListener('change', (e) => {
                    container.style.justifyContent = map[e.target.value];
                });
            } else {
                // For Text (Block), use text-align
                alignSelect.value = textElement.style.textAlign || 'left';
                alignSelect.addEventListener('change', (e) => textElement.style.textAlign = e.target.value);
            }

            alignRow.appendChild(alignSelect);
            fontGroup.appendChild(alignRow);

            // Font Size Override (Directly on text element)
            const sizeRow = document.createElement('div');
            sizeRow.className = 'style-input-row';
            sizeRow.innerHTML = '<label class="style-label">Size</label>';
            const sizeInput = document.createElement('input');
            sizeInput.className = 'style-input';
            sizeInput.value = textElement.style.fontSize || '';
            sizeInput.placeholder = 'inherit';
            sizeInput.addEventListener('change', (e) => {
                let val = e.target.value;
                if (val && !isNaN(val) && val !== '0') {
                    val += 'px';
                }
                textElement.style.fontSize = val;
            });
            sizeRow.appendChild(sizeInput);
            fontGroup.appendChild(sizeRow);

            panel.appendChild(fontGroup);
        }

        // Dimensions & Spacing Group
        const boxGroup = group('Spacing & Dimensions');
        boxGroup.appendChild(createSpacingInput('Margin', 'margin')); // Wrapper margin
        boxGroup.appendChild(createSpacingInput('Padding', 'padding'));
        // Height
        boxGroup.appendChild(createInput('Height', 'height', 'auto'));
        boxGroup.appendChild(createInput('Width', 'width', '100%'));

        panel.appendChild(boxGroup);

        // Styling Target (Button itself vs Wrapper)
        const stylingTarget = buttonElement || this.selectedElement;

        // Appearance (Background)
        const visualGroup = group('Appearance');
        visualGroup.appendChild(createColorInput('Background', 'backgroundColor', 'transparent', stylingTarget));
        panel.appendChild(visualGroup);

        // Typography
        const typeGroup = group('Typography');
        if (!textElement) {
            typeGroup.appendChild(createInput('Font Size', 'fontSize', '14px', stylingTarget));
        }
        typeGroup.appendChild(createColorInput('Color', 'color', 'inherit', stylingTarget));

        panel.appendChild(typeGroup);

        // Borders
        const borderGroup = group('Border');
        borderGroup.appendChild(createInput('Radius', 'borderRadius', '0px', stylingTarget));

        // Border Style
        const styleRow = document.createElement('div');
        styleRow.className = 'style-input-row';
        styleRow.innerHTML = '<label class="style-label">Style</label>';
        const styleSelect = document.createElement('select');
        styleSelect.className = 'style-input';
        ['none', 'solid', 'dashed', 'dotted', 'double'].forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            styleSelect.appendChild(opt);
        });
        styleSelect.value = stylingTarget.style.borderStyle || 'none';
        styleSelect.addEventListener('change', (e) => stylingTarget.style.borderStyle = e.target.value);
        styleRow.appendChild(styleSelect);
        borderGroup.appendChild(styleRow);

        borderGroup.appendChild(createInput('Weight', 'borderWidth', '0px', stylingTarget));
        borderGroup.appendChild(createColorInput('Color', 'borderColor', 'inherit', stylingTarget));

        panel.appendChild(borderGroup);

        // Inner Content Styling (if exists)
        // For general components, it's .component-content
        // For charts, it might be the .chart-wrapper within .component-content
        const innerContent = this.selectedElement.querySelector('.component-content')
            || this.selectedElement.querySelector('.chart-wrapper');

        if (innerContent) {
            const innerGroup = group('Inner Content');
            innerGroup.appendChild(createSpacingInput('Margin', 'margin', innerContent));
            innerGroup.appendChild(createSpacingInput('Padding', 'padding', innerContent));
            panel.appendChild(innerGroup);
        }

        // Actions
        const actionGroup = group('Actions');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete ' + type.charAt(0).toUpperCase() + type.slice(1);
        deleteBtn.style.width = '100%';
        deleteBtn.style.backgroundColor = '#ef4444';
        deleteBtn.style.color = 'white';
        deleteBtn.style.padding = '8px';
        deleteBtn.style.borderRadius = '4px';
        deleteBtn.style.border = 'none';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.marginTop = '10px';

        deleteBtn.addEventListener('click', () => {
            this.showConfirmModal(
                'Delete ' + type.charAt(0).toUpperCase() + type.slice(1) + '?',
                `Are you sure you want to delete this ${type}?`,
                () => {
                    this.selectedElement.remove();
                    this.renderTree();
                    panel.innerHTML = '<div class="empty-config">Select an element to configure</div>';
                }
            );
        });

        actionGroup.appendChild(deleteBtn);
        panel.appendChild(actionGroup);
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    window.uiBuilder = new UIBuilder();
});
