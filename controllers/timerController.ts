/**
 * Ruleta Nexo Premium - TimerController
 * Controlador modular y escalable del Temporizador / Cuenta Regresiva.
 * Diseñado bajo arquitectura orientada a eventos para permitir integraciones futuras sin acoplamiento.
 */

import { StateManager } from '../core';

export type TimerPhase = 'normal' | 'warning' | 'danger';

export interface TimerState {
    timeRemaining: number;
    isRunning: boolean;
    scheduleTime: number | null;
}

export type TimerEvent = 'start' | 'stop' | 'tick' | 'reset' | 'expire' | 'phaseChange' | 'scheduleUpdate';
export type TimerCallback = (...args: any[]) => void;

export class TimerController {
    private static instance: TimerController;

    // Estado interno del temporizador
    private timeRemaining: number = 180; // 3 minutos por defecto en segundos
    private isRunning: boolean = false;
    private scheduleTime: number | null = null;

    // Intervalos
    private timerIntervalId: any = null;
    private scheduleIntervalId: any = null;

    // Callbacks dinámicos para desacoplamiento total (Patrón Observer)
    private eventListeners: Map<TimerEvent, Set<TimerCallback>> = new Map();

    // Umbrales para las fases del temporizador (Configurables y escalables)
    private warningThreshold: number = 15; // <= 15s es Fase de Advertencia (Warning)
    private dangerThreshold: number = 5;   // <= 5s es Fase de Peligro (Danger)
    private currentPhase: TimerPhase = 'normal';

    private constructor() {
        // Inicializar sets para eventos
        const events: TimerEvent[] = ['start', 'stop', 'tick', 'reset', 'expire', 'phaseChange', 'scheduleUpdate'];
        events.forEach(event => this.eventListeners.set(event, new Set()));
    }

    /**
     * Retorna la instancia única (Singleton) del controlador
     */
    public static getInstance(): TimerController {
        if (!TimerController.instance) {
            TimerController.instance = new TimerController();
        }
        return TimerController.instance;
    }

    // --- MANEJO DE EVENTOS (Patrón Pub/Sub / Observer) ---

