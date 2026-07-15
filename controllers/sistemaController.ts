import { StateManager } from '../core';
import { isSupabaseConfigured, testSupabaseConnection } from '../supabase';

// ==========================================
// 1. SYSTEM TABS & MODULES EXTENSION API
// ==========================================
export interface SistemaModule {
    id: string;
    title: string;
    icon: string;
    description: string;
    render: () => string;
    init?: (container: HTMLElement) => void;
}

export interface SistemaCallbacks {
    executeWithAuth: (callback: () => void) => void;
    showCustomConfirm: (message: string, onConfirm: () => void) => void;
    showCustomAlert: (message: string, title?: string) => void;
    renderAuditLogs: () => void;
    updateStorageUsage: () => void;
}

// ==========================================
// 2. STORAGE MONITOR EXTENSION API (MODULAR)
// ==========================================
export interface StorageProvider {
    id: string;
    name: string;
    getUsageBytes: () => Promise<number> | number;
    getLimitBytes: () => Promise<number> | number;
    optimize: () => Promise<void> | void;
}

class StorageMonitorRegistryClass {
    private providers: StorageProvider[] = [];

    constructor() {
        // Register default LocalStorage provider
        this.registerProvider({
            id: 'localstorage',
            name: 'LocalStorage (Navegador)',
            getUsageBytes: () => {
                let totalBytes = 0;
                try {
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key) {
                            totalBytes += (localStorage.getItem(key) || "").length * 2; // UTF-16 approximation
                        }
                    }
                } catch (e) {
                    console.error("Error calculando LocalStorage:", e);
                }
                return totalBytes;
            },
            getLimitBytes: () => 5 * 1024 * 1024, // Standard 5MB limit
            optimize: async () => {
                window.dispatchEvent(new CustomEvent('nexo-optimize-storage'));
            }
        });
    }

    public registerProvider(provider: StorageProvider) {
        this.providers = this.providers.filter(p => p.id !== provider.id);
        this.providers.push(provider);
        this.notifyChange();
    }

    public unregisterProvider(id: string) {
        this.providers = this.providers.filter(p => p.id !== id);
        this.notifyChange();
    }

    public getProviders(): StorageProvider[] {
        return [...this.providers];
    }

    private notifyChange() {
        window.dispatchEvent(new Event('nexo-state-change'));
        window.dispatchEvent(new Event('nexo-storage-change'));
    }
}
export const StorageMonitorRegistry = new StorageMonitorRegistryClass();

// ==========================================
// 3. OBSERVABILITY PANEL EXTENSION API (MODULAR)
// ==========================================
export interface MetricProvider {
    id: string;
    label: string;
    value: () => string | number;
    category?: 'performance' | 'database' | 'network' | 'custom';
}

class ObservabilityRegistryClass {
    private providers: MetricProvider[] = [];

    public registerProvider(provider: MetricProvider) {
        this.providers = this.providers.filter(p => p.id !== provider.id);
        this.providers.push(provider);
        this.notifyChange();
    }

    public unregisterProvider(id: string) {
        this.providers = this.providers.filter(p => p.id !== id);
        this.notifyChange();
    }

    public getProviders(): MetricProvider[] {
        return [...this.providers];
    }

    private notifyChange() {
        window.dispatchEvent(new CustomEvent('nexo-custom-metrics-update'));
    }
}
export const ObservabilityRegistry = new ObservabilityRegistryClass();

// ==========================================
// 4. AUDIT LOG EXTENSION API (MODULAR)
// ==========================================
export interface AuditLogSink {
    id: string;
    onLogAdded: (log: { timestamp: string; action: string }) => void;
}

class AuditLogRegistryClass {
    private sinks: AuditLogSink[] = [];

    public registerSink(sink: AuditLogSink) {
        this.sinks = this.sinks.filter(s => s.id !== sink.id);
        this.sinks.push(sink);
    }

    public unregisterSink(id: string) {
        this.sinks = this.sinks.filter(s => s.id !== id);
    }

