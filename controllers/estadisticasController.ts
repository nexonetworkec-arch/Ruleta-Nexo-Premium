import { StateManager } from '../core';

// ==========================================
// 1. STATS KPI EXTENSION API (MODULAR)
// ==========================================
export interface KpiProvider {
    id: string;
    label: string;
    value: (validPlays: any[]) => string | number;
    color?: string;       // Custom text/value color (e.g. '#10b981' or 'var(--gold)')
    borderColor?: string; // Custom border/glow styling
    bgOpacity?: string;   // Custom background color
}

class KpiRegistryClass {
    private providers: KpiProvider[] = [];

    public registerProvider(provider: KpiProvider) {
        this.providers = this.providers.filter(p => p.id !== provider.id);
        this.providers.push(provider);
        this.notifyChange();
    }

    public unregisterProvider(id: string) {
        this.providers = this.providers.filter(p => p.id !== id);
        this.notifyChange();
    }

    public getProviders(): KpiProvider[] {
        return [...this.providers];
    }

    private notifyChange() {
        window.dispatchEvent(new Event('nexo-state-change'));
        window.dispatchEvent(new Event('nexo-stats-change'));
    }
}
export const KpiRegistry = new KpiRegistryClass();


// ==========================================
// 2. STATS WIDGET/CHART EXTENSION API
// ==========================================
export interface StatsWidgetProvider {
    id: string;
    title: string;
    render: (validPlays: any[]) => string; // Must return complete HTML string
    onMounted?: (container: HTMLElement, validPlays: any[]) => void; // For D3, Chart.js, Recharts, or interactive event listeners
}

class StatsWidgetRegistryClass {
    private providers: StatsWidgetProvider[] = [];

    public registerProvider(provider: StatsWidgetProvider) {
        this.providers = this.providers.filter(p => p.id !== provider.id);
        this.providers.push(provider);
        this.notifyChange();
    }

    public unregisterProvider(id: string) {
        this.providers = this.providers.filter(p => p.id !== id);
        this.notifyChange();
    }

    public getProviders(): StatsWidgetProvider[] {
        return [...this.providers];
    }

    private notifyChange() {
        window.dispatchEvent(new Event('nexo-state-change'));
        window.dispatchEvent(new Event('nexo-stats-change'));
    }
}
export const StatsWidgetRegistry = new StatsWidgetRegistryClass();


// ==========================================
// 3. STATS EXPORTERS EXTENSION API
// ==========================================
export interface StatsExporter {
    id: string;
    label: string;
    buttonClass?: string; // e.g. 'btn-secondary' or 'btn-primary'
    style?: string;       // Custom CSS styling inline
    export: (validPlays: any[], selectedGameTitle: string, kpis: any) => Promise<void> | void;
}

class StatsExporterRegistryClass {
    private exporters: StatsExporter[] = [];

    constructor() {
        // Default CSV Exporter
        this.registerExporter({
            id: 'csv',
            label: '📊 Exportar a CSV',
            buttonClass: 'btn-secondary',
            export: (validPlays, selectedGameTitle) => {
                if (validPlays.length === 0) {
                    alert('No hay giros para exportar.');
                    return;
                }
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += "Fecha,Nombre Recompensa,Lead Info,LocalSessionID,PublicSessionID\n";
                
                validPlays.forEach(p => {
                    const leadStr = p.lead ? JSON.stringify(p.lead).replace(/"/g, '""') : 'Público/Directo';
                    const row = `"${p.fecha}","${p.nombre}","${leadStr}","${p.localSessionId || ''}","${p.publicSessionId || ''}"`;
                    csvContent += row + "\n";
                });

                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                const sanitizedTitle = selectedGameTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                link.setAttribute("download", `reporte_giros_${sanitizedTitle}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    }

    public registerExporter(exporter: StatsExporter) {
        this.exporters = this.exporters.filter(e => e.id !== exporter.id);
        this.exporters.push(exporter);
        this.notifyChange();
    }

    public unregisterExporter(id: string) {
        this.exporters = this.exporters.filter(e => e.id !== id);
        this.notifyChange();
    }

    public getExporters(): StatsExporter[] {
        return [...this.exporters];
    }

    private notifyChange() {
        window.dispatchEvent(new Event('nexo-state-change'));
        window.dispatchEvent(new Event('nexo-stats-change'));
    }
}
export const StatsExporterRegistry = new StatsExporterRegistryClass();


// ==========================================
// 4. FORENSIC AUDIT REPORT SECTION EXTENSION API
// ==========================================
export interface ForensicSectionProvider {
    id: string;
    title: string;
    renderSectionText: (validPlays: any[]) => string; // Returns plain-text ASCII summary
    renderSectionHtml: (validPlays: any[]) => string; // Returns HTML for active tab UI
    renderSectionPrintHtml?: (validPlays: any[]) => string; // Optional custom print/PDF styling
}

class ForensicSectionRegistryClass {
    private sections: ForensicSectionProvider[] = [];

    public registerSection(section: ForensicSectionProvider) {
        this.sections = this.sections.filter(s => s.id !== section.id);
        this.sections.push(section);
        this.notifyChange();
    }

    public unregisterSection(id: string) {
        this.sections = this.sections.filter(s => s.id !== id);
        this.notifyChange();
    }

    public getSections(): ForensicSectionProvider[] {
        return [...this.sections];
    }

    private notifyChange() {
        window.dispatchEvent(new Event('nexo-state-change'));
        window.dispatchEvent(new Event('nexo-stats-change'));
    }
}
export const ForensicSectionRegistry = new ForensicSectionRegistryClass();


// ==========================================
// MAIN ESTADISTICAS MODULE CONTROLLER (API BRIDGE)
// ==========================================
class EstadisticasControllerClass {
    public initEstadisticas() {
        window.dispatchEvent(new Event('nexo-state-change'));
        window.dispatchEvent(new Event('nexo-stats-change'));
    }
}

export const EstadisticasController = new EstadisticasControllerClass();
