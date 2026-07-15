/**
 * Ruleta Nexo Premium - SpinController
 * Controlador modular y escalable para el Botón de Giro (Spin Button).
 * Diseñado bajo arquitectura orientada a eventos, desacoplado del DOM directo,
 * permitiendo futuras integraciones de terceros, analíticas, registros, SDKs y APIs.
 */

import { StateManager } from '../core';

export type SpinButtonState = 'idle' | 'spinning' | 'disabled' | 'lightning_auto' | 'registration_required' | 'guest_join';

export interface SpinButtonAesthetics {
    text: string;
    classesToAdd: string[];
    classesToRemove: string[];
    pointerEvents: 'auto' | 'none';
    color: string;
    fontSize: string;
    lineHeight: string;
    padding: string;
    fontWeight: string;
    textShadow: string;
    border: string;
    backgroundImage: string;
}

export type SpinEvent = 'spinRequested' | 'spinStarted' | 'spinCompleted' | 'stateChanged' | 'registrationTriggered';
export type SpinCallback = (...args: any[]) => void;

export class SpinController {
    private static instance: SpinController;

    // Estado interno
    private currentState: SpinButtonState = 'idle';
    private isSpinning: boolean = false;

    // Callbacks dinámicos (Patrón Observer / PubSub)
    private eventListeners: Map<SpinEvent, Set<SpinCallback>> = new Map();

    private constructor() {
        // Inicializar sets para eventos
        const events: SpinEvent[] = ['spinRequested', 'spinStarted', 'spinCompleted', 'stateChanged', 'registrationTriggered'];
        events.forEach(event => this.eventListeners.set(event, new Set()));
    }

    /**
     * Retorna la instancia única (Singleton) del controlador
     */
    public static getInstance(): SpinController {
        if (!SpinController.instance) {
            SpinController.instance = new SpinController();
        }
        return SpinController.instance;
    }

    // --- SISTEMA DE EVENTOS (Observer / PubSub) ---