    public notifySinks(log: { timestamp: string; action: string }) {
        this.sinks.forEach(s => {
            try {
                s.onLogAdded(log);
            } catch (err) {
                console.error(`Error notifying audit sink ${s.id}:`, err);
            }
        });
    }
}
export const AuditLogRegistry = new AuditLogRegistryClass();

// ==========================================
// 5. CLOUD DIAGNOSTIC STEPS API (MODULAR)
// ==========================================
export interface DiagnosticStep {
    id: string;
    name: string;
    description: string;
    run: () => Promise<{ success: boolean; message: string; details?: string }>;
}

class CloudDiagnosticRegistryClass {
    private steps: DiagnosticStep[] = [];

    constructor() {
        // Default core Supabase connectivity test
        this.registerStep({
            id: 'supabase-ping',
            name: 'Supabase API Ping',
            description: 'Verifica la resolución de DNS, el ping HTTPS y la autenticación anónima con Supabase.',
            run: async () => {
                const res = await testSupabaseConnection();
                return {
                    success: res.success,
                    message: res.message,
                    details: res.details
                };
            }
        });
    }

    public registerStep(step: DiagnosticStep) {
        this.steps = this.steps.filter(s => s.id !== step.id);
        this.steps.push(step);
    }

    public unregisterStep(id: string) {
        this.steps = this.steps.filter(s => s.id !== id);
    }

    public getSteps(): DiagnosticStep[] {
        return [...this.steps];
    }
}
export const CloudDiagnosticRegistry = new CloudDiagnosticRegistryClass();


// ==========================================
// MAIN SYSTEM MODULE CONTROLLER
// ==========================================
class SistemaControllerClass {
    private modules: SistemaModule[] = [];
    private callbacks: SistemaCallbacks | null = null;
    private initialized = false;

    constructor() {
        this.registerDefaultModules();
    }

    /**
     * Registers a new module dynamically in the System Tab.
     */
    public registerModule(module: SistemaModule) {
        if (this.modules.some(m => m.id === module.id)) {
            console.warn(`System module with ID "${module.id}" is already registered. Overwriting.`);
            this.modules = this.modules.filter(m => m.id !== module.id);
        }
        this.modules.push(module);

        if (this.initialized) {
            this.render();
        }
    }

    /**
     * Initializes the entire System module.
     */
    public init(callbacks: SistemaCallbacks) {
        this.callbacks = callbacks;
        this.initialized = true;
        this.render();
    }

    /**
     * Renders all registered modules inside the `#sistema-modules-grid` container.
     */
    public render() {
        const grid = document.getElementById('sistema-modules-grid');
        if (!grid) {
            console.warn("Container '#sistema-modules-grid' not found in DOM.");
            return;
        }

        grid.innerHTML = '';

        this.modules.forEach(m => {
            const card = document.createElement('div');
            card.className = 'config-section';
            card.id = `system-card-${m.id}`;
            card.style.border = '1px solid rgba(212,175,55,0.15)';
            card.style.background = 'rgba(0,0,0,0.4)';
            card.style.borderRadius = '20px';
            card.style.padding = '22px';
            card.style.backdropFilter = 'blur(5px)';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'space-between';
            card.style.minHeight = '280px';

            card.innerHTML = `
                <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                        <span style="font-size: 1.2rem;">${m.icon}</span>
                        <h4 style="margin: 0; font-size: 0.9rem; color: var(--gold); font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${m.title}</h4>
                    </div>
                    <p style="font-size: 0.65rem; color: #888; margin-bottom: 15px; line-height: 1.4;">${m.description}</p>
                    <div id="module-container-${m.id}">
                        ${m.render()}
                    </div>
                </div>
            `;

            grid.appendChild(card);

            // Execute custom init lifecycle of the module if defined
            const contentContainer = document.getElementById(`module-container-${m.id}`);
            if (contentContainer && m.init) {
                try {
                    m.init(contentContainer);
                } catch (err) {
                    console.error(`Error initializing system module ${m.id}:`, err);
                }
            }
        });
    }

