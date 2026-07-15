import { StateManager } from '../core';
import { AuditLogRegistry } from '../controllers/sistemaController';

export const addAuditEntry = (action: string, dispatchFn?: () => void) => {
    if (!StateManager.config.auditLog) {
        StateManager.config.auditLog = [];
    }
    const timestamp = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logEntry = { action, timestamp };
    StateManager.config.auditLog.unshift(logEntry);
    
    // Limit log to the last 60 entries for memory efficiency
    if (StateManager.config.auditLog.length > 60) {
        StateManager.config.auditLog = StateManager.config.auditLog.slice(0, 60);
    }
    StateManager.save();

    // Trigger registered audit log sinks/interceptors (modular extension points)
    AuditLogRegistry.notifySinks(logEntry);

    if (dispatchFn) {
        dispatchFn();
    }
};


export const optimizeStorage = (
    showCustomConfirm: (msg: string, onConfirm: () => void) => void,
    showCustomAlert: (msg: string, title: string) => void,
    dispatchFn?: () => void
) => {
    showCustomConfirm("¿Deseas optimizar la base de datos de la ruleta? Esto purgará el registro de auditoría antiguo y comprimirá el historial si excede límites.", () => {
        let actionsCount = 0;
        let prunedHistory = false;
        
        // 1. Limit history if excessive (> 150 records)
        if (StateManager.config.winnersHistory && StateManager.config.winnersHistory.length > 150) {
            StateManager.config.winnersHistory = StateManager.config.winnersHistory.slice(0, 100);
            prunedHistory = true;
            actionsCount++;
        }
        
        // 2. Clean audit log
        if (StateManager.config.auditLog && StateManager.config.auditLog.length > 5) {
            StateManager.config.auditLog = StateManager.config.auditLog.slice(0, 5);
            actionsCount++;
        }
        
        StateManager.save();
        if (dispatchFn) {
            dispatchFn();
        }
        
        let msg = "¡Optimización exitosa! La memoria ha sido defragmentada.";
        if (prunedHistory) msg += " Se redujo el historial excesivo para conservar espacio seguro.";
        
        showCustomAlert(msg, "SISTEMA OPTIMIZADO");
        addAuditEntry(`[ÉXITO] Base de datos local optimizada. Acciones de compresión: ${actionsCount}`, dispatchFn);
    });
};