    /**
     * Registra un callback para escuchar un evento específico
     */
    public on(event: TimerEvent, callback: TimerCallback): () => void {
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
    public off(event: TimerEvent, callback: TimerCallback): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    /**
     * Emite un evento a todos los suscriptores registrados
     */
    private emit(event: TimerEvent, ...args: any[]): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`[TimerController Error] Error en listener del evento '${event}':`, error);
                }
            });
        }
    }

    // --- ACCESORES DE ESTADO (Getters / Setters) ---

    public getTimeRemaining(): number {
        return this.timeRemaining;
    }

    public isTimerRunning(): boolean {
        return this.isRunning;
    }

    public getScheduleTime(): number | null {
        return this.scheduleTime;
    }

    /**
     * Establece el tiempo restante en segundos directamente
     */
    public setTimeRemaining(seconds: number): void {
        this.timeRemaining = Math.max(0, seconds);
        this.updatePhase();
        this.emit('tick', this.timeRemaining);
    }

    /**
     * Configura el temporizador a partir de minutos
     */
    public setDurationMinutes(minutes: number): void {
        this.setTimeRemaining(Math.round(minutes * 60));
    }

    // --- ACCIONES PRINCIPALES ---

    /**
     * Inicia el temporizador de forma asíncrona
     */
    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;

        // Si el tiempo se agotó previamente, restablecer al límite por defecto
        if (this.timeRemaining <= 0) {
            const lightningGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_lightning_game");
            const limitMin = lightningGame ? lightningGame.publicTimeLimit || StateManager.config.publicTimeLimit || 3 : StateManager.config.publicTimeLimit || 3;
            this.timeRemaining = limitMin * 60;
        }

        this.updatePhase();
        this.emit('start', this.timeRemaining);
        this.emit('tick', this.timeRemaining);

        this.timerIntervalId = setInterval(() => {
            if (this.timeRemaining > 0) {
                this.timeRemaining--;
                this.updatePhase();
                this.emit('tick', this.timeRemaining);
            } else {
                this.expire();
            }
        }, 1000);
    }

    /**
     * Pausa / Detiene el temporizador
     */
    public stop(): void {
        if (this.timerIntervalId) {
            clearInterval(this.timerIntervalId);
            this.timerIntervalId = null;
        }
        this.isRunning = false;
        this.emit('stop', this.timeRemaining);
    }

    /**
     * Reinicia el temporizador según la configuración activa de tiempo del juego relámpago
     */
    public reset(): void {
        this.stop();
        
        const lightningGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_lightning_game");
        const limitMin = lightningGame ? lightningGame.publicTimeLimit || StateManager.config.publicTimeLimit || 3 : StateManager.config.publicTimeLimit || 3;
        this.timeRemaining = Math.round(limitMin * 60);
        
        this.updatePhase();
        this.emit('reset', this.timeRemaining);
        this.emit('tick', this.timeRemaining);
    }

    /**
     * Incrementa o decrementa el tiempo restante en una cantidad de segundos
     */
    public adjustTime(seconds: number): void {
        this.timeRemaining = Math.max(0, this.timeRemaining + seconds);
        this.updatePhase();
        this.emit('tick', this.timeRemaining);
    }

    /**
     * Finaliza la cuenta regresiva e inicia la acción de expiración
     */
    private expire(): void {
        this.stop();
        this.currentPhase = 'normal';
        this.emit('expire');
    }

    // --- CONTROL DE FASES Y SEÑALES VISUALES ---

    /**
     * Determina en qué fase se encuentra el temporizador y notifica en caso de cambio
     */
    private updatePhase(): void {
        let newPhase: TimerPhase = 'normal';

        if (this.timeRemaining <= this.dangerThreshold) {
            newPhase = 'danger';
        } else if (this.timeRemaining <= this.warningThreshold) {
            newPhase = 'warning';
        }

        if (newPhase !== this.currentPhase) {
            const oldPhase = this.currentPhase;
            this.currentPhase = newPhase;
            this.emit('phaseChange', newPhase, oldPhase, this.timeRemaining);
        }
    }

    public getCurrentPhase(): TimerPhase {
        return this.currentPhase;
    }

    // --- PROGRAMACIÓN DE INICIO AUTOMÁTICO (SCHEDULED RUN) ---

    /**
     * Configura u programa una fecha y hora futura para inicio automático
     */
    public setScheduleTime(timestamp: number | null, onTriggerCallback?: () => void): void {
        if (this.scheduleIntervalId) {
            clearInterval(this.scheduleIntervalId);
            this.scheduleIntervalId = null;
        }

        this.scheduleTime = timestamp;
        this.emit('scheduleUpdate', this.scheduleTime);

        if (this.scheduleTime) {
            this.scheduleIntervalId = setInterval(() => {
                const now = Date.now();
                if (this.scheduleTime && now >= this.scheduleTime) {
                    this.triggerScheduledRun(onTriggerCallback);
                } else {
                    this.emit('scheduleUpdate', this.scheduleTime);
                }
            }, 1000);
        }
    }

    /**
     * Ejecuta la activación programada del juego
     */
    private triggerScheduledRun(onTriggerCallback?: () => void): void {
        if (this.scheduleIntervalId) {
            clearInterval(this.scheduleIntervalId);
            this.scheduleIntervalId = null;
        }
        this.scheduleTime = null;
        this.emit('scheduleUpdate', null);
        
        if (onTriggerCallback) {
            try {
                onTriggerCallback();
            } catch (e) {
                console.error("[TimerController] Error al disparar el callback programado:", e);
            }
        }
    }

    /**
     * Cancela la programación actual
     */
    public cancelSchedule(): void {
        if (this.scheduleIntervalId) {
            clearInterval(this.scheduleIntervalId);
            this.scheduleIntervalId = null;
        }
        this.scheduleTime = null;
        this.emit('scheduleUpdate', null);
    }
}

// Exportar instancia Singleton por defecto
export const timerController = TimerController.getInstance();
