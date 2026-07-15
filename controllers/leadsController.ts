/**
 * Ruleta Nexo Premium - LeadsController
 * Controlador modular, desacoplado y reactivo de captura de Leads.
 * Diseñado bajo arquitectura orientada a eventos para permitir integraciones futuras
 * con sistemas de terceros, automatizaciones (ej. Zapier, Make, CRMs como HubSpot, ActiveCampaign, etc.).
 */

import { StateManager } from '../core';
import { LeadData, WinnerEntry } from '../config';

export type LeadsEvent = 
    | 'beforeCapture' | 'leadCaptured' | 'captureFailed'
    | 'beforePurge' | 'leadsPurged' 
    | 'beforeExport' | 'leadsExported' | 'exportFailed';

export type LeadsCallback = (...args: any[]) => void;

export interface LeadValidationResult {
    isValid: boolean;
    message?: string;
}

export class LeadsController {
    private static instance: LeadsController;
    private eventListeners: Map<LeadsEvent, Set<LeadsCallback>> = new Map();
    private fieldValidators: Map<string, Array<(value: string) => LeadValidationResult>> = new Map();

    private constructor() {
        const events: LeadsEvent[] = [
            'beforeCapture', 'leadCaptured', 'captureFailed',
            'beforePurge', 'leadsPurged',
            'beforeExport', 'leadsExported', 'exportFailed'
        ];
        events.forEach(event => this.eventListeners.set(event, new Set()));
        this.registerDefaultValidators();
    }

    /**
     * Retorna la instancia única (Singleton) del controlador de Leads
     */
    public static getInstance(): LeadsController {
        if (!LeadsController.instance) {
            LeadsController.instance = new LeadsController();
        }
        return LeadsController.instance;
    }

    // --- SISTEMA DE EVENTOS (Observer / PubSub) ---

    /**
     * Suscribe un callback a un evento de Leads
     */
    public on(event: LeadsEvent, callback: LeadsCallback): () => void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.add(callback);
        }
        return () => this.off(event, callback);
    }

    /**
     * Remueve la suscripción de un callback a un evento de Leads
     */
    public off(event: LeadsEvent, callback: LeadsCallback): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    /**
     * Emite un evento con sus argumentos correspondientes
     */
    public emit(event: LeadsEvent, ...args: any[]): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`[LeadsController Error] Error en listener para evento '${event}':`, error);
                }
            });
        }
    }

    // --- PIPELINE DE VALIDACIÓN MODULAR DE CAMPOS ---

    /**
     * Agrega un validador personalizado para un campo específico del formulario de leads
     */
    public addFieldValidator(fieldId: string, validator: (value: string) => LeadValidationResult): void {
        if (!this.fieldValidators.has(fieldId)) {
            this.fieldValidators.set(fieldId, []);
        }
        this.fieldValidators.get(fieldId)!.push(validator);
    }

    /**
     * Valida un campo en tiempo real o en submit
     */
    public validateField(fieldId: string, value: string): LeadValidationResult {
        const validators = this.fieldValidators.get(fieldId);
        if (validators) {
            for (const val of validators) {
                const res = val(value);
                if (!res.isValid) return res;
            }
        }
        return { isValid: true };
    }

    /**
     * Registra validadores por defecto de forma modular para campos típicos (email, telefono)
     */
    private registerDefaultValidators(): void {
        // Validador modular para correos electrónicos
        this.addFieldValidator('email', (val) => {
            if (!val.trim()) {
                return { isValid: false, message: 'El correo electrónico no puede estar vacío.' };
            }
            if (!val.includes('@') || !val.includes('.')) {
                return { isValid: false, message: 'Por favor, ingresa un correo electrónico válido.' };
            }
            return { isValid: true };
        });

        // Validador modular para números telefónicos
        this.addFieldValidator('telefono', (val) => {
            if (!val.trim()) {
                return { isValid: false, message: 'El número de teléfono no puede estar vacío.' };
            }
            if (val.length < 7) {
                return { isValid: false, message: 'El número de teléfono debe tener al menos 7 dígitos.' };
            }
            return { isValid: true };
        });
    }

    // --- ACCIONES CORE DESACOPLADAS ---

    /**
     * Procesa y registra un lead de forma modular
     */
    public captureLead(lead: LeadData): { success: boolean; message?: string } {
        try {
            this.emit('beforeCapture', lead);

            // Validar todos los campos del lead de acuerdo a sus validadores
            for (const [fieldId, val] of Object.entries(lead)) {
                const validation = this.validateField(fieldId, val);
                if (!validation.isValid) {
                    this.emit('captureFailed', { lead, error: validation.message });
                    return { success: false, message: validation.message };
                }
            }

            this.emit('leadCaptured', lead);
            return { success: true };
        } catch (error: any) {
            this.emit('captureFailed', { lead, error: error?.message || error });
            return { success: false, message: error?.message || 'Error desconocido al registrar el lead.' };
        }
    }

    /**
     * Purga de manera segura el historial de leads en StateManager
     */
    public purgeLeadsHistory(onConfirm: () => void): void {
        this.emit('beforePurge');
        try {
            StateManager.config.winnersHistory = [];
            StateManager.save();
            onConfirm();
            this.emit('leadsPurged');
        } catch (error) {
            console.error('[LeadsController] Error al purgar historial:', error);
        }
    }

    /**
     * Ejecuta una exportación de leads notificando de forma modular
     */
    public exportLeads(format: 'csv' | 'txt' | 'img', exportFn: () => void): void {
        this.emit('beforeExport', format);
        try {
            exportFn();
            this.emit('leadsExported', format);
        } catch (error: any) {
            this.emit('exportFailed', { format, error: error?.message || error });
        }
    }
}

export const leadsController = LeadsController.getInstance();
