/**
 * Query Builder Application
 * Uses NowDB to query JSON data with a visual interface
 */
class QueryBuilder {
    constructor() {
        // Available datasets registry
        this.datasetRegistry = [];
        this.datasets = {};

        // Current state
        this.currentDataset = null; // Will be set after loading index
        this.selectedColumns = [];
        this.filters = [];
        this.sorts = [];
        this.limit = null;
        this.results = [];
        this.chart = null;

        // Chart Config State
        this.currentChartType = 'bar';
        this.palette = 'default';
        this.chartConfig = {
            xAxisField: '',
            series: [],
            legendPosition: 'top',
            showLabels: false,
            showValues: false,
            enableAnimations: true,
            showGridLines: true,
            xAxisTitle: '',
            yAxisTitle: '',
            yAxisMin: null,
            yAxisMax: null,
            yAxisMax: null,
            numberFormat: 'default',
            numberFormat: 'default',
            stacking: 'none',
            showDataZoom: false,
            labelNamePosition: 'outside',
            labelValuePosition: 'outside'
        };

        // Available operators for filters
        this.operators = [
            { value: 'equals', label: 'equals' },
            { value: 'notEquals', label: 'not equals' },
            { value: 'contains', label: 'contains' },
            { value: 'starts', label: 'starts with' },
            { value: 'ends', label: 'ends with' },
            { value: 'greater', label: '>' },
            { value: 'greaterEquals', label: '>=' },
            { value: 'less', label: '<' },
            { value: 'lessEquals', label: '<=' },
            { value: 'empty', label: 'is empty' },
            { value: 'is', label: 'is not empty' }
        ];

        this.init();
        this.loadMaps();
        this.loadDatasets();
    }

    async loadDatasets() {
        try {
            const response = await fetch('data/index.json');
            if (!response.ok) throw new Error(response.statusText);
            this.datasetRegistry = await response.json();
            this.populateDatasetSelector();
        } catch (err) {
            console.error('Failed to load dataset index:', err);
            Utils.showToast('Failed to load datasets. Please ensure you are running on a local server.', 'error');
        }
    }

    populateDatasetSelector() {
        const selector = document.getElementById('dataSourceSelect');
        selector.innerHTML = this.datasetRegistry.map(ds =>
            `<option value="${ds.id}">${ds.name}</option>`
        ).join('');

        if (this.datasetRegistry.length > 0) {
            this.changeDataset(this.datasetRegistry[0].id);
        }
    }

    async fetchDataset(id) {
        if (this.datasets[id]) return this.datasets[id]; // Return cached

        const entry = this.datasetRegistry.find(d => d.id === id);
        if (!entry) return null;

        // Try fetch if path exists
        if (entry.path) {
            try {
                const response = await fetch(entry.path);
                if (!response.ok) throw new Error(response.statusText);
                const data = await response.json();
                this.datasets[id] = data;
                return data;
            } catch (err) {
                console.error(`Failed to fetch ${entry.path}:`, err);
                Utils.showToast(`Failed to load ${entry.name}`, 'error');
                this.datasets[id] = []; // Cache empty to avoid repeated failures/crashes
                return [];
            }
        }

        return [];
    }

    async changeDataset(id) {
        this.currentDataset = id;
        const selector = document.getElementById('dataSourceSelect');
        if (selector.value !== id) selector.value = id;

        // Fetch data if needed
        await this.fetchDataset(id);

        this.selectedColumns = [];
        this.filters = [];
        this.sorts = [];

        this.updateAvailableFields();
        this.renderFilters();
        this.renderSorts();

        // Auto-select all columns by default for better UX
        const fields = this.getAvailableFields();
        if (fields.length > 0) {
            this.selectedColumns = fields.map(f => f.id);
        }

        this.resetChartConfig();

        this.runQuery();
    }

    loadMaps() {
        // Load map registry
        fetch('data/maps.json')
            .then(res => res.json())
            .then(registry => {
                this.mapRegistry = registry;
                this.populateMapSelector();

                // Initial load (default to first or Indonesia)
                const defaultMap = registry.find(m => m.id === 'indonesia') || registry[0];
                if (defaultMap) {
                    this.loadMapRegion(defaultMap.id);
                }
            })
            .catch(err => {
                console.error('Failed to load map registry:', err);
                // Fallback to hardceded if registry fails
                this.loadMapRegion('indonesia');
            });

        // Listen for map region changes
        const regionSelect = document.getElementById('mapRegionSelect');
        if (regionSelect) {
            regionSelect.addEventListener('change', (e) => {
                this.loadMapRegion(e.target.value);
            });
        }
    }

    populateMapSelector() {
        const selector = document.getElementById('mapRegionSelect');
        if (!selector || !this.mapRegistry) return;

        selector.innerHTML = this.mapRegistry.map(map =>
            `<option value="${map.id}">${map.name}</option>`
        ).join('');
    }

