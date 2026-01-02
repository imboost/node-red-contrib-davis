/**
 * Microbase - Utility Functions
 * Helper utilities for the chart editor
 */

const Utils = {
    // Color palettes matching Metabase style
    colorPalettes: {
        default: [
            '#509EE3', // Primary blue
            '#88BF4D', // Green
            '#A989C5', // Purple
            '#EF8C8C', // Red
            '#F9CF48', // Yellow
            '#98D9D9', // Teal
            '#7172AD', // Indigo
            '#F2A86F', // Orange
            '#A3B9CB', // Gray blue
            '#C4A4D8'  // Light purple
        ],
        warm: [
            '#EF6C00', // Deep orange
            '#FDD835', // Yellow
            '#E53935', // Red
            '#F06292', // Pink
            '#FF8A65', // Light orange
            '#FFCA28', // Amber
            '#D81B60', // Magenta
            '#FF7043', // Deep orange light
            '#FFB74D', // Orange light
            '#F48FB1'  // Pink light
        ],
        cool: [
            '#00ACC1', // Cyan
            '#5E35B1', // Deep purple
            '#1E88E5', // Blue
            '#00897B', // Teal
            '#3949AB', // Indigo
            '#039BE5', // Light blue
            '#7E57C2', // Purple
            '#26A69A', // Teal light
            '#42A5F5', // Blue light
            '#9575CD'  // Purple light
        ],
        nature: [
            '#43A047', // Green
            '#8BC34A', // Light green
            '#004D40', // Dark teal
            '#2E7D32', // Dark green
            '#689F38', // Lime
            '#00695C', // Teal
            '#558B2F', // Light green dark
            '#1B5E20', // Green dark
            '#33691E', // Lime dark
            '#4CAF50'  // Green medium
        ]
    },

    // Get color from palette
    getColor(index, palette = 'default') {
        const colors = this.colorPalettes[palette] || this.colorPalettes.default;
        return colors[index % colors.length];
    },

    // Get entire palette
    getPalette(name = 'default') {
        return this.colorPalettes[name] || this.colorPalettes.default;
    },

    // Format numbers
    formatNumber(value, format = 'default') {
        if (value === null || value === undefined) return '-';

        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(value);

            case 'percent':
                return `${value.toFixed(1)}%`;

            case 'compact':
                if (value >= 1000000000) {
                    return `${(value / 1000000000).toFixed(1)}B`;
                } else if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                    return `${(value / 1000).toFixed(1)}K`;
                }
                return value.toLocaleString();

            case 'standard': // 1,234.56
                return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

            case 'european': // 1.234,56
                return value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

            case 'plain': // 1234.56
                return String(value);

            default:
                return value.toLocaleString();
        }
    },

    // Format axis label
    formatAxisLabel(value, format = 'default') {
        if (format === 'compact') {
            if (value >= 1000000) {
                return `${(value / 1000000).toFixed(0)}M`;
            } else if (value >= 1000) {
                return `${(value / 1000).toFixed(0)}K`;
            }
        } else if (format === 'currency') {
            if (value >= 1000000) {
                return `$${(value / 1000000).toFixed(0)}M`;
            } else if (value >= 1000) {
                return `$${(value / 1000).toFixed(0)}K`;
            }
            return `$${value}`;
        } else if (format === 'percent') {
            return `${value}%`;
        }
        return value;
    },

    // Debounce function for performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function for performance
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Deep clone object
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    // Generate unique ID
    generateId() {
        return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Check if mobile viewport
    isMobile() {
        return window.innerWidth <= 768;
    },

    // Show toast notification
    showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // SVG icons for chart types
    chartIcons: {
        bar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10" stroke="#EF8C8C"/>
            <line x1="12" y1="20" x2="12" y2="4" stroke="#509EE3"/>
            <line x1="6" y1="20" x2="6" y2="14" stroke="#88BF4D"/>
        </svg>`,
        line: `<svg viewBox="0 0 24 24" fill="none" stroke="#509EE3" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>`,
        area: `<svg viewBox="0 0 24 24" fill="none" stroke="#509EE3" stroke-width="2">
            <path d="M2 20L6 14L10 16L14 10L18 12L22 6"/>
            <path d="M2 20L6 14L10 16L14 10L18 12L22 6V20H2Z" fill="#509EE3" opacity="0.2"/>
        </svg>`,
        pie: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke="#E0E4E8"/>
            <path d="M12 2V12L20 16" stroke="#509EE3" fill="#509EE3" fill-opacity="0.2"/>
            <circle cx="12" cy="12" r="10" stroke="#509EE3" stroke-dasharray="15 60" transform="rotate(-90 12 12)"/>
        </svg>`,
        donut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke="#E0E4E8"/>
            <circle cx="12" cy="12" r="4" stroke="#E0E4E8"/>
            <path d="M12 2 A10 10 0 0 1 22 12" stroke="#88BF4D"/>
            <path d="M12 22 A10 10 0 0 1 2 12" stroke="#509EE3"/>
        </svg>`,
        scatter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="7" cy="17" r="2" fill="#509EE3" stroke="none"/>
            <circle cx="12" cy="12" r="2" fill="#88BF4D" stroke="none"/>
            <circle cx="17" cy="7" r="2" fill="#EF8C8C" stroke="none"/>
            <circle cx="5" cy="9" r="2" fill="#F9CF48" stroke="none"/>
            <circle cx="19" cy="15" r="2" fill="#A989C5" stroke="none"/>
        </svg>`,
        row: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="6" x2="14" y2="6" stroke="#EF8C8C"/>
            <line x1="4" y1="12" x2="20" y2="12" stroke="#509EE3"/>
            <line x1="4" y1="18" x2="10" y2="18" stroke="#88BF4D"/>
        </svg>`,
        combo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="6" y1="20" x2="6" y2="14" stroke="#509EE3" opacity="0.5"/>
            <line x1="12" y1="20" x2="12" y2="10" stroke="#509EE3" opacity="0.5"/>
            <line x1="18" y1="20" x2="18" y2="6" stroke="#509EE3" opacity="0.5"/>
            <polyline points="4 8 9 12 15 6 20 10" stroke="#EF8C8C"/>
        </svg>`,
        funnel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 4H22L18 10H6L2 4Z" fill="#509EE3" stroke="#509EE3" fill-opacity="0.2"/>
            <path d="M6 10H18L15 16H9L6 10Z" fill="#88BF4D" stroke="#88BF4D" fill-opacity="0.2"/>
            <path d="M9 16H15L13 22H11L9 16Z" fill="#EF8C8C" stroke="#EF8C8C" fill-opacity="0.2"/>
        </svg>`,
        gauge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 12C2 6.5 6.5 2 12 2C17.5 2 22 6.5 22 12" stroke="#E0E4E8"/>
            <path d="M2 12C2 6.5 6.5 2 12 2" stroke="#509EE3"/>
            <path d="M12 12L16 8" stroke="#EF8C8C"/>
            <circle cx="12" cy="12" r="2" fill="#EF8C8C" stroke="none"/>
        </svg>`,
        table: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#E0E4E8"/>
            <line x1="3" y1="9" x2="21" y2="9" stroke="#509EE3"/>
            <line x1="3" y1="15" x2="21" y2="15" stroke="#E0E4E8"/>
            <line x1="9" y1="3" x2="9" y2="21" stroke="#E0E4E8"/>
            <line x1="15" y1="3" x2="15" y2="21" stroke="#E0E4E8"/>
        </svg>`,
        number: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <text x="6" y="17" font-size="14" font-weight="bold" fill="#509EE3" stroke="none">42</text>
        </svg>`,
        matrix: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="6" height="6" fill="#509EE3" fill-opacity="0.8" stroke="none"/>
            <rect x="10" y="3" width="6" height="6" fill="#509EE3" fill-opacity="0.4" stroke="none"/>
            <rect x="17" y="3" width="6" height="6" fill="#509EE3" fill-opacity="0.6" stroke="none"/>
            <rect x="3" y="10" width="6" height="6" fill="#509EE3" fill-opacity="0.3" stroke="none"/>
            <rect x="10" y="10" width="6" height="6" fill="#509EE3" fill-opacity="0.9" stroke="none"/>
            <rect x="17" y="10" width="6" height="6" fill="#509EE3" fill-opacity="0.5" stroke="none"/>
            <rect x="3" y="17" width="6" height="6" fill="#509EE3" fill-opacity="0.7" stroke="none"/>
            <rect x="10" y="17" width="6" height="6" fill="#509EE3" fill-opacity="0.2" stroke="none"/>
            <rect x="17" y="17" width="6" height="6" fill="#509EE3" fill-opacity="0.8" stroke="none"/>
        </svg>`,

        waterfall: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="6" width="3" height="12" fill="#509EE3" stroke="none"/>
            <rect x="7" y="4" width="3" height="6" fill="#88BF4D" stroke="none"/>
            <rect x="12" y="10" width="3" height="8" fill="#EF8C8C" stroke="none"/>
            <rect x="17" y="8" width="3" height="10" fill="#F9CF48" stroke="none"/>
        </svg>`,
        radar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12,2 22,8.5 19,20 5,20 2,8.5" stroke="#E0E4E8"/>
            <polygon points="12,6 17,9.5 15.5,16 8.5,16 7,9.5" fill="#509EE3" stroke="#509EE3" fill-opacity="0.3"/>
            <line x1="12" y1="2" x2="12" y2="12" stroke="#E0E4E8"/>
            <line x1="22" y1="8.5" x2="12" y2="12" stroke="#E0E4E8"/>
            <line x1="19" y1="20" x2="12" y2="12" stroke="#E0E4E8"/>
            <line x1="5" y1="20" x2="12" y2="12" stroke="#E0E4E8"/>
            <line x1="2" y1="8.5" x2="12" y2="12" stroke="#E0E4E8"/>
        </svg>`,
        candlestick: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="6" y1="4" x2="6" y2="20"/>
            <rect x="4" y="8" width="4" height="6" fill="#88BF4D" stroke="#88BF4D"/>
            <line x1="12" y1="2" x2="12" y2="18"/>
            <rect x="10" y="6" width="4" height="8" fill="#EF8C8C" stroke="#EF8C8C"/>
            <line x1="18" y1="6" x2="18" y2="22"/>
            <rect x="16" y="10" width="4" height="6" fill="#88BF4D" stroke="#88BF4D"/>
        </svg>`,
        calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <rect x="6" y="13" width="3" height="3" fill="#509EE3" stroke="none" opacity="0.3"/>
            <rect x="10.5" y="13" width="3" height="3" fill="#509EE3" stroke="none" opacity="0.6"/>
            <rect x="15" y="13" width="3" height="3" fill="#509EE3" stroke="none" opacity="1"/>
        </svg>`,
        graph: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="5" r="3" fill="#509EE3"/>
            <circle cx="5" cy="18" r="3" fill="#88BF4D"/>
            <circle cx="19" cy="18" r="3" fill="#EF8C8C"/>
            <line x1="12" y1="8" x2="5" y2="15"/>
            <line x1="12" y1="8" x2="19" y2="15"/>
            <line x1="8" y1="18" x2="16" y2="18"/>
        </svg>`,
        tree: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="4" r="2" fill="#509EE3"/>
            <circle cx="6" cy="12" r="2" fill="#88BF4D"/>
            <circle cx="18" cy="12" r="2" fill="#88BF4D"/>
            <circle cx="3" cy="20" r="2" fill="#EF8C8C"/>
            <circle cx="9" cy="20" r="2" fill="#EF8C8C"/>
            <circle cx="15" cy="20" r="2" fill="#EF8C8C"/>
            <circle cx="21" cy="20" r="2" fill="#EF8C8C"/>
            <line x1="12" y1="6" x2="6" y2="10"/>
            <line x1="12" y1="6" x2="18" y2="10"/>
            <line x1="6" y1="14" x2="3" y2="18"/>
            <line x1="6" y1="14" x2="9" y2="18"/>
            <line x1="18" y1="14" x2="15" y2="18"/>
            <line x1="18" y1="14" x2="21" y2="18"/>
        </svg>`,
        circularGraph: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" stroke-dasharray="3 2" opacity="0.3"/>
            <circle cx="12" cy="3" r="2" fill="#509EE3"/>
            <circle cx="20" cy="9" r="2" fill="#88BF4D"/>
            <circle cx="18" cy="18" r="2" fill="#A989C5"/>
            <circle cx="6" cy="18" r="2" fill="#EF8C8C"/>
            <circle cx="4" cy="9" r="2" fill="#F9CF48"/>
            <line x1="12" y1="5" x2="18" y2="9"/>
            <line x1="18" y1="11" x2="17" y2="16"/>
            <line x1="16" y1="18" x2="8" y2="18"/>
            <line x1="6" y1="16" x2="5" y2="11"/>
            <line x1="6" y1="9" x2="10" y2="5"/>
        </svg>`,
        sankey: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1" y="2" width="4" height="6" rx="1" fill="#509EE3"/>
            <rect x="1" y="10" width="4" height="5" rx="1" fill="#88BF4D"/>
            <rect x="1" y="17" width="4" height="5" rx="1" fill="#A989C5"/>
            <rect x="19" y="3" width="4" height="8" rx="1" fill="#EF8C8C"/>
            <rect x="19" y="13" width="4" height="8" rx="1" fill="#F9CF48"/>
            <path d="M5 5 Q12 5 19 7" stroke="#509EE3" stroke-width="2" fill="none" opacity="0.5"/>
            <path d="M5 12.5 Q12 10 19 7" stroke="#88BF4D" stroke-width="1.5" fill="none" opacity="0.5"/>
            <path d="M5 19.5 Q12 20 19 17" stroke="#A989C5" stroke-width="2" fill="none" opacity="0.5"/>
        </svg>`,
        chord: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10" stroke="#E0E4E8" stroke-width="1"/>
            <circle cx="12" cy="2" r="2" fill="#509EE3"/>
            <circle cx="21" cy="12" r="2" fill="#88BF4D"/>
            <circle cx="12" cy="22" r="2" fill="#A989C5"/>
            <circle cx="3" cy="12" r="2" fill="#EF8C8C"/>
            <path d="M12 4 Q16 12 19 12" stroke="#509EE3" stroke-width="2" fill="none" opacity="0.4"/>
            <path d="M12 4 Q8 12 5 12" stroke="#509EE3" stroke-width="1.5" fill="none" opacity="0.4"/>
            <path d="M19 12 Q16 16 12 20" stroke="#88BF4D" stroke-width="2" fill="none" opacity="0.4"/>
            <path d="M5 12 Q8 16 12 20" stroke="#EF8C8C" stroke-width="2" fill="none" opacity="0.4"/>
        </svg>`,
        treemap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="2" y="2" width="20" height="20" rx="2" stroke="#E0E4E8" stroke-width="1.5"/>
            <rect x="3" y="3" width="10" height="12" fill="#509EE3" rx="1"/>
            <rect x="14" y="3" width="7" height="6" fill="#88BF4D" rx="1"/>
            <rect x="14" y="10" width="7" height="5" fill="#A989C5" rx="1"/>
            <rect x="3" y="16" width="6" height="5" fill="#EF8C8C" rx="1"/>
            <rect x="10" y="16" width="11" height="5" fill="#F9CF48" rx="1"/>
        </svg>`,
        sunburst: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <circle cx="12" cy="12" r="3" fill="#509EE3"/>
            <path d="M12 9 A3 3 0 0 1 15 12" stroke="#509EE3" stroke-width="3" fill="none"/>
            <path d="M15 12 A3 3 0 0 1 12 15" stroke="#88BF4D" stroke-width="3" fill="none"/>
            <path d="M12 15 A3 3 0 0 1 9 12" stroke="#A989C5" stroke-width="3" fill="none"/>
            <path d="M9 12 A3 3 0 0 1 12 9" stroke="#EF8C8C" stroke-width="3" fill="none"/>
            <path d="M12 5 A7 7 0 0 1 19 12" stroke="#509EE3" stroke-width="2" fill="none"/>
            <path d="M19 12 A7 7 0 0 1 12 19" stroke="#88BF4D" stroke-width="2" fill="none"/>
            <path d="M12 19 A7 7 0 0 1 5 12" stroke="#A989C5" stroke-width="2" fill="none"/>
            <path d="M5 12 A7 7 0 0 1 12 5" stroke="#F9CF48" stroke-width="2" fill="none"/>
        </svg>`,
        geomap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2C8 2 3 7 3 12s5 10 9 10 9-5 9-10S16 2 12 2z" fill="#509EE3" opacity="0.3"/>
            <ellipse cx="12" cy="12" rx="9" ry="10" stroke="#509EE3" fill="none"/>
            <path d="M3 12h18" stroke="#509EE3" stroke-dasharray="2 2"/>
            <path d="M12 2c2.5 0 4.5 4.5 4.5 10s-2 10-4.5 10" stroke="#509EE3"/>
            <path d="M12 2c-2.5 0-4.5 4.5-4.5 10s2 10 4.5 10" stroke="#509EE3"/>
            <circle cx="8" cy="8" r="1.5" fill="#EF8C8C"/>
            <circle cx="15" cy="14" r="1.5" fill="#88BF4D"/>
        </svg>`,
        geomapPie: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <ellipse cx="12" cy="14" rx="10" ry="8" stroke="#509EE3" fill="#509EE3" opacity="0.2"/>
            <ellipse cx="12" cy="14" rx="10" ry="8" stroke="#509EE3" fill="none"/>
            <circle cx="8" cy="12" r="3" fill="#EF8C8C"/>
            <path d="M8 12 L8 9 A3 3 0 0 1 10.5 13.5 Z" fill="#88BF4D"/>
            <circle cx="16" cy="14" r="2.5" fill="#A989C5"/>
            <path d="M16 14 L16 11.5 A2.5 2.5 0 0 1 18 15 Z" fill="#F9CF48"/>
        </svg>`
    },

    // Get chart icon SVG
    getChartIcon(type) {
        return this.chartIcons[type] || this.chartIcons.bar;
    }
};

// Export for use in other modules
window.Utils = Utils;
