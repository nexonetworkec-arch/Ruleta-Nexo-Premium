import { isSupabaseConfigured } from '../supabase';
import { ObservabilityRegistry } from '../controllers/sistemaController';

export interface PerformanceMetrics {
    fps: number;
    usedMemory: number; // in MB
    totalMemory: number; // in MB
    supabaseLatency: number; // in ms
    localStorageBytes: number;
    uptimeSeconds: number;
    healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    apiSuccessRate: number; // percentage
}

class ObservabilityEngine {
    private metrics: PerformanceMetrics = {
        fps: 60,
        usedMemory: 0,
        totalMemory: 0,
        supabaseLatency: 0,
        localStorageBytes: 0,
        uptimeSeconds: 0,
        healthStatus: 'HEALTHY',
        apiSuccessRate: 100
    };

    private apiCalls = 0;
    private apiSuccesses = 0;
    private frameCount = 0;
    private lastFpsUpdate = 0;
    private startTime = Date.now();
    private latencyHistory: number[] = [];

    constructor() {
        this.lastFpsUpdate = performance.now();
        this.startTime = Date.now();
        this.startFpsTracker();
        this.startUptimeTracker();
        this.startApiCallListener();
    }

    private startApiCallListener() {
        window.addEventListener('nexo-api-call', (e: Event) => {
            const { durationMs, success } = (e as CustomEvent).detail;
            this.recordApiCall(durationMs, success);
        });
    }

    private startFpsTracker() {
        const loop = () => {
            this.frameCount++;
            const now = performance.now();
            const elapsed = now - this.lastFpsUpdate;
            if (elapsed >= 1000) {
                this.metrics.fps = Math.round((this.frameCount * 1000) / elapsed);
                this.frameCount = 0;
                this.lastFpsUpdate = now;
                this.updateMemoryMetrics();
                this.calculateHealthStatus();
                this.dispatchMetricsUpdate();
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    private startUptimeTracker() {
        setInterval(() => {
            this.metrics.uptimeSeconds = Math.round((Date.now() - this.startTime) / 1000);
            this.metrics.localStorageBytes = this.calculateLocalStorageSize();
            this.dispatchMetricsUpdate();
        }, 1000);
    }

    private updateMemoryMetrics() {
        // @ts-ignore
        if (performance && performance.memory) {
            // @ts-ignore
            this.metrics.usedMemory = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
            // @ts-ignore
            this.metrics.totalMemory = Math.round(performance.memory.totalJSHeapSize / (1024 * 1024));
        } else {
            this.metrics.usedMemory = 0;
            this.metrics.totalMemory = 0;
        }
    }

    private calculateLocalStorageSize(): number {
        let total = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    total += (localStorage.getItem(key) || "").length * 2; // UTF-16
                }
            }
        } catch (e) {
            console.error(e);
        }
        return total;
    }

    private calculateHealthStatus() {
        let issuesCount = 0;
        if (this.metrics.fps < 45) issuesCount++;
        if (this.metrics.supabaseLatency > 500) issuesCount++;
        if (this.metrics.apiSuccessRate < 90) issuesCount++;

        if (issuesCount >= 2) {
            this.metrics.healthStatus = 'CRITICAL';
        } else if (issuesCount === 1) {
            this.metrics.healthStatus = 'WARNING';
        } else {
            this.metrics.healthStatus = 'HEALTHY';
        }
    }

    public recordApiCall(durationMs: number, success: boolean) {
        this.apiCalls++;
        if (success) {
            this.apiSuccesses++;
        }
        this.latencyHistory.push(durationMs);
        if (this.latencyHistory.length > 20) {
            this.latencyHistory.shift();
        }
        
        const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
        this.metrics.supabaseLatency = Math.round(sum / this.latencyHistory.length);
        this.metrics.apiSuccessRate = Math.round((this.apiSuccesses / this.apiCalls) * 100);
        this.calculateHealthStatus();
        this.dispatchMetricsUpdate();
    }

    public getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    private dispatchMetricsUpdate() {
        window.dispatchEvent(new CustomEvent('nexo-metrics-update', { detail: this.metrics }));
    }
}

export const observabilityEngine = new ObservabilityEngine();

export class NexoObservabilityPanel extends HTMLElement {
    private handleMetrics = (e: Event) => {
        const metrics = (e as CustomEvent).detail as PerformanceMetrics;
        this.render(metrics);
    };

    private handleCustomMetrics = () => {
        this.render(observabilityEngine.getMetrics());
    };

    connectedCallback() {
        window.addEventListener('nexo-metrics-update', this.handleMetrics);
        window.addEventListener('nexo-custom-metrics-update', this.handleCustomMetrics);
        this.render(observabilityEngine.getMetrics());
    }

