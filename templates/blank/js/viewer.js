/**
 * Dashboard Viewer Application
 * Handles read-only rendering of dashboards with optional PIN protection.
 */
class DashboardViewer {
    constructor() {
        const urlParams = new URLSearchParams(window.location.search);
        this.layoutId = urlParams.get('id');
        this.layoutsMap = {};
        this.savedCharts = []; // Cache for charts
        this.currentLayout = null;

        this.init();
    }

    async init() {
        if (!this.layoutId) {
            this.showError('No Dashboard ID provided.');
            return;
        }

        try {
            // Load Data from API
            const [dashboards, charts] = await Promise.all([
                API.getDashboards(),
                API.getSavedCharts()
            ]);

            this.layoutsMap = dashboards;
            this.savedCharts = charts;

            // Load Layout
            let data = this.layoutsMap[this.layoutId];

            if (!data) {
                // Legacy fallback support for viewer? Maybe not needed if backend is truth.
                // But if user just migrated, maybe. Let's keep it simple: API is truth.
                this.showError('Dashboard not found.');
                return;
            }

            this.currentLayout = data;

            // Load Map Dependencies
            await this.loadIndonesiaMap();

            this.checkAccess();

        } catch (e) {
            console.error('Failed to init viewer:', e);
            this.showError('Failed to load dashboard data.');
        }
    }

    loadIndonesiaMap() {
        return fetch('https://code.highcharts.com/mapdata/countries/id/id-all.geo.json')
            .then(response => response.json())
            .then(geoJSON => {
                echarts.registerMap('indonesia', geoJSON);
            })
            .catch(err => console.warn('Map load error', err));
    }

    checkAccess() {
        document.getElementById('loadingState').style.display = 'none';

        const settings = this.currentLayout.publishSettings || { isPublic: false, pin: '' };

        // If not public (and we are in viewer), maybe strict deny? 
        // Or assume viewer assumes valid link possession.
        // Let's implement: If PIN is set, require it.

        if (settings.pin && settings.pin.trim() !== '') {
            this.showPinScreen();
        } else {
            this.renderDashboard();
        }
    }

