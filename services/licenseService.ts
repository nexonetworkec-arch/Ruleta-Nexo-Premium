import { StateManager, Security } from '../core';
import { isSupabaseConfigured, activateLicenseOnline, checkLicenseStatusOnline, syncConfigToSupabase } from '../supabase';
import { appWheel } from '../engine';

export const handleLicenseActivation = async (
    inputId: string,
    showCustomAlert: (message: string, title?: string) => void,
    renderSubscriptionDashboard: () => void,
    verifyGlobalLicense: () => Promise<void>
) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (!input) return;
    
    const key = input.value.trim();
    if (!key) return showCustomAlert("Por favor, ingrese una llave.", "ATENCIÓN");
    
    const currentEmail = sessionStorage.getItem('nexo_current_user_email') || '';

    showCustomAlert("Verificando la llave de activación con el servidor en línea de Supabase...", "PROCESANDO");

    if (isSupabaseConfigured) {
        try {
            const result = await activateLicenseOnline(key, currentEmail, Security.getDeviceId());
            if (result.success && result.license) {
                StateManager.config.license = result.license;
                StateManager.save();
                
                // Synchronize configuration update
                await syncConfigToSupabase(currentEmail, StateManager.config);

                appWheel.audio.init();
                showCustomAlert(`¡SISTEMA ACTIVADO EN LÍNEA!\nNivel: ${result.license.tier}\nExpira: ${new Date(result.license.expiryDate).toLocaleDateString()}`, "ÉXITO");
                renderSubscriptionDashboard();
                await verifyGlobalLicense();
                input.value = "";
                return;
            } else {
                return showCustomAlert(`ERROR DE ACTIVACIÓN EN LÍNEA:\n\n${result.error}`, "ERROR EN LÍNEA");
            }
        } catch (err: any) {
            console.error("Error al activar en línea:", err);
        }
    }

    // Fallback to offline algorithm validation
    const newLicense = Security.validateLicenseAlgorithm(key, currentEmail);
    if (newLicense) {
        StateManager.config.license = newLicense;
        StateManager.save();
        appWheel.audio.init();
        showCustomAlert(`¡SISTEMA ACTIVADO (MODO LOCAL)!\nNivel: ${newLicense.tier}\nExpira: ${new Date(newLicense.expiryDate).toLocaleDateString()}`, "ÉXITO (LOCAL)");
        renderSubscriptionDashboard();
        await verifyGlobalLicense();
        input.value = "";
    } else {
        showCustomAlert("ERROR: LLAVE DE ACTIVACIÓN INVÁLIDA O CORRUPTA.\n\nCausas probables:\n1. La llave no coincide con este dispositivo o no existe en el servidor en línea.\n2. La licencia pertenece a otro correo.\n3. Error de escritura.", "ERROR DE ACTIVACIÓN");
    }
};

export const verifyGlobalLicense = async (
    renderSubscriptionDashboard: () => void
) => {
    const license = StateManager.config.license;
    const currentEmail = sessionStorage.getItem('nexo_current_user_email') || '';
    
    if (isSupabaseConfigured && license.licenseKey && license.licenseKey !== 'TRIAL-MODE-LITE') {
        try {
            const status = await checkLicenseStatusOnline(license.licenseKey, currentEmail);
            if (status.success) {
                if (status.isValid && status.license) {
                    if (StateManager.config.license.tier !== status.license.tier || 
                        StateManager.config.license.expiryDate !== status.license.expiryDate) {
                        StateManager.config.license = status.license;
                        StateManager.save();
                        renderSubscriptionDashboard();
                    }
                } else {
                    if (StateManager.config.license.isActive) {
                        StateManager.config.license.isActive = false;
                        StateManager.config.license.expiryDate = new Date(Date.now() - 86400000).toISOString();
                        StateManager.save();
                        renderSubscriptionDashboard();
                    }
                }
            }
        } catch (e) {
            console.warn("No se pudo verificar el estado de la licencia en línea:", e);
        }
    }

    const updatedLicense = StateManager.config.license;
    const isExpired = new Date(updatedLicense.expiryDate) < new Date() || !updatedLicense.isActive;
    const modalLock = document.getElementById('modalLicenseLock');
    if (isExpired) {
        if (modalLock) modalLock.style.display = 'flex';
        const btnSpin = document.getElementById('btnSpinCenter');
        if (btnSpin) (btnSpin as HTMLButtonElement).disabled = true;
        
        const deviceIdDisplayLock = document.getElementById('nexoDeviceIdDisplayLock');
        if (deviceIdDisplayLock) deviceIdDisplayLock.innerText = Security.getDeviceId();
    } else {
        if (modalLock) modalLock.style.display = 'none';
        const btnSpin = document.getElementById('btnSpinCenter');
        if (btnSpin) (btnSpin as HTMLButtonElement).disabled = false;
    }
};