    disconnectedCallback() {
        window.removeEventListener('nexo-metrics-update', this.handleMetrics);
        window.removeEventListener('nexo-custom-metrics-update', this.handleCustomMetrics);
    }

    render(metrics: PerformanceMetrics) {
        const uptimeFormatted = this.formatUptime(metrics.uptimeSeconds);
        const connectionText = isSupabaseConfigured ? 'NUBE (SUPABASE)' : 'MODO TOTALMENTE LOCAL';
        const latencyText = isSupabaseConfigured ? `${metrics.supabaseLatency} ms` : 'N/A';
        const healthColor = metrics.healthStatus === 'HEALTHY' ? '#4caf50' : metrics.healthStatus === 'WARNING' ? '#ff9800' : '#ff4d4d';
        const memoryDisplay = metrics.totalMemory > 0 ? `${metrics.usedMemory} MB / ${metrics.totalMemory} MB` : 'N/A';
        const fpsColor = metrics.fps >= 55 ? '#4caf50' : metrics.fps >= 40 ? '#ff9800' : '#ff4d4d';

        // Obtener métricas de módulos registrados dinámicamente
        const customMetrics = ObservabilityRegistry.getProviders();
        let customMetricsHtml = '';
        if (customMetrics.length > 0) {
            customMetricsHtml = `
                <!-- Métricas de Plugins de Terceros -->
                <div style="border-top: 1px dashed rgba(255, 255, 255, 0.05); padding-top: 8px; margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
                    <span style="color: var(--gold); font-size: 0.55rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Métricas Integradas (Plugins)</span>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        ${customMetrics.map(p => `
                            <div style="display: flex; flex-direction: column; gap: 1px; background: rgba(212,175,55,0.02); padding: 5px; border-radius: 4px; border: 1px solid rgba(212,175,55,0.05);">
                                <span style="color: #666; font-size: 0.5rem; font-weight: 800; text-transform: uppercase;">${p.label}</span>
                                <span style="color: #fff; font-weight: bold; font-size: 0.75rem;">${p.value()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        this.innerHTML = `
            <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 15px; font-family: monospace; font-size: 0.75rem; color: #ccc; display: flex; flex-direction: column; gap: 10px;">
                <!-- Fila de Cabecera -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 8px;">
                    <span style="font-weight: 800; color: var(--gold); text-transform: uppercase;">Diagnóstico del Motor</span>
                    <span style="background: ${healthColor}; color: #000; font-size: 0.55rem; font-weight: 900; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">${metrics.healthStatus}</span>
                </div>
                
                <!-- Métricas Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div style="display: flex; flex-direction: column; gap: 2px; background: rgba(255,255,255,0.02); padding: 6px; border-radius: 6px;">
                        <span style="color: #666; font-size: 0.55rem; font-weight: 800; text-transform: uppercase;">Rendimiento (FPS)</span>
                        <span style="color: ${fpsColor}; font-weight: 800; font-size: 0.9rem;">${metrics.fps} FPS</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 2px; background: rgba(255,255,255,0.02); padding: 6px; border-radius: 6px;">
                        <span style="color: #666; font-size: 0.55rem; font-weight: 800; text-transform: uppercase;">Latencia DB</span>
                        <span style="color: #fff; font-weight: 800; font-size: 0.9rem;">${latencyText}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 2px; background: rgba(255,255,255,0.02); padding: 6px; border-radius: 6px;">
                        <span style="color: #666; font-size: 0.55rem; font-weight: 800; text-transform: uppercase;">Memoria JS</span>
                        <span style="color: #fff; font-weight: 800; font-size: 0.9rem;">${memoryDisplay}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 2px; background: rgba(255,255,255,0.02); padding: 6px; border-radius: 6px;">
                        <span style="color: #666; font-size: 0.55rem; font-weight: 800; text-transform: uppercase;">Almacenamiento</span>
                        <span style="color: #fff; font-weight: 800; font-size: 0.9rem;">${(metrics.localStorageBytes / 1024).toFixed(1)} KB</span>
                    </div>
                </div>

                ${customMetricsHtml}

                <!-- Detalles Adicionales -->
                <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.65rem; border-top: 1px solid rgba(255, 255, 255, 0.03); padding-top: 8px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #666;">Conectividad:</span>
                        <span style="color: var(--gold); font-weight: bold;">${connectionText}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #666;">Tasa de Éxito API:</span>
                        <span style="color: #fff;">${metrics.apiSuccessRate}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #666;">Tiempo de Actividad:</span>
                        <span style="color: #fff;">${uptimeFormatted}</span>
                    </div>
                </div>
            </div>
        `;
    }

    private formatUptime(secs: number): string {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return [
            h.toString().padStart(2, '0'),
            m.toString().padStart(2, '0'),
            s.toString().padStart(2, '0')
        ].join(':');
    }
}