    showPinScreen() {
        const overlay = document.getElementById('pinOverlay');
        const input = document.getElementById('pinInput');
        const btn = document.getElementById('submitPinBtn');
        const error = document.getElementById('pinError');

        overlay.style.display = 'flex';
        input.focus();

        const verify = () => {
            if (input.value === this.currentLayout.publishSettings.pin) {
                overlay.style.display = 'none';
                this.renderDashboard();
            } else {
                error.style.display = 'block';
                input.value = '';
                input.focus();
            }
        };

        btn.onclick = verify;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') verify();
        };
    }

    showError(msg) {
        document.getElementById('loadingState').textContent = msg;
        document.getElementById('loadingState').style.color = '#ef4444';
    }

    renderDashboard() {
        const container = document.getElementById('viewerContent');
        container.style.display = 'block';

        const data = this.currentLayout;
        document.getElementById('pageTitle').textContent = data.title || 'Untitled Dashboard';
        if (data.lastModified) {
            document.getElementById('lastUpdated').textContent = 'Updated ' + new Date(data.lastModified).toLocaleDateString();
        }

        const root = document.getElementById('dropZoneRoot');
        root.innerHTML = '';

        let layout = [];
        if (Array.isArray(data)) layout = data;
        else if (data.layout) layout = data.layout;

        layout.forEach(rowData => {
            const row = document.createElement('div');
            row.className = 'builder-row';
            if (rowData.style) row.style.cssText = rowData.style;
            row.style.border = 'none'; // Viewer style override

            if (rowData.columns) {
                rowData.columns.forEach(colData => {
                    const col = document.createElement('div');
                    col.className = 'builder-column';
                    col.style.border = 'none'; // Viewer style

                    if (colData.style) col.style.cssText = colData.style;
                    else col.style.flex = '1';

                    // Render Components
                    if (colData.components) {
                        colData.components.forEach(comp => this.renderComponent(col, comp));
                    }

                    row.appendChild(col);
                });
            }
            root.appendChild(row);
        });
    }

    async renderComponent(container, compData) {
        const wrapper = document.createElement('div');
        wrapper.className = 'rendered-component';
        wrapper.style.border = 'none'; // Viewer style
        if (compData.style) wrapper.style.cssText = compData.style;

        // Fix: Append immediately to preserve order, then populate async
        container.appendChild(wrapper);

        const content = document.createElement('div');
        content.className = 'component-content';
        if (compData.innerStyle) content.style.cssText = compData.innerStyle;
        wrapper.appendChild(content);

        // Type specific rendering
        if (compData.type === 'chart') {
            await this.renderChart(content, compData.chartId);
        } else if (compData.type === 'text') {
            const textEl = document.createElement('div');
            if (compData.content) textEl.innerHTML = compData.content;
            if (compData.textStyle) textEl.style.cssText = compData.textStyle;
            content.appendChild(textEl);
        } else if (compData.type === 'button') {
            const btn = document.createElement('a');
            if (compData.content) btn.textContent = compData.content;
            if (compData.href) btn.href = compData.href;
            if (compData.btnStyle) btn.style.cssText = compData.btnStyle;

            // Allow clicking in viewer
            // btn.addEventListener('click', ... default behavior is fine)
            content.appendChild(btn);
        } else if (compData.type === 'combobox') {
            const select = document.createElement('select');
            select.className = 'combobox-select';
            if (compData.selectStyle) select.style.cssText = compData.selectStyle;

            // Default styling if missing
            if (!select.style.width) select.style.width = '100%';
            if (!select.style.padding) select.style.padding = '8px 12px';
            if (!select.style.borderRadius) select.style.borderRadius = '4px';
            if (!select.style.border) select.style.border = '1px solid #e2e8f0';
            if (!select.style.outline) select.style.outline = 'none';

            const options = compData.options || [];

            // Add placeholder
            const placeholder = document.createElement('option');
            placeholder.text = 'Select an option...';
            placeholder.value = '';
            placeholder.disabled = true;
            placeholder.selected = true;
            select.appendChild(placeholder);

            if (options.length > 0) {
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.text = opt.label;
                    option.value = opt.url;
                    select.appendChild(option);
                });

                select.addEventListener('change', (e) => {
                    const url = e.target.value;
                    if (url && url !== '#' && url !== '') {
                        window.location.href = url;
                    }
                });
            }

            content.appendChild(select);
        } else if (compData.type === 'line') {
            const hr = document.createElement('hr');
            hr.style.margin = '0';
            hr.style.width = '100%';
            hr.style.border = 'none';
            hr.style.borderTop = '1px solid #cbd5e1'; // Default
            if (compData.lineStyle) hr.style.cssText = compData.lineStyle;
            content.appendChild(hr);
        }
    }

    async renderChart(container, chartId) {
        if (!chartId) return;

        // Load config from cache
        let chartData = this.savedCharts.find(c => c.id === chartId);

        if (!chartData) {
            container.innerHTML = '<div style="color:#ef4444">Chart not found</div>';
            return;
        }

        const chartDiv = document.createElement('div');
        chartDiv.className = 'chart-wrapper';
        chartDiv.style.width = '100%';
        chartDiv.style.height = '100%';
        container.appendChild(chartDiv);

        try {
            // Use the exact same logic as UIBuilder
            const { chartType, config, dataset, palette, queryState } = chartData;

            // For GeoMap charts, load the required map first
            if (['geomap', 'geomapPie'].includes(chartType)) {
                const mapRegion = config.mapRegion || 'indonesia';
                const mapLoaded = await this.loadMapForRegion(mapRegion);
                if (!mapLoaded) {
                    container.innerHTML = `<div style="color: #f59e0b; font-size: 11px; padding: 10px;">GeoMap requires "${mapRegion}" map data which could not be loaded.</div>`;
                    return;
                }
            }

            // Data Fetch
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
                container.innerHTML = '<div style="color: #94a3b8; font-size: 11px;">No data</div>';
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
            } else if (chartType === 'radar') {
                xAxisData = data.map(row => row[config.xAxisField]);
                const activeSeries = config.series.filter(s => s.visible);

                indicators = activeSeries.map(s => {
                    const values = data.map(r => r[s.id]).filter(v => typeof v === 'number');
                    const max = values.length > 0 ? Math.max(...values) : 100;
                    return { name: s.name, max: Math.ceil(max * 1.1) };
                });

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
            } else if (chartType === 'candlestick') {
                xAxisData = data.map(row => row[config.xAxisField]);
                let activeSeries = config.series ? config.series.filter(s => s.visible) : [];

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
                    }
                }

                for (let i = 0; i < activeSeries.length; i += 4) {
                    const group = activeSeries.slice(i, i + 4);
                    if (group.length < 4) break;

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
            } else if (['graph', 'circularGraph', 'sankey', 'chord'].includes(chartType)) {
                if (data.length > 0) {
                    const fields = Object.keys(data[0]);
                    const sourceField = fields.find(f => /source/i.test(f));
                    const targetField = fields.find(f => /target/i.test(f));
                    const valueField = fields.find(f => /value/i.test(f));

                    if (sourceField && targetField) {
                        const nodesSet = new Set();
                        const linksArray = [];

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

                        const degrees = {};
                        linksArray.forEach(l => {
                            degrees[l.source] = (degrees[l.source] || 0) + 1;
                            degrees[l.target] = (degrees[l.target] || 0) + 1;
                        });

                        graphNodes = Array.from(nodesSet).map((name) => ({
                            name,
                            id: name,
                            category: 0,
                            value: degrees[name] || 0,
                            symbolSize: 10 + (degrees[name] || 0) * 2
                        }));
                        graphLinks = linksArray;

                        if (config.graphCategories && config.graphCategories.length > 0) {
                            graphCategories = config.graphCategories;
                        } else {
                            graphCategories = [{ name: 'Node' }];
                        }

                        sankeyNodes = graphNodes;
                        sankeyLinks = linksArray;
                        chordNodes = graphNodes;
                        chordLinks = linksArray;
                    }
                }
            } else if (['tree', 'radialTree', 'sunburst', 'treemap'].includes(chartType)) {
                if (rawData && typeof rawData === 'object') {
                    if (rawData.name || rawData.children) {
                        if (chartType === 'sunburst') {
                            sunburstData = rawData;
                        } else {
                            treeData = { data: rawData };
                        }
                    } else if (data.length > 0 && data[0].name) {
                        if (chartType === 'sunburst') {
                            sunburstData = data[0];
                        } else {
                            treeData = { data: data[0] };
                        }
                    }
                }
            } else if (['geomap', 'geomapPie'].includes(chartType)) {
                if (data.length > 0) {
                    xAxisData = data.map(row => row[config.xAxisField]);
                    let valueField = null;
                    if (config.series && config.series.length > 0) {
                        valueField = config.series[0].id;
                    } else {
                        const fields = Object.keys(data[0]);
                        valueField = fields.find(k => typeof data[0][k] === 'number');
                    }

                    if (valueField) {
                        const mapData = data.map(row => ({
                            name: row[config.xAxisField],
                            value: row[valueField]
                        }));

                        seriesData.push({
                            name: valueField,
                            type: 'map',
                            map: config.mapRegion || 'indonesia',
                            data: mapData
                        });
                    }
                }
            } else if (['gauge', 'gaugeSpeed', 'number'].includes(chartType)) {
                if (data.length > 0) {
                    const valueField = config.valueField ||
                        Object.keys(data[0]).find(k => typeof data[0][k] === 'number');

                    if (valueField) {
                        const value = data[data.length - 1][valueField];
                        seriesData = [{
                            name: valueField,
                            data: [value],
                            visible: true
                        }];
                    }
                }
            } else if (specialChartTypes.includes(chartType)) {
                // Pass through
            } else {
                xAxisData = data.map(row => row[config.xAxisField]);
                const pieChartTypes = ['pie', 'donut', 'halfDonut', 'nightingale', 'treemap', 'sunburst', 'funnel'];

                if (pieChartTypes.includes(chartType)) {
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
                } else {
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

            const buildConfig = {
                ...config,
                xAxisData,
                series: seriesData.length > 0 ? seriesData : config.series,
                palette: palette || config.palette || 'default',
                animation: true,
                matrixX, matrixY, matrixData,
                indicators,
                graphNodes, graphLinks, graphCategories, sankeyNodes, sankeyLinks, chordNodes, chordLinks,
                treeData, sunburstData,
                gaugeMin: chartData.gaugeConfig?.min ?? 0,
                gaugeMax: chartData.gaugeConfig?.max ?? 100,
                gaugeStartAngle: chartData.gaugeConfig?.startAngle ?? 180,
                gaugeEndAngle: chartData.gaugeConfig?.endAngle ?? 0,
                gaugeSplitNumber: chartData.gaugeConfig?.splitNumber ?? 10
            };

            // Main Fix: call buildChartOptions, not createChartOptions
            const options = ChartConfig.buildChartOptions(chartType, buildConfig);

            // Remove geo configuration if map isn't registered
            const mapName = options.geo?.map || 'indonesia';
            const mapRegistered = echarts.getMap(mapName);

            if (!mapRegistered) {
                if (options.geo) delete options.geo;
                if (options.series) {
                    options.series = options.series.filter(s => {
                        if (s.type === 'map' || s.map || s.geoIndex !== undefined || s.coordinateSystem === 'geo') return false;
                        return true;
                    });
                }
                if (!options.series || options.series.length === 0) {
                    container.innerHTML = '<div style="color: #f59e0b; font-size: 11px; padding: 10px;">GeoMap not available. Map data not loaded.</div>';
                    return;
                }
            }

            const chart = echarts.init(chartDiv);
            chart.setOption(options);

            new ResizeObserver(() => chart.resize()).observe(chartDiv);

        } catch (e) {
            console.error(e);
            container.innerHTML = `<div style="color:#ef4444">Error loading chart</div>`;
        }
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
                console.warn('[DashboardViewer] Unknown map region:', region);
                return false;
            }

            // Fetch and register the map
            const response = await fetch(mapEntry.path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const geoJSON = await response.json();
            echarts.registerMap(region, geoJSON);
            console.log(`[DashboardViewer] ${region} map registered from ${mapEntry.path}`);
            return true;
        } catch (err) {
            console.warn(`[DashboardViewer] Could not load ${region} map:`, err);
            return false;
        }
    }
}

// Start
new DashboardViewer();