    async loadMapRegion(region) {
        let url;

        if (this.mapRegistry) {
            const mapEntry = this.mapRegistry.find(m => m.id === region);
            url = mapEntry ? mapEntry.path : null;
        } else {
            // Fallback URLs if registry not loaded
            const mapUrls = {
                indonesia: 'https://code.highcharts.com/mapdata/countries/id/id-all.geo.json',
                us: 'data/us.geojson',
                europe: 'https://code.highcharts.com/mapdata/custom/europe.geo.json',
                australia: 'https://code.highcharts.com/mapdata/countries/au/au-all.geo.json',
                world: 'https://code.highcharts.com/mapdata/custom/world.geo.json'
            };
            url = mapUrls[region];
        }

        if (!url) return;

        try {
            // Check if already registered
            if (echarts.getMap(region)) {
                this.chartConfig.mapRegion = region;
                this.updateChart();
                return;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const geoJSON = await response.json();
            echarts.registerMap(region, geoJSON);
            console.log(`${region} map registered`);

            this.chartConfig.mapRegion = region;

            if (this.currentChartType === 'geomap') {
                this.updateChart();
            }
        } catch (err) {
            console.warn(`Could not load ${region} map:`, err);
            Utils.showToast(`Failed to load ${region} map`, 'error');
        }
    }

    // Sample Datasets - Moved to JSON files in data/ directory

    init() {
        this.setupEventListeners();
        this.loadMaps();
        this.loadDatasets();
    }

    setupEventListeners() {
        // Data source change
        document.getElementById('dataSourceSelect').addEventListener('change', (e) => {
            this.changeDataset(e.target.value);
        });

        // Run query button


        // Select all columns
        document.getElementById('selectAllColumns').addEventListener('click', () => {
            this.selectAllColumns();
        });

        // Add filter button
        document.getElementById('addFilterBtn').addEventListener('click', () => {
            this.addFilter();
        });

        // Add sort button
        document.getElementById('addSortBtn').addEventListener('click', () => {
            this.addSort();
        });

        // Limit input
        document.getElementById('limitInput').addEventListener('change', (e) => {
            this.limit = e.target.value ? parseInt(e.target.value) : null;
            this.runQuery();
        });

        // View tabs
        document.querySelectorAll('.results-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchView(e.target.closest('.results-tab').dataset.view);
            });
        });

        // --- Visualization Controls ---

        // Config Tabs (Data, Display, Axes)
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchConfigTab(e.target.dataset.tab));
        });

        // X-Axis Field
        document.getElementById('xAxisField')?.addEventListener('change', (e) => {
            this.chartConfig.xAxisField = e.target.value;
            this.updateChart();
        });

        // Helper for delegation
        document.addEventListener('click', (e) => {
            // Update Map Button
            if (e.target && e.target.closest('#updateMapBtn')) {
                // Explicitly sync from DOM to ChartConfig
                const mapKeyEl = document.getElementById('mapKeyField');
                const geoValueEl = document.getElementById('geoValueField');

                if (mapKeyEl) {
                    this.chartConfig.mapKeyField = mapKeyEl.value;
                }

                if (geoValueEl) {
                    const val = geoValueEl.value;
                    this.chartConfig.valueField = val;

                    if (this.chartConfig.series.length > 0) {
                        this.chartConfig.series[0].id = val;
                        this.chartConfig.series[0].name = val;
                    }
                }

                if (this.currentChartType.startsWith('geomap')) {
                    if (this.chart) this.chart.clear();
                }
                this.updateChart();
            }
        });

        // Geo Value Field Change (Delegation update)
        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'geoValueField') {
                const val = e.target.value;
                if (this.chartConfig.series.length > 0) {
                    this.chartConfig.series[0].id = val;
                    this.chartConfig.series[0].name = val;

                    // Sync Map Key just in case
                    const mapKeyEl = document.getElementById('mapKeyField');
                    if (mapKeyEl) {
                        this.chartConfig.mapKeyField = mapKeyEl.value;
                    }

                    if (this.currentChartType.startsWith('geomap')) {
                        if (this.chart) this.chart.clear();
                    }

                    this.updateChart();
                }
            }
        });

        const mapKeyField = document.getElementById('mapKeyField');
        if (mapKeyField) {
            mapKeyField.addEventListener('change', (e) => {
                this.chartConfig.mapKeyField = e.target.value;
                this.updateChart();
            });
        }







        // Calendar Legend Position
        document.getElementById('calendarLegendPosition')?.addEventListener('change', (e) => {
            this.updateChart();
        });

        // Number Aggregation
        document.getElementById('numberField')?.addEventListener('change', (e) => {
            this.updateChart();
        });
        document.getElementById('numberAggregation')?.addEventListener('change', (e) => {
            this.updateChart();
        });
        document.getElementById('numberLabel')?.addEventListener('input', (e) => {
            this.updateChart();
        });
        document.getElementById('numberFormatSelect')?.addEventListener('change', (e) => {
            this.updateChart();
        });


        document.getElementById('matrixXAxis')?.addEventListener('change', () => this.updateChart());
        document.getElementById('matrixYAxis')?.addEventListener('change', () => this.updateChart());
        document.getElementById('matrixValue')?.addEventListener('change', () => this.updateChart());

        // Candlestick
        document.getElementById('candleOpen')?.addEventListener('change', () => this.updateChart());
        document.getElementById('candleClose')?.addEventListener('change', () => this.updateChart());
        document.getElementById('candleLow')?.addEventListener('change', () => this.updateChart());
        document.getElementById('candleHigh')?.addEventListener('change', () => this.updateChart());
        document.getElementById('candleName')?.addEventListener('input', () => this.updateChart());

        // Gauge Config
        document.getElementById('gaugeMin')?.addEventListener('change', () => this.updateChart());
        document.getElementById('gaugeMax')?.addEventListener('change', () => this.updateChart());
        document.getElementById('gaugeStartAngle')?.addEventListener('change', () => this.updateChart());
        document.getElementById('gaugeEndAngle')?.addEventListener('change', () => this.updateChart());
        document.getElementById('gaugeSplitNumber')?.addEventListener('change', () => this.updateChart());

        // Stacking
        document.getElementById('stackingMode')?.addEventListener('change', (e) => {
            this.chartConfig.stacking = e.target.value;
            this.updateChart();
        });

        // Chart Title
        document.getElementById('chartTitle')?.addEventListener('change', (e) => {
            this.chartConfig.title = e.target.value;
            this.updateChart();
        });

        // Legend Position
        document.getElementById('legendPosition')?.addEventListener('change', (e) => {
            this.chartConfig.legendPosition = e.target.value;
            this.updateChart();
        });

        document.getElementById('labelNamePosition')?.addEventListener('change', (e) => {
            this.chartConfig.labelNamePosition = e.target.value;
            this.updateChart();
        });

        document.getElementById('labelValuePosition')?.addEventListener('change', (e) => {
            this.chartConfig.labelValuePosition = e.target.value;
            this.updateChart();
        });

        // Value Field (GeoMap)
        document.getElementById('geoValueField')?.addEventListener('change', (e) => {
            this.chartConfig.valueField = e.target.value;
            this.updateChart();
        });

        // Toggles
        document.getElementById('showLabels')?.addEventListener('change', (e) => {
            this.chartConfig.showLabels = e.target.checked;
            this.updateChart();
        });

        document.getElementById('showDataZoom')?.addEventListener('change', (e) => {
            this.chartConfig.showDataZoom = e.target.checked;
            this.updateChart();
        });

        document.getElementById('showValues')?.addEventListener('change', (e) => {
            this.chartConfig.showValues = e.target.checked;
            this.updateChart();
        });

        document.getElementById('showMinMax')?.addEventListener('change', (e) => {
            this.chartConfig.showMinMax = e.target.checked;
            this.updateChart();
        });



        document.getElementById('showGridLines')?.addEventListener('change', (e) => {
            this.chartConfig.showGridLines = e.target.checked;
            this.updateChart();
        });

        // Colors
        document.querySelectorAll('.palette-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const paletteBtn = e.target.closest('.palette-btn');
                document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
                paletteBtn.classList.add('active');
                this.palette = paletteBtn.dataset.palette;
                this.updateSeriesColors();
                this.updateChart();
            });
        });

        // Axis Titles and Ranges
        document.getElementById('xAxisTitle')?.addEventListener('input', Utils.debounce((e) => {
            this.chartConfig.xAxisTitle = e.target.value;
            this.updateChart();
        }, 300));

        document.getElementById('yAxisTitle')?.addEventListener('input', Utils.debounce((e) => {
            this.chartConfig.yAxisTitle = e.target.value;
            this.updateChart();
        }, 300));

        document.getElementById('yAxisMin')?.addEventListener('input', Utils.debounce((e) => {
            this.chartConfig.yAxisMin = e.target.value ? parseFloat(e.target.value) : null;
            this.updateChart();
        }, 300));

        document.getElementById('yAxisMax')?.addEventListener('input', Utils.debounce((e) => {
            this.chartConfig.yAxisMax = e.target.value ? parseFloat(e.target.value) : null;
            this.updateChart();
        }, 300));

        // Mark Line (Goal)
        document.getElementById('goalValue')?.addEventListener('input', Utils.debounce((e) => {
            this.chartConfig.goalValue = e.target.value;
            this.updateChart();
        }, 300));

        document.getElementById('goalLabel')?.addEventListener('input', Utils.debounce((e) => {
            this.chartConfig.goalLabel = e.target.value;
            this.updateChart();
        }, 300));

        document.getElementById('numberFormat')?.addEventListener('change', (e) => {
            this.chartConfig.numberFormat = e.target.value;
            this.updateChart();
        });

        // Chart Type Selector
        document.getElementById('chartTypeSelector')?.addEventListener('click', () => {
            this.openChartTypeModal();
        });

        // Add Series Modal Triggers
        document.getElementById('addSeriesBtn')?.addEventListener('click', () => this.openAddSeriesModal());
        document.getElementById('closeSeriesModal')?.addEventListener('click', () => this.closeAddSeriesModal());
        document.getElementById('cancelAddSeries')?.addEventListener('click', () => this.closeAddSeriesModal());
        document.getElementById('confirmAddSeries')?.addEventListener('click', () => this.confirmAddSeries());

        // Chart Type Modal Triggers
        // Note: You needs a trigger button for this in the UI, currently just verifying logic
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeChartTypeModal());
        document.getElementById('chartTypeModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'chartTypeModal') this.closeChartTypeModal();
        });

        // Save Chart Logic
        document.getElementById('saveBtn')?.addEventListener('click', () => this.openSaveModal());
        document.getElementById('saveDesignBtn')?.addEventListener('click', () => this.openSaveModal());

        // Save Modal Listeners
        document.getElementById('closeSaveModal')?.addEventListener('click', () => this.closeSaveModal());
        document.getElementById('cancelSaveDesign')?.addEventListener('click', () => this.closeSaveModal());
        document.getElementById('confirmSaveDesign')?.addEventListener('click', () => this.confirmSaveDesign());
        document.getElementById('saveDesignModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'saveDesignModal') this.closeSaveModal();
        });

        // Export PNG Logic
        document.getElementById('exportPngBtn')?.addEventListener('click', () => this.exportChart());
    }

    openSaveModal() {
        document.getElementById('designNameInput').value = 'My Chart';
        document.getElementById('saveDesignModal').classList.add('active');
        document.getElementById('designNameInput').focus();
    }

    closeSaveModal() {
        document.getElementById('saveDesignModal').classList.remove('active');
    }

    confirmSaveDesign() {
        const title = document.getElementById('designNameInput').value.trim();
        if (!title) {
            alert('Please enter a name for the design.');
            return;
        }

        this.saveChartDesign(title);
        this.closeSaveModal();
    }

    async saveChartDesign(title) {

        const design = {
            id: Date.now().toString(),
            title: title,
            chartType: this.currentChartType,
            dataset: this.currentDataset,
            config: this.chartConfig,
            palette: this.palette,
            queryState: {
                selectedColumns: this.selectedColumns,
                filters: this.filters,
                sorts: this.sorts,
                limit: this.limit
            },
            // Save special chart configurations
            matrixConfig: {
                xField: document.getElementById('matrixXAxis')?.value,
                yField: document.getElementById('matrixYAxis')?.value,
                valueField: document.getElementById('matrixValue')?.value
            },
            gaugeConfig: {
                min: parseFloat(document.getElementById('gaugeMin')?.value || 0),
                max: parseFloat(document.getElementById('gaugeMax')?.value || 180),
                startAngle: parseFloat(document.getElementById('gaugeStartAngle')?.value || 180),
                endAngle: parseFloat(document.getElementById('gaugeEndAngle')?.value || 0),
                splitNumber: parseFloat(document.getElementById('gaugeSplitNumber')?.value || 10)
            },
            calendarConfig: {
                legendPosition: document.getElementById('calendarLegendPosition')?.value || 'bottom'
            },
            timestamp: new Date().toISOString()
        };

        try {
            // Load existing from API
            let savedCharts = await API.getSavedCharts();
            if (!Array.isArray(savedCharts)) savedCharts = [];

            savedCharts.push(design);

            // Save back to API
            const res = await API.saveSavedCharts(savedCharts);

            if (res.success) {
                Utils.showToast('Chart design saved successfully!', 'success');
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            console.error('Failed to save chart:', e);
            Utils.showToast('Failed to save chart design.', 'error');
        }
    }

    exportChart() {
        if (!this.chart) return;

        const url = this.chart.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#ffffff'
        });

        const link = document.createElement('a');
        link.download = `chart-${Date.now()}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }




    // Reset chart config based on current dataset
    resetChartConfig() {
        const fields = this.getAvailableFields();
        if (fields.length === 0) return;

        const data = this.datasets[this.currentDataset];
        // Check if data exists and has records
        // Check if data exists
        if (!data) {
            return;
        }

        let sample = data;
        if (Array.isArray(data)) {
            if (data.length === 0) return;
            sample = data[0];
        }

        // Helper to guess type
        const getType = (val) => {
            if (typeof val === 'number') return 'number';
            if (typeof val === 'string') {
                // naive date check
                if (!isNaN(Date.parse(val)) && val.length > 5) return 'date';
                return 'string';
            }
            return 'string';
        };

        // Find potential X-Axis (String or Date)
        const xField = fields.find(f => {
            const type = getType(sample[f.id]);
            return type === 'string' || type === 'date';
        }) || fields[0];

        // Find potential Series (Number)
        const numberFields = fields.filter(f => getType(sample[f.id]) === 'number');
        const sField = numberFields.length > 0 ? numberFields[0] : (fields[1] || fields[0]);

        this.chartConfig.xAxisField = xField.id;

        // Reset series
        this.chartConfig.series = [];

        this.updateChartConfigUI();
    }

    updateChartConfigUI() {
        // Populate X-Axis Select
        const xAxisSelect = document.getElementById('xAxisField');
        if (xAxisSelect) {
            const fields = this.getAvailableFields();
            xAxisSelect.innerHTML = fields.map(f =>
                `<option value="${f.id}" ${f.id === this.chartConfig.xAxisField ? 'selected' : ''}>${f.name}</option>`
            ).join('');

            // Also populate Map Key Field
            const mapKeySelect = document.getElementById('mapKeyField');
            if (mapKeySelect) {
                const mapKey = this.chartConfig.mapKeyField || this.chartConfig.xAxisField;
                mapKeySelect.innerHTML = fields.map(f =>
                    `<option value="${f.id}" ${f.id === mapKey ? 'selected' : ''}>${f.name}</option>`
                ).join('');
                this.chartConfig.mapKeyField = mapKey; // Ensure config is synced
            }

            // Populate Geo Value Field
            const geoValueSelect = document.getElementById('geoValueField');
            if (geoValueSelect && this.chartConfig.series.length > 0) {
                const currentSeriesId = this.chartConfig.series[0].id;
                geoValueSelect.innerHTML = fields.filter(f => {
                    // Filter only numbers for value? Or allow all? Usually numbers.
                    const data = this.datasets[this.currentDataset];
                    const sample = data ? data[0] : {};
                    return typeof sample[f.id] === 'number';
                }).map(f =>
                    `<option value="${f.id}" ${f.id === currentSeriesId ? 'selected' : ''}>${f.name}</option>`
                ).join('');
            }

            // Populate Number Field (For Number Chart)
            const numberFieldSelect = document.getElementById('numberField');
            if (numberFieldSelect) {
                const numericFields = fields.filter(f => {
                    const data = this.datasets[this.currentDataset];
                    const sample = (Array.isArray(data) && data.length > 0) ? data[0] : (data || {});
                    const val = sample[f.id];
                    return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
                });

                numberFieldSelect.innerHTML = numericFields.map(f =>
                    `<option value="${f.id}">${f.name}</option>`
                ).join('');

                // If no numeric fields (e.g. only string), show all just in case
                if (numericFields.length === 0) {
                    numberFieldSelect.innerHTML = fields.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
                }
            }

            // Populate Matrix Selectors
            const matrixX = document.getElementById('matrixXAxis');
            const matrixY = document.getElementById('matrixYAxis');
            const matrixVal = document.getElementById('matrixValue');

            if (matrixX && matrixY && matrixVal) {
                const options = fields.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
                matrixX.innerHTML = options;
                matrixY.innerHTML = options;
                matrixVal.innerHTML = options;

                // Smart default selection
                if (fields.length >= 2) {
                    matrixX.selectedIndex = 0;
                    matrixY.selectedIndex = 1;
                    if (fields.length >= 3) matrixVal.selectedIndex = 2;
                }
            }

            // Populate Candlestick Selectors
            const candleOpen = document.getElementById('candleOpen');
            const candleClose = document.getElementById('candleClose');
            const candleLow = document.getElementById('candleLow');
            const candleHigh = document.getElementById('candleHigh');

            if (candleOpen && candleClose && candleLow && candleHigh) {
                const numericFields = fields.filter(f => {
                    const data = this.datasets[this.currentDataset];
                    const sample = (Array.isArray(data) && data.length > 0) ? data[0] : (data || {});
                    const val = sample[f.id];
                    return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
                });
                // Fallback to all fields if no numeric found
                const candidateFields = numericFields.length > 0 ? numericFields : fields;

                const options = candidateFields.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
                candleOpen.innerHTML = options;
                candleClose.innerHTML = options;
                candleLow.innerHTML = options;
                candleHigh.innerHTML = options;

                // Smart Auto-Select
                const findField = (dict) => candidateFields.find(f => f.id.toLowerCase().includes(dict));

                const openF = findField('open');
                const closeF = findField('close');
                const lowF = candidateFields.find(f => f.id.toLowerCase().includes('low') || f.id.toLowerCase().includes('min'));
                const highF = candidateFields.find(f => f.id.toLowerCase().includes('high') || f.id.toLowerCase().includes('max'));

                if (openF) candleOpen.value = openF.id;
                if (closeF) candleClose.value = closeF.id;
                if (lowF) candleLow.value = lowF.id;
                if (highF) candleHigh.value = highF.id;
            }
        }
    }

    getAvailableFields() {
        const data = this.datasets[this.currentDataset];
        if (!data) return [];

        let sample = data;
        if (Array.isArray(data)) {
            if (data.length === 0) return [];
            sample = data[0];
        }

        const keys = Object.keys(sample);
        return keys.map(k => ({ id: k, name: k }));
    }

    updateAvailableFields() {
        const data = this.datasets[this.currentDataset];
        if (!data) return;

        const fields = this.getAvailableFields().map(f => f.id);

        // Update field count
        const recordCount = Array.isArray(data) ? data.length : 1;
        document.getElementById('fieldCount').textContent =
            `${fields.length} fields, ${recordCount} record${recordCount !== 1 ? 's' : ''}`;

        // Populate column list
        this.populateColumns(fields);
    }

    populateColumns(fields) {
        const container = document.getElementById('columnList');
        container.innerHTML = '';

        // Select all columns by default
        this.selectedColumns = [...fields];

        fields.forEach(field => {
            const data = this.datasets[this.currentDataset];
            const sampleValue = data.length > 0 ? data[0][field] : null;
            const fieldType = this.getFieldType(sampleValue);

            const item = document.createElement('div');
            item.className = 'column-item';
            item.innerHTML = `
                <input type="checkbox" id="col_${field}" checked>
                <label for="col_${field}">${field}</label>
                <span class="column-type">${fieldType}</span>
            `;

            item.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!this.selectedColumns.includes(field)) {
                        this.selectedColumns.push(field);
                    }
                } else {
                    this.selectedColumns = this.selectedColumns.filter(c => c !== field);
                }
                this.runQuery();
            });

            container.appendChild(item);
        });
    }

    getFieldType(value) {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'bool';
        if (typeof value === 'string') {
            if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
            return 'string';
        }
        if (Array.isArray(value)) return 'array';
        return 'object';
    }

    selectAllColumns() {
        const data = this.datasets[this.currentDataset];
        const fields = data.length > 0 ? Object.keys(data[0]) : [];
        this.selectedColumns = [...fields];

        document.querySelectorAll('.column-item input').forEach(input => {
            input.checked = true;
        });

        this.runQuery();
    }

    addFilter() {
        const data = this.datasets[this.currentDataset];
        const fields = data.length > 0 ? Object.keys(data[0]) : [];

        // Detect default value type from first record
        const firstRecord = data[0] || {};
        const defaultField = fields[0] || '';
        const sampleValue = firstRecord[defaultField];
        const detectedType = typeof sampleValue === 'number' ? 'number' : 'string';

        this.filters.push({
            id: Date.now(),
            field: defaultField,
            operator: 'equals',
            value: '',
            valueType: detectedType,
            logic: this.filters.length > 0 ? 'AND' : null
        });

        this.renderFilters();
    }

    renderFilters() {
        const container = document.getElementById('filterList');
        const noFilters = document.getElementById('noFilters');

        if (this.filters.length === 0) {
            noFilters.style.display = 'block';
            container.querySelectorAll('.filter-row').forEach(r => r.remove());
            return;
        }

        noFilters.style.display = 'none';
        container.querySelectorAll('.filter-row').forEach(r => r.remove());

        const data = this.datasets[this.currentDataset];
        const fields = data.length > 0 ? Object.keys(data[0]) : [];

        this.filters.forEach((filter, index) => {
            const row = document.createElement('div');
            row.className = 'filter-row';
            row.dataset.id = filter.id;

            const showLogic = index > 0;
            const needsValue = !['empty', 'is'].includes(filter.operator);

            row.innerHTML = `
                <div class="filter-row-header">
                    ${showLogic ? `
                        <select class="filter-logic">
                            <option value="AND" ${filter.logic === 'AND' ? 'selected' : ''}>AND</option>
                            <option value="OR" ${filter.logic === 'OR' ? 'selected' : ''}>OR</option>
                        </select>
                    ` : '<span class="filter-row-logic">WHERE</span>'}
                    <button class="filter-row-delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="filter-row-content">
                    <div class="filter-row-selects">
                        <select class="filter-field">
                            ${fields.map(f => `<option value="${f}" ${f === filter.field ? 'selected' : ''}>${f}</option>`).join('')}
                        </select>
                        <select class="filter-operator">
                            ${this.operators.map(op => `<option value="${op.value}" ${op.value === filter.operator ? 'selected' : ''}>${op.label}</option>`).join('')}
                        </select>
                        ${needsValue ? `
                            <select class="filter-value-type" title="Value type">
                                <option value="string" ${filter.valueType === 'string' ? 'selected' : ''}>Text</option>
                                <option value="number" ${filter.valueType === 'number' ? 'selected' : ''}>Number</option>
                            </select>
                        ` : ''}
                    </div>
                    ${needsValue ? `<input type="text" class="filter-value" placeholder="Enter value..." value="${filter.value}">` : ''}
                </div>
            `;

            // Event listeners
            row.querySelector('.filter-row-delete').addEventListener('click', () => {
                this.filters = this.filters.filter(f => f.id !== filter.id);
                this.renderFilters();
                this.runQuery();
            });

            row.querySelector('.filter-field').addEventListener('change', (e) => {
                filter.field = e.target.value;
                // Update valueType based on new field's data type
                const firstRecord = data[0] || {};
                const sampleValue = firstRecord[filter.field];
                filter.valueType = typeof sampleValue === 'number' ? 'number' : 'string';
                this.renderFilters();
                this.runQuery();
            });

            row.querySelector('.filter-operator').addEventListener('change', (e) => {
                filter.operator = e.target.value;
                this.renderFilters();
                this.runQuery();
            });

            const valueTypeSelect = row.querySelector('.filter-value-type');
            if (valueTypeSelect) {
                valueTypeSelect.addEventListener('change', (e) => {
                    filter.valueType = e.target.value;
                    this.runQuery();
                });
            }

            const valueInput = row.querySelector('.filter-value');
            if (valueInput) {
                valueInput.addEventListener('input', (e) => {
                    filter.value = e.target.value;
                });
                valueInput.addEventListener('change', () => {
                    this.runQuery();
                });
            }

            const logicSelect = row.querySelector('.filter-logic');
            if (logicSelect) {
                logicSelect.addEventListener('change', (e) => {
                    filter.logic = e.target.value;
                    this.runQuery();
                });
            }

            container.appendChild(row);
        });
    }

    addSort() {
        const data = this.datasets[this.currentDataset];
        const fields = data.length > 0 ? Object.keys(data[0]) : [];

        this.sorts.push({
            id: Date.now(),
            field: fields[0] || '',
            direction: 'asc'
        });

        this.renderSorts();
    }

    renderSorts() {
        const container = document.getElementById('sortList');
        const noSort = document.getElementById('noSort');

        if (this.sorts.length === 0) {
            noSort.style.display = 'block';
            container.querySelectorAll('.sort-row').forEach(r => r.remove());
            return;
        }

        noSort.style.display = 'none';
        container.querySelectorAll('.sort-row').forEach(r => r.remove());

        const data = this.datasets[this.currentDataset];
        const fields = data.length > 0 ? Object.keys(data[0]) : [];

        this.sorts.forEach(sort => {
            const row = document.createElement('div');
            row.className = 'sort-row';
            row.dataset.id = sort.id;

            row.innerHTML = `
                <div class="sort-row-header">
                    <span class="section-label" style="font-size: 11px;">SORT BY</span>
                    <button class="sort-row-delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="sort-row-content">
                    <select class="sort-field">
                        ${fields.map(f => `<option value="${f}" ${f === sort.field ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                    <select class="sort-direction">
                        <option value="asc" ${sort.direction === 'asc' ? 'selected' : ''}>Ascending</option>
                        <option value="desc" ${sort.direction === 'desc' ? 'selected' : ''}>Descending</option>
                    </select>
                </div>
            `;

            row.querySelector('.sort-row-delete').addEventListener('click', () => {
                this.sorts = this.sorts.filter(s => s.id !== sort.id);
                this.renderSorts();
                this.runQuery();
            });

            row.querySelector('.sort-field').addEventListener('change', (e) => {
                sort.field = e.target.value;
                this.runQuery();
            });

            row.querySelector('.sort-direction').addEventListener('change', (e) => {
                sort.direction = e.target.value;
                this.runQuery();
            });

            container.appendChild(row);
        });
    }

    runQuery() {
        const data = this.datasets[this.currentDataset];
        // NowDB requires an array. If data is a single object (e.g. tree), wrap it.
        const queryData = Array.isArray(data) ? data : [data];
        let query = NowDB.from(queryData);

        // Apply filters
        this.filters.forEach((filter, index) => {
            const { field, operator, value, valueType, logic } = filter;

            // Convert value based on valueType
            let compareValue = value;
            if (valueType === 'number') {
                compareValue = parseFloat(value) || 0;
            }

            // Build the query based on operator and logic
            if (index === 0 || logic === 'AND') {
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
            } else {
                // OR logic
                switch (operator) {
                    case 'equals': query = query.orEquals(field, compareValue); break;
                    case 'notEquals': query = query.orNotEquals(field, compareValue); break;
                    case 'contains': query = query.orContains(field, compareValue); break;
                    case 'starts': query = query.orStarts(field, compareValue); break;
                    case 'ends': query = query.orEnds(field, compareValue); break;
                    case 'greater': query = query.orGreater(field, compareValue); break;
                    case 'greaterEquals': query = query.orGreaterEquals(field, compareValue); break;
                    case 'less': query = query.orLess(field, compareValue); break;
                    case 'lessEquals': query = query.orLessEquals(field, compareValue); break;
                    case 'empty': query = query.orEmpty(field); break;
                    case 'is': query = query.orIs(field); break;
                }
            }
        });

        // Apply sorting
        if (this.sorts.length > 0) {
            const sortFields = this.sorts.map(s =>
                s.direction === 'desc' ? `-${s.field}` : s.field
            );
            query = query.sort(...sortFields);
        }

        // Execute query
        let results = query.select();

        // Apply limit
        if (this.limit && this.limit > 0) {
            results = results.slice(0, this.limit);
        }

        // Filter columns
        if (this.selectedColumns.length > 0) {
            results = results.map(record => {
                const filtered = {};
                this.selectedColumns.forEach(col => {
                    if (record.hasOwnProperty(col)) {
                        filtered[col] = record[col];
                    }
                });
                return filtered;
            });
        }

        this.results = results;
        this.renderResults();
        this.renderResults();
        this.updateChart();
        // Also update JSON if view is active or just always update
        if (document.getElementById('jsonView')?.classList.contains('active')) {
            this.renderJson();
        }
    }

    renderResults() {
        const thead = document.getElementById('tableHead');
        const tbody = document.getElementById('tableBody');
        const resultCount = document.getElementById('resultCount');

        // Update count
        resultCount.textContent = `${this.results.length} result${this.results.length !== 1 ? 's' : ''}`;

        if (this.results.length === 0) {
            thead.innerHTML = '';
            tbody.innerHTML = '<tr><td colspan="100" style="text-align: center; padding: 40px; color: var(--color-text-tertiary);">No results found</td></tr>';
            return;
        }

        // Build header
        const columns = Object.keys(this.results[0]);
        thead.innerHTML = '<tr>' + columns.map(col => `<th>${col}</th>`).join('') + '</tr>';

        // Build body
        tbody.innerHTML = this.results.map(record => {
            return '<tr>' + columns.map(col => {
                const value = record[col];
                const displayValue = value === null ? '<em>null</em>' :
                    typeof value === 'object' ? JSON.stringify(value) : value;
                return `<td>${displayValue}</td>`;
            }).join('') + '</tr>';
        }).join('');
    }

    renderJson() {
        const codeBlock = document.getElementById('jsonCode');
        if (!codeBlock) return;

        if (this.results.length === 0) {
            codeBlock.textContent = '// No results found';
            return;
        }

        try {
            codeBlock.textContent = JSON.stringify(this.results, null, 2);
        } catch (e) {
            codeBlock.textContent = '// Error generating JSON';
        }
    }

    updateChart() {
        if (!this.chart) {
            const container = document.getElementById('queryChartContainer');
            if (container && typeof echarts !== 'undefined') {
                this.chart = echarts.init(container);
            }
        }

        if (!this.chart || this.results.length === 0) return;

        // Extract data for chart
        // For maps, prefer mapKeyField, otherwise fallback to xAxisField
        const mapKeyField = this.chartConfig.mapKeyField || this.chartConfig.xAxisField;
        console.log('[UpdateChart] Type:', this.currentChartType, 'ValueField:', this.chartConfig.valueField, 'MapKey:', mapKeyField);

        const xAxisData = this.results.map(r => r[this.chartConfig.xAxisField]);
        const mapKeyData = this.results.map(r => r[mapKeyField]);

        // Build series data
        let activeSeries = this.chartConfig.series.filter(s => s.visible);

        // Fallback for GeoMap: if no series but valueField is set, create a dummy series
        if (activeSeries.length === 0 && ['geomap', 'geomapPie'].includes(this.currentChartType) && this.chartConfig.valueField) {
            activeSeries = [{
                id: 'geo_series',
                name: this.chartConfig.valueField,
                visible: true,
                color: Utils.getColor(0, this.palette)
            }];
        }

        let seriesData = activeSeries
            .map(s => {
                // Get data for this series
                // Get data for this series
                let dataField = s.id;

                // For GeoMap, prioritize the explicitly selected Value Field ONLY if single series
                // This allows multi-series (Map+Pie) to use their own columns
                if (['geomap', 'geomapPie'].includes(this.currentChartType) &&
                    this.chartConfig.valueField &&
                    activeSeries.length === 1) {
                    dataField = this.chartConfig.valueField;
                }

                const data = this.results.map(r => r[dataField]);

                // For Maps and Pies, we need name-value pairs
                // We use xAxisData (or mapKey for maps) as the names
                if (['pie', 'donut', 'halfDonut', 'nightingale', 'treemap', 'sunburst', 'funnel'].includes(this.currentChartType)) {
                    return {
                        name: s.name,
                        data: xAxisData.map((name, i) => ({ name, value: data[i] })),
                        color: s.color
                    };
                }

                if (['geomap', 'geomapPie'].includes(this.currentChartType)) {
                    return {
                        name: s.name,
                        data: mapKeyData.map((name, i) => {
                            const rawVal = data[i];
                            // Parse number handling commas and strings
                            let val = null;
                            if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
                                if (typeof rawVal === 'number') {
                                    val = rawVal;
                                } else {
                                    val = parseFloat(String(rawVal).replace(/,/g, ''));
                                }
                            }
                            // Filter explicit invalid results
                            if (isNaN(val)) val = null;

                            // Name Corrections for known mismatches
                            const nameCorrections = {
                                'Papua Barat': 'Irian Jaya Barat',
                                'DKI Jakarta': 'Jakarta Raya',
                                'Daerah Istimewa Yogyakarta': 'Yogyakarta'
                            };
                            const cleanName = String(name).trim();
                            const finalName = nameCorrections[cleanName] || cleanName;

                            return {
                                name: finalName,
                                value: val
                            };
                        }),
                        color: s.color
                    };
                }

                if (this.currentChartType === 'candlestick') {
                    // Start with empty, will be handled by post-processing pivot below
                    // We need to pivot Open/Close/Low/High series into one data array
                    return null;
                }

                return {
                    name: s.name,
                    data: data,
                    color: s.color
                };
            }).filter(s => s !== null);

        if (this.currentChartType === 'candlestick') {
            // Pivot series data into [[Open, Close, Low, High], ...] per group
            // We group active series by 4: [Open, Close, Low, High]
            // If less than 4, we can't make a valid candle.

            seriesData = [];

            for (let i = 0; i < activeSeries.length; i += 4) {
                // Get chunk of 4
                const group = activeSeries.slice(i, i + 4);
                if (group.length < 4) break; // Incomplete candle

                // Assume order: Open, Close, Low, High
                const openField = group[0].id;
                const closeField = group[1].id;
                const lowField = group[2].id;
                const highField = group[3].id;

                // Name: Use the common prefix or the first field name
                let name = group[0].name.split('_')[0] || 'Candlestick ' + (i / 4 + 1);

                const data = this.results.map(r => [
                    r[openField],
                    r[closeField],
                    r[lowField],
                    r[highField]
                ]);

                seriesData.push({
                    name: name,
                    data: data,
                    // Pass color from first series in group
                    color: group[0].color
                });
            }
        }

        // Calculate global min/max for visualMap (used in geomap)
        // (Min/Max calculation moved below mapColorData generation)

        // Generate mapColorData for the base map (Map + Pie)
        let mapColorData = [];
        if (this.currentChartType === 'geomapPie' && this.chartConfig.valueField) {
            const mapKeyField = this.chartConfig.mapKeyField || this.chartConfig.xAxisField;
            // We need to re-map just the Value Field to name/value pairs
            mapColorData = this.results.map(r => {
                let val = r[this.chartConfig.valueField];
                if (typeof val !== 'number') {
                    val = parseFloat(String(val).replace(/,/g, ''));
                }
                if (isNaN(val)) val = null;

                // Name Corrections
                let name = r[mapKeyField];
                const nameCorrections = {
                    'Papua Barat': 'Irian Jaya Barat',
                    'DKI Jakarta': 'Jakarta Raya',
                    'Daerah Istimewa Yogyakarta': 'Yogyakarta',
                    // Countries
                    'United States': 'United States of America'
                };
                const cleanName = String(name).trim();
                const finalName = nameCorrections[cleanName] || cleanName;

                return { name: finalName, value: val };
            });
        }

        // Calculate global min/max for visualMap (used in geomap)
        let visualMin = 0;
        let visualMax = 100;

        if (this.currentChartType === 'geomap') {
            const allValues = seriesData.flatMap(s => s.data.map(d => d.value)).filter(v => v !== null && !isNaN(v));

            if (allValues.length > 0) {
                visualMin = Math.min(...allValues);
                visualMax = Math.max(...allValues);

                // If min == max, spread a bit to allow range
                if (visualMin === visualMax) {
                    visualMin -= 1;
                    visualMax += 1;
                }
            }
        }



        let indicators = [];
        if (this.currentChartType === 'radar') {
            // Calculate indicators based on active series (metrics)
            // Name is the series name (column), Max is the max value in that column + buffer
            indicators = activeSeries.map(s => {
                const values = this.results.map(r => r[s.id]).filter(v => typeof v === 'number');
                const max = values.length > 0 ? Math.max(...values) : 100;
                return { name: s.name, max: Math.ceil(max * 1.1) };
            });

            // Pivot: Convert each Row (Entity) into a Series object for ChartConfig
            // chartConfig.buildRadarSeries iterates 'series' and maps s.data to value.
            // So we want seriesData = [ {name: 'R&D', data: [values]}, {name: 'Marketing', data: [values]} ]

            seriesData = xAxisData.map((entityName, rowIndex) => {
                const values = activeSeries.map(s => {
                    const val = this.results[rowIndex][s.id];
                    // Ensure numeric value
                    let num = typeof val === 'number' ? val : parseFloat(val);
                    return isNaN(num) ? 0 : num;
                });
                return {
                    name: entityName ? String(entityName) : 'Unknown', // Ensure name is string
                    data: values
                };
            });

            if (indicators.length === 0) {
                indicators = [{ name: 'No Metrics', max: 100 }];
            }
        }

        let graphNodes = [];
        let graphLinks = [];
        let graphCategories = [];

        if (this.currentChartType === 'graph' || this.currentChartType === 'circularGraph' || this.currentChartType === 'sankey' || this.currentChartType === 'chord') {
            // Auto-detect Source and Target fields
            if (this.results.length > 0) {
                const keys = Object.keys(this.results[0]);
                const sourceKey = keys.find(k => k.toLowerCase() === 'source');
                const targetKey = keys.find(k => k.toLowerCase() === 'target');
                const valueKey = keys.find(k => k.toLowerCase() === 'value'); // Optional

                if (sourceKey && targetKey) {
                    const nodesSet = new Set();
                    this.results.forEach(r => {
                        const source = r[sourceKey];
                        const target = r[targetKey];
                        const val = valueKey ? parseFloat(r[valueKey]) : 1;

                        if (source && target) {
                            nodesSet.add(source);
                            nodesSet.add(target);

                            graphLinks.push({
                                source: source,
                                target: target,
                                value: isNaN(val) ? 1 : val
                            });
                        }
                    });

                    // Create Nodes
                    graphNodes = Array.from(nodesSet).map(name => ({
                        name: name,
                        id: name,
                        symbolSize: 20,
                        value: 1,
                        category: 0
                    }));

                    // Calculate node degree for size
                    const degrees = {};
                    graphLinks.forEach(l => {
                        degrees[l.source] = (degrees[l.source] || 0) + 1;
                        degrees[l.target] = (degrees[l.target] || 0) + 1;
                    });

                    graphNodes.forEach(n => {
                        n.symbolSize = 10 + (degrees[n.name] || 0) * 2;
                        n.value = degrees[n.name] || 0;
                    });

                    graphCategories = [{ name: 'Node' }];
                    this.chartConfig.graphCategories = graphCategories;
                }
            }
        }

        // Gauge / Speed Gauge Logic (Reusing Number Config)
        if (['gauge', 'gaugeSpeed'].includes(this.currentChartType)) {
            const aggrType = document.getElementById('numberAggregation') ? document.getElementById('numberAggregation').value : 'sum';
            const selectedField = document.getElementById('numberField') ? document.getElementById('numberField').value : null;
            // Default to standard "count" or first numeric field if nothing selected?
            // If dataset is simplistic [{value: 70}], and we default to sum/avg, it works.
            // If field is not selected, fallback to first active series OR first available field
            let valueKey = selectedField || (activeSeries.length > 0 ? activeSeries[0].id : null);

            if (!valueKey) {
                const available = this.getAvailableFields();
                if (available.length > 0) valueKey = available[0].id;
            }

            let finalValue = 0;
            if (valueKey) {
                const values = this.results.map(r => parseFloat(r[valueKey])).filter(v => !isNaN(v));
                if (values.length > 0) {
                    switch (aggrType) {
                        case 'sum': finalValue = values.reduce((a, b) => a + b, 0); break;
                        case 'avg': finalValue = values.reduce((a, b) => a + b, 0) / values.length; break;
                        case 'min': finalValue = Math.min(...values); break;
                        case 'max': finalValue = Math.max(...values); break;
                        case 'count': finalValue = this.results.length; break;
                        default: finalValue = values.reduce((a, b) => a + b, 0);
                    }
                } else if (aggrType === 'count') {
                    finalValue = this.results.length;
                }
            } else if (aggrType === 'count') {
                finalValue = this.results.length;
            }

            const customLabel = document.getElementById('numberLabel') ? document.getElementById('numberLabel').value : null;

            seriesData = [{
                data: [finalValue],
                name: customLabel || selectedField || 'Value'
            }];
        }

        if (this.currentChartType === 'number') {
            const aggrType = document.getElementById('numberAggregation') ? document.getElementById('numberAggregation').value : 'sum';
            // Prefer selected field, fallback to first active series
            const selectedField = document.getElementById('numberField') ? document.getElementById('numberField').value : null;
            const valueKey = selectedField || (activeSeries.length > 0 ? activeSeries[0].id : null);

            if (valueKey) {
                const values = this.results.map(r => parseFloat(r[valueKey])).filter(v => !isNaN(v));
                let finalValue = 0;

                if (values.length > 0) {
                    switch (aggrType) {
                        case 'sum': finalValue = values.reduce((a, b) => a + b, 0); break;
                        case 'avg': finalValue = values.reduce((a, b) => a + b, 0) / values.length; break;
                        case 'min': finalValue = Math.min(...values); break;
                        case 'max': finalValue = Math.max(...values); break;
                        case 'count': finalValue = this.results.length; break;
                        default: finalValue = values.reduce((a, b) => a + b, 0);
                    }
                } else if (aggrType === 'count') {
                    finalValue = this.results.length;
                }

                seriesData = [{
                    data: [finalValue],
                    name: aggrType.toUpperCase()
                }];
            }
        }

        if (this.currentChartType === 'candlestick') {
            const openField = document.getElementById('candleOpen')?.value;
            const closeField = document.getElementById('candleClose')?.value;
            const lowField = document.getElementById('candleLow')?.value;
            const highField = document.getElementById('candleHigh')?.value;

            if (openField && closeField && lowField && highField) {
                // ECharts Candlestick data: [open, close, lowest, highest]
                const candleData = this.results.map(r => [
                    parseFloat(r[openField]),
                    parseFloat(r[closeField]),
                    parseFloat(r[lowField]),
                    parseFloat(r[highField])
                ]);

                const candleName = document.getElementById('candleName')?.value || 'Price';

                seriesData = [{
                    type: 'candlestick',
                    name: candleName,
                    data: candleData
                }];
            }
        }


        if (this.currentChartType === 'calendar') {
            // Auto-detect Date and Value fields if not explicitly provided
            let dateKey = xAxisField;
            let valueKey = activeSeries.length > 0 ? activeSeries[0].id : null;

            // If UI is hidden, dateKey would be null, so auto-detect
            if (!dateKey || !valueKey) {
                if (this.results.length > 0) {
                    const keys = Object.keys(this.results[0]);
                    dateKey = keys.find(k => /date|time/i.test(k));
                    valueKey = keys.find(k => /value|count|total/i.test(k));
                }
            }

            if (dateKey && valueKey) {
                const calendarData = this.results.map(r => {
                    const dateVal = r[dateKey];
                    const numVal = parseFloat(r[valueKey]);
                    if (dateVal && !isNaN(numVal)) {
                        // Ensure date string is YYYY-MM-DD
                        return [
                            dateVal,
                            numVal
                        ];
                    }
                    return null;
                }).filter(valid => valid);

                seriesData = [{
                    name: 'Activity',
                    data: calendarData
                }];
            }
        }


        let treeData = { data: {} };
        let sunburstData = { children: [] };

        if (['tree', 'radialTree', 'treemap', 'sunburst'].includes(this.currentChartType)) {
            // Expecting hierarchical data.
            if (this.results.length > 0) {
                const root = this.results[0];
                if (this.currentChartType === 'sunburst') {
                    sunburstData = root;
                } else {
                    treeData.data = root;
                }
            }
        }


        // Matrix Data Preparation
        let matrixData = [];
        let matrixX = [];
        let matrixY = [];

        if (this.currentChartType === 'matrix') {
            const xField = document.getElementById('matrixXAxis')?.value;
            const yField = document.getElementById('matrixYAxis')?.value;
            const valField = document.getElementById('matrixValue')?.value;

            if (xField && yField && valField) {
                // Get unique X and Y categories
                matrixX = [...new Set(this.results.map(r => r[xField]))].sort();
                matrixY = [...new Set(this.results.map(r => r[yField]))].sort();

                // Map data to [xIndex, yIndex, value]
                matrixData = this.results.map(r => {
                    const xIdx = matrixX.indexOf(r[xField]);
                    const yIdx = matrixY.indexOf(r[yField]);
                    const val = parseFloat(r[valField]) || 0;
                    if (xIdx >= 0 && yIdx >= 0) {
                        return [xIdx, yIdx, val];
                    }
                    return null;
                }).filter(d => d !== null);
            }
        }

        // Build config object for ChartConfig
        const config = {
            ...this.chartConfig,
            xAxisData,
            series: seriesData,
            palette: this.palette,
            animation: this.chartConfig.enableAnimations,
            visualMin,
            visualMax,
            mapColorData,
            indicators,
            graphNodes,
            graphLinks,
            graphCategories,
            sankeyNodes: graphNodes,
            sankeyLinks: graphLinks,
            chordNodes: graphNodes,
            chordLinks: graphLinks,
            treeData: treeData,
            sunburstData: sunburstData,

            // Gauge Parameters
            gaugeMin: parseFloat(document.getElementById('gaugeMin')?.value || 0),
            gaugeMax: parseFloat(document.getElementById('gaugeMax')?.value || 180),
            gaugeStartAngle: parseFloat(document.getElementById('gaugeStartAngle')?.value || 180),
            gaugeEndAngle: parseFloat(document.getElementById('gaugeEndAngle')?.value || 0),
            gaugeSplitNumber: parseFloat(document.getElementById('gaugeSplitNumber')?.value || 10),
            // Matrix Data
            matrixData,
            matrixX,
            matrixY,
            calendarLegendPosition: document.getElementById('calendarLegendPosition') ? document.getElementById('calendarLegendPosition').value : 'bottom'
        };



        // Render Logic
        const container = document.getElementById('queryChartContainer');

        if (this.currentChartType === 'number') {
            // Dispose ECharts if exists
            if (this.chart) {
                this.chart.dispose();
                this.chart = null;
            }

            // Render HTML
            const val = seriesData[0]?.data[0] || 0;
            // Prefer UI format selection, fallback to compact
            const fmt = document.getElementById('numberFormatSelect') ? document.getElementById('numberFormatSelect').value : 'compact';
            const displayVal = Utils.formatNumber(val, fmt);

            // Allow Custom Label vs Auto-Generated
            const customLabel = document.getElementById('numberLabel') ? document.getElementById('numberLabel').value : '';
            const label = customLabel || (seriesData[0]?.name || 'Value');

            const color = Utils.getColor(0, this.palette);

            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                    <div style="font-size: 72px; font-weight: bold; color: ${color}; line-height: 1;">${displayVal}</div>
                    <div style="font-size: 24px; color: #888; margin-top: 10px;">${label}</div>
                </div>
            `;
            return; // Skip ECharts
        }

        // Initialize ECharts if needed
        if (!this.chart) {
            if (container && typeof echarts !== 'undefined') {
                this.chart = echarts.init(container);
            }
        }

        // Ensure container is empty of previous HTML if switching back from Number
        if (container && this.currentChartType !== 'number') {
            // If we just initialized echarts, it's fine. 
            // If we already had it, resizing might be needed, but usually dispose/init handles cleanup.
        }

        // Generate ECharts options
        const options = ChartConfig.buildChartOptions(this.currentChartType, config);
        this.chart.setOption(options, true);
    }

    // --- Chart Type Selection ---

    openChartTypeModal() {
        this.populateChartTypeGrid();
        document.getElementById('chartTypeModal').classList.add('active');
    }

    closeChartTypeModal() {
        document.getElementById('chartTypeModal').classList.remove('active');
    }

    populateChartTypeGrid() {
        const grid = document.getElementById('chartTypeGrid');
        if (!grid) return;

        const categories = ChartConfig.getChartTypesByCategory();
        let html = '';

        Object.entries(categories).forEach(([category, types]) => {
            html += `
                <div class="chart-category">
                    <span class="chart-category-label">${category}</span>
                </div>
            `;
            types.forEach(type => {
                html += `
                    <div class="chart-type-item ${type.id === this.currentChartType ? 'active' : ''}" data-type="${type.id}">
                        <div class="chart-type-icon">
                            ${Utils.getChartIcon(type.icon)}
                        </div>
                        <span class="chart-type-name">${type.name}</span>
                    </div>
                `;
            });
        });

        grid.innerHTML = html;

        // Bind click events
        grid.querySelectorAll('.chart-type-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                this.selectChartType(type);
            });
        });
    }

    selectChartType(type) {
        this.currentChartType = type;
        this.updateSidebarVisibility(type);
        this.updateChartTypeButton(type);
        this.updateChart();
        this.closeChartTypeModal();
    }

    updateChartTypeButton(typeId) {
        const btn = document.getElementById('chartTypeSelector');
        if (!btn) return;

        const type = ChartConfig.getChartType(typeId);
        if (!type) return;

        const iconContainer = btn.querySelector('.chart-icon');
        const nameSpan = btn.querySelector('.chart-name');

        if (iconContainer) iconContainer.innerHTML = Utils.getChartIcon(type.icon);
        if (nameSpan) nameSpan.textContent = type.name;
    }

    updateSidebarVisibility(chartType) {
        // Map chart types to categories (reuse logic from app.js)
        const chartCategories = {
            bar: ['axis'], line: ['axis'], area: ['axis'], row: ['axis'],
            combo: ['axis'], scatter: ['axis'], candlestick: ['candlestick'],
            pie: ['pie'], donut: ['donut'], funnel: ['funnel'],
            halfDonut: ['halfDonut'], nightingale: ['nightingale'],
            treemap: ['hierarchy'], sunburst: ['hierarchy'],
            tree: ['hierarchy'], radialTree: ['hierarchy'],
            sankey: ['network'], chord: ['network'],
            graph: ['network'], circularGraph: ['network'],
            gauge: ['kpi'], number: ['kpi'],
            geomap: ['geo'], geomapPie: ['geo'], radar: ['radar'],
            calendar: ['calendar'], matrix: ['matrix'] // Dedicated matrix config
        };

        const categories = chartCategories[chartType] || ['axis'];
        const matchTerms = [...categories, chartType];

        // Show/hide config sections
        document.querySelectorAll('.config-section[data-for]').forEach(section => {
            const forTypes = section.dataset.for.split(',').map(t => t.trim());
            const shouldShow = forTypes.some(t => matchTerms.includes(t));

            // Debug Log
            // console.log(`Section [${forTypes}] vs [${matchTerms}] => ${shouldShow}`);

            section.style.display = shouldShow ? '' : 'none';
        });

        // Extra safety: Explicitly hide Zoom for Matrix
        const zoomSection = document.getElementById('configSectionZoom');
        if (zoomSection) {
            if (chartType === 'matrix') {
                zoomSection.style.setProperty('display', 'none', 'important');
            } else if (matchTerms.includes('axis')) {
                // Ensure it is shown for axis types if not explicitly hidden by loop
                // But loop logic handles it. Just ensuring we don't accidentally hide it for others
            }
        }

        // Show/hide Axes tab
        const axesTab = document.querySelector('[data-tab="axes"]');
        if (axesTab) {
            axesTab.style.display = categories.includes('axis') ? '' : 'none';
            if (!categories.includes('axis') && axesTab.classList.contains('active')) {
                document.querySelector('[data-tab="data"]')?.click();
            }
        }

        // Show/Hide Enable Zoom specifically
        const zoomContainer = document.getElementById('showDataZoom')?.closest('.config-section');
        if (zoomContainer) {
            const noZoomCharts = ['pie', 'donut', 'halfDonut', 'nightingale', 'funnel', 'radar', 'gauge', 'gaugeSpeed', 'number', 'treemap', 'sunburst', 'sankey', 'chord', 'graph', 'circularGraph', 'calendar'];
            zoomContainer.style.display = noZoomCharts.includes(chartType) ? 'none' : '';
        }
    }

    switchView(view) {
        document.querySelectorAll('.results-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });
        document.querySelectorAll('.results-view').forEach(v => {
            v.classList.toggle('active', v.id === `${view}View`);
        });

        // Toggle Sidebars
        const querySidebar = document.getElementById('query-config');
        const vizSidebar = document.getElementById('viz-config');

        if (view === 'chart') {
            querySidebar.style.display = 'none';
            vizSidebar.style.display = 'block';

            const actions = document.getElementById('chartToolbarActions');
            if (actions) actions.style.display = 'flex';

            this.updateVizConfig();

            setTimeout(() => {
                if (this.chart) this.chart.resize();
                this.updateChart();
            }, 100);
        } else if (view === 'json') {
            // JSON View: keep query config visible, hide viz
            querySidebar.style.display = 'block';
            vizSidebar.style.display = 'none';

            const actions = document.getElementById('chartToolbarActions');
            if (actions) actions.style.display = 'none';

            this.renderJson();
        } else {
            // Table View
            querySidebar.style.display = 'block';
            vizSidebar.style.display = 'none';

            const actions = document.getElementById('chartToolbarActions');
            if (actions) actions.style.display = 'none';
        }
    }

    switchConfigTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
    }

    updateVizConfig() {
        if (this.results.length === 0) return;

        // Get columns from results
        const columns = Object.keys(this.results[0]);
        const stringCols = columns.filter(c => typeof this.results[0][c] === 'string');
        const numericCols = columns.filter(c => typeof this.results[0][c] === 'number');

        // Populate X-Axis Select
        const xAxisSelect = document.getElementById('xAxisField');
        const currentX = this.chartConfig.xAxisField;

        xAxisSelect.innerHTML = columns.map(col => `
            <option value="${col}" ${col === currentX ? 'selected' : ''}>${col}</option>
        `).join('');

        // If no X-axis selected or invalid, select first string col or first col
        // If no X-axis selected or invalid, select first string col or first col
        if (!currentX || !columns.includes(currentX)) {
            const defaultX = stringCols.length > 0 ? stringCols[0] : columns[0];
            this.chartConfig.xAxisField = defaultX;
            xAxisSelect.value = defaultX;
        }

        // Populate Value Field (for GeoMap, etc.)
        const valueFieldSelect = document.getElementById('geoValueField');
        if (valueFieldSelect) {
            const currentValue = this.chartConfig.valueField;
            valueFieldSelect.innerHTML = numericCols.map(col => `
                <option value="${col}" ${col === currentValue ? 'selected' : ''}>${col}</option>
            `).join('');

            // Set default if empty
            if (!currentValue && numericCols.length > 0) {
                this.chartConfig.valueField = numericCols[0];
                valueFieldSelect.value = numericCols[0];
            }
        }

        // Initialize series if empty
        // Default series initialization removed per user request
        // Users must adds series manually.

        this.populateSeriesList();
        this.updateSidebarVisibility(this.currentChartType);
    }

    populateSeriesList() {
        const container = document.getElementById('seriesList');
        if (!container) return;

        // Limit series for Pie/Donut/Nightingale to 1
        const addBtn = document.getElementById('addSeriesBtn');
        if (addBtn) {
            const singleSeriesCharts = ['pie', 'donut', 'halfDonut', 'nightingale', 'funnel'];
            if (singleSeriesCharts.includes(this.currentChartType) && this.chartConfig.series.length >= 1) {
                addBtn.style.display = 'none';
            } else {
                addBtn.style.display = 'flex';
            }
        }

        container.innerHTML = ''; // Clear existing

        this.chartConfig.series.forEach((s) => {
            const item = document.createElement('div');
            item.className = 'series-item';
            item.dataset.id = s.id;
            item.innerHTML = `
                <span class="series-color" style="background: ${s.color}" title="Click to change color"></span>
                <span class="series-name">${s.name}</span>
                <label class="toggle series-toggle">
                    <input type="checkbox" ${s.visible ? 'checked' : ''} data-series="${s.id}">
                    <span class="toggle-slider"></span>
                </label>
                <div class="series-actions">
                    <button class="btn-icon rename-btn" title="Rename Series">
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon remove-btn" title="Remove Series">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });

        // Re-bind Toggle Events (Moved from outside map)
        container.querySelectorAll('.series-toggle input').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const seriesId = e.target.dataset.series;
                const series = this.chartConfig.series.find(s => s.id === seriesId);
                if (series) {
                    series.visible = e.target.checked;
                    this.updateChart();
                }
            });
        });

        // Bind rename events
        container.querySelectorAll('.rename-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.series-item');
                const seriesId = item.dataset.id;
                const series = this.chartConfig.series.find(s => s.id === seriesId);

                if (series) {
                    const newName = prompt('Enter new name for series:', series.name);
                    if (newName !== null && newName.trim() !== '') {
                        series.name = newName.trim();
                        this.populateSeriesList();
                        this.updateChart();
                    }
                }
            });
        });

        // Bind series remove events
        container.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const seriesId = e.target.closest('.series-item').dataset.id; // Correct selector
                this.removeSeries(seriesId);
            });
        });

        // Bind color picker
        container.querySelectorAll('.series-color').forEach(colorBtn => {
            colorBtn.addEventListener('click', (e) => {
                const seriesItem = e.target.closest('.series-item');
                const seriesId = seriesItem.dataset.id;
                this.openColorPicker(e.target, seriesId);
            });
        });
    }

    updateSeriesColors() {
        this.chartConfig.series.forEach((s, index) => {
            s.color = Utils.getColor(index, this.palette);
        });
        this.populateSeriesList();
    }

    openColorPicker(target, seriesId) {
        // Remove existing color picker
        document.querySelectorAll('.color-picker-popup').forEach(p => p.remove());

        const picker = document.createElement('div');
        picker.className = 'color-picker-popup active';
        picker.innerHTML = `
            <div class="color-picker-grid">
                ${Utils.getPalette(this.palette).map(color => `
                    <div class="color-picker-option" style="background: ${color}" data-color="${color}"></div>
                `).join('')}
            </div>
        `;

        target.style.position = 'relative';
        target.appendChild(picker);

        picker.querySelectorAll('.color-picker-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                const series = this.chartConfig.series.find(s => s.id === seriesId);
                if (series) {
                    series.color = color;
                    target.style.background = color;
                    this.updateChart();
                }
                picker.remove();
            });
        });

        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', function closeHandler(e) {
                if (!picker.contains(e.target) && e.target !== target) {
                    picker.remove();
                    document.removeEventListener('click', closeHandler);
                }
            });
        }, 10);
    }

    removeSeries(seriesId) {
        this.chartConfig.series = this.chartConfig.series.filter(s => s.id !== seriesId);
        this.populateSeriesList();
        this.updateChart();
    }

    openAddSeriesModal() {
        const modal = document.getElementById('addSeriesModal');
        const select = document.getElementById('newSeriesField');

        if (this.results.length === 0) return;

        const columns = Object.keys(this.results[0]);
        const numericCols = columns.filter(c => typeof this.results[0][c] === 'number');

        // Get available fields not already in series
        const usedIds = this.chartConfig.series.map(s => s.id);
        const available = numericCols.filter(f => !usedIds.includes(f));

        if (available.length === 0) {
            select.innerHTML = '<option disabled>No more numeric fields available</option>';
        } else {
            const placeholder = '<option value="" disabled selected>Select a field...</option>';
            select.innerHTML = placeholder + available.map(f => `
                <option value="${f}">${f}</option>
            `).join('');
        }

        modal.classList.add('active');
    }

    closeAddSeriesModal() {
        document.getElementById('addSeriesModal')?.classList.remove('active');
    }

    confirmAddSeries() {
        const select = document.getElementById('newSeriesField');
        const field = select.value;

        if (!field) {
            alert('Please select a field to add.');
            return;
        }

        this.addSeries(field);
        this.closeAddSeriesModal();
    }

    addSeries(fieldId) {
        if (!fieldId) return;

        const newIndex = this.chartConfig.series.length;
        this.chartConfig.series.push({
            id: fieldId,
            name: fieldId,
            color: Utils.getColor(newIndex, this.palette),
            visible: true
        });

        this.populateSeriesList();
        this.updateChart();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const userSession = localStorage.getItem('microbase_user');
    if (!userSession) {
        window.location.href = 'index.html';
        return;
    }
    document.body.style.display = 'block';

    window.queryBuilder = new QueryBuilder();
});
