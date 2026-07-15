/**
 * Ruleta Nexo Premium - MenuController
 * Controlador modular, desacoplado y escalable para el Botón de Menú (Menu Button).
 * Diseñado bajo arquitectura orientada a eventos para permitir integraciones futuras
 * (ej. logs, analíticas, telemetría, pausas de juego, integraciones de terceros).
 */

export type MenuEvent = 'menuOpened' | 'menuClosed' | 'beforeOpen' | 'securityChecked' | 'securityFailed';
export type MenuCallback = (...args: any[]) => void;

export interface MenuControllerOptions {
    menuSecurityEnabled: boolean;
    onOpen: () => void;
    onAuthRequired: (callback: () => void) => void;
}

export class MenuController {
    private static instance: MenuController;

    private isMenuOpen: boolean = false;
    private eventListeners: Map<MenuEvent, Set<MenuCallback>> = new Map();

    private constructor() {
        const events: MenuEvent[] = ['menuOpened', 'menuClosed', 'beforeOpen', 'securityChecked', 'securityFailed'];
        events.forEach(event => this.eventListeners.set(event, new Set()));
    }

    /**
     * Retorna la instancia única (Singleton) del controlador
     */
    public static getInstance(): MenuController {
        if (!MenuController.instance) {
            MenuController.instance = new MenuController();
        }
        return MenuController.instance;
    }

    // --- SISTEMA DE EVENTOS (Observer / PubSub) ---

    /**
     * Registra un callback para un evento específico
     */
    public on(event: MenuEvent, callback: MenuCallback): () => void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.add(callback);
        }
        return () => this.off(event, callback);
    }

    /**
     * Remueve un callback de un evento específico
     */
    public off(event: MenuEvent, callback: MenuCallback): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    /**
     * Emite un evento a todos los suscriptores registrados
     */
    private emit(event: MenuEvent, ...args: any[]): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`[MenuController Error] Error en el listener del evento '${event}':`, error);
                }
            });
        }
    }

    // --- ACCESORES Y ESTADO ---

    public isOpen(): boolean {
        return this.isMenuOpen;
    }

    public setMenuOpenState(open: boolean): void {
        if (this.isMenuOpen === open) return;
        this.isMenuOpen = open;
        this.emit(open ? 'menuOpened' : 'menuClosed');
    }

    /**
     * Controla la apertura del menú de forma segura y modular, validando
     * permisos y permitiendo que integraciones de terceros intercepten el flujo.
     */
    public handleOpenMenu(options: MenuControllerOptions): void {
        this.emit('beforeOpen');

        const proceedToOpen = () => {
            this.setMenuOpenState(true);
            options.onOpen();
        };

        if (options.menuSecurityEnabled) {
            options.onAuthRequired(() => {
                this.emit('securityChecked');
                proceedToOpen();
            });
        } else {
            proceedToOpen();
        }
    }
}

export const menuController = MenuController.getInstance();
