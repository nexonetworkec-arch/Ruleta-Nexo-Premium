/**
 * Ruleta Nexo Premium - FullscreenController
 * Controlador de pantalla completa 100% modular, desacoplado y orientado a eventos.
 * Permite integraciones futuras con analíticas, telemetría o gestores de estado externos.
 */

export type FullscreenEvent = 'stateChanged' | 'error' | 'notSupported';
export type FullscreenCallback = (...args: any[]) => void;

export class FullscreenController {
    private static instance: FullscreenController;
    private eventListeners: Map<FullscreenEvent, Set<FullscreenCallback>> = new Map();

    private constructor() {
        const events: FullscreenEvent[] = ['stateChanged', 'error', 'notSupported'];
        events.forEach(event => this.eventListeners.set(event, new Set()));
        
        // Escuchar el evento nativo para sincronizar el estado
        document.addEventListener('fullscreenchange', () => {
            this.emit('stateChanged', this.isFullscreen());
        });
        document.addEventListener('webkitfullscreenchange', () => {
            this.emit('stateChanged', this.isFullscreen());
        });
    }

    public static getInstance(): FullscreenController {
        if (!FullscreenController.instance) {
            FullscreenController.instance = new FullscreenController();
        }
        return FullscreenController.instance;
    }

    // --- SISTEMA DE EVENTOS ---

    public on(event: FullscreenEvent, callback: FullscreenCallback): () => void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.add(callback);
        }
        return () => this.off(event, callback);
    }

    public off(event: FullscreenEvent, callback: FullscreenCallback): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    private emit(event: FullscreenEvent, ...args: any[]): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`[FullscreenController Error] Error en listener '${event}':`, error);
                }
            });
        }
    }

    // --- ACCIONES Y ESTADO ---

    public isFullscreen(): boolean {
        return !!(
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).mozFullScreenElement ||
            (document as any).msFullscreenElement
        );
    }

    /**
     * Alterna el estado de pantalla completa
     */
    public toggle(): Promise<void> {
        if (this.isFullscreen()) {
            return this.exit();
        } else {
            return this.enter();
        }
    }

    /**
     * Activa la pantalla completa en el elemento raíz (document.documentElement)
     */
    public enter(): Promise<void> {
        const docEl = document.documentElement as any;
        const requestMethod = docEl.requestFullscreen || 
                              docEl.webkitRequestFullscreen || 
                              docEl.webkitRequestFullScreen ||
                              docEl.mozRequestFullScreen || 
                              docEl.msRequestFullscreen;

        if (requestMethod) {
            return requestMethod.call(docEl).catch((err: any) => {
                this.emit('error', err);
                throw err;
            });
        } else {
            this.emit('notSupported');
            return Promise.reject(new Error('Fullscreen API no soportada en este navegador.'));
        }
    }

    /**
     * Sale de la pantalla completa
     */
    public exit(): Promise<void> {
        const doc = document as any;
        const exitMethod = doc.exitFullscreen || 
                           doc.webkitExitFullscreen || 
                           doc.webkitCancelFullScreen ||
                           doc.mozCancelFullScreen || 
                           doc.msExitFullscreen;

        if (exitMethod) {
            return exitMethod.call(doc).catch((err: any) => {
                this.emit('error', err);
                throw err;
            });
        } else {
            this.emit('notSupported');
            return Promise.reject(new Error('Fullscreen API no soportada en este navegador.'));
        }
    }

    /**
     * Configura el gesto de doble clic/toque en áreas vacías para alternar pantalla completa.
     * Ignora elementos interactivos (botones, formularios, modales, etc.).
     */
    public setupDoubleTapGesture(element: HTMLElement = document.body): void {
        let lastTap = 0;

        const handleDoubleInteraction = (e: Event) => {
            if (e.target) {
                const target = e.target as HTMLElement;
                // Ignorar si se hace clic dentro de campos interactivos, botones, modales, menús o login
                if (
                    target.id === 'btnOpenMenu' || target.closest('#btnOpenMenu') ||
                    target.id === 'loginScreen' || target.closest('#loginScreen') ||
                    target.id === 'modalConfig' || target.closest('#modalConfig') ||
                    target.id === 'modalWinner' || target.closest('#modalWinner') ||
                    ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A', 'LABEL'].includes(target.tagName)
                ) {
                    return;
                }
            }

            this.toggle().catch(() => {});
        };

        // Soporte para computadoras (doble clic)
        element.addEventListener('dblclick', (e) => {
            handleDoubleInteraction(e);
        });

        // Soporte de doble toque fluido para dispositivos móviles (evitando retardos)
        element.addEventListener('touchstart', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                e.preventDefault(); // Evitar el zoom por defecto del móvil
                handleDoubleInteraction(e);
            }
            lastTap = currentTime;
        }, { passive: false });
    }
}

export const fullscreenController = FullscreenController.getInstance();