    /**
     * Unregisters a module.
     */
    public unregisterModule(id: string) {
        this.modules = this.modules.filter(m => m.id !== id);
        if (this.initialized) {
            this.render();
        }
    }

    /**
     * Registers all core default system tab modules.
     */
    private registerDefaultModules() {
        // 1. Storage monitor
        this.registerModule({
            id: 'storage-monitor',
            title: 'Consumo de Memoria Local',
            icon: '💾',
            description: 'Monitorea la cantidad de memoria utilizada por los activos multimedia del juego (como imágenes y videos personalizados) en la base de datos local IndexedDB.',
            render: () => `
                <nexo-storage-monitor id="storageMonitor" style="display: block;"></nexo-storage-monitor>
            `
        });

        // 2. Observability panel
        this.registerModule({
            id: 'observability-panel',
            title: 'Observabilidad y Telemetría',
            icon: '📈',
            description: 'Métricas de rendimiento en tiempo real de renderizado del canvas, latencia de eventos y asignación de hilos del motor de física de la ruleta.',
            render: () => `
                <nexo-observability-panel id="observabilityPanel" style="display: block;"></nexo-observability-panel>
            `
        });

        // 3. Supabase syncing & diagnostic
        this.registerModule({
            id: 'supabase-sync',
            title: 'Nube & Multidispositivo (Supabase)',
            icon: '☁️',
            description: 'Establece y valida la sincronización en tiempo real para replicar la ruleta, las licencias, partidas y las cuentas de colaboradores en la nube.',
            render: () => `
                <div style="background: #000; padding: 20px; border-radius: 20px; border: 1px solid #222;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <p style="color: #666; font-size: 0.6rem; margin: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Sincronización</p>
                        <span id="supabaseStatusBadge" style="padding: 4px 10px; border-radius: 5px; font-size: 0.55rem; font-weight: 900; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);">INACTIVA (SÓLO LOCAL)</span>
                    </div>
                    <p id="supabaseStatusDesc" style="color: #777; font-size: 0.7rem; margin: 0; line-height: 1.4; margin-bottom: 15px;">Tus configuraciones y cuentas de usuario se guardan temporalmente en este navegador. Para sincronizar tu ruleta en cualquier dispositivo en tiempo real, configura las variables <code style="color: var(--gold); background: rgba(255,255,255,0.05); padding: 2px 4px; border-radius: 3px; font-family: monospace;">VITE_SUPABASE_URL</code> y <code style="color: var(--gold); background: rgba(255,255,255,0.05); padding: 2px 4px; border-radius: 3px; font-family: monospace;">VITE_SUPABASE_ANON_KEY</code>.</p>
                    <button id="btnTestSupabase" class="btn btn-secondary" style="width: 100%; font-size: 0.65rem; padding: 8px; margin-top: 5px; border: 1px dashed rgba(255,255,255,0.15);">PROBAR CONEXIÓN DE RED</button>
                    <div id="supabaseTestResult" style="display: none; margin-top: 12px; font-size: 0.65rem; padding: 10px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; line-height: 1.3;"></div>
                </div>
            `,
            init: () => {
                const badge = document.getElementById('supabaseStatusBadge');
                const desc = document.getElementById('supabaseStatusDesc');
                if (badge && desc) {
                    if (isSupabaseConfigured) {
                        badge.innerText = "CONECTADO (NUBE)";
                        badge.style.background = "rgba(16, 185, 129, 0.1)";
                        badge.style.color = "#10b981";
                        badge.style.borderColor = "rgba(16, 185, 129, 0.2)";
                        desc.innerHTML = `Tu ruleta está sincronizada con Supabase. Puedes iniciar sesión desde cualquier navegador, teléfono o dispositivo con tus mismas credenciales y toda tu configuración, premios y registros se sincronizarán al instante de forma segura.`;
                    } else {
                        badge.innerText = "INACTIVA (SÓLO LOCAL)";
                        badge.style.background = "rgba(239, 68, 68, 0.1)";
                        badge.style.color = "#ef4444";
                        badge.style.borderColor = "rgba(239, 68, 68, 0.2)";
                        desc.innerHTML = `Tus configuraciones y cuentas de usuario se guardan únicamente en este navegador. Para sincronizar tu ruleta en cualquier dispositivo en tiempo real, configura las variables <code style="color: var(--gold); background: rgba(255,255,255,0.05); padding: 2px 4px; border-radius: 3px; font-family: monospace;">VITE_SUPABASE_URL</code> y <code style="color: var(--gold); background: rgba(255,255,255,0.05); padding: 2px 4px; border-radius: 3px; font-family: monospace;">VITE_SUPABASE_ANON_KEY</code>.`;
                    }
                }

                const btnTest = document.getElementById('btnTestSupabase');
                const testResult = document.getElementById('supabaseTestResult');
                if (btnTest && testResult) {
                    btnTest.onclick = async () => {
                        btnTest.innerText = "EJECUTANDO DIAGNÓSTICOS...";
                        (btnTest as HTMLButtonElement).disabled = true;
                        testResult.style.display = "block";
                        testResult.style.background = "rgba(255, 255, 255, 0.02)";
                        testResult.style.color = "#888";
                        testResult.style.border = "1px solid #222";
                        testResult.innerHTML = "Iniciando pruebas de red modulares...\nLlamando a cada agente de diagnóstico registrado...";

                        try {
                            const steps = CloudDiagnosticRegistry.getSteps();
                            let output = `EJECUTANDO ${steps.length} PRUEBAS DE DIAGNÓSTICO:\n\n`;
                            let globalSuccess = true;

                            for (const step of steps) {
                                output += `⏳ Probando: ${step.name}...\n`;
                                testResult.innerHTML = output;

                                const res = await step.run();
                                if (res.success) {
                                    output += `✔ ${step.name}: ÉXITO\n`;
                                    if (res.details) output += `   ↳ ${res.details.split('\n')[0]}\n`;
                                } else {
                                    output += `✖ ${step.name}: FALLIDO - ${res.message}\n`;
                                    if (res.details) output += `   ↳ ${res.details}\n`;
                                    globalSuccess = false;
                                }
                                output += `----------------------------------------\n`;
                                testResult.innerHTML = output;
                            }

                            if (globalSuccess) {
                                testResult.style.background = "rgba(16, 185, 129, 0.05)";
                                testResult.style.color = "#10b981";
                                testResult.style.border = "1px solid rgba(16, 185, 129, 0.2)";
                                testResult.innerHTML = `<b>✔ DIAGNÓSTICO EXITOSO</b>\n\nTodos los módulos de red responden correctamente.\n\n` + output;
                            } else {
                                testResult.style.background = "rgba(239, 68, 68, 0.05)";
                                testResult.style.color = "#ef4444";
                                testResult.style.border = "1px solid rgba(239, 68, 68, 0.2)";
                                testResult.innerHTML = `<b>✖ DIAGNÓSTICO PARCIALMENTE FALLIDO</b>\n\nSe detectaron anomalías en los módulos.\n\n` + output;
                            }
                        } catch (err: any) {
                            testResult.style.background = "rgba(239, 68, 68, 0.05)";
                            testResult.style.color = "#ef4444";
                            testResult.style.border = "1px solid rgba(239, 68, 68, 0.2)";
                            testResult.innerHTML = `<b>✖ Error crítico en motor de diagnóstico</b>\n\n${err?.message || err}`;
                        } finally {
                            btnTest.innerText = "PROBAR CONEXIÓN DE RED";
                            (btnTest as HTMLButtonElement).disabled = false;
                        }
                    };
                }
            }
        });

        // 4. Audit Log module
        this.registerModule({
            id: 'audit-log',
            title: 'Log de Auditoría y Seguridad',
            icon: '🛡️',
            description: 'Registro histórico en tiempo real de operaciones administrativas críticas, inicios de sesión de colaboradores y activaciones de licencias.',
            render: () => `
                <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
                    <button id="btnClearAuditLog" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.55rem; width: auto; margin: 0; min-height: unset; border: 1px solid rgba(255, 77, 77, 0.3); color: #ff4d4d; background: rgba(255, 77, 77, 0.05); font-weight: 800; cursor: pointer;">LIMPIAR LOG</button>
                </div>
                <div style="border: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.3); border-radius: 12px; padding: 15px;">
                    <nexo-audit-log id="auditLogContainer" style="max-height: 280px; overflow-y: auto; font-family: monospace; font-size: 0.6rem; color: #bbb; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;"></nexo-audit-log>
                </div>
            `,
            init: () => {
                const btnClearLogs = document.getElementById('btnClearAuditLog');
                if (btnClearLogs && this.callbacks) {
                    btnClearLogs.onclick = () => {
                        this.callbacks!.executeWithAuth(() => {
                            this.callbacks!.showCustomConfirm("¿Seguro que deseas limpiar el registro de acciones de auditoría?", () => {
                                StateManager.config.auditLog = [];
                                StateManager.save();
                                this.callbacks!.renderAuditLogs();
                                this.callbacks!.updateStorageUsage();
                                this.callbacks!.showCustomAlert("Log de auditoría limpiado.", "LIMPIEZA COMPLETADA");
                            });
                        });
                    };
                }
                // Trigger dynamic render for custom element
                window.dispatchEvent(new Event('nexo-state-change'));
            }
        });

        // 5. Future Integrations placeholder
        this.registerModule({
            id: 'future-integrations',
            title: 'Nexo Plugins (Futuras Integraciones)',
            icon: '🔌',
            description: 'Este panel cuenta con una arquitectura de micro-servicios 100% modular. Puedes conectar APIs externas, webhooks, analytics o pasarelas al instante.',
            render: () => `
                <div style="background: rgba(212,175,55,0.02); border: 1px dashed rgba(212,175,55,0.15); padding: 18px; border-radius: 15px; text-align: center; display: flex; flex-direction: column; gap: 10px; align-items: center; justify-content: center; height: 100%; min-height: 140px;">
                    <span style="font-size: 1.5rem; filter: grayscale(50%);">✨</span>
                    <p style="color: #888; font-size: 0.62rem; line-height: 1.4; margin: 0; max-width: 240px;">¿Deseas conectar un nuevo microservicio, pasarela de pago o webhook de leads? Registra tu módulo usando:</p>
                    <code style="color: var(--gold); background: rgba(0,0,0,0.4); padding: 4px 8px; border-radius: 5px; font-family: monospace; font-size: 0.52rem; border: 1px solid rgba(255,255,255,0.05); user-select: all;">SistemaController.registerModule(...)</code>
                    <button id="btnFutureIntegrationDemo" class="btn btn-secondary" style="width: auto; font-size: 0.55rem; padding: 6px 12px; border: 1px solid rgba(212,175,55,0.2); color: var(--gold); margin-top: 5px; font-weight: 800;">VER EJEMPLO DE INTEGRACIÓN</button>
                </div>
            `,
            init: () => {
                const btnDemo = document.getElementById('btnFutureIntegrationDemo');
                if (btnDemo && this.callbacks) {
                    btnDemo.onclick = () => {
                        this.callbacks!.showCustomAlert(
                            `Para integrar tu propio módulo, copia esta plantilla:\n\n` +
                            `SistemaController.registerModule({\n` +
                            `  id: "mi-plugin-externo",\n` +
                            `  title: "Pasarela Webhook",\n` +
                            `  icon: "🚀",\n` +
                            `  description: "Envía datos en tiempo real.",\n` +
                            `  render: () => '<button id=\\"btnSend\\">Test Webhook</button>',\n` +
                            `  init: () => { document.getElementById(\\"btnSend\\").onclick = ... }\n` +
                            `});\n\n` +
                            `¡El sistema es 100% extensible y autogestionado!`,
                            "CÓDIGO DE INTEGRACIÓN"
                        );
                    };
                }
            }
        });
    }
}

export const SistemaController = new SistemaControllerClass();

