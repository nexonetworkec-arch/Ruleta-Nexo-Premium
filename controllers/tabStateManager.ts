import { StateManager } from '../core';

export interface TabStateCallbacks {
    renderLeadsList: () => void;
    renderSubscriptionDashboard: () => void;
    initSistema: () => void;
    renderAnalytics: () => void;
    showCustomAlert?: (message: string, title?: string) => void;
}

let callbacks: TabStateCallbacks | null = null;

export const setTabStateCallbacks = (cb: TabStateCallbacks) => {
    callbacks = cb;
};

const getCallbacks = (): TabStateCallbacks => {
    if (!callbacks) {
        throw new Error("TabStateCallbacks must be registered before utilizing TabStateManager.");
    }
    return callbacks;
};

export class TabStateManager {
    /**
     * Activates a main tab and its corresponding pane, updates session persistence,
     * and executes specific tab initialization callbacks.
     */
    static setActiveTab(tabId: string) {
        const tabs = document.querySelectorAll('.tab-btn');
        const panes = document.querySelectorAll('.tab-pane');

        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        const tabButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        const tabPane = document.getElementById(tabId);

        if (tabButton) tabButton.classList.add('active');
        if (tabPane) tabPane.classList.add('active');

        sessionStorage.setItem('nexo_active_tab', tabId);

        const cb = getCallbacks();
        if (tabId === 'tab-leads') cb.renderLeadsList();
        if (tabId === 'tab-perfil') {
            cb.renderSubscriptionDashboard();
            this.syncSubtabStates();
        }
        if (tabId === 'tab-sistema') cb.initSistema();
        if (tabId === 'tab-admin') cb.renderAnalytics();

        if (tabId === 'tab-estadisticas' || tabId === 'tab-sistema') {
            window.dispatchEvent(new Event('nexo-state-change'));
        }
    }

    /**
     * Activates a specific sub-tab and its pane inside the profile tab,
     * and fetches the associated dynamic data.
     */
    static setActiveSubtab(subtabId: string) {
        const container = document.getElementById('tab-perfil');
        if (!container) return;

        const subTabs = container.querySelectorAll('.sub-tab-btn[data-subtab]');
        const subPanes = container.querySelectorAll('.sub-tab-pane');

        subTabs.forEach(t => t.classList.remove('active'));
        subPanes.forEach(p => p.classList.remove('active'));

        const subTabButton = container.querySelector(`.sub-tab-btn[data-subtab="${subtabId}"]`);
        const subTabPane = document.getElementById(subtabId);

        if (subTabButton) subTabButton.classList.add('active');
        if (subTabPane) subTabPane.classList.add('active');
    }

    /**
     * Dynamically synchronizes sub-tab buttons visibility and auto-corrects the selected sub-tab
     * based on user role and permissions. Fully eliminates any "black background" or disconnected state.
     */
    static syncSubtabStates() {
        const isSuperAdmin = sessionStorage.getItem('nexo_current_user_role') === 'superadmin' || sessionStorage.getItem('nexo_is_super_admin') === 'true';

        const subtabCuenta = document.querySelector('[data-subtab="subtab-cuenta"]') as HTMLElement;
        const subtabPersonalizacion = document.querySelector('[data-subtab="subtab-personalizacion"]') as HTMLElement;

        let allowCuenta = true;
        let allowPers = true;

        if (isSuperAdmin) {
            allowCuenta = true;
            allowPers = true;
        } else {
            allowCuenta = true;
            allowPers = true;
        }

        if (subtabCuenta) subtabCuenta.style.display = allowCuenta ? 'block' : 'none';
        if (subtabPersonalizacion) subtabPersonalizacion.style.display = allowPers ? 'block' : 'none';

        const activeSubtabBtn = document.querySelector('#tab-perfil .sub-tab-btn[data-subtab].active') as HTMLElement;
        const activeSubtabId = activeSubtabBtn ? activeSubtabBtn.getAttribute('data-subtab') : null;

        let activeIsAllowed = false;
        if (activeSubtabId) {
            if (activeSubtabId === 'subtab-cuenta' && allowCuenta) activeIsAllowed = true;
            if (activeSubtabId === 'subtab-personalizacion' && allowPers) activeIsAllowed = true;
        }

        if (!activeIsAllowed || !activeSubtabId) {
            let targetSubtab = '';
            if (allowCuenta) targetSubtab = 'subtab-cuenta';
            else if (allowPers) targetSubtab = 'subtab-personalizacion';

            if (targetSubtab) {
                this.setActiveSubtab(targetSubtab);
            }
        } else {
            this.setActiveSubtab(activeSubtabId);
        }
    }
}