    /**
     * Registra un callback para un evento específico
     */
    public on(event: SpinEvent, callback: SpinCallback): () => void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.add(callback);
        }
        // Retornar función para desuscribirse de forma limpia
        return () => this.off(event, callback);
    }

    /**
     * Remueve un callback de un evento específico
     */
    public off(event: SpinEvent, callback: SpinCallback): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    /**
     * Emite un evento a todos los suscriptores registrados
     */
    private emit(event: SpinEvent, ...args: any[]): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`[SpinController Error] Error en el listener del evento '${event}':`, error);
                }
            });
        }
    }

    // --- ACCESORES DE ESTADO ---

    public getSpinState(): SpinButtonState {
        return this.currentState;
    }

    public isWheelSpinning(): boolean {
        return this.isSpinning;
    }

    /**
     * Actualiza el estado de giro y notifica a los suscriptores
     */
    public setSpinning(spinning: boolean): void {
        if (this.isSpinning === spinning) return;
        this.isSpinning = spinning;
        
        if (spinning) {
            this.currentState = 'spinning';
            this.emit('spinStarted');
        } else {
            this.currentState = 'idle';
            this.emit('spinCompleted');
        }
        this.recalculateState();
    }

    /**
     * Dispara una solicitud de giro manual por el usuario.
     * Cualquier middleware o módulo futuro (ej. anti-cheat, validación externa, etc.) puede engancharse aquí.
     */
    public requestSpin(options: { 
        isGuestMode: boolean;
        guestRegistrationRequired: boolean;
        isGuestRegistered: boolean;
        hasRegisteredLocally: boolean;
        guestRaffleMode: boolean;
        onConfirmRegistration: () => void;
        onStartSpin: () => void;
    }): void {
        this.emit('spinRequested', options);

        if (this.isSpinning) return;

        // Validar si el juego actual es juego relámpago
        if (StateManager.config.activeSavedListId === "list_lightning_game") {
            // No permitir giro manual
            return;
        }

        // Determinar registro
        const isRegistered = options.isGuestMode 
            ? (!options.guestRegistrationRequired || options.isGuestRegistered)
            : (!StateManager.config.localRequireRegister || options.hasRegisteredLocally);

        if (isRegistered) {
            options.onStartSpin();
        } else if (options.isGuestMode && options.guestRegistrationRequired) {
            // Se requiere registro de invitado
            this.emit('registrationTriggered', { type: 'guest' });
            options.onConfirmRegistration();
        } else {
            // Se requiere registro local
            this.emit('registrationTriggered', { type: 'local' });
            options.onConfirmRegistration();
        }
    }

    /**
     * Calcula la estética y atributos CSS recomendados para el botón basados en el estado del juego actual.
     * Retorna un objeto desacoplado con la definición estética, permitiendo que cualquier UI (React, HTML nativo, Web Components) lo aplique libremente.
     */
    public calculateAesthetics(params: {
        isGuestMode: boolean;
        guestRegistrationRequired: boolean;
        isGuestRegistered: boolean;
        hasRegisteredLocally: boolean;
        guestRaffleMode: boolean;
        logoUrl?: string;
    }): SpinButtonAesthetics {
        
        // 1. Caso: Está Girando
        if (this.isSpinning) {
            return {
                text: "GIRANDO",
                classesToAdd: ['btn-spin-disabled'],
                classesToRemove: ['btn-spin-pulse-active'],
                pointerEvents: 'none',
                color: '#999',
                fontSize: '0.75rem',
                lineHeight: '1.2',
                padding: '4px',
                fontWeight: 'bold',
                textShadow: 'none',
                border: 'none',
                backgroundImage: 'none'
            };
        }

        // 2. Caso: Juego Relámpago (Automático)
        if (StateManager.config.activeSavedListId === "list_lightning_game") {
            return {
                text: "AUTO",
                classesToAdd: ['btn-spin-disabled'],
                classesToRemove: ['btn-spin-pulse-active'],
                pointerEvents: 'none',
                color: '#ef4444',
                fontSize: '',
                lineHeight: '',
                padding: '',
                fontWeight: '',
                textShadow: '',
                border: '',
                backgroundImage: 'none'
            };
        }

        // Determinar si ya está registrado
        const isRegistered = params.isGuestMode 
            ? (!params.guestRegistrationRequired || params.isGuestRegistered)
            : (!StateManager.config.localRequireRegister || params.hasRegisteredLocally);

        // 3. Caso: Registrado (Listo para girar o unirse)
        if (isRegistered) {
            return {
                text: params.guestRaffleMode ? "UNIRSE" : "¡GIRAR!",
                classesToAdd: ['btn-spin-pulse-active'],
                classesToRemove: ['btn-spin-disabled'],
                pointerEvents: 'auto',
                color: '#ffffff',
                fontSize: params.guestRaffleMode ? '0.8rem' : '0.95rem',
                lineHeight: '1.2',
                padding: '4px',
                fontWeight: '900',
                textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.9)',
                border: 'none',
                backgroundImage: 'none'
            };
        }

        // 4. Caso: Modo Invitado con registro pendiente
        if (params.isGuestMode && params.guestRegistrationRequired) {
            return {
                text: "REGISTRO",
                classesToAdd: ['btn-spin-pulse-active'],
                classesToRemove: ['btn-spin-disabled'],
                pointerEvents: 'auto',
                color: '#ffffff',
                fontSize: '0.8rem',
                lineHeight: '1.2',
                padding: '4px',
                fontWeight: '900',
                textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.9)',
                border: 'none',
                backgroundImage: 'none'
            };
        }

        // 5. Caso: Estado por defecto o con logotipo personalizado
        let url = params.logoUrl;
        if (url === undefined) {
            const themeId = StateManager.config.themeId;
            const current = StateManager.config.themeCustomizations[themeId];
            url = current ? current.logo : "";
        }

        if (url && url.trim() !== "") {
            return {
                text: "",
                classesToAdd: ['btn-spin-pulse-active'],
                classesToRemove: ['btn-spin-disabled'],
                pointerEvents: 'auto',
                color: 'transparent',
                fontSize: '',
                lineHeight: '',
                padding: '',
                fontWeight: '',
                textShadow: '',
                border: '',
                backgroundImage: `url(${url})`
            };
        } else {
            return {
                text: "GIRAR",
                classesToAdd: ['btn-spin-pulse-active'],
                classesToRemove: ['btn-spin-disabled'],
                pointerEvents: 'auto',
                color: '#ffffff',
                fontSize: '',
                lineHeight: '',
                padding: '',
                fontWeight: '',
                textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.9)',
                border: '',
                backgroundImage: 'none'
            };
        }
    }

    /**
     * Fuerza un recálculo manual del estado y gatilla el evento stateChanged
     */
    public recalculateState(logoUrl?: string): void {
        this.emit('stateChanged', logoUrl);
    }
}

export const spinController = SpinController.getInstance();
