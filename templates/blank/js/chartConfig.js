/**
 * Microbase - Chart Configuration
 * ECharts option builders for each chart type
 */

const ChartConfig = {
    // Available chart types with metadata
    chartTypes: [
        { id: 'bar', name: 'Bar', category: 'Basic', icon: 'bar' },
        { id: 'line', name: 'Line', category: 'Basic', icon: 'line' },
        { id: 'area', name: 'Area', category: 'Basic', icon: 'area' },
        { id: 'row', name: 'Row', category: 'Basic', icon: 'row' },
        { id: 'combo', name: 'Combo', category: 'Basic', icon: 'combo' },
        { id: 'pie', name: 'Pie', category: 'Proportion', icon: 'pie' },
        { id: 'donut', name: 'Donut', category: 'Proportion', icon: 'donut' },
        { id: 'halfDonut', name: 'Half Donut', category: 'Proportion', icon: 'donut' },
        { id: 'nightingale', name: 'Nightingale', category: 'Proportion', icon: 'pie' },
        { id: 'funnel', name: 'Funnel', category: 'Proportion', icon: 'funnel' },
        { id: 'scatter', name: 'Scatter', category: 'Comparison', icon: 'scatter' },
        { id: 'radar', name: 'Radar', category: 'Comparison', icon: 'radar' },
        { id: 'candlestick', name: 'Candlestick', category: 'Financial', icon: 'candlestick' },
        { id: 'matrix', name: 'Matrix', category: 'Comparison', icon: 'matrix' },
        { id: 'calendar', name: 'Calendar', category: 'Time', icon: 'calendar' },
        { id: 'graph', name: 'Graph', category: 'Network', icon: 'graph' },
        { id: 'circularGraph', name: 'Circular Graph', category: 'Network', icon: 'circularGraph' },
        { id: 'sankey', name: 'Sankey', category: 'Flow', icon: 'sankey' },
        { id: 'chord', name: 'Chord', category: 'Flow', icon: 'chord' },
        { id: 'tree', name: 'Tree', category: 'Hierarchy', icon: 'tree' },
        { id: 'radialTree', name: 'Radial Tree', category: 'Hierarchy', icon: 'tree' },
        { id: 'treemap', name: 'Treemap', category: 'Hierarchy', icon: 'treemap' },
        { id: 'sunburst', name: 'Sunburst', category: 'Hierarchy', icon: 'sunburst' },
        { id: 'gauge', name: 'Gauge', category: 'KPI', icon: 'gauge' },
        { id: 'number', name: 'Number', category: 'KPI', icon: 'number' },
        { id: 'geomap', name: 'GeoMap', category: 'Geographic', icon: 'geomap' }
    ],

    // Get chart types grouped by category
    getChartTypesByCategory() {
        const categories = {};
        this.chartTypes.forEach(type => {
            if (!categories[type.category]) {
                categories[type.category] = [];
            }
            categories[type.category].push(type);
        });
        return categories;
    },

    // Get chart type by ID
    getChartType(id) {
        return this.chartTypes.find(t => t.id === id);
    },

    // Base options shared across all charts
    getBaseOptions(config) {
        const { animation = true, palette = 'default', title } = config;

        return {
            title: title ? {
                text: title,
                left: 'center',
                top: 5,
                textStyle: {
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#2E353B'
                }
            } : undefined,
            animation: animation,
            animationDuration: 500,
            animationEasing: 'cubicOut',
            color: Utils.getPalette(palette),
            grid: {
                top: 60,
                right: 40,
                bottom: 60,
                left: 60,
                containLabel: true
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#E0E4E8',
                borderWidth: 1,
                textStyle: {
                    color: '#2E353B',
                    fontSize: 13
                },
                padding: [12, 16],
                extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border-radius: 8px;'
            }
        };
    },

    // Build legend options
    getLegendOptions(config) {
        const { legendPosition = 'top', series = [] } = config;

        if (legendPosition === 'none') {
            return { show: false };
        }

        const positions = {
            top: { top: config.title ? 40 : 10, left: 'center', orient: 'horizontal' },
            bottom: { bottom: 10, left: 'center', orient: 'horizontal' },
            left: { left: 10, top: 'middle', orient: 'vertical' },
            right: { right: 10, top: 'middle', orient: 'vertical' }
        };

        return {
            show: true,
            ...positions[legendPosition],
            itemWidth: 16,
            itemHeight: 10,
            itemGap: 16,
            textStyle: {
                fontSize: 12,
                color: '#74838F'
            },
            icon: 'roundRect',
            data: (series.length === 1 && series[0].data && series[0].data[0]?.name)
                ? series[0].data.map(d => d.name)
                : series.map(s => s.name)
        };
    },

    // Build X-Axis options
    getXAxisOptions(config) {
        const {
            xAxisData = [],
            xAxisTitle = '',
            showGridLines = true
        } = config;

        return {
            type: 'category',
            data: xAxisData,
            name: xAxisTitle,
            nameLocation: 'middle',
            nameGap: 35,
            nameTextStyle: {
                fontSize: 12,
                fontWeight: 500,
                color: '#74838F'
            },
            axisLine: {
                lineStyle: { color: '#E0E4E8' }
            },
            axisTick: {
                lineStyle: { color: '#E0E4E8' }
            },
            axisLabel: {
                color: '#74838F',
                fontSize: 11
            },
            splitLine: {
                show: showGridLines,
                lineStyle: {
                    color: '#F0F4F8',
                    type: 'dashed'
                }
            }
        };
    },

    // Build Y-Axis options
    getYAxisOptions(config) {
        const {
            yAxisTitle = '',
            yAxisScale = 'linear',
            yAxisMin,
            yAxisMax,
            showGridLines = true,
            numberFormat = 'default'
        } = config;

        return {
            type: yAxisScale === 'log' ? 'log' : 'value',
            name: yAxisTitle,
            nameLocation: 'middle',
            nameGap: 50,
            nameTextStyle: {
                fontSize: 12,
                fontWeight: 500,
                color: '#74838F'
            },
            min: yAxisMin || null,
            max: yAxisMax || null,
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            },
            axisLabel: {
                color: '#74838F',
                fontSize: 11,
                formatter: (value) => Utils.formatAxisLabel(value, numberFormat)
            },
            splitLine: {
                show: showGridLines,
                lineStyle: {
                    color: '#F0F4F8',
                    type: 'dashed'
                }
            }
        };
    },

    // Build series for bar chart
    buildBarSeries(config) {
        const { series = [], showValues = false, stacking = 'none', palette = 'default' } = config;

        return series.map((s, index) => ({
            type: 'bar',
            name: s.name,
            data: s.data,
            stack: stacking !== 'none' ? 'total' : null,
            barMaxWidth: 40,
            barGap: '20%',
            itemStyle: {
                color: s.color || Utils.getColor(index, palette),
                borderRadius: [4, 4, 0, 0]
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.15)'
                }
            },
            label: {
                show: config.showLabels || showValues,
                position: 'top',
                fontSize: 11,
                color: '#74838F',
                formatter: (params) => {
                    const parts = [];
                    if (config.showLabels) parts.push(params.name);
                    if (showValues) parts.push(Utils.formatNumber(params.value, config.numberFormat));
                    return parts.join(': ');
                }
            },
            markPoint: config.showMinMax ? {
                data: [
                    { type: 'max', name: 'Max' },
                    { type: 'min', name: 'Min' }
                ],
                label: { color: '#fff' },
                itemStyle: { color: s.color || Utils.getColor(index, palette) }
            } : undefined
        }));
    },

    // Build series for line chart
    buildLineSeries(config) {
        const { series = [], showValues = false, stacking = 'none', palette = 'default' } = config;

        return series.map((s, index) => ({
            type: 'line',
            name: s.name,
            data: s.data,
            stack: stacking !== 'none' ? 'total' : null,
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
                width: 3,
                color: s.color || Utils.getColor(index, palette)
            },
            itemStyle: {
                color: s.color || Utils.getColor(index, palette),
                borderColor: '#fff',
                borderWidth: 2
            },
            emphasis: {
                scale: true,
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.2)'
                }
            },
            label: {
                show: config.showLabels || showValues,
                position: 'top',
                fontSize: 11,
                color: '#74838F',
                formatter: (params) => {
                    const parts = [];
                    if (config.showLabels) parts.push(params.name);
                    if (showValues) parts.push(Utils.formatNumber(params.value, config.numberFormat));
                    return parts.join(': ');
                }
            },
            markPoint: config.showMinMax ? {
                data: [
                    { type: 'max', name: 'Max' },
                    { type: 'min', name: 'Min' }
                ],
                label: { color: '#fff' },
                itemStyle: { color: s.color || Utils.getColor(index, palette) }
            } : undefined
        }));
    },

    // Build series for area chart
    buildAreaSeries(config) {
        const { series = [], showValues = false, stacking = 'none', palette = 'default' } = config;

        return series.map((s, index) => {
            const color = s.color || Utils.getColor(index, palette);
            return {
                type: 'line',
                name: s.name,
                data: s.data,
                stack: stacking !== 'none' ? 'total' : null,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: {
                    width: 2,
                    color: color
                },
                itemStyle: {
                    color: color,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: color + '40' },
                            { offset: 1, color: color + '05' }
                        ]
                    }
                },
                emphasis: {
                    scale: true
                },
                label: {
                    show: config.showLabels || showValues,
                    position: 'top',
                    fontSize: 11,
                    color: '#74838F',
                    formatter: (params) => {
                        const parts = [];
                        if (config.showLabels) parts.push(params.name);
                        if (showValues) parts.push(Utils.formatNumber(params.value, config.numberFormat));
                        return parts.join(': ');
                    }
                },
                markPoint: config.showMinMax ? {
                    data: [
                        { type: 'max', name: 'Max' },
                        { type: 'min', name: 'Min' }
                    ],
                    label: { color: '#fff' },
                    itemStyle: { color: s.color || Utils.getColor(index, palette) }
                } : undefined
            };
        });
    },

    // Build series for row (horizontal bar) chart
    buildRowSeries(config) {
        const { series = [], showValues = false, stacking = 'none', palette = 'default' } = config;

        return series.map((s, index) => ({
            type: 'bar',
            name: s.name,
            data: s.data,
            stack: stacking !== 'none' ? 'total' : null,
            barMaxWidth: 30,
            itemStyle: {
                color: s.color || Utils.getColor(index, palette),
                borderRadius: [0, 4, 4, 0]
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.15)'
                }
            },
            label: {
                show: showValues,
                position: 'right',
                fontSize: 11,
                color: '#74838F'
            },
            markPoint: config.showMinMax ? {
                data: [
                    { type: 'max', name: 'Max' },
                    { type: 'min', name: 'Min' }
                ],
                label: { color: '#fff' },
                itemStyle: { color: s.color || Utils.getColor(index, palette) }
            } : undefined
        }));
    },

    // Build series for pie chart
    buildPieSeries(config) {
        const { series = [], showValues = false, palette = 'default', isDonut = false, isHalf = false, roseType = false, xAxisData = [], labelNamePosition = 'outside', labelValuePosition = 'outside' } = config;

        // Check if we have valid pie data (array of {name, value} objects)
        let pieData = [];

        if (series.length > 0 && series[0]?.data) {
            const firstItem = series[0].data[0];

            // Check if data is already in pie format {name, value}
            if (typeof firstItem === 'object' && firstItem !== null && 'name' in firstItem && 'value' in firstItem) {
                pieData = series[0].data;
            } else if (Array.isArray(series[0].data) && typeof firstItem === 'number') {
                // Convert time-series data to pie format
                pieData = series.map((s, index) => ({
                    name: s.name,
                    value: s.data.reduce((sum, val) => sum + (val || 0), 0)
                }));
            } else {
                pieData = [];
            }
        } else if (series.length > 0) {
            pieData = series[0].data;
        }

        const radius = isDonut ? ['45%', '70%'] : ['0%', '70%'];
        const center = isHalf ? ['50%', '70%'] : ['50%', '50%'];
        const startAngle = isHalf ? 180 : 90;
        const endAngle = isHalf ? 360 : 450; // default usually 90 with no end? ECharts default is sufficient, but for half we need 180-360.

        let extraOptions = {};
        if (isHalf) {
            extraOptions = {
                startAngle: 180,
                endAngle: 360
            };
        }

        const itemStyle = {
            borderColor: '#fff',
            borderWidth: 2,
            borderRadius: isDonut ? 6 : 0
        };

        const resultSeries = [];

        // 1. Name Series (Main)
        if (config.showLabels) {
            resultSeries.push({
                type: 'pie',
                radius: radius,
                center: center,
                radius: radius,
                center: center,
                roseType: roseType,
                ...extraOptions,
                avoidLabelOverlap: true,
                itemStyle: itemStyle,
                label: {
                    show: true,
                    position: labelNamePosition,
                    formatter: '{b}', // Name only
                    fontSize: 12,
                    color: labelNamePosition === 'inside' ? '#fff' : '#74838F'
                },
                labelLine: { show: true, lineStyle: { color: '#E0E4E8' } },
                emphasis: {
                    label: { show: true, fontSize: 14, fontWeight: 'bold' },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' }
                },
                data: pieData.map((item, index) => ({
                    name: item.name,
                    value: item.value,
                    itemStyle: { color: Utils.getColor(index, palette) }
                }))
            });
        }

        // 2. Value Series (Secondary / Overlay)
        // If showValues is on, and (positions differ OR showLabels is off), we add this.
        // If positions match and both on, we could potentially merge, but sticking to 2 series is simpler logic now.
        // Actually, if we merge, we can use the old 'Name: Value' format.
        // Let's support merged if positions equal for cleaner look (single line leader).

        if (config.showLabels && showValues && labelNamePosition === labelValuePosition) {
            // OVERRIDE: single series handling both
            // Clear the one we just pushed
            resultSeries.length = 0;

            resultSeries.push({
                type: 'pie',
                radius: radius,
                center: center,
                radius: radius,
                center: center,
                roseType: roseType,
                ...extraOptions,
                avoidLabelOverlap: true,
                itemStyle: itemStyle,
                label: {
                    show: true,
                    position: labelNamePosition,
                    formatter: (params) => {
                        return params.name + ': ' + Utils.formatNumber(params.value, config.numberFormat);
                    }, // Merged
                    fontSize: 12,
                    color: labelNamePosition === 'inside' ? '#fff' : '#74838F'
                },
                labelLine: { show: true, lineStyle: { color: '#E0E4E8' } },
                emphasis: {
                    label: { show: true, fontSize: 14, fontWeight: 'bold' },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' }
                },
                data: pieData.map((item, index) => ({
                    name: item.name,
                    value: item.value,
                    itemStyle: { color: Utils.getColor(index, palette) }
                }))
            });

        } else if (showValues) {
            // Add separate Values series
            // If showLabels was OFF, this is the only series.
            // If showLabels was ON, this is the second series (so resultSeries has 2).
            // NOTE: If this is the second series, we should probably hide tooltip to prevent dupes? or keep it?

            resultSeries.push({
                type: 'pie',
                radius: radius,
                center: center,
                radius: radius,
                center: center,
                roseType: roseType,
                ...extraOptions,
                avoidLabelOverlap: true,
                itemStyle: itemStyle,
                // We must ensure colors match perfectly.
                label: {
                    show: true,
                    position: labelValuePosition,
                    formatter: (params) => {
                        return params.percent + '%'; // Percent for Pie usually preferred, or value? existing used percent.
                        // Wait, previous code used percent for showValues in pie?
                        // "if (showValues) parts.push(params.percent + '%');" -> Yes.
                    },
                    fontSize: 12,
                    color: labelValuePosition === 'inside' ? '#fff' : '#74838F'
                },
                labelLine: { show: true, lineStyle: { color: '#E0E4E8' } },
                emphasis: {
                    label: { show: true, fontSize: 14, fontWeight: 'bold' },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' }
                },
                data: pieData.map((item, index) => ({
                    name: item.name,
                    value: item.value,
                    itemStyle: { color: Utils.getColor(index, palette) }
                })),
                silent: config.showLabels // If first series exists (labels), make this one silent to avoid interference?
            });
        }

        // Fallback if both OFF?
        if (resultSeries.length === 0) {
            // Just show the pie without labels
            resultSeries.push({
                type: 'pie',
                radius: radius,
                center: center,
                radius: radius,
                center: center,
                roseType: roseType,
                ...extraOptions,
                itemStyle: itemStyle,
                label: { show: false },
                data: pieData.map((item, index) => ({
                    name: item.name,
                    value: item.value,
                    itemStyle: { color: Utils.getColor(index, palette) }
                }))
            });
        }

        return resultSeries;
    },

    // Build series for funnel chart
    buildFunnelSeries(config) {
        const { series = [], palette = 'default', showValues = true } = config;
        const funnelData = series.length > 0 ? series[0].data : [];

        return [{
            type: 'funnel',
            left: '10%',
            top: 60,
            bottom: 60,
            width: '80%',
            min: 0,
            max: 100,
            minSize: '0%',
            maxSize: '100%',
            sort: 'descending',
            gap: 2,
            label: {
                show: true,
                position: 'inside',
                formatter: showValues ? '{b}: {c}' : '{b}',
                fontSize: 12,
                color: '#fff'
            },
            emphasis: {
                label: {
                    fontSize: 14
                }
            },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 1
            },
            data: funnelData.map((item, index) => ({
                name: item.name,
                value: item.value,
                itemStyle: {
                    color: Utils.getColor(index, palette)
                }
            }))
        }];
    },

    // Build series for scatter chart
    buildScatterSeries(config) {
        const { series = [], palette = 'default' } = config;
        const scatterData = series.length > 0 ? series[0].data : [];

        return [{
            type: 'scatter',
            symbolSize: 15,
            data: scatterData,
            itemStyle: {
                color: Utils.getColor(0, palette),
                opacity: 0.7
            },
            emphasis: {
                itemStyle: {
                    opacity: 1,
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.2)'
                }
            }
        }];
    },

    // Build series for radar chart
    buildRadarSeries(config) {
        const { palette = 'default', series = [], showValues = false } = config;

        // Radar charts need specific multi-dimensional data that doesn't work with time-series
        // Assuming series[0].data is an array of objects like { name: 'Series A', value: [val1, val2, ...] }
        const radarSeries = series.map((s, index) => ({
            name: s.name,
            value: s.data,
            itemStyle: {
                color: Utils.getColor(index, palette)
            },
            lineStyle: {
                color: Utils.getColor(index, palette),
                width: 2
            },
            areaStyle: {
                color: Utils.getColor(index, palette) + '30'
            },
            label: {
                show: showValues,
                formatter: function (params) {
                    return params.value;
                }
            }
        }));

        return [{
            type: 'radar',
            symbol: 'circle',
            symbolSize: 8,
            label: {
                show: showValues,
                position: 'top',
                color: '#2E353B',
                fontSize: 11
            },
            emphasis: {
                lineStyle: {
                    width: 3
                },
                areaStyle: {
                    opacity: 0.5
                }
            },
            data: radarSeries
        }];
    },

    // Get radar legend data (separate from regular series)
    getRadarLegendData(config) {
        const { series = [] } = config;
        return series.map(s => s.name);
    },

    // Build radar options (needs special handling)
    getRadarOptions(config) {
        const { indicators = [], showLabels = true } = config;

        return {
            indicator: indicators.map(ind => ({
                name: ind.name,
                max: ind.max
            })),
            shape: 'polygon',
            splitNumber: 5,
            axisName: {
                show: showLabels,
                color: '#74838F',
                fontSize: 12
            },
            splitLine: {
                lineStyle: {
                    color: '#E0E4E8'
                }
            },
            splitArea: {
                show: true,
                areaStyle: {
                    color: ['#FFFFFF', '#F9FBFC']
                }
            },
            axisLine: {
                lineStyle: {
                    color: '#E0E4E8'
                }
            }
        };
    },

    // Build series for candlestick chart
    buildCandlestickSeries(config) {
        const { series = [], showValues = false, palette = 'default' } = config;

        return series.map((s, index) => ({
            type: 'candlestick',
            name: s.name,
            data: s.data,
            label: {
                show: showValues,
                position: 'top', // Or 'inside'
                formatter: function (param) {
                    return param.data[2];
                }
            },
            itemStyle: {
                color: Utils.getColor(index, palette),        // Dynamic Up color 
                color0: '#EF8C8C',       // Fixed Down color (or dynamic?) - usually distinct.
                // Let's stick to standard Red/Green for single, but for multi-series we might want distinct colors.
                // Actually, standard candlestick uses Red/Green per candle based on movement. 
                // Using palette color for "Up" and distinct for "Down" helps differentiate series.
                borderColor: Utils.getColor(index, palette),
                borderColor0: '#EF8C8C'
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.2)'
                }
            }
        }));
    },

    // Get candlestick X-axis data (dates)
    getCandlestickXAxisData(config) {
        const { xAxisData = [] } = config;
        return xAxisData.map(date => {
            // Return complete date as-is (e.g., "2024-01-15")
            if (typeof date === 'string') return date;
            // Format Date object as YYYY-MM-DD
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        });
    },

    // Build calendar options
    getCalendarOptions(config) {
        const { calendarYear = new Date().getFullYear() } = config;

        return {
            top: 120,
            left: 60,
            right: 40,
            cellSize: ['auto', 20],
            range: calendarYear.toString(),
            itemStyle: {
                borderWidth: 2,
                borderColor: '#fff'
            },
            yearLabel: {
                show: true,
                position: 'top',
                margin: 30,
                fontSize: 14,
                fontWeight: 'bold',
                color: '#2E353B'
            },
            monthLabel: {
                show: true,
                nameMap: 'en',
                fontSize: 11,
                color: '#74838F'
            },
            dayLabel: {
                show: true,
                firstDay: 0,
                nameMap: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
                fontSize: 10,
                color: '#74838F'
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: '#E0E4E8',
                    width: 1
                }
            }
        };
    },

    // Build series for calendar heatmap
    buildCalendarSeries(config) {
        const { palette = 'default', series = [] } = config;
        const data = series.length > 0 ? series[0].data : [];

        return [{
            type: 'heatmap',
            coordinateSystem: 'calendar',
            data: data,
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.2)'
                }
            }
        }];
    },

    // Get visual map for calendar heatmap
    getCalendarVisualMap(config) {
        const { palette = 'default', calendarLegendPosition = 'bottom' } = config;
        const baseColor = Utils.getColor(0, palette);

        return {
            show: calendarLegendPosition !== 'none',
            type: 'piecewise',
            orient: 'horizontal',
            left: 'center',
            top: calendarLegendPosition === 'top' ? 30 : 'auto',
            bottom: calendarLegendPosition === 'bottom' ? 20 : 'auto',
            pieces: [
                { min: 0, max: 2, label: 'Low', color: '#ebedf0' },
                { min: 3, max: 4, label: '', color: baseColor + '40' },
                { min: 5, max: 6, label: '', color: baseColor + '80' },
                { min: 7, max: 8, label: '', color: baseColor + 'B0' },
                { min: 9, max: 10, label: 'High', color: baseColor }
            ],
            textStyle: {
                color: '#74838F',
                fontSize: 11
            }
        };
    },

    // Build vertical calendar options (3 years side-by-side like ECharts example)


    // Build series for graph/network chart
    buildGraphSeries(config) {
        const { palette = 'default', graphNodes = [], graphLinks = [], graphCategories = [] } = config;

        // Assign colors to categories based on palette
        const categories = graphCategories.map((cat, index) => ({
            name: cat.name,
            itemStyle: {
                color: Utils.getColor(index, palette)
            }
        }));

        return [{
            type: 'graph',
            layout: 'force',
            data: graphNodes.map(node => ({
                ...node,
                label: {
                    show: true,
                    position: 'right',
                    fontSize: 12,
                    color: '#2E353B'
                }
            })),
            links: graphLinks.map(link => ({
                ...link,
                lineStyle: {
                    color: '#E0E4E8',
                    width: 2,
                    curveness: 0.1
                }
            })),
            categories: categories,
            roam: true,
            draggable: true,
            force: {
                repulsion: 300,
                gravity: 0.1,
                edgeLength: [80, 150],
                layoutAnimation: true
            },
            emphasis: {
                focus: 'adjacency',
                lineStyle: {
                    width: 4
                }
            },
            lineStyle: {
                opacity: 0.6
            },
            label: {
                show: true,
                position: 'right',
                formatter: '{b}'
            }
        }];
    },

    // Get graph legend data
    getGraphLegendData(config) {
        const { graphCategories = [] } = config;
        return graphCategories.map(cat => cat.name);
    },

    // Build series for circular graph chart
    buildCircularGraphSeries(config) {
        const { palette = 'default', graphNodes = [], graphLinks = [], graphCategories = [] } = config;

        // Assign colors to categories based on palette
        const categories = graphCategories.map((cat, index) => ({
            name: cat.name,
            itemStyle: {
                color: Utils.getColor(index, palette)
            }
        }));

        return [{
            type: 'graph',
            layout: 'circular',
            circular: {
                rotateLabel: true
            },
            data: graphNodes.map(node => ({
                ...node,
                label: {
                    show: true,
                    position: 'right',
                    fontSize: 12,
                    color: '#2E353B'
                }
            })),
            links: graphLinks.map(link => ({
                ...link,
                lineStyle: {
                    color: '#E0E4E8',
                    width: 2,
                    curveness: 0.3
                }
            })),
            categories: categories,
            roam: true,
            draggable: true,
            emphasis: {
                focus: 'adjacency',
                lineStyle: {
                    width: 4
                }
            },
            lineStyle: {
                opacity: 0.6,
                curveness: 0.3
            },
            label: {
                show: true,
                position: 'right',
                formatter: '{b}'
            }
        }];
    },

    // Build series for sankey diagram
    buildSankeySeries(config) {
        const { palette = 'default', sankeyOrient = 'horizontal', sankeyNodes = [], sankeyLinks = [] } = config;

        // Assign colors to nodes based on palette
        const nodes = sankeyNodes.map((node, index) => ({
            name: node.name,
            itemStyle: {
                color: Utils.getColor(index, palette)
            }
        }));

        // Determine orient and label position based on orientation
        const isVertical = sankeyOrient === 'vertical';
        const orient = isVertical ? 'vertical' : 'horizontal';
        const labelPosition = isVertical ? 'top' :
            (sankeyOrient === 'RL' ? 'left' : 'right');

        return [{
            type: 'sankey',
            layout: 'none',
            orient: orient,
            emphasis: {
                focus: 'adjacency'
            },
            nodeAlign: sankeyOrient === 'RL' ? 'right' : 'left',
            nodeGap: 12,
            nodeWidth: 20,
            left: isVertical ? '10%' : (sankeyOrient === 'RL' ? '15%' : '5%'),
            right: isVertical ? '10%' : (sankeyOrient === 'RL' ? '5%' : '15%'),
            top: isVertical ? '5%' : '10%',
            bottom: isVertical ? '15%' : '10%',
            data: nodes,
            links: sankeyLinks.map(link => ({
                source: sankeyOrient === 'RL' ? link.target : link.source,
                target: sankeyOrient === 'RL' ? link.source : link.target,
                value: link.value
            })),
            lineStyle: {
                color: 'gradient',
                curveness: 0.5,
                opacity: 0.4
            },
            label: {
                show: true,
                position: labelPosition,
                fontSize: 11,
                color: '#2E353B',
                rotate: isVertical ? -45 : 0
            },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 1
            }
        }];
    },

    // Build series for chord diagram (Native ECharts 6)
    buildChordSeries(config) {
        const { palette = 'default', series = [], xAxisData = [], chordNodes = [], chordLinks = [] } = config;

        let nodes = [];
        let links = [];

        if (series.length > 0 && xAxisData.length > 0) {
            const nodeNames = new Set();
            const colors = Utils.getPalette(palette);

            // Add Series nodes (Targets)
            series.forEach((s, idx) => {
                const name = s.name;
                if (!nodeNames.has(name)) {
                    nodeNames.add(name);
                    nodes.push({
                        name: name,
                        itemStyle: { color: colors[idx % colors.length] }
                    });
                }

                // Add links from X-Axis items (Sources) to Series (Targets)
                s.data.forEach((val, i) => {
                    const source = String(xAxisData[i]);
                    // Add Source node if not exists
                    if (!nodeNames.has(source)) {
                        nodeNames.add(source);
                        nodes.push({
                            name: source,
                            itemStyle: { color: '#74838F' }
                        });
                    }

                    if (val) {
                        links.push({
                            source: source,
                            target: name,
                            value: val
                        });
                    }
                });
            });
        } else if (chordNodes.length > 0 && chordLinks.length > 0) {
            const colors = Utils.getPalette(palette);
            nodes = chordNodes.map((node, i) => ({
                name: node.name,
                value: node.value,
                itemStyle: { color: colors[i % colors.length] }
            }));
            links = chordLinks.map(link => ({
                source: link.source,
                target: link.target,
                value: link.value
            }));
        }

        return [{
            type: 'chord',
            layout: 'circular',
            sort: 'ascending',
            sortSub: 'descending',
            radius: ['50%', '75%'],
            itemStyle: {
                borderWidth: 1,
                borderColor: '#ffffff',
                borderCap: 'round'
            },
            label: {
                show: true,
                color: '#2E353B',
                rotate: true
            },
            data: nodes,
            links: links,
            emphasis: {
                focus: 'adjacency',
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0,0,0,0.3)'
                }
            }
        }];
    },

    // Build series for geomap chart (Indonesia)
    buildGeomapSeries(config) {
        const { palette = 'default', series = [], mapRegion = 'indonesia' } = config;
        // Use provided data or fallback to empty
        const mapData = series.length > 0 ? series[0].data : [];
        const colors = Utils.getPalette(palette);

        return [{
            type: 'map',
            map: mapRegion,
            roam: true,
            data: mapData,
            nameProperty: 'name',
            label: {
                show: config.showLabels === true,
                color: '#333',
                fontSize: 10
            },
            itemStyle: {
                areaColor: '#cccccc',
                borderColor: '#fff',
                borderWidth: 0.5
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 12,
                    fontWeight: 'bold'
                },
                itemStyle: {
                    areaColor: colors[1],
                    shadowBlur: 10,
                    shadowColor: 'rgba(0,0,0,0.3)'
                }
            },
            select: {
                label: { show: true },
                itemStyle: { areaColor: colors[2] }
            }
        }];
    },

    // Build series for tree chart
    buildTreeSeries(config) {
        const { palette = 'default', treeOrient = 'TB', treeData = { data: {} } } = config;

        // Determine label positions based on orientation
        const isVertical = treeOrient === 'TB' || treeOrient === 'BT';
        const labelPosition = isVertical ? 'top' : 'right';
        const leavesLabelPosition = isVertical ? 'bottom' : 'left';

        return [{
            type: 'tree',
            data: [treeData.data],
            top: '5%',
            left: '10%',
            bottom: '5%',
            right: '10%',
            symbolSize: 12,
            orient: treeOrient,
            label: {
                position: labelPosition,
                verticalAlign: 'middle',
                fontSize: 11,
                color: '#2E353B',
                backgroundColor: '#fff',
                padding: [4, 8],
                borderRadius: 4
            },
            leaves: {
                label: {
                    position: leavesLabelPosition,
                    verticalAlign: 'middle'
                }
            },
            emphasis: {
                focus: 'descendant'
            },
            expandAndCollapse: true,
            initialTreeDepth: 3,
            animationDuration: 550,
            animationDurationUpdate: 750,
            lineStyle: {
                color: '#E0E4E8',
                width: 2,
                curveness: 0.5
            },
            itemStyle: {
                color: Utils.getColor(0, palette),
                borderColor: Utils.getColor(0, palette)
            }
        }];
    },

    // Build series for radial tree chart
    buildRadialTreeSeries(config) {
        const { palette = 'default', treeData = { data: {} } } = config;

        return [{
            type: 'tree',
            data: [treeData.data],
            layout: 'radial',
            symbolSize: 10,
            symbol: 'circle',
            roam: true,
            label: {
                fontSize: 10,
                color: '#2E353B'
            },
            emphasis: {
                focus: 'descendant'
            },
            expandAndCollapse: true,
            initialTreeDepth: 3,
            animationDuration: 550,
            animationDurationUpdate: 750,
            lineStyle: {
                color: '#E0E4E8',
                width: 1.5,
                curveness: 0.5
            },
            itemStyle: {
                color: Utils.getColor(0, palette),
                borderColor: Utils.getColor(0, palette)
            }
        }];
    },

    // Build series for treemap chart
    buildTreemapSeries(config) {
        const { palette = 'default', treeData = { data: {} } } = config;

        // Get palette colors for the treemap
        const colors = Utils.getPalette(palette);

        return [{
            type: 'treemap',
            data: [treeData.data],
            width: '90%',
            height: '85%',
            top: '10%',
            left: 'center',
            roam: false,
            nodeClick: 'zoomToNode',
            colorMappingBy: 'id',
            visibleMin: 300,
            breadcrumb: {
                show: true,
                left: 'center',
                top: 5,
                itemStyle: {
                    color: '#F5F7FA',
                    borderColor: '#E0E4E8',
                    borderWidth: 1,
                    shadowBlur: 0
                },
                textStyle: {
                    color: '#2E353B',
                    fontSize: 12
                }
            },
            label: {
                show: true,
                formatter: '{b}',
                fontSize: 12,
                color: '#fff',
                textShadowBlur: 3,
                textShadowColor: 'rgba(0,0,0,0.5)'
            },
            upperLabel: {
                show: true,
                height: 24,
                color: '#fff',
                fontSize: 11,
                fontWeight: 'bold',
                textShadowBlur: 3,
                textShadowColor: 'rgba(0,0,0,0.6)'
            },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 1,
                gapWidth: 1
            },
            levels: [
                {
                    // Level 0: Root level (CEO)
                    color: colors,
                    colorMappingBy: 'index',
                    itemStyle: {
                        borderColor: '#555',
                        borderWidth: 4,
                        gapWidth: 4
                    }
                },
                {
                    // Level 1: First children (CTO, CFO, CMO)
                    color: colors,
                    colorMappingBy: 'index',
                    itemStyle: {
                        borderColor: '#aaa',
                        borderWidth: 3,
                        gapWidth: 3
                    },
                    upperLabel: {
                        show: true
                    }
                },
                {
                    // Level 2: Departments
                    colorSaturation: [0.4, 0.7],
                    colorAlpha: [0.8, 1],
                    itemStyle: {
                        borderColor: '#ccc',
                        borderWidth: 2,
                        gapWidth: 2
                    }
                },
                {
                    // Level 3: Teams
                    colorSaturation: [0.5, 0.8],
                    colorAlpha: [0.7, 0.95],
                    itemStyle: {
                        borderColor: '#ddd',
                        borderWidth: 1,
                        gapWidth: 1
                    }
                }
            ],
            emphasis: {
                focus: 'descendant',
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.3)'
                }
            }
        }];
    },

    // Build series for sunburst chart (native ECharts)
    buildSunburstSeries(config) {
        const { palette = 'default', sunburstData = { children: [] } } = config;

        // Get colors for each level
        const colors = Utils.getPalette(palette);

        // Helper to assign colors recursively
        const assignColors = (node, level = 0, parentIndex = 0) => {
            const colorIndex = (parentIndex + level) % colors.length;
            node.itemStyle = { color: colors[colorIndex] };

            if (node.children) {
                node.children.forEach((child, i) => {
                    assignColors(child, level + 1, i);
                });
            }
            return node;
        };

        const coloredData = assignColors(JSON.parse(JSON.stringify(sunburstData)));

        return [{
            type: 'sunburst',
            data: coloredData.children, // Root's children are the first ring
            radius: ['15%', '90%'],
            sort: null, // Keep original order
            emphasis: {
                focus: 'ancestor'
            },
            levels: [
                {}, // Level 0 (root) - hidden
                {
                    // Level 1 - Inner ring
                    r0: '15%',
                    r: '40%',
                    label: {
                        rotate: 'tangential',
                        color: '#2E353B',
                        fontSize: 12,
                        fontWeight: 'bold'
                    },
                    itemStyle: {
                        borderWidth: 2,
                        borderColor: '#fff'
                    }
                },
                {
                    // Level 2 - Outer ring
                    r0: '40%',
                    r: '75%',
                    label: {
                        rotate: 'tangential',
                        color: '#2E353B',
                        fontSize: 10
                    },
                    itemStyle: {
                        borderWidth: 1,
                        borderColor: '#fff'
                    }
                },
                {
                    // Level 3 - Outermost ring
                    r0: '75%',
                    r: '90%',
                    label: {
                        position: 'outside',
                        color: '#74838F',
                        fontSize: 9
                    },
                    itemStyle: {
                        borderWidth: 1,
                        borderColor: '#eee'
                    }
                }
            ]
        }];
    },

    // Build series for basic gauge chart
    buildGaugeSeries(config) {
        const { palette = 'default', series = [], min, max } = config;

        // Kpi data
        const kpiData = series.length > 0 && series[0]?.data?.length > 0
            ? {
                value: series[0].data[series[0].data.length - 1],
                name: series[0].name || ''
            }
            : { value: 0, name: '' };

        const color = Utils.getColor(0, palette);

        return [{
            type: 'gauge',
            type: 'gauge',
            radius: '85%',
            center: ['50%', '55%'],
            itemStyle: {
                color: color
            },
            progress: {
                show: true,
                width: 15
            },
            pointer: {
                show: true,
                length: '70%',
                width: 6,
                itemStyle: {
                    color: 'auto'
                }
            },
            axisLine: {
                lineStyle: {
                    width: 15,
                    color: [
                        [1, '#E0E4E8'] // Background track color
                    ]
                }
            },
            axisTick: {
                distance: -15,
                length: 8,
                lineStyle: {
                    color: '#fff',
                    width: 2
                }
            },
            splitLine: {
                distance: -15,
                length: 20,
                lineStyle: {
                    color: '#fff',
                    width: 3
                }
            },
            axisLabel: {
                color: '#74838F',
                distance: 25,
                fontSize: 12
            },
            anchor: {
                show: true,
                showAbove: true,
                size: 20,
                itemStyle: {
                    borderWidth: 5,
                    borderColor: 'auto' // Matches pointer
                }
            },

            min: config.gaugeMin !== undefined ? config.gaugeMin : 0,
            max: config.gaugeMax !== undefined ? config.gaugeMax : 100,
            startAngle: config.gaugeStartAngle !== undefined ? config.gaugeStartAngle : 225,
            endAngle: config.gaugeEndAngle !== undefined ? config.gaugeEndAngle : -45,
            splitNumber: config.gaugeSplitNumber !== undefined ? config.gaugeSplitNumber : 10,
            detail: {
                valueAnimation: true,
                formatter: '{value}',
                color: '#2E353B',
                fontSize: 32,
                fontWeight: 'bold',
                offsetCenter: [0, '70%']
            },
            axisLabel: {
                color: '#464646',
                distance: 25,
                fontSize: 12
            },
            title: {
                offsetCenter: [0, '95%'],
                fontSize: 14,
                color: '#74838F'
            },
            data: [{
                value: kpiData.value,
                name: kpiData.name
            }]
        }];
    },



    // Build combo chart (bar + line)
    buildComboSeries(config) {
        const { series = [], showValues = false, palette = 'default' } = config;

        if (series.length < 2) {
            return this.buildBarSeries(config);
        }

        return series.map((s, index) => {
            const isLine = index >= Math.ceil(series.length / 2);
            const color = s.color || Utils.getColor(index, palette);

            if (isLine) {
                return {
                    type: 'line',
                    name: s.name,
                    data: s.data,
                    yAxisIndex: 1,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: { width: 3, color },
                    itemStyle: { color, borderColor: '#fff', borderWidth: 2 },
                    label: {
                        show: showValues,
                        position: 'top',
                        fontSize: 11,
                        color: '#74838F'
                    },
                    markPoint: config.showMinMax ? {
                        data: [
                            { type: 'max', name: 'Max' },
                            { type: 'min', name: 'Min' }
                        ],
                        label: { color: '#fff' },
                        itemStyle: { color: s.color || Utils.getColor(index, palette) }
                    } : undefined
                };
            } else {
                return {
                    type: 'bar',
                    name: s.name,
                    data: s.data,
                    barMaxWidth: 40,
                    itemStyle: { color, borderRadius: [4, 4, 0, 0] },
                    label: {
                        show: showValues,
                        position: 'top',
                        fontSize: 11,
                        color: '#74838F'
                    },
                    markPoint: config.showMinMax ? {
                        data: [
                            { type: 'max', name: 'Max' },
                            { type: 'min', name: 'Min' }
                        ],
                        label: { color: '#fff' },
                        itemStyle: { color: s.color || Utils.getColor(index, palette) }
                    } : undefined
                };
            }
        });
    },

    // Build number (big number KPI) chart
    buildNumberSeries(config) {
        const { series = [], palette = 'default' } = config;

        let value = 0;
        if (series && series.length > 0 && series[0].data && Array.isArray(series[0].data)) {
            const data = series[0].data;
            if (data.length > 0) {
                value = data[data.length - 1];
            }
        }

        // Ensure value is numeric
        if (typeof value !== 'number') value = parseFloat(value) || 0;

        return [{
            type: 'custom',
            coordinateSystem: 'none',
            data: [[0, 0]],
            renderItem: (params, api) => {
                return {
                    type: 'group',
                    children: [
                        {
                            type: 'text',
                            style: {
                                text: Utils.formatNumber(value, config.numberFormat || 'compact'),
                                x: api.getWidth() / 2,
                                y: api.getHeight() / 2 - 20,
                                textAlign: 'center',
                                font: 'bold 48px Inter, sans-serif',
                                fill: Utils.getColor(0, palette)
                            }
                        },
                        {
                            type: 'text',
                            style: {
                                text: series[0]?.name || 'Total',
                                x: api.getWidth() / 2,
                                y: api.getHeight() / 2 + 30,
                                textAlign: 'center',
                                font: '16px Inter, sans-serif',
                                fill: '#74838F'
                            }
                        }
                    ]
                };
            }
        }];
    },

    // Add goal line to chart
    addGoalLine(options, config) {
        const { goalValue, goalLabel } = config;

        if (!goalValue || !options.series || options.series.length === 0) return options;

        const markLine = {
            silent: true,
            symbol: 'none',
            lineStyle: {
                color: '#EF8C8C',
                type: 'dashed',
                width: 2
            },
            label: {
                formatter: goalLabel || `Goal: ${goalValue}`,
                position: 'end',
                color: '#EF8C8C',
                fontSize: 12
            },
            data: [{
                yAxis: parseFloat(goalValue)
            }]
        };

        // Attach to the first series
        if (options.series[0]) {
            options.series[0].markLine = markLine;
        }

        return options;
    },

    // Build Matrix (Heatmap) Series
    buildMatrixSeries(config) {
        const { matrixData = [], matrixX = [], matrixY = [], palette = 'default' } = config;

        return [{
            type: 'heatmap',
            data: matrixData,
            label: {
                show: true
            },
            itemStyle: {
                borderWidth: 1,
                borderColor: '#fff',
                borderRadius: 4
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }];
    },

    // Main function to build chart options
    buildChartOptions(chartType, config) {
        const baseOptions = this.getBaseOptions(config);
        let options = { ...baseOptions };

        // Add legend
        options.legend = this.getLegendOptions(config);

        // Build chart-specific options
        switch (chartType) {
            case 'bar':
                options.xAxis = this.getXAxisOptions(config);
                options.yAxis = this.getYAxisOptions(config);
                options.series = this.buildBarSeries(config);
                break;

            case 'line':
                options.xAxis = this.getXAxisOptions(config);
                options.yAxis = this.getYAxisOptions(config);
                options.series = this.buildLineSeries(config);
                break;

            case 'area':
                options.xAxis = this.getXAxisOptions(config);
                options.yAxis = this.getYAxisOptions(config);
                options.series = this.buildAreaSeries(config);
                break;

            case 'row':
                options.xAxis = this.getYAxisOptions(config);
                options.yAxis = { ...this.getXAxisOptions(config), type: 'category' };
                options.series = this.buildRowSeries(config);
                break;

            case 'combo':
                options.xAxis = this.getXAxisOptions(config);
                options.yAxis = [
                    this.getYAxisOptions(config),
                    { ...this.getYAxisOptions(config), splitLine: { show: false } }
                ];
                options.series = this.buildComboSeries(config);
                break;

            case 'pie':
                options.tooltip = { ...options.tooltip, trigger: 'item' };
                options.series = this.buildPieSeries({
                    ...config,
                    isDonut: false,
                    labelNamePosition: config.labelNamePosition || 'outside',
                    labelValuePosition: config.labelValuePosition || 'outside'
                });
                delete options.xAxis;
                delete options.yAxis;
                break;

            case 'donut':
                options.tooltip = { ...options.tooltip, trigger: 'item' };
                options.series = this.buildPieSeries({
                    ...config,
                    isDonut: true,
                    labelNamePosition: config.labelNamePosition || 'outside',
                    labelValuePosition: config.labelValuePosition || 'outside'
                });
                delete options.xAxis;
                delete options.yAxis;
                break;

            case 'halfDonut':
                options.tooltip = { ...options.tooltip, trigger: 'item' };
                options.series = this.buildPieSeries({
                    ...config,
                    isDonut: true,
                    isHalf: true,
                    labelNamePosition: config.labelNamePosition || 'outside',
                    labelValuePosition: config.labelValuePosition || 'outside'
                });
                delete options.xAxis;
                delete options.yAxis;
                break;

            case 'nightingale':
                options.tooltip = { ...options.tooltip, trigger: 'item' };
                options.series = this.buildPieSeries({
                    ...config,
                    isDonut: false, // Nightingale usually has hole or not, but typically looks like a filled rose. Let's start with false (full).
                    roseType: 'area', // or 'radius'
                    labelNamePosition: config.labelNamePosition || 'outside',
                    labelValuePosition: config.labelValuePosition || 'outside'
                });
                delete options.xAxis;
                delete options.yAxis;
                break;

            case 'funnel':
                options.tooltip = { ...options.tooltip, trigger: 'item' };
                options.series = this.buildFunnelSeries(config);
                delete options.xAxis;
                delete options.yAxis;
                break;

            case 'scatter':
                options.xAxis = { ...this.getXAxisOptions(config), type: 'value', data: null };
                options.yAxis = this.getYAxisOptions(config);
                options.series = this.buildScatterSeries(config);
                break;

            case 'radar':
                options.radar = this.getRadarOptions(config);
                options.series = this.buildRadarSeries(config);
                // Override legend with radar-specific data but keep existing config
                options.legend = {
                    ...options.legend,
                    data: this.getRadarLegendData(config)
                };
                delete options.xAxis;
                delete options.yAxis;
                delete options.grid;
                delete options.dataZoom;
                break;

            case 'candlestick':
                options.xAxis = {
                    ...this.getXAxisOptions(config),
                    data: this.getCandlestickXAxisData(config),
                    axisLabel: {
                        ...this.getXAxisOptions(config).axisLabel,
                        rotate: 45
                    }
                };
                options.yAxis = {
                    ...this.getYAxisOptions(config),
                    scale: true,
                    name: 'Price ($)'
                };
                options.series = this.buildCandlestickSeries(config);
                options.tooltip = {
                    ...options.tooltip,
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross'
                    }
                };

                break;

            case 'calendar':
                options.calendar = this.getCalendarOptions(config);
                options.visualMap = this.getCalendarVisualMap(config);
                options.series = this.buildCalendarSeries(config);
                options.tooltip = {
                    ...options.tooltip,
                    trigger: 'item',
                    formatter: function (params) {
                        return params.data[0] + ': ' + params.data[1] + ' activities';
                    }
                };
                delete options.xAxis;
                delete options.yAxis;
                delete options.legend;
                delete options.grid;
                break;

            case 'graph':
                options.series = this.buildGraphSeries(config);
                // Merge with existing legend options so position can be changed
                options.legend = {
                    ...options.legend,
                    data: this.getGraphLegendData(config)
                };
                options.tooltip = {
                    ...options.tooltip,
                    trigger: 'item',
                    formatter: function (params) {
                        if (params.dataType === 'node') {
                            return params.name + '<br/>Value: ' + (params.value || params.data.value);
                        }
                        return params.data.source + ' → ' + params.data.target;
                    }
                };
                delete options.xAxis;
                delete options.yAxis;
                delete options.grid;
                break;

            case 'circularGraph':
                options.series = this.buildCircularGraphSeries(config);
                // Merge with existing legend options so position can be changed
                options.legend = {
                    ...options.legend,
                    data: this.getGraphLegendData(config)
                };
                options.tooltip = {
                    ...options.tooltip,
                    trigger: 'item',
                    formatter: function (params) {
                        if (params.dataType === 'node') {
                            return params.name + '<br/>Value: ' + (params.value || params.data.value);
                        }
                        return params.data.source + ' → ' + params.data.target;
                    }
                };
                delete options.xAxis;
                delete options.yAxis;
                delete options.grid;
                break;

            case 'sankey':
                options.series = this.buildSankeySeries(config);
                options.tooltip = {
                    ...options.tooltip,
                    trigger: 'item',
                    triggerOn: 'mousemove',
                    formatter: function (params) {
                        if (params.dataType === 'node') {
                            return params.name;
                        }
                        return params.data.source + ' → ' + params.data.target + '<br/>Value: ' + params.data.value;
                    }
                };
                delete options.xAxis;
                delete options.yAxis;
                delete options.legend;
                delete options.grid;
                delete options.grid;
                break;

            case 'chord':
                options.series = this.buildChordSeries(config);
                delete options.xAxis;
                delete options.yAxis;
                delete options.legend;
                delete options.grid;
                break;

            case 'tree':
                options.series = this.buildTreeSeries(config);
                options.tooltip = {
                    ...options.tooltip,
                    trigger: 'item',
                    formatter: function (params) {
                        return params.name + (params.value ? '<br/>Value: ' + params.value : '');
                    }
                };
                delete options.xAxis;
                delete options.yAxis;
                delete options.legend;
                delete options.grid;
                break;

            case 'radialTree':
                options.series = this.buildRadialTreeSeries(config);
                options.tooltip = {
                    ...options.tooltip,
                    trigger: 'item',
                    formatter: function (params) {
                        return params.name + (params.value ? '<br/>Value: ' + params.value : '');
                    }
                };
                delete options.xAxis;
                delete options.yAxis;
                delete options.legend;
                delete options.grid;
                break;

            case 'treemap':
                options.series = this.buildTreemapSeries(config);
                options.tooltip = {
                    ...options.tooltip,
                    trigger: 'item',
                    formatter: function (params) {
                        const path = params.treePathInfo ?
                            params.treePathInfo.map(p => p.name).join(' → ') : params.name;
                        return path + '<br/>Value: ' + params.value;
                    }
                };
                delete options.xAxis;
                delete options.yAxis;
                delete options.legend;
                delete options.grid;
                break;

            case 'sunburst':
                options.series = this.buildSunburstSeries(config);
                options.tooltip = {
                    ...options.tooltip,
                    trigger: 'item',
                    formatter: function (params) {
                        const path = params.treePathInfo ?
                            params.treePathInfo.map(p => p.name).filter(n => n).join(' → ') : params.name;
                        return path + '<br/>Value: ' + params.value;
                    }
                };
                delete options.xAxis;
                delete options.yAxis;
                delete options.legend;
                delete options.grid;
                break;

            case 'gauge':
                options.series = this.buildGaugeSeries(config);
                delete options.xAxis;
                delete options.yAxis;
                delete options.legend;
                delete options.grid;
                break;

            case 'gaugeSpeed':
                options.series = this.buildSpeedGaugeSeries(config);
                delete options.xAxis;
                delete options.yAxis;
                delete options.legend;
                delete options.grid;
                break;

            case 'number':
                options.series = this.buildNumberSeries(config);
                delete options.xAxis;
                delete options.yAxis;
                delete options.legend;
                delete options.grid;
                delete options.tooltip;
                break;

            case 'matrix':
                options.tooltip = {
                    position: 'top',
                    formatter: (params) => {
                        const x = config.matrixX[params.value[0]];
                        const y = config.matrixY[params.value[1]];
                        return `${x} x ${y}<br/>Value: <b>${params.value[2]}</b>`;
                    }
                };
                options.grid = { top: 60, right: 120, bottom: 100, left: 120 };
                options.xAxis = {
                    type: 'category',
                    data: config.matrixX,
                    splitArea: { show: true }
                };
                options.yAxis = {
                    type: 'category',
                    data: config.matrixY,
                    splitArea: { show: true }
                };
                options.visualMap = {
                    min: 0,
                    max: config.matrixData.reduce((max, item) => Math.max(max, item[2]), 0),
                    calculable: true,
                    orient: 'horizontal',
                    left: 'center',
                    bottom: 20,
                    itemWidth: 15,
                    itemHeight: 200, // Make bar wider horizontally
                    textStyle: { color: '#666' },
                    inRange: {
                        color: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127']
                    }
                };

                // Let's use a vibrant gradient
                options.visualMap.inRange.color = ['#f0f9ff', '#a6d96a', '#fdae61', '#d7191c'];
                options.series = this.buildMatrixSeries(config);
                break;

            case 'geomap':
                options.series = this.buildGeomapSeries(config);
                // Calculate dynamic min/max from data
                let minVal = 0;
                let maxVal = 100;
                const mapSeries = options.series[0];
                if (mapSeries && mapSeries.data && mapSeries.data.length > 0) {
                    const values = mapSeries.data.map(d => d.value).filter(v => v !== null && v !== undefined);
                    if (values.length > 0) {
                        minVal = Math.min(...values);
                        maxVal = Math.max(...values);
                    }
                }

                options.visualMap = {
                    min: minVal,
                    max: maxVal,
                    left: 'left',
                    top: 'bottom',
                    text: ['High', 'Low'],
                    calculable: true,
                    inRange: {
                        color: Utils.getPalette(config.palette)
                    }
                };
                options.tooltip = {
                    ...options.tooltip,
                    trigger: 'item',
                    formatter: function (params) {
                        if (params.value) {
                            return `${params.name}<br/>${params.seriesName}: ${params.value.toLocaleString()}`;
                        }
                        return params.name;
                    }
                };
                delete options.xAxis;
                delete options.yAxis;
                delete options.legend;
                delete options.grid;
                break;

            default:
                options.xAxis = this.getXAxisOptions(config);
                options.yAxis = this.getYAxisOptions(config);
                options.series = this.buildBarSeries(config);
        }

        // Add dataZoom for axis-based charts if enabled
        const dataZoomCharts = ['bar', 'line', 'area', 'row', 'combo', 'scatter', 'candlestick'];
        if (dataZoomCharts.includes(chartType) && config.showDataZoom !== false) {
            const isHorizontal = chartType !== 'row';
            const hasBottomLegend = config.legendPosition === 'bottom';
            options.dataZoom = [
                {
                    type: 'slider',
                    show: true,
                    xAxisIndex: isHorizontal ? 0 : undefined,
                    yAxisIndex: isHorizontal ? undefined : 0,
                    start: 0,
                    end: 100,
                    bottom: isHorizontal ? (hasBottomLegend ? 45 : 10) : undefined,
                    left: isHorizontal ? undefined : 10,
                    height: isHorizontal ? 20 : undefined,
                    width: isHorizontal ? undefined : 20,
                    borderColor: '#E0E4E8',
                    backgroundColor: '#F7F8F9',
                    fillerColor: 'rgba(80, 158, 227, 0.2)',
                    handleStyle: {
                        color: '#509EE3'
                    },
                    textStyle: {
                        color: '#74838F',
                        fontSize: 10
                    }
                },
                {
                    type: 'inside',
                    xAxisIndex: isHorizontal ? 0 : undefined,
                    yAxisIndex: isHorizontal ? undefined : 0,
                    start: 0,
                    end: 100,
                    zoomOnMouseWheel: 'shift',
                    moveOnMouseWheel: true
                }
            ];

            // Adjust grid to make room for dataZoom slider
            if (isHorizontal) {
                options.grid = { ...options.grid, bottom: hasBottomLegend ? 110 : 80 };
            } else {
                options.grid = { ...options.grid, left: 80 };
            }
        }

        // Add goal line if specified
        if (config.goalValue && ['bar', 'line', 'area', 'combo'].includes(chartType)) {
            options = this.addGoalLine(options, config);
        }

        // Ensure grid bottom has space for legend
        if (config.legendPosition === 'bottom' && options.grid && (options.grid.bottom === undefined || options.grid.bottom < 85)) {
            options.grid = { ...options.grid, bottom: 85 };
        }

        // Ensure grid top has space for Top Legend + Title
        if (config.legendPosition === 'top' && config.title && options.grid && (options.grid.top === undefined || options.grid.top < 90)) {
            options.grid = { ...options.grid, top: 90 };
        }

        // Ensure grid side has space for Side Legends
        if (config.legendPosition === 'left' && options.grid && (options.grid.left === undefined || options.grid.left < 150)) {
            options.grid = { ...options.grid, left: 150 };
        }
        if (config.legendPosition === 'right' && options.grid && (options.grid.right === undefined || options.grid.right < 150)) {
            options.grid = { ...options.grid, right: 150 };
        }

        return options;
    }
};

// Export for use in other modules
window.ChartConfig = ChartConfig;
