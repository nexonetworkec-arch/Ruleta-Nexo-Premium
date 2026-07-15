// ==========================================================
// NEXO SUPER ADMIN CONTROLLER (MODULAR DELEGATION ENGINE)
// ==========================================================

import { checkIfSuperAdmin } from '../supabase';

export const initSuperAdminHandlers = (
    showCustomAlert: (msg: string, title?: string) => void,
    showCustomConfirm: (msg: string, onConfirm: () => void) => void
) => {
    const btnTab = document.getElementById('btnTabSuperAdmin');
    
    const checkVisibility = async () => {
        const currentEmail = (sessionStorage.getItem('nexo_current_user_email') || '').toLowerCase();
        if (!currentEmail) {
            if (btnTab) btnTab.style.display = 'none';
            return;
        }
        
        // Verificar contra la base de datos de manera dinámica y en tiempo real
        const authorized = await checkIfSuperAdmin(currentEmail);
        if (authorized && btnTab) {
            btnTab.style.display = 'block';
        } else if (btnTab) {
            btnTab.style.display = 'none';
        }
    };

    // Validar visibilidad inicial de manera dinámica
    checkVisibility();

    // Escuchar cambio a la pestaña Super Admin para refrescar el componente modular reactivo
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            if (target === 'tab-superadmin') {
                const superAdminEl = document.querySelector('nexo-super-admin') as any;
                if (superAdminEl && typeof superAdminEl.refreshAll === 'function') {
                    superAdminEl.refreshAll();
                }
            }
        });
    });
};

export const registerSuperAdminGlobals = (
    showCustomAlert: (msg: string, title?: string) => void,
    showCustomConfirm: (msg: string, onConfirm: () => void) => void
) => {
    // No-op to maintain compatibility, since <nexo-super-admin> is 100% self-contained and modular
};
