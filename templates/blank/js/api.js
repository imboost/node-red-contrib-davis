/**
 * API Wrapper for Backend Persistence
 */
class API {
    static get BASE_URL() {
        return 'api';
    }

    static async getDashboards() {
        try {
            const res = await fetch(`${this.BASE_URL}/dashboards`);
            if (!res.ok) throw new Error('Failed to fetch dashboards');
            return await res.json();
        } catch (e) {
            console.error('[API] getDashboards error:', e);
            return {};
        }
    }

    static async saveDashboard(id, data) {
        try {
            const res = await fetch(`${this.BASE_URL}/dashboards/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await res.json();
        } catch (e) {
            console.error('[API] saveDashboard error:', e);
            return { success: false, message: e.message };
        }
    }

    static async deleteDashboard(id) {
        try {
            const res = await fetch(`${this.BASE_URL}/dashboards/${id}`, {
                method: 'DELETE'
            });
            return await res.json();
        } catch (e) {
            console.error('[API] deleteDashboard error:', e);
            return { success: false, message: e.message };
        }
    }

    static async getSavedCharts() {
        try {
            const res = await fetch(`${this.BASE_URL}/saved_charts`);
            if (!res.ok) throw new Error('Failed to fetch saved charts');
            return await res.json();
        } catch (e) {
            console.error('[API] getSavedCharts error:', e);
            return [];
        }
    }

    static async saveSavedCharts(charts) {
        try {
            const res = await fetch(`${this.BASE_URL}/saved_charts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(charts)
            });
            return await res.json();
        } catch (e) {
            console.error('[API] saveSavedCharts error:', e);
            return { success: false, message: e.message };
        }
    }
}
