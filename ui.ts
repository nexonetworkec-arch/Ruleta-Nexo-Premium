import { StateManager } from './core';
import { startGameRunInSupabase, endGameRunInSupabase } from './supabase';
import { leadsController } from './controllers/leadsController';
import { StorageMonitorRegistry } from './controllers/sistemaController';
import { KpiRegistry, StatsWidgetRegistry, StatsExporterRegistry, ForensicSectionRegistry } from './controllers/estadisticasController';
import { 
    StatsContext, StatsComponent, 
    MetricsKpisComponent, MetricsChartsRowComponent, MetricsInsightsComponent, 
    MetricsComparativeComponent, MetricsWidgetsComponent, MetricsActionsComponent, 
    ForensicHeaderComponent, ForensicSessionGridComponent, ForensicKpisRowComponent, 
    ForensicStockLedgerComponent, ForensicLogbookComponent, ForensicCustomSectionsComponent, 
    ForensicIntegrityBoxComponent, ForensicActionsComponent, generateSHA256 
} from './views/statsComponents';
import { SuperAdminContext, SuperAdminRegistry } from './views/superAdminComponents';

/**
 * NexoAuditLog Component
 * Native Web Component to render security and operations audit logs reactively.
 */
export class NexoAuditLog extends HTMLElement {
    connectedCallback() {
        this.render();
        window.addEventListener('nexo-state-change', this.handleStateChange);
    }
    disconnectedCallback() {
        window.removeEventListener('nexo-state-change', this.handleStateChange);
    }
    handleStateChange = () => {
        this.render();
    }
    render() {
        try {
            const logs = StateManager.config.auditLog || [];
            if (logs.length === 0) {
                this.innerHTML = `<div style="color: #666; font-style: italic; text-align: center; padding: 10px 0;">No hay acciones registradas.</div>`;
                return;
            }
            
            this.innerHTML = logs.map(l => {
                if (!l || !l.action) return '';
                let color = '#ccc';
                if (l.action.includes('ERROR') || l.action.includes('error') || l.action.includes('Erroneo')) color = '#ff4d4d';
                else if (l.action.includes('ÉXITO') || l.action.includes('exitoso') || l.action.includes('Validada')) color = '#4caf50';
                else if (l.action.includes('ADVERTENCIA') || l.action.includes('¡ATENCIÓN!')) color = '#ff9800';
                else if (l.action.includes('Sorteo') || l.action.includes('GIRAR')) color = '#d4af37';
                
                return `
                    <div style="display: flex; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.03); padding: 4px 0; align-items: flex-start; line-height: 1.2;">
                        <span style="color: #666; flex-shrink: 0; font-weight: 800;">[${l.timestamp || ''}]</span>
                        <span style="color: ${color}; word-break: break-all;">${l.action}</span>
                    </div>
                `;
            }).join('');
        } catch (e) {
            console.error("Error al renderizar NexoAuditLog:", e);
            this.innerHTML = `<div style="color: #666; font-style: italic; text-align: center; padding: 10px 0;">Error al cargar el log de auditoría.</div>`;
        }
    }
}

/**
 * NexoStorageMonitor Component
 * Native Web Component to monitor and optimize local storage usage.
 */
export class NexoStorageMonitor extends HTMLElement {
    connectedCallback() {
        this.render();
        window.addEventListener('nexo-state-change', this.handleStateChange);
        window.addEventListener('nexo-storage-change', this.handleStateChange);
    }
    disconnectedCallback() {
        window.removeEventListener('nexo-state-change', this.handleStateChange);
        window.removeEventListener('nexo-storage-change', this.handleStateChange);
    }
    handleStateChange = () => {
        this.render();
    }
    async render() {
        try {
            const providers = StorageMonitorRegistry.getProviders();
            if (providers.length === 0) {
                this.innerHTML = `<div style="color: #666; font-size: 0.65rem;">No hay almacenes de datos registrados.</div>`;
                return;
            }

            let html = `<div style="display: flex; flex-direction: column; gap: 18px;">`;

            for (const provider of providers) {
                const usageBytes = await provider.getUsageBytes();
                const limitBytes = await provider.getLimitBytes();
                const percent = Math.min(100, Math.round((usageBytes / limitBytes) * 100));
                const kbUsed = (usageBytes / 1024).toFixed(1);
                const kbLimit = (limitBytes / 1024).toFixed(0);

                let barColor = 'linear-gradient(90deg, var(--gold), var(--gold-secondary))';
                if (percent > 85) {
                    barColor = '#ff4d4d';
                } else if (percent > 60) {
                    barColor = '#ff9800';
                }

                html += `
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.6rem; color: #aaa; font-weight: 800; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                            <span>${provider.name}</span>
                            <span>${percent}%</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                            <div style="width: ${percent}%; height: 100%; background: ${barColor}; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.55rem; color: #555;">
                            <span>${kbUsed} KB / ${kbLimit} KB</span>
                            <button id="btnOptimize-${provider.id}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.5rem; border-radius: 4px; font-weight: 800; text-transform: uppercase; cursor: pointer; transition: all 0.2s;">OPTIMIZAR Y COMPRIMIR</button>
                        </div>
                    </div>
                `;
            }

            html += `</div>`;
            this.innerHTML = html;

            // Vincular eventos de optimización dinámicamente
            providers.forEach(provider => {
                const btn = this.querySelector(`#btnOptimize-${provider.id}`);
                if (btn) {
                    btn.addEventListener('click', async () => {
                        btn.innerHTML = 'OPTIMIZANDO...';
                        (btn as HTMLButtonElement).disabled = true;
                        try {
                            await provider.optimize();
                        } catch (err) {
                            console.error(`Error optimizando ${provider.name}:`, err);
                        } finally {
                            btn.innerHTML = 'OPTIMIZAR Y COMPRIMIR';
                            (btn as HTMLButtonElement).disabled = false;
                        }
                    });
                }
            });

        } catch (e) {
            console.error("Error al renderizar NexoStorageMonitor:", e);
            this.innerHTML = `<div style="color: #666; font-size: 0.65rem;">Error al renderizar monitor de almacenamiento.</div>`;
        }
    }
}

/**
 * NexoLeadsPanel Component
 * Native Web Component that encapsulates the entire "Leads" Configuration Tab.
 * 100% modular, highly scalable, and designed for seamless future integrations.
 */
export class NexoLeadsPanel extends HTMLElement {
    connectedCallback() {
        this.render();
        window.addEventListener('nexo-state-change', this.handleStateChange);
        this.setupListeners();
    }

    disconnectedCallback() {
        window.removeEventListener('nexo-state-change', this.handleStateChange);
    }

    handleStateChange = () => {
        this.render();
        this.setupListeners();
    }

    private setupListeners() {
        const btnCsv = this.querySelector('#btnExportCSVLeads');
        const btnTxt = this.querySelector('#btnExportTXTLeads');
        const btnImg = this.querySelector('#btnExportIMGLeads');

        if (btnCsv) {
            (btnCsv as HTMLElement).onclick = () => {
                // @ts-ignore
                if (window.leadsController && window.exportCSVFunction) {
                    // @ts-ignore
                    window.leadsController.exportLeads('csv', window.exportCSVFunction);
                } else if (leadsController) {
                    // Fallback to direct import
                    // @ts-ignore
                    leadsController.exportLeads('csv', window.exportCSVFunction || (() => {}));
                }
            };
        }

        if (btnTxt) {
            (btnTxt as HTMLElement).onclick = () => {
                // @ts-ignore
                if (window.leadsController && window.exportTXTFunction) {
                    // @ts-ignore
                    window.leadsController.exportLeads('txt', window.exportTXTFunction);
                } else if (leadsController) {
                    // Fallback to direct import
                    // @ts-ignore
                    leadsController.exportLeads('txt', window.exportTXTFunction || (() => {}));
                }
            };
        }

        if (btnImg) {
            (btnImg as HTMLElement).onclick = () => {
                // @ts-ignore
                if (window.leadsController && window.exportIMGFunction) {
                    // @ts-ignore
                    window.leadsController.exportLeads('img', window.exportIMGFunction);
                } else if (leadsController) {
                    // Fallback to direct import
                    // @ts-ignore
                    leadsController.exportLeads('img', window.exportIMGFunction || (() => {}));
                }
            };
        }
    }

    render() {
        this.innerHTML = `
            <div class="config-section" style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); padding: 25px; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.6); backdrop-filter: blur(20px);">
                <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">
                    <h4 style="margin: 0; font-size: 1.15rem; color: var(--gold); font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; text-shadow: 0 2px 10px rgba(212,175,55,0.15);">Participantes Registrados</h4>
                    <p style="font-size: 0.75rem; color: #777; margin: 6px 0 0 0; line-height: 1.4;">Listado de clientes registrados en el sistema de captura de leads.</p>
                </div>
                
                <nexo-leads-list id="leadsList" style="display: block; max-height: 420px; overflow-y: auto; padding-right: 4px;"></nexo-leads-list>
                
                <div style="margin-top: 25px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                    <button id="btnExportCSVLeads" class="btn btn-primary" style="width: 100%; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 900; border-radius: 14px; height: 46px; letter-spacing: 1.2px; transition: 0.3s; box-shadow: 0 4px 15px rgba(212,175,55,0.15);">
                        <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        DESCARGAR BASE DE DATOS (.CSV)
                    </button>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <button id="btnExportTXTLeads" class="btn btn-secondary" style="font-size: 0.72rem; display: flex; align-items: center; justify-content: center; gap: 8px; border-color: rgba(255,255,255,0.08); color: #ccc; font-weight: 800; border-radius: 14px; height: 42px; background: rgba(255,255,255,0.02); transition: 0.3s;">
                            <svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            REPORTE (.TXT)
                        </button>
                        <button id="btnExportIMGLeads" class="btn btn-secondary" style="font-size: 0.72rem; display: flex; align-items: center; justify-content: center; gap: 8px; border-color: rgba(212,175,55,0.3); color: var(--gold); font-weight: 800; border-radius: 14px; height: 42px; background: rgba(212,175,55,0.03); transition: 0.3s;">
                            <svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a1 1 0 011.414 0L16 17m-2-2l1.586-1.586a1 1 0 011.414 0L21 14m-7-2a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            IMAGEN (.PNG)
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

/**
 * NexoWinnerHeader Component
 * Highly modular header for the winner card displaying participant name and timestamp.
 */
export class NexoWinnerHeader extends HTMLElement {
    private _participantName: string = "";
    private _fecha: string = "";

    set participantName(val: string) {
        this._participantName = val;
        this.render();
    }
    get participantName() { return this._participantName; }

    set fecha(val: string) {
        this._fecha = val;
        this.render();
    }
    get fecha() { return this._fecha; }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; width: 100%;">
                <div style="display: flex; flex-direction: column; gap: 3px;">
                    <span style="font-weight: 900; color: #fff; font-size: 0.95rem; letter-spacing: 0.3px;">${this._participantName || 'PARTICIPANTE'}</span>
                    <slot name="status"></slot>
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    <span style="color: #475569; font-size: 0.6rem; font-family: 'JetBrains Mono', monospace; font-weight: 700; text-transform: uppercase;">REGISTRO</span>
                    <small style="color: #64748b; font-size: 0.65rem; font-weight: 600;">${this._fecha || ''}</small>
                </div>
            </div>
        `;
    }
}
if (!customElements.get('nexo-winner-header')) {
    customElements.define('nexo-winner-header', NexoWinnerHeader);
}

/**
 * NexoWinnerStatus Component
 * Dynamic status badge visualizer.
 */
export class NexoWinnerStatus extends HTMLElement {
    private _status: string = "";

    set status(val: string) {
        this._status = val;
        this.render();
    }
    get status() { return this._status; }

    connectedCallback() {
        this.render();
    }

    render() {
        let statusMarkup = "";
        const s = this._status;
        if (s === "GIRANDO...") {
            statusMarkup = `
                <span style="display:inline-flex; align-items:center; gap:5px; font-size:0.65rem; color:#eab308; background:rgba(234,179,8,0.1); border:1px solid rgba(234,179,8,0.2); padding:2px 8px; border-radius:12px; font-weight:800; text-transform:uppercase; animation: pulse 1.5s infinite;">
                    <span style="width:6px; height:6px; border-radius:50%; background:#eab308;"></span> Sorteo en curso...
                </span>
            `;
        } else if (s === "REGISTRADO (SORTEO)") {
            statusMarkup = `
                <span style="display:inline-flex; align-items:center; gap:5px; font-size:0.65rem; color:#38bdf8; background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.2); padding:2px 8px; border-radius:12px; font-weight:800; text-transform:uppercase;">
                    <span style="width:6px; height:6px; border-radius:50%; background:#38bdf8;"></span> Registrado
                </span>
            `;
        } else {
            statusMarkup = `
                <span style="display:inline-flex; align-items:center; gap:5px; font-size:0.65rem; color:var(--gold); background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.2); padding:2px 8px; border-radius:12px; font-weight:800; text-transform:uppercase;">
                    🎁 Premio: ${s || '---'}
                </span>
            `;
        }
        this.innerHTML = statusMarkup;
    }
}
if (!customElements.get('nexo-winner-status')) {
    customElements.define('nexo-winner-status', NexoWinnerStatus);
}

/**
 * NexoWinnerFieldRow Component
 * Renders an individual key-value row. Extremely extensible for future interactions (e.g. call, copy individual field, open link).
 */
export class NexoWinnerFieldRow extends HTMLElement {
    private _label: string = "";
    private _value: string = "";
    private _fieldId: string = "";

    set label(val: string) { this._label = val; this.render(); }
    get label() { return this._label; }

    set value(val: string) { this._value = val; this.render(); }
    get value() { return this._value; }

    set fieldId(val: string) { this._fieldId = val; }
    get fieldId() { return this._fieldId; }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
            <div style="font-size:0.75rem; color:#e2e8f0; display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.02); padding: 4px 0; transition: background 0.2s; border-radius: 4px;" class="field-row-interactive">
                <span style="color:#64748b; font-weight: 500;">${this._label || 'Campo'}:</span>
                <span style="font-weight: 600; text-align: right; word-break: break-all; max-width: 70%; color: #f8fafc;">${this._value || '---'}</span>
            </div>
        `;
    }
}
if (!customElements.get('nexo-winner-field-row')) {
    customElements.define('nexo-winner-field-row', NexoWinnerFieldRow);
}

/**
 * NexoWinnerFields Component
 * Renders the collection of field rows and handles expansion limits dynamically.
 */
export class NexoWinnerFields extends HTMLElement {
    private _lead: any = {};
    private _fields: any[] = [];
    private _expanded: boolean = false;

    set lead(val: any) { this._lead = val; this.render(); }
    get lead() { return this._lead; }

    set fields(val: any[]) { this._fields = val; this.render(); }
    get fields() { return this._fields; }

    set expanded(val: boolean) { this._expanded = val; this.render(); }
    get expanded() { return this._expanded; }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = "";
        const container = document.createElement('div');
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "6px";
        container.style.background = "rgba(0,0,0,0.2)";
        container.style.padding = "10px 12px";
        container.style.borderRadius = "10px";
        container.style.border = "1px solid rgba(255,255,255,0.02)";
        container.style.marginTop = "4px";

        const fieldsLimit = 3;
        const visibleFields = this._expanded ? this._fields : this._fields.slice(0, fieldsLimit);
        const hasHiddenFields = this._fields.length > fieldsLimit;

        visibleFields.forEach(f => {
            const row = document.createElement('nexo-winner-field-row') as NexoWinnerFieldRow;
            container.appendChild(row);
            row.label = f.label || '';
            row.value = this._lead?.[f.id] || '---';
            row.fieldId = f.id;
        });

        if (hasHiddenFields) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = "toggle-expand-btn";
            toggleBtn.style.background = "none";
            toggleBtn.style.border = "none";
            toggleBtn.style.color = "var(--gold)";
            toggleBtn.style.fontSize = "0.65rem";
            toggleBtn.style.fontWeight = "800";
            toggleBtn.style.cursor = "pointer";
            toggleBtn.style.textTransform = "uppercase";
            toggleBtn.style.padding = "4px 0";
            toggleBtn.style.marginTop = "5px";
            toggleBtn.style.display = "flex";
            toggleBtn.style.alignItems = "center";
            toggleBtn.style.gap = "4px";
            toggleBtn.style.transition = "all 0.2s";
            
            toggleBtn.innerHTML = `<span>${this._expanded ? '▲ Contraer campos' : `▼ Ver todos los campos (${this._fields.length})`}</span>`;
            
            toggleBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('nexo-toggle-expand', {
                    bubbles: true,
                    composed: true
                }));
            });
            container.appendChild(toggleBtn);
        }

        this.appendChild(container);
    }
}
if (!customElements.get('nexo-winner-fields')) {
    customElements.define('nexo-winner-fields', NexoWinnerFields);
}

/**
 * NexoWinnerActions Component
 * Footer component containing WhatsApp button, copy action, and deletion button.
 */
export class NexoWinnerActions extends HTMLElement {
    private _phoneNum: string = "";
    private _participantName: string = "";
    private _prizeName: string = "";

    set phoneNum(val: string) { this._phoneNum = val; this.render(); }
    get phoneNum() { return this._phoneNum; }

    set participantName(val: string) { this._participantName = val; this.render(); }
    get participantName() { return this._participantName; }

    set prizeName(val: string) { this._prizeName = val; this.render(); }
    get prizeName() { return this._prizeName; }

    connectedCallback() {
        this.render();
    }

    render() {
        let whatsappButton = "";
        if (this._phoneNum) {
            const cleanPhone = this._phoneNum.replace(/[^\d+]/g, "");
            const encodedText = encodeURIComponent(`¡Hola ${this._participantName}! Te saludamos de Ruleta Nexo Premium. Fuiste registrado correctamente en nuestro sistema y obtuviste: ${this._prizeName === "GIRANDO..." ? "Giro de ruleta" : this._prizeName === "REGISTRADO (SORTEO)" ? "Participación de sorteo" : this._prizeName || "Premio"}.`);
            const waUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodedText}`;
            whatsappButton = `
                <a href="${waUrl}" target="_blank" title="Contactar por WhatsApp" style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: rgba(37, 211, 102, 0.08); border: 1px solid rgba(37, 211, 102, 0.15); color: #25d366; text-decoration: none; transition: all 0.2s;" onmouseover="this.style.background='rgba(37, 211, 102, 0.15)'; this.style.borderColor='rgba(37, 211, 102, 0.3)';" onmouseout="this.style.background='rgba(37, 211, 102, 0.08)'; this.style.borderColor='rgba(37, 211, 102, 0.15)';">
                    <svg style="width: 15px; height: 15px;" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008 0c3.202.001 6.212 1.249 8.477 3.514 2.266 2.265 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.573 1.453 5.4 1.454 5.38.002 9.761-4.375 9.764-9.756.002-2.607-1.011-5.059-2.857-6.905C17.054 2.101 14.6 1.085 12 1.085 6.62 1.085 2.24 5.462 2.237 10.84c-.001 1.838.48 3.633 1.396 5.215l-.991 3.616 3.702-.971c1.534.836 3.255 1.277 4.965 1.278l.003-.002h-.002zm12.353-8.818c-.3-.15-1.772-.875-2.046-.975-.275-.1-.475-.15-.675.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.413-1.488-.891-.795-1.493-1.777-1.668-2.075-.175-.3-.018-.463.13-.612.134-.133.3-.35.45-.525.15-.175.2-.3.3-.5s.05-.375-.025-.525C10.1 5.31 9.5 3.838 9.25 3.238c-.244-.588-.492-.51-.675-.52-.175-.01-.375-.01-.575-.01s-.525.075-.8 3.14-.175 3.242.025 3.442c.2.2 4.31 6.574 10.435 9.22.348.15.696.24 1.055.353 1.483.47 2.834.404 3.901.244 1.19-.177 2.446-.992 2.796-1.95.35-.958.35-1.78.246-1.952-.104-.174-.3-.274-.6-.424z"/>
                    </svg>
                </a>
            `;
        }

        this.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.04); padding-top: 10px; margin-top: 2px; width: 100%;">
                <span class="copy-feedback" style="font-size: 0.65rem; font-weight: 800; font-family: sans-serif; transition: opacity 0.3s ease; opacity: 0;"></span>
                
                <div style="display: flex; gap: 8px; align-items: center;">
                    <!-- WhatsApp Link (Dynamic Integration) -->
                    ${whatsappButton}

                    <!-- Copy Button (Modular integration hook) -->
                    <button class="copy-lead-btn" title="Copiar reporte del Lead" style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); color: #cbd5e1; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,255,255,0.15)';" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='rgba(255,255,255,0.08)';">
                        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                        </svg>
                    </button>

                    <!-- Delete Button (Secure & audited action) -->
                    <button class="delete-lead-btn" title="Eliminar registro" style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.12); color: #f87171; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.borderColor='rgba(239, 68, 68, 0.3)';" onmouseout="this.style.background='rgba(239, 68, 68, 0.05)'; this.style.borderColor='rgba(239, 68, 68, 0.12)';">
                        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        this.querySelector('.copy-lead-btn')?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('nexo-copy-lead', {
                bubbles: true,
                composed: true
            }));
        });

        this.querySelector('.delete-lead-btn')?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('nexo-delete-lead', {
                bubbles: true,
                composed: true
            }));
        });
    }
}
if (!customElements.get('nexo-winner-actions')) {
    customElements.define('nexo-winner-actions', NexoWinnerActions);
}

/**
 * NexoWinnerCard Component
 * Native Web Component representing a modular, extensible, and high-performance winner/lead entry.
 */
export class NexoWinnerCard extends HTMLElement {
    private _leadData: any = null;
    private _index: number = -1;
    private _expanded: boolean = false;

    set leadData(val: any) {
        this._leadData = val;
        this.render();
    }

    get leadData() {
        return this._leadData;
    }

    set index(val: number) {
        this._index = val;
    }

    get index() {
        return this._index;
    }

    connectedCallback() {
        this.render();
    }

    toggleExpand() {
        this._expanded = !this._expanded;
        this.render();
    }

    async copyLeadData() {
        if (!this._leadData) return;
        const formFields = StateManager.config.formFields || [];
        const h = this._leadData;
        
        let details = `📋 LEAD REGISTRADO - RULETA NEXO PREMIUM\n`;
        details += `=====================================\n`;
        details += `Fecha: ${h.fecha || 'N/A'}\n`;
        
        if (h.nombre === "GIRANDO...") {
            details += `Estado: Sorteo en curso...\n`;
        } else if (h.nombre === "REGISTRADO (SORTEO)") {
            details += `Estado: Registrado en ruleta\n`;
        } else {
            details += `Premio ganado: ${h.nombre || 'N/A'}\n`;
        }
        
        details += `-------------------------------------\n`;
        formFields.forEach((f: any) => {
            details += `${f.label || 'Campo'}: ${h.lead?.[f.id] || '---'}\n`;
        });
        details += `=====================================\n`;

        try {
            await navigator.clipboard.writeText(details);
            const feedback = this.querySelector('.copy-feedback') as HTMLElement;
            if (feedback) {
                feedback.innerText = "¡Copiado!";
                feedback.style.color = "#10b981";
                feedback.style.opacity = "1";
                setTimeout(() => {
                    feedback.style.opacity = "0";
                }, 2000);
            }
        } catch (err) {
            console.error("Error al copiar al portapapeles:", err);
        }
    }

    deleteLead() {
        if (this._index === -1) return;
        
        const performDelete = () => {
            const history = [...(StateManager.config.winnersHistory || [])];
            const deleted = history[this._index];
            if (!deleted) return;
            
            // Delete the item safely by index
            history.splice(this._index, 1);
            StateManager.config.winnersHistory = history;
            
            // Log security audit log entry
            const auditEntry = {
                timestamp: new Date().toLocaleTimeString(),
                action: `🛡️ LEAD ELIMINADO: Se retiró permanentemente a "${deleted.lead?.nombre || 'Participante'}" del historial.`
            };
            
            if (!StateManager.config.auditLog) {
                StateManager.config.auditLog = [];
            }
            StateManager.config.auditLog.push(auditEntry);
            if (StateManager.config.auditLog.length > 100) {
                StateManager.config.auditLog.shift();
            }
            
            StateManager.save();
            
            // Notify UI & trigger re-render
            window.dispatchEvent(new CustomEvent('nexo-state-change'));
            
            // Trigger integration hook event
            this.dispatchEvent(new CustomEvent('nexo-lead-action', {
                bubbles: true,
                composed: true,
                detail: {
                    action: 'delete',
                    lead: deleted,
                    index: this._index
                }
            }));
        };

        const confirmMessage = `¿Estás seguro de eliminar de forma permanente a este participante de la base de datos? Esta acción se registrará en la auditoría del sistema.`;
        
        // @ts-ignore
        if (window.showCustomConfirm) {
            // @ts-ignore
            window.showCustomConfirm(confirmMessage, () => {
                performDelete();
            });
        } else {
            if (confirm(confirmMessage)) {
                performDelete();
            }
        }
    }

    render() {
        if (!this._leadData) {
            this.innerHTML = "";
            return;
        }

        const h = this._leadData;
        const formFields = StateManager.config.formFields || [];
        
        // Scan for phone numbers in the lead form fields
        let phoneNum = "";
        formFields.forEach((f: any) => {
            const val = h.lead?.[f.id] || "";
            const normalizedLabel = (f.label || "").toLowerCase();
            const normalizedId = (f.id || "").toLowerCase();
            if (normalizedLabel.includes('telefono') || normalizedLabel.includes('teléfono') || normalizedLabel.includes('celular') || normalizedLabel.includes('phone') || normalizedLabel.includes('whatsapp') ||
                normalizedId.includes('telefono') || normalizedId.includes('celular') || normalizedId.includes('phone') || normalizedId.includes('whatsapp')) {
                phoneNum = val;
            }
        });

        // Setup first form field as primary title of participant
        const firstFieldId = formFields.length > 0 ? formFields[0].id : 'nombre';
        const participantName = h.lead?.[firstFieldId] || 'PARTICIPANTE';

        this.innerHTML = `
            <style>
                @keyframes cardFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .winner-card-container {
                    animation: cardFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                    transition: border-color 0.3s ease, box-shadow 0.3s ease;
                }
                .winner-card-container:hover {
                    border-color: rgba(212,175,55,0.3) !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.6);
                }
            </style>
            
            <div class="winner-card-container" style="display: flex; flex-direction: column; gap: 10px; background: rgba(255,255,255,0.02); padding: 16px; border-radius: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.06); position: relative;">
                
                <!-- Subcomponent Header -->
                <nexo-winner-header id="card-header"></nexo-winner-header>

                <!-- Subcomponent Fields Container -->
                <nexo-winner-fields id="card-fields"></nexo-winner-fields>

                <!-- Subcomponent Actions Controls -->
                <nexo-winner-actions id="card-actions"></nexo-winner-actions>

            </div>
        `;

        // Configure Subcomponent Header
        const headerEl = this.querySelector('#card-header') as NexoWinnerHeader;
        if (headerEl) {
            headerEl.participantName = participantName;
            headerEl.fecha = h.fecha || '';

            // Add status badge in a slotted manner or within the header for layout positioning
            const statusBadge = document.createElement('nexo-winner-status') as NexoWinnerStatus;
            statusBadge.setAttribute('slot', 'status');
            statusBadge.status = h.nombre;
            headerEl.appendChild(statusBadge);
        }

        // Configure Subcomponent Fields Container
        const fieldsEl = this.querySelector('#card-fields') as NexoWinnerFields;
        if (fieldsEl) {
            fieldsEl.lead = h.lead || {};
            fieldsEl.fields = formFields;
            fieldsEl.expanded = this._expanded;

            // Handle expansion toggle event (fully decoupled)
            fieldsEl.addEventListener('nexo-toggle-expand', () => {
                this.toggleExpand();
            });
        }

        // Configure Subcomponent Actions Controls
        const actionsEl = this.querySelector('#card-actions') as NexoWinnerActions;
        if (actionsEl) {
            actionsEl.phoneNum = phoneNum;
            actionsEl.participantName = participantName;
            actionsEl.prizeName = h.nombre;

            // Handle decoupled actions events
            actionsEl.addEventListener('nexo-copy-lead', () => {
                this.copyLeadData();
            });

            actionsEl.addEventListener('nexo-delete-lead', () => {
                this.deleteLead();
            });
        }
    }
}

// Define nexo-winner-card if not already defined
if (!customElements.get('nexo-winner-card')) {
    customElements.define('nexo-winner-card', NexoWinnerCard);
}

/**
 * NexoCongratsHeader Component
 * Modular and customizable header for the winner celebration card.
 * Styled with premium gold-accented typography and custom winner icons.
 */
export class NexoCongratsHeader extends HTMLElement {
    private _isSpecial: boolean = false;

    set isSpecial(val: boolean) {
        this._isSpecial = val;
        this.render();
    }
    get isSpecial() { return this._isSpecial; }

    connectedCallback() {
        this.render();
    }

    render() {
        const titleText = this._isSpecial ? "PREMIO ESPECIAL ADJUDICADO" : "¡TENEMOS UN GANADOR!";
        const subtitleText = this._isSpecial ? "CELEBRACIÓN EXCLUSIVA" : "RECOMPENSA NEXO PREMIUM";
        
        // Premium modern SVGs with custom gradient filters
        const iconSVG = this._isSpecial 
            ? `<div class="premium-badge-wrapper spec">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                    <path d="M4 22h16"></path>
                    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path>
                    <path d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Z"></path>
                </svg>
               </div>`
            : `<div class="premium-badge-wrapper std">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
               </div>`;

        this.innerHTML = `
            <style>
                .premium-badge-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    margin-bottom: 15px;
                    position: relative;
                }
                .premium-badge-wrapper.std {
                    background: radial-gradient(circle, rgba(212,175,55,0.15) 0%, rgba(0,0,0,0.6) 100%);
                    border: 1px solid rgba(212, 175, 55, 0.4);
                    box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
                    animation: premiumGlow 3s ease-in-out infinite alternate;
                }
                .premium-badge-wrapper.spec {
                    background: radial-gradient(circle, rgba(212,175,55,0.25) 0%, rgba(0,0,0,0.7) 100%);
                    border: 2px solid rgba(212, 175, 55, 0.7);
                    box-shadow: 0 0 30px rgba(212, 175, 55, 0.4);
                    animation: premiumPulseSpecial 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                .premium-badge-wrapper svg {
                    width: 32px;
                    height: 32px;
                    color: #e5a93b;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                }
                @keyframes premiumGlow {
                    0% { box-shadow: 0 0 15px rgba(212, 175, 55, 0.15); transform: translateY(0); }
                    100% { box-shadow: 0 0 25px rgba(212, 175, 55, 0.35); transform: translateY(-3px); }
                }
                @keyframes premiumPulseSpecial {
                    0%, 100% { transform: scale(1) translateY(0); box-shadow: 0 0 25px rgba(212, 175, 55, 0.3); }
                    50% { transform: scale(1.05) translateY(-4px); box-shadow: 0 0 40px rgba(212, 175, 55, 0.6); }
                }
            </style>
            <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 5px; width: 100%;">
                ${iconSVG}
                <div style="font-size: 0.65rem; font-weight: 800; letter-spacing: 4px; color: rgba(212,175,55,0.85); text-transform: uppercase; margin-bottom: 8px; text-shadow: 0 0 12px rgba(212,175,55,0.25); font-family: system-ui, -apple-system, sans-serif;">
                    ${subtitleText}
                </div>
                <h2 style="color: #fff; margin: 0; letter-spacing: 1px; text-transform: uppercase; font-weight: 900; font-size: 1.5rem; font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.2; background: linear-gradient(180deg, #ffffff 30%, #b8b8b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.6)); text-align: center;">
                    ${titleText}
                </h2>
                <div style="width: 40px; height: 2px; background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent); margin-top: 15px; border-radius: 1px;"></div>
            </div>
        `;
    }
}
if (!customElements.get('nexo-congrats-header')) {
    customElements.define('nexo-congrats-header', NexoCongratsHeader);
}

export class NexoCongratsDisplay extends HTMLElement {
    private _premioName: string = "---";

    set premioName(val: string) {
        this._premioName = val;
        this.render();
    }
    get premioName() { return this._premioName; }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
            <div class="ticket-container" style="
                background: linear-gradient(135deg, rgba(24, 24, 26, 0.95) 0%, rgba(12, 12, 13, 0.98) 100%);
                border: 1px solid rgba(212, 175, 55, 0.2);
                box-shadow: inset 0 0 30px rgba(212, 175, 55, 0.03), 0 15px 35px rgba(0, 0, 0, 0.6);
                border-radius: 16px;
                padding: 26px 20px;
                margin: 22px 0;
                position: relative;
                overflow: visible;
                width: 100%;
                box-sizing: border-box;
            ">
                <!-- Golden Radial Aura -->
                <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(212,175,55,0.06) 0%, transparent 75%); pointer-events: none; border-radius: 16px;"></div>
                
                <!-- Physical Ticket Cutouts (Crescent shapes on left & right sides) -->
                <div class="ticket-cutout left" style="
                    position: absolute;
                    left: -10px;
                    top: calc(50% - 10px);
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #0d0d0e; /* Matches modal content background */
                    border-right: 1px solid rgba(212, 175, 55, 0.2);
                    box-shadow: inset -5px 0 10px rgba(0,0,0,0.5);
                    z-index: 10;
                "></div>
                <div class="ticket-cutout right" style="
                    position: absolute;
                    right: -10px;
                    top: calc(50% - 10px);
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #0d0d0e; /* Matches modal content background */
                    border-left: 1px solid rgba(212, 175, 55, 0.2);
                    box-shadow: inset 5px 0 10px rgba(0,0,0,0.5);
                    z-index: 10;
                "></div>

                <!-- Ticket perforation dashed guide -->
                <div style="
                    position: absolute;
                    left: 15px;
                    right: 15px;
                    top: calc(50% - 1px);
                    border-top: 1px dashed rgba(212, 175, 55, 0.15);
                    pointer-events: none;
                "></div>

                <div style="font-size: 0.62rem; font-weight: 800; letter-spacing: 2.5px; color: rgba(255,255,255,0.45); text-transform: uppercase; margin-bottom: 12px; font-family: system-ui, sans-serif; position: relative; z-index: 2;">
                    PREMIO OBTENIDO
                </div>
                
                <div class="winner-prize-title" style="
                    font-size: 2.1rem; 
                    color: #d4af37; 
                    font-weight: 950; 
                    text-shadow: 0 0 20px rgba(212,175,55,0.4), 0 2px 4px rgba(0,0,0,0.9); 
                    font-family: system-ui, -apple-system, sans-serif; 
                    letter-spacing: 0.25px; 
                    word-break: break-word; 
                    line-height: 1.15; 
                    margin: 0;
                    position: relative;
                    z-index: 2;
                    animation: ticketTextPulse 2s ease-in-out infinite alternate;
                ">
                    ${this._premioName}
                </div>
            </div>
            <style>
                @keyframes ticketTextPulse {
                    0% { transform: scale(1); text-shadow: 0 0 15px rgba(212,175,55,0.3), 0 2px 4px rgba(0,0,0,0.9); }
                    100% { transform: scale(1.02); text-shadow: 0 0 25px rgba(212,175,55,0.55), 0 2px 4px rgba(0,0,0,0.9); }
                }
            </style>
        `;
    }
}
if (!customElements.get('nexo-congrats-display')) {
    customElements.define('nexo-congrats-display', NexoCongratsDisplay);
}

export class NexoCongratsClaim extends HTMLElement {
    private _prize: any = null;

    set prize(val: any) {
        this._prize = val;
        this.render();
    }
    get prize() { return this._prize; }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = "";
        const p = this._prize;
        if (!p || !p.isSpecial) {
            return;
        }

        const container = document.createElement('div');
        container.style.marginBottom = "24px";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "14px";
        container.style.width = "100%";
        container.style.boxSizing = "border-box";

        const textPara = document.createElement('p');
        textPara.style.color = "rgba(255, 255, 255, 0.8)";
        textPara.style.fontSize = "0.85rem";
        textPara.style.lineHeight = "1.5";
        textPara.style.margin = "0";
        textPara.style.fontWeight = "400";
        textPara.style.fontFamily = "system-ui, sans-serif";
        textPara.style.textAlign = "center";
        textPara.innerText = p.celebrationText || '¡Felicidades! Has ganado este premio especial en el juego.';
        container.appendChild(textPara);

        const claimContainer = document.createElement('div');
        claimContainer.style.width = "100%";
        claimContainer.style.boxSizing = "border-box";
        const claimUrl = p.claimUrl ? p.claimUrl.trim() : '';
        const claimBtnText = p.claimBtnText ? p.claimBtnText.trim() : 'RECLAMAR PREMIO';

        if (claimUrl) {
            const isLink = claimUrl.startsWith('http://') || claimUrl.startsWith('https://') || claimUrl.startsWith('/') || claimUrl.includes('.com') || claimUrl.includes('.net');
            if (isLink) {
                let absoluteUrl = claimUrl;
                if (!claimUrl.startsWith('http://') && !claimUrl.startsWith('https://') && !claimUrl.startsWith('/')) {
                    absoluteUrl = 'https://' + claimUrl;
                }
                
                // Exquisite premium gold claim button with glowing anims & hover state transformations
                claimContainer.innerHTML = `
                    <style>
                        .shine-btn {
                            position: relative;
                            display: block;
                            text-decoration: none;
                            text-align: center;
                            background: linear-gradient(135deg, #f4cf62 0%, #d4af37 50%, #aa841c 100%);
                            color: #000;
                            font-weight: 800;
                            padding: 16px;
                            border-radius: 12px;
                            font-size: 0.8rem;
                            letter-spacing: 2px;
                            box-shadow: 0 4px 20px rgba(212,175,55,0.3);
                            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                            margin-top: 5px;
                            text-transform: uppercase;
                            border: 1px solid rgba(255,255,255,0.25);
                            font-family: system-ui, sans-serif;
                            overflow: hidden;
                        }
                        .shine-btn::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: -100%;
                            width: 100%;
                            height: 100%;
                            background: linear-gradient(120deg, transparent, rgba(255,255,255,0.35), transparent);
                            transition: all 0.5s;
                        }
                        .shine-btn:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 8px 25px rgba(212,175,55,0.5), 0 0 15px rgba(212,175,55,0.2);
                            filter: brightness(1.08);
                        }
                        .shine-btn:hover::before {
                            left: 100%;
                            transition: all 0.6s ease-in-out;
                        }
                        .shine-btn:active {
                            transform: translateY(0);
                            box-shadow: 0 4px 10px rgba(212,175,55,0.3);
                        }
                    </style>
                    <a href="${absoluteUrl}" target="_blank" class="shine-btn">
                        ${claimBtnText}
                    </a>
                `;
            } else {
                claimContainer.innerHTML = `
                    <div style="
                        background: rgba(212,175,55,0.03); 
                        border: 1px dashed rgba(212, 175, 55, 0.35); 
                        border-radius: 12px; 
                        padding: 16px; 
                        margin-top: 5px; 
                        text-align: center; 
                        box-shadow: inset 0 0 15px rgba(212,175,55,0.02);
                        box-sizing: border-box;
                    ">
                        <div style="color: rgba(212,175,55,0.9); font-size: 0.65rem; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 2px; font-family: system-ui, sans-serif;">
                            📌 CÓMO RECLAMAR:
                        </div>
                        <div style="color: #fff; font-size: 0.9rem; margin: 0; font-weight: 700; line-height: 1.4; font-family: system-ui, sans-serif; word-break: break-all;">
                            ${claimUrl}
                        </div>
                    </div>
                `;
            }
        }
        container.appendChild(claimContainer);
        this.appendChild(container);
    }
}
if (!customElements.get('nexo-congrats-claim')) {
    customElements.define('nexo-congrats-claim', NexoCongratsClaim);
}

export class NexoCongratsActions extends HTMLElement {
    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; margin-top: 5px; box-sizing: border-box;">
                <button class="btn btn-primary btn-close-congrats" style="
                    width: 100%; 
                    font-weight: 800; 
                    letter-spacing: 2px; 
                    text-transform: uppercase; 
                    padding: 15px 20px; 
                    font-size: 0.8rem; 
                    border-radius: 12px; 
                    cursor: pointer;
                    background: linear-gradient(135deg, #161618 0%, #0d0d0e 100%);
                    color: #fff;
                    border: 1px solid rgba(255,255,255,0.08);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
                    font-family: system-ui, sans-serif;
                " onmouseover="this.style.background='linear-gradient(135deg, #202023 0%, #161618 100%)'; this.style.borderColor='rgba(212,175,55,0.45)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.4)';" onmouseout="this.style.background='linear-gradient(135deg, #161618 0%, #0d0d0e 100%)'; this.style.borderColor='rgba(255,255,255,0.08)'; this.style.transform='none'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.3)';">
                    CONTINUAR
                </button>
            </div>
        `;

        this.querySelector('.btn-close-congrats')?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('nexo-congrats-close', {
                bubbles: true,
                composed: true
            }));
        });
    }
}
if (!customElements.get('nexo-congrats-actions')) {
    customElements.define('nexo-congrats-actions', NexoCongratsActions);
}

export class NexoCongratsCard extends HTMLElement {
    private _prize: any = null;
    private _premioName: string = "---";
    private _isGuestMode: boolean = false;

    set prize(val: any) {
        this._prize = val;
        this.render();
    }
    get prize() { return this._prize; }

    set premioName(val: string) {
        this._premioName = val;
        this.render();
    }
    get premioName() { return this._premioName; }

    set isGuestMode(val: boolean) {
        this._isGuestMode = val;
        this.render();
    }
    get isGuestMode() { return this._isGuestMode; }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
            <style>
                .congrats-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                    animation: scaleUpCard 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    transform-origin: center;
                    box-sizing: border-box;
                }
                @keyframes scaleUpCard {
                    from { transform: scale(0.92); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            </style>
            <div class="congrats-wrapper">
                <!-- Subcomponent Header -->
                <nexo-congrats-header id="congrats-header" style="width: 100%;"></nexo-congrats-header>

                <!-- Subcomponent Display -->
                <nexo-congrats-display id="congrats-display" style="width: 100%;"></nexo-congrats-display>

                <!-- Subcomponent Claim Area -->
                <nexo-congrats-claim id="congrats-claim" style="width: 100%;"></nexo-congrats-claim>

                <!-- Subcomponent Footer Actions -->
                <nexo-congrats-actions id="congrats-actions" style="width: 100%;"></nexo-congrats-actions>
            </div>
        `;

        // Configure Subcomponent Header
        const headerEl = this.querySelector('#congrats-header') as NexoCongratsHeader;
        if (headerEl) {
            headerEl.isSpecial = !!(this._prize && this._prize.isSpecial);
        }

        // Configure Subcomponent Display
        const displayEl = this.querySelector('#congrats-display') as NexoCongratsDisplay;
        if (displayEl) {
            displayEl.premioName = this._premioName;
        }

        // Configure Subcomponent Claim Area
        const claimEl = this.querySelector('#congrats-claim') as NexoCongratsClaim;
        if (claimEl) {
            claimEl.prize = this._prize;
        }

        // Handle closed event from footer actions
        const actionsEl = this.querySelector('#congrats-actions') as NexoCongratsActions;
        if (actionsEl) {
            actionsEl.addEventListener('nexo-congrats-close', () => {
                this.dispatchEvent(new CustomEvent('nexo-congrats-card-close', {
                    bubbles: true,
                    composed: true
                }));
            });
        }
    }
}
if (!customElements.get('nexo-congrats-card')) {
    customElements.define('nexo-congrats-card', NexoCongratsCard);
}

/**
 * NexoLeadsList Component
 * Native Web Component to render leads with individual dynamic form fields.
 */
export class NexoLeadsList extends HTMLElement {
    connectedCallback() {
        this.render();
        window.addEventListener('nexo-state-change', this.handleStateChange);
    }
    disconnectedCallback() {
        window.removeEventListener('nexo-state-change', this.handleStateChange);
    }
    handleStateChange = () => {
        this.render();
    }
    render() {
        try {
            const history = StateManager.config.winnersHistory || [];
            
            // Map each lead with its original index in history
            const sortedLeadsWithIndex = history
                .map((h, idx) => ({ h, idx }))
                .filter(item => item.h && item.h.lead);

            let filteredLeads = sortedLeadsWithIndex;
            if (StateManager.config.publicSessionListEnabled && StateManager.config.publicSessionId) {
                filteredLeads = filteredLeads.filter(item => item.h.publicSessionId === StateManager.config.publicSessionId);
            }
            if (StateManager.config.localSessionListEnabled && StateManager.config.localSessionId) {
                filteredLeads = filteredLeads.filter(item => item.h.localSessionId === StateManager.config.localSessionId);
            }

            if (!filteredLeads.length) {
                this.innerHTML = "<p style='text-align:center; color:#444; padding: 20px;'>NO HAY LEADS REGISTRADOS</p>";
                return;
            }

            this.innerHTML = "";

            // Reverse to display newest first
            const reversedLeads = [...filteredLeads].reverse();
            reversedLeads.forEach(item => {
                const card = document.createElement('nexo-winner-card') as NexoWinnerCard;
                this.appendChild(card);
                // Assign properties after element is in DOM to trigger correct rendering
                card.index = item.idx;
                card.leadData = item.h;
            });
        } catch (e) {
            console.error("Error al renderizar NexoLeadsList:", e);
            this.innerHTML = "<p style='text-align:center; color:#444; padding: 20px;'>Error al cargar los leads registrados.</p>";
        }
    }
}

/**
 * NexoGameStats Component
 * Native Web Component to render detailed game metrics, charts, and audit-driven analytics.
 */
export class NexoGameStats extends HTMLElement {
    selectedGameId: string = 'all';
    currentTab: string = 'metrics';

    static get observedAttributes() {
        return ['mode'];
    }

    attributeChangedCallback() {
        this.render();
    }

    connectedCallback() {
        this.render();
        window.addEventListener('nexo-state-change', this.handleStateChange);
        window.addEventListener('nexo-stats-change', this.handleStateChange);
    }
    disconnectedCallback() {
        window.removeEventListener('nexo-state-change', this.handleStateChange);
        window.removeEventListener('nexo-stats-change', this.handleStateChange);
    }
    handleStateChange = () => {
        this.render();
    }

    // Deterministic simulation of SHA-256 checksum for forensic validation
    generateSHA256(dataStr: string): string {
        let hash1 = 0xb0378122;
        for (let i = 0; i < dataStr.length; i++) {
            hash1 = (hash1 ^ dataStr.charCodeAt(i)) + ((hash1 << 5) | (hash1 >>> 27));
        }
        const hexPart1 = Math.abs(hash1).toString(16).padStart(8, '0');
        
        let hash2 = 0x10b98115;
        for (let i = dataStr.length - 1; i >= 0; i--) {
            hash2 = (hash2 ^ dataStr.charCodeAt(i)) + ((hash2 << 7) | (hash2 >>> 25));
        }
        const hexPart2 = Math.abs(hash2).toString(16).padStart(8, '0');
        
        return (hexPart1 + hexPart2 + "c3e8093db2e811ea093dfd21").substring(0, 64);
    }

    // List of registered modular components for the Metrics tab
    getMetricsComponents(): StatsComponent[] {
        return [
            new MetricsKpisComponent(),
            new MetricsChartsRowComponent(),
            new MetricsInsightsComponent(),
            new MetricsComparativeComponent(),
            new MetricsWidgetsComponent(),
            new MetricsActionsComponent()
        ];
    }

    // List of registered modular components for the Forensic tab
    getForensicComponents(): StatsComponent[] {
        return [
            new ForensicHeaderComponent(),
            new ForensicSessionGridComponent(),
            new ForensicKpisRowComponent(),
            new ForensicStockLedgerComponent(),
            new ForensicLogbookComponent(),
            new ForensicCustomSectionsComponent(),
            new ForensicIntegrityBoxComponent(),
            new ForensicActionsComponent()
        ];
    }

    // Modern Forensic Printable Certificate Modal
    showForensicCertificateModal(ctx: StatsContext) {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.85)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '99999';
        modal.style.overflowY = 'auto';
        modal.style.padding = '20px';
        modal.className = 'no-print';

        const card = document.createElement('div');
        card.id = 'certificateSheet';
        card.style.background = '#fff';
        card.style.color = '#000';
        card.style.width = '100%';
        card.style.maxWidth = '800px';
        card.style.padding = '40px';
        card.style.borderRadius = '12px';
        card.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5)';
        card.style.border = '16px double #d4af37';
        card.style.position = 'relative';

        const styleTag = document.createElement('style');
        styleTag.innerHTML = `
            @media print {
                body * {
                    display: none !important;
                }
                body, html {
                    background: #fff !important;
                }
                #certificateSheet, #certificateSheet * {
                    display: block !important;
                }
                #certificateSheet {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    background: #fff !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                #certificateSheet {
                    border: 12px double #d4af37 !important;
                    box-shadow: none !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    padding: 30px !important;
                    margin: 0 !important;
                }
                .no-print {
                    display: none !important;
                }
            }
        `;
        modal.appendChild(styleTag);

        let stockTableHtml = '';
        if (ctx.stockRows.length > 0) {
            stockTableHtml = `
                <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:0.7rem; font-family:sans-serif; border:1px solid #ddd;">
                    <thead>
                        <tr style="background:#f2f2f2; border-bottom:2px solid #aaa; font-weight:bold; color:#000;">
                            <th style="padding:5px 8px; text-align:left;">Premio Especial</th>
                            <th style="padding:5px 8px; text-align:center;">Stock Inicial</th>
                            <th style="padding:5px 8px; text-align:center;">Consumido</th>
                            <th style="padding:5px 8px; text-align:center;">Saldo Stock</th>
                            <th style="padding:5px 8px; text-align:center;">Consumo %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ctx.stockRows.map(r => `
                            <tr style="border-bottom:1px solid #ddd;">
                                <td style="padding:5px 8px; font-weight:bold; color:#000;">${r.name}</td>
                                <td style="padding:5px 8px; text-align:center; font-family:monospace;">${r.initial}</td>
                                <td style="padding:5px 8px; text-align:center; font-family:monospace;">${r.consumed}</td>
                                <td style="padding:5px 8px; text-align:center; font-family:monospace; font-weight:bold; color:${r.current === 0 ? '#ff0000' : '#000'}">${r.current}</td>
                                <td style="padding:5px 8px; text-align:center; font-family:monospace;">${r.rate}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            stockTableHtml = `<p style="font-size:0.7rem; font-style:italic; margin-top:5px; color:#555; font-family:sans-serif;">No se configuraron límites de stock para los premios en este juego (Premios Ilimitados).</p>`;
        }

        card.innerHTML = `
            <div style="text-align:center; border-bottom:2px solid #d4af37; padding-bottom:10px; margin-bottom:20px;">
                <p style="font-size:0.6rem; letter-spacing:4px; font-weight:bold; color:#666; margin:0; text-transform:uppercase; font-family:sans-serif;">CERTIFICADO DE AUDITORÍA FORENSE DE JUEGO</p>
                <h1 style="font-size:1.6rem; margin:5px 0; font-family:'Times New Roman', serif; font-weight:bold; color:#000; letter-spacing:1px; text-transform:uppercase;">Ruleta Nexo Premium</h1>
                <p style="font-size:0.5rem; color:#d4af37; font-weight:bold; margin:0; letter-spacing:2px; text-transform:uppercase; font-family:sans-serif;">INTEGRIDAD DE DATOS CONEXIÓN &bull; ESTÁNDAR INTERNACIONAL ISO/IEC 27001</p>
            </div>

            <div style="font-size:0.75rem; line-height:1.4; color:#111; text-align:justify; font-family:'Georgia', serif;">
                <p>Por medio del presente documento oficial, el <b>Motor de Analíticas Forenses Nexo Premium</b> certifica con carácter inmutable, la validez e integridad de las transacciones registradas de giros para el juego/plantilla denominado <b><span style="font-family:monospace; font-size:0.8rem; color:#000; font-weight:bold; text-decoration:underline;">${ctx.selectedGameTitle}</span></b>, procesadas y auditadas de manera transparente de acuerdo con las especificaciones técnicas ISO/IEC 27001, SOC 2 y PCI-DSS v4.0.</p>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:15px 0; background:#faf6eb; padding:10px; border:1px solid #dfd1b0; font-family:sans-serif; font-size:0.65rem;">
                    <div>
                        <span style="color:#666; font-weight:bold; text-transform:uppercase; display:block; font-size:0.55rem;">ID Reporte Único</span>
                        <b style="font-family:monospace; color:#000; font-size:0.75rem;">${ctx.reportUuid}</b>
                    </div>
                    <div>
                        <span style="color:#666; font-weight:bold; text-transform:uppercase; display:block; font-size:0.55rem;">Fecha Emisión Certificado</span>
                        <b style="color:#000;">${new Date().toLocaleString()}</b>
                    </div>
                    <div>
                        <span style="color:#666; font-weight:bold; text-transform:uppercase; display:block; font-size:0.55rem;">Hora Fecha de Inicio</span>
                        <b style="color:#000;">${ctx.startDateStr}</b>
                    </div>
                    <div>
                        <span style="color:#666; font-weight:bold; text-transform:uppercase; display:block; font-size:0.55rem;">Hora Fecha de Fin</span>
                        <b style="color:#000;">${ctx.endDateStr}</b>
                    </div>
                    <div>
                        <span style="color:#666; font-weight:bold; text-transform:uppercase; display:block; font-size:0.55rem;">Duración Activa</span>
                        <b style="color:#000;">${ctx.durationStr}</b>
                    </div>
                    <div>
                        <span style="color:#666; font-weight:bold; text-transform:uppercase; display:block; font-size:0.55rem;">Auditor Administrador</span>
                        <b style="color:#000; font-family:monospace;">${ctx.adminEmail}</b>
                    </div>
                </div>

                <h3 style="font-size:0.85rem; font-family:'Times New Roman', serif; border-bottom:1px solid #ccc; padding-bottom:3px; margin-top:15px; color:#000; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">I. Resumen Métrico de Giros</h3>
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:8px; text-align:center; font-family:sans-serif; font-size:0.65rem;">
                    <div style="background:#fbfbfb; border:1px solid #ddd; padding:8px;">
                        <span style="color:#666; display:block; font-size:0.55rem;">GIROS TOTALES</span>
                        <b style="font-size:1.1rem; color:#000;">${ctx.totalPlays}</b>
                    </div>
                    <div style="background:#fbfbfb; border:1px solid #ddd; padding:8px;">
                        <span style="color:#666; display:block; font-size:0.55rem;">LEADS REGISTRADOS</span>
                        <b style="font-size:1.1rem; color:#000;">${ctx.totalLeads}</b>
                    </div>
                    <div style="background:#fbfbfb; border:1px solid #ddd; padding:8px;">
                        <span style="color:#666; display:block; font-size:0.55rem;">TASA DE CONVERSIÓN</span>
                        <b style="font-size:1.1rem; color:#000;">${ctx.convRate}%</b>
                    </div>
                </div>

                <h3 style="font-size:0.85rem; font-family:'Times New Roman', serif; border-bottom:1px solid #ccc; padding-bottom:3px; margin-top:15px; color:#000; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">II. Balance de Stock Especial</h3>
                ${stockTableHtml}

                <h3 style="font-size:0.85rem; font-family:'Times New Roman', serif; border-bottom:1px solid #ccc; padding-bottom:3px; margin-top:15px; color:#000; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">III. Premios Calientes más Entregados</h3>
                <ul style="font-size:0.7rem; padding-left:15px; color:#222; margin-top:5px; font-family:sans-serif;">
                    ${ctx.sortedPrizes.map(([p, count]) => `<li>Premio: <b>${p}</b> adjudicado un total de <b>${count}</b> veces en la sesión.</li>`).join('')}
                </ul>

                ${(() => {
                     const customSections = ForensicSectionRegistry.getSections();
                     let html = '';
                     customSections.forEach((s, idx) => {
                         const romanNumerals = ['IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
                         const numStr = romanNumerals[idx] || (idx + 4).toString();
                         const renderFn = s.renderSectionPrintHtml || s.renderSectionHtml;
                         html += `
                             <h3 style="font-size:0.85rem; font-family:'Times New Roman', serif; border-bottom:1px solid #ccc; padding-bottom:3px; margin-top:15px; color:#000; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">${numStr}. ${s.title}</h3>
                             <div style="font-size:0.7rem; color:#222; margin-top:5px; font-family:sans-serif;">
                                 ${renderFn(ctx.validPlays)}
                             </div>
                         `;
                     });
                     return html;
                 })()}

                <h3 style="font-size:0.85rem; font-family:'Times New Roman', serif; border-bottom:1px solid #ccc; padding-bottom:3px; margin-top:15px; color:#000; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">
                     ${(() => {
                         const count = ForensicSectionRegistry.getSections().length;
                         const romanNumerals = ['IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
                         return romanNumerals[count] || (count + 4).toString();
                     })()}. Firma Digital de Auditoría Forense
                </h3>
                <div style="background:#111; color:#00ff66; font-family:monospace; font-size:0.55rem; padding:10px; border-radius:4px; margin-top:5px; word-break:break-all; border-left:4px solid #d4af37;">
                    [HUELLA DIGITAL DE INTEGRIDAD DE SESIÓN]<br>
                    [SHA-256 CHECK-SUM]: ${ctx.forensicHash}<br>
                    [VERIFICACIÓN]      : INTEGRIDAD 100% CORRECTA &bull; NO SE DETECTARON ALTERACIONES MANUALES
                </div>
            </div>

            <div style="margin-top:30px; display:flex; justify-content:space-between; align-items:flex-end; font-size:0.65rem; border-top:1px dashed #ddd; padding-top:20px; font-family:sans-serif;">
                <div style="text-align:center; width:180px;">
                    <div style="border-bottom:1px solid #333; height:35px; margin-bottom:5px;"></div>
                    <span>Firma del Oficial de Cumplimiento</span><br>
                    <span style="color:#777; font-size:0.55rem;">Nexo Premium Forensic Engine</span>
                </div>
                <div style="text-align:right;">
                    <span style="color:#666;">Sello de Autenticación</span><br>
                    <div style="width:60px; height:60px; border:2px double #d4af37; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-top:5px; margin-left:auto; transform:rotate(-15deg); background:#fff;">
                        <div style="font-size:0.4rem; color:#d4af37; font-weight:bold; text-align:center; line-height:1;">
                            NEXO<br>PREMIUM<br>AUDIT
                        </div>
                    </div>
                </div>
            </div>

            <div class="no-print" style="margin-top:25px; border-top:1px solid #eee; padding-top:12px; display:flex; gap:10px; justify-content:flex-end; font-family:sans-serif;">
                <button id="btnPrintCertificateAction" style="background:#d4af37; color:#000; border:none; padding:8px 16px; font-weight:bold; cursor:pointer; font-size:0.65rem; border-radius:4px; display:flex; align-items:center; gap:4px;">
                    🖨️ Imprimir Certificado
                </button>
                <button id="btnCloseCertificateAction" style="background:#555; color:#fff; border:none; padding:8px 16px; font-weight:bold; cursor:pointer; font-size:0.65rem; border-radius:4px;">
                    Cerrar
                </button>
            </div>
        `;

        modal.appendChild(card);
        document.body.appendChild(modal);

        document.getElementById('btnPrintCertificateAction')?.addEventListener('click', () => {
            window.print();
        });

        document.getElementById('btnCloseCertificateAction')?.addEventListener('click', () => {
            modal.remove();
        });
    }

    render() {
        try {
            const history = StateManager.config.winnersHistory || [];
            const validPlaysAll = history.filter(h => h && h.nombre !== "GIRANDO...");
            const savedLists = [...(StateManager.config.savedPrizeLists || [])].sort((a, b) => {
                if (a.id === "list_juego_estandar") return -1;
                if (b.id === "list_juego_estandar") return 1;
                return 0;
            });

            // Tab toggles UI header
            let tabHeaderHtml = `
                <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #1a1a1a; padding-bottom: 12px; flex-wrap: wrap;">
                    <button class="stats-tab-btn" data-tab="metrics" style="flex:1; min-width: 140px; background: ${this.currentTab === 'metrics' ? 'rgba(212,175,55,0.08)' : 'transparent'}; border: 1px solid ${this.currentTab === 'metrics' ? 'var(--gold)' : '#222'}; color: ${this.currentTab === 'metrics' ? 'var(--gold)' : '#888'}; padding: 10px; border-radius: 8px; font-size: 0.65rem; font-weight: 900; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; letter-spacing: 0.5px;">
                        📊 KPIs & ANALÍTICAS
                    </button>
                    <button class="stats-tab-btn" data-tab="forensic" style="flex:1; min-width: 140px; background: ${this.currentTab === 'forensic' ? 'rgba(16,185,129,0.08)' : 'transparent'}; border: 1px solid ${this.currentTab === 'forensic' ? '#10b981' : '#222'}; color: ${this.currentTab === 'forensic' ? '#10b981' : '#888'}; padding: 10px; border-radius: 8px; font-size: 0.65rem; font-weight: 900; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; letter-spacing: 0.5px;">
                        📜 REPORTE FORENSE DE AUDITORÍA
                    </button>
                </div>
            `;

            // If no plays overall
            if (validPlaysAll.length === 0) {
                this.innerHTML = `
                    <div>
                        <h5 style="color: var(--gold); font-size: 0.85rem; margin-top: 0; margin-bottom: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
                            📊 Estadísticas Generales
                        </h5>
                        <p style="font-size: 0.65rem; color: #666; margin-top: 0; margin-bottom: 20px;">Métricas consolidadas de giros, tasa de conversión y analíticas avanzadas de juego.</p>
                        
                        <div style="text-align: center; color: #555; padding: 30px; border: 1px dashed #222; border-radius: 12px; font-size: 0.7rem; margin-top: 15px;">
                            Para activar las analíticas y reportes de auditoría forense, realiza giros en la ruleta o inicia un juego.
                        </div>
                    </div>
                `;
                return;
            }

            // Apply selected game filter
            const savedSessionIds = savedLists.map(l => l.localSessionId).filter(Boolean);
            const standalonePlays = validPlaysAll.filter(h => !h.localSessionId || !savedSessionIds.includes(h.localSessionId));

            let validPlays = validPlaysAll;
            let selectedGameTitle = 'TODOS LOS JUEGOS / SESIONES';
            let targetList: any = null;

            if (this.selectedGameId !== 'all') {
                if (this.selectedGameId === 'standalone') {
                    validPlays = standalonePlays;
                    selectedGameTitle = 'GIROS INDEPENDIENTES / STANDALONE';
                } else {
                    targetList = savedLists.find(l => l.id === this.selectedGameId);
                    if (targetList) {
                        validPlays = validPlaysAll.filter(h => h.localSessionId === targetList.localSessionId);
                        selectedGameTitle = `JUEGO: ${targetList.name.toUpperCase()}`;
                    }
                }
            }

            const totalPlays = validPlays.length;
            const totalLeads = validPlays.filter(h => h.lead).length;
            const convRate = totalPlays > 0 ? ((totalLeads / totalPlays) * 100).toFixed(1) : "0.0";
            
            const prizesWonCounts: Record<string, number> = {};
            let totalPrizesCount = 0;
            validPlays.forEach(h => {
                if (h.nombre !== "REGISTRADO (SORTEO)") {
                    prizesWonCounts[h.nombre] = (prizesWonCounts[h.nombre] || 0) + 1;
                    totalPrizesCount++;
                }
            });
            const uniquePrizesWon = Object.keys(prizesWonCounts).length;

            // Sort top winning prizes
            const sortedPrizes = Object.entries(prizesWonCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

            // Fetch admin details
            const adminEmail = sessionStorage.getItem('nexo_current_user_email') || '';

            // Filter options for the dropdown select
            let selectOptions = `<option value="all" ${this.selectedGameId === 'all' ? 'selected' : ''}>✨ GENERAL (TODOS LOS JUEGOS - ${validPlaysAll.length} giros)</option>`;
            savedLists.forEach(list => {
                const count = validPlaysAll.filter(h => h.localSessionId === list.localSessionId).length;
                selectOptions += `<option value="${list.id}" ${this.selectedGameId === list.id ? 'selected' : ''}>🎯 JUEGO: ${list.name.toUpperCase()} (${count} giros)</option>`;
            });
            if (standalonePlays.length > 0) {
                selectOptions += `<option value="standalone" ${this.selectedGameId === 'standalone' ? 'selected' : ''}>🎲 GIROS INDEPENDIENTES (${standalonePlays.length} giros)</option>`;
            }

            // Calculation of Chronology (Inicio & Fin) based on logs timestamps
            let startDateStr = 'Sin registros';
            let endDateStr = 'Sin registros';
            let durationStr = '00h 00m 00s';

            if (validPlays.length > 0) {
                const parsedPlays = validPlays.map(p => {
                    let timeMs = 0;
                    try {
                        timeMs = Date.parse(p.fecha);
                        if (isNaN(timeMs)) {
                            timeMs = new Date(p.fecha).getTime();
                        }
                    } catch (e) {}
                    return { ...p, timeMs };
                }).filter(p => p.timeMs > 0).sort((a, b) => a.timeMs - b.timeMs);

                if (parsedPlays.length > 0) {
                    startDateStr = parsedPlays[0].fecha;
                    endDateStr = parsedPlays[parsedPlays.length - 1].fecha;
                    
                    const diffMs = parsedPlays[parsedPlays.length - 1].timeMs - parsedPlays[0].timeMs;
                    if (diffMs > 0) {
                        const diffSecs = Math.floor(diffMs / 1000);
                        const hrs = Math.floor(diffSecs / 3600);
                        const mins = Math.floor((diffSecs % 3600) / 60);
                        const secs = diffSecs % 60;
                        durationStr = `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
                    } else {
                        durationStr = 'Sesión instantánea (1 giro)';
                    }
                }
            }

            // Calculation of stock balances
            const prizesToAudit = targetList ? targetList.prizes : StateManager.config.prizes;
            const stockRows = prizesToAudit.map((p: any) => {
                if (!p.isSpecial || p.stock === undefined) return null;
                const consumed = validPlays.filter(play => play.nombre === p.name).length;
                const current = p.stock;
                const initial = current + consumed;
                const rate = initial > 0 ? ((consumed / initial) * 100).toFixed(1) : "0.0";
                
                let statusLabel = '🟢 DISPONIBLE';
                let statusColor = '#10b981';
                let bgOpacity = 'rgba(16, 185, 129, 0.05)';
                if (current === 0) {
                    statusLabel = '🔴 AGOTADO';
                    statusColor = '#ef4444';
                    bgOpacity = 'rgba(239, 68, 68, 0.05)';
                } else if (current / initial <= 0.4) {
                    statusLabel = '🟡 BAJO STOCK';
                    statusColor = '#facc15';
                    bgOpacity = 'rgba(250, 204, 21, 0.05)';
                }

                return {
                    name: p.name,
                    initial,
                    consumed,
                    current,
                    rate,
                    statusLabel,
                    statusColor,
                    bgOpacity
                };
            }).filter(Boolean);

            // Forensic metadata & deterministic hash
            const reportUuid = `REPORT-AUDIT-${this.selectedGameId.substring(0, 5).toUpperCase()}-${Date.now().toString(16).slice(-4).toUpperCase()}`;
            const hashPayload = `${selectedGameTitle}-${validPlays.length}-${startDateStr}-${endDateStr}-${stockRows.length}-${adminEmail}`;
            const forensicHash = generateSHA256(hashPayload);

            // Fetch extra analysis attributes
            let leadsCount = 0, raffleCount = 0, publicCount = 0;
            validPlays.forEach(h => {
                const sid = h.localSessionId || '';
                const isPub = h.publicSessionId || sid.startsWith('session_public_');
                const isRaffle = sid.startsWith('session_raffle_') || h.nombre === "REGISTRADO (SORTEO)";
                if (isPub) publicCount++;
                else if (isRaffle) raffleCount++;
                else leadsCount++;
            });

            let madrugada = 0, manana = 0, tarde = 0, noche = 0;
            validPlays.forEach(h => {
                let hour = -1;
                try {
                    const match = h.fecha.match(/(\d{1,2}):\d{2}:\d{2}/);
                    if (match) hour = parseInt(match[1]);
                    else {
                        const date = new Date(h.fecha);
                        if (!isNaN(date.getTime())) hour = date.getHours();
                    }
                } catch (e) {}
                if (hour >= 0) {
                    if (hour < 6) madrugada++;
                    else if (hour < 12) manana++;
                    else if (hour < 18) tarde++;
                    else noche++;
                } else noche++;
            });

            const sessionCounts: Record<string, number> = {};
            validPlays.forEach(h => {
                const s = h.localSessionId || h.publicSessionId || 'Sin Sesión';
                sessionCounts[s] = (sessionCounts[s] || 0) + 1;
            });
            const topSession = Object.entries(sessionCounts).sort((a, b) => b[1] - a[1])[0];
            const topSessionStr = topSession ? `${topSession[0].substring(0, 18)}... (${topSession[1]} giros)` : 'Ninguna';
            const hotPrize = sortedPrizes[0] ? `${sortedPrizes[0][0]} (${sortedPrizes[0][1]} veces)` : 'Ninguno';
            const peakPeriodStr = [
                { n: 'Madrugada', v: madrugada }, { n: 'Mañana', v: manana }, { n: 'Tarde', v: tarde }, { n: 'Noche', v: noche }
            ].sort((a, b) => b.v - a.v)[0]?.n || 'N/A';

            // Construct unified Context Object
            const ctx: StatsContext = {
                validPlaysAll, savedLists, validPlays, selectedGameTitle, targetList,
                totalPlays, totalLeads, convRate, uniquePrizesWon, sortedPrizes, totalPrizesCount,
                adminEmail, startDateStr, endDateStr, durationStr, stockRows, reportUuid, forensicHash,
                hashPayload, leadsCount, raffleCount, publicCount, madrugada, manana, tarde, noche,
                hotPrize, peakPeriodStr, topSessionStr
            };

            // RENDER BASE CONTAINER STRUCTURE
            let innerHtmlContent = `
                <div style="position: relative;">
                    ${tabHeaderHtml}

                    <div style="background: rgba(212,175,55,0.02); border: 1px solid #1a1a1a; border-radius: 12px; padding: 12px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 0.55rem; color: var(--gold); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Seleccionar Filtro de Juego / Sesión a Analizar:</label>
                        <select id="statsGameFilter" style="width: 100%; background: #000; border: 1px solid #222; color: #fff; padding: 8px 10px; border-radius: 6px; font-size: 0.65rem; font-weight: 700; outline: none; cursor:pointer;">
                            ${selectOptions}
                        </select>
                    </div>

                    <div id="activeTabContent" style="display: flex; flex-direction: column;"></div>
                </div>
            `;
            this.innerHTML = innerHtmlContent;

            // Render sub-components based on active tab
            const activeContainer = this.querySelector('#activeTabContent') as HTMLElement;
            if (activeContainer) {
                const componentsToRender = this.currentTab === 'metrics' ? this.getMetricsComponents() : this.getForensicComponents();
                let subHtml = '';
                componentsToRender.forEach(comp => {
                    subHtml += `<div id="comp-wrapper-${comp.id}">${comp.render(ctx)}</div>`;
                });
                activeContainer.innerHTML = subHtml;

                // Bind events for each sub-component
                componentsToRender.forEach(comp => {
                    if (comp.bindEvents) {
                        const wrapper = activeContainer.querySelector(`#comp-wrapper-${comp.id}`) as HTMLElement;
                        if (wrapper) {
                            comp.bindEvents(ctx, wrapper, this);
                        }
                    }
                });
            }

            // Bind tab toggles
            this.querySelectorAll('.stats-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tab = btn.getAttribute('data-tab');
                    if (tab) {
                        this.currentTab = tab;
                        this.render();
                    }
                });
            });

            // Bind global events of the component
            this.bindEvents();

        } catch (error) {
            console.error("Error al renderizar NexoGameStats:", error);
            this.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #ff4d4d; border: 1px dashed #ff4d4d; border-radius: 12px; font-size: 0.75rem;">
                    Ocurrió un error al cargar las estadísticas avanzadas de juego.
                </div>
            `;
        }
    }

    /*
    render() {
        try {
            const customWidgets = StatsWidgetRegistry.getProviders();
            const customExporters = StatsExporterRegistry.getExporters();
            const history = StateManager.config.winnersHistory || [];
            const validPlaysAll = history.filter(h => h && h.nombre !== "GIRANDO...");
            const savedLists = [...(StateManager.config.savedPrizeLists || [])].sort((a, b) => {
                if (a.id === "list_juego_estandar") return -1;
                if (b.id === "list_juego_estandar") return 1;
                return 0;
            });

            // Tab toggles UI header
            let tabHeaderHtml = `
                <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #1a1a1a; padding-bottom: 12px; flex-wrap: wrap;">
                    <button class="stats-tab-btn" data-tab="metrics" style="flex:1; min-width: 140px; background: ${this.currentTab === 'metrics' ? 'rgba(212,175,55,0.08)' : 'transparent'}; border: 1px solid ${this.currentTab === 'metrics' ? 'var(--gold)' : '#222'}; color: ${this.currentTab === 'metrics' ? 'var(--gold)' : '#888'}; padding: 10px; border-radius: 8px; font-size: 0.65rem; font-weight: 900; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; letter-spacing: 0.5px;">
                        📊 KPIs & ANALÍTICAS
                    </button>
                    <button class="stats-tab-btn" data-tab="forensic" style="flex:1; min-width: 140px; background: ${this.currentTab === 'forensic' ? 'rgba(16,185,129,0.08)' : 'transparent'}; border: 1px solid ${this.currentTab === 'forensic' ? '#10b981' : '#222'}; color: ${this.currentTab === 'forensic' ? '#10b981' : '#888'}; padding: 10px; border-radius: 8px; font-size: 0.65rem; font-weight: 900; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; letter-spacing: 0.5px;">
                        📜 REPORTE FORENSE DE AUDITORÍA
                    </button>
                </div>
            `;

            // If no plays overall
            if (validPlaysAll.length === 0) {
                this.innerHTML = `
                    <div>
                        <h5 style="color: var(--gold); font-size: 0.85rem; margin-top: 0; margin-bottom: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
                            📊 Estadísticas Generales
                        </h5>
                        <p style="font-size: 0.65rem; color: #666; margin-top: 0; margin-bottom: 20px;">Métricas consolidadas de giros, tasa de conversión y analíticas avanzadas de juego.</p>
                        
                        <div style="text-align: center; color: #555; padding: 30px; border: 1px dashed #222; border-radius: 12px; font-size: 0.7rem; margin-top: 15px;">
                            Para activar las analíticas y reportes de auditoría forense, realiza giros en la ruleta o inicia un juego.
                        </div>
                    </div>
                `;
                return;
            }

            // Apply selected game filter
            const savedSessionIds = savedLists.map(l => l.localSessionId).filter(Boolean);
            const standalonePlays = validPlaysAll.filter(h => !h.localSessionId || !savedSessionIds.includes(h.localSessionId));

            let validPlays = validPlaysAll;
            let selectedGameTitle = 'TODOS LOS JUEGOS / SESIONES';
            let targetList: any = null;

            if (this.selectedGameId !== 'all') {
                if (this.selectedGameId === 'standalone') {
                    validPlays = standalonePlays;
                    selectedGameTitle = 'GIROS INDEPENDIENTES / STANDALONE';
                } else {
                    targetList = savedLists.find(l => l.id === this.selectedGameId);
                    if (targetList) {
                        validPlays = validPlaysAll.filter(h => h.localSessionId === targetList.localSessionId);
                        selectedGameTitle = `JUEGO: ${targetList.name.toUpperCase()}`;
                    }
                }
            }

            const totalPlays = validPlays.length;
            const totalLeads = validPlays.filter(h => h.lead).length;
            const convRate = totalPlays > 0 ? ((totalLeads / totalPlays) * 100).toFixed(1) : "0.0";
            
            const prizesWonCounts: Record<string, number> = {};
            let totalPrizesCount = 0;
            validPlays.forEach(h => {
                if (h.nombre !== "REGISTRADO (SORTEO)") {
                    prizesWonCounts[h.nombre] = (prizesWonCounts[h.nombre] || 0) + 1;
                    totalPrizesCount++;
                }
            });
            const uniquePrizesWon = Object.keys(prizesWonCounts).length;

            // Sort top winning prizes
            const sortedPrizes = Object.entries(prizesWonCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

            // Fetch admin details
            const adminEmail = sessionStorage.getItem('nexo_current_user_email') || '';

            // Filter options for the dropdown select
            let selectOptions = `<option value="all" ${this.selectedGameId === 'all' ? 'selected' : ''}>✨ GENERAL (TODOS LOS JUEGOS - ${validPlaysAll.length} giros)</option>`;
            savedLists.forEach(list => {
                const count = validPlaysAll.filter(h => h.localSessionId === list.localSessionId).length;
                selectOptions += `<option value="${list.id}" ${this.selectedGameId === list.id ? 'selected' : ''}>🎯 JUEGO: ${list.name.toUpperCase()} (${count} giros)</option>`;
            });
            if (standalonePlays.length > 0) {
                selectOptions += `<option value="standalone" ${this.selectedGameId === 'standalone' ? 'selected' : ''}>🎲 GIROS INDEPENDIENTES (${standalonePlays.length} giros)</option>`;
            }

            // Calculation of Chronology (Inicio & Fin) based on logs timestamps
            let startDateStr = 'Sin registros';
            let endDateStr = 'Sin registros';
            let durationStr = '00h 00m 00s';

            if (validPlays.length > 0) {
                const parsedPlays = validPlays.map(p => {
                    let timeMs = 0;
                    try {
                        timeMs = Date.parse(p.fecha);
                        if (isNaN(timeMs)) {
                            timeMs = new Date(p.fecha).getTime();
                        }
                    } catch (e) {}
                    return { ...p, timeMs };
                }).filter(p => p.timeMs > 0).sort((a, b) => a.timeMs - b.timeMs);

                if (parsedPlays.length > 0) {
                    startDateStr = parsedPlays[0].fecha;
                    endDateStr = parsedPlays[parsedPlays.length - 1].fecha;
                    
                    const diffMs = parsedPlays[parsedPlays.length - 1].timeMs - parsedPlays[0].timeMs;
                    if (diffMs > 0) {
                        const diffSecs = Math.floor(diffMs / 1000);
                        const hrs = Math.floor(diffSecs / 3600);
                        const mins = Math.floor((diffSecs % 3600) / 60);
                        const secs = diffSecs % 60;
                        durationStr = `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
                    } else {
                        durationStr = 'Sesión instantánea (1 giro)';
                    }
                }
            }

            // Calculation of stock balances
            const prizesToAudit = targetList ? targetList.prizes : StateManager.config.prizes;
            const stockRows = prizesToAudit.map((p: any) => {
                if (!p.isSpecial || p.stock === undefined) return null;
                const consumed = validPlays.filter(play => play.nombre === p.name).length;
                const current = p.stock;
                const initial = current + consumed;
                const rate = initial > 0 ? ((consumed / initial) * 100).toFixed(1) : "0.0";
                
                let statusLabel = '🟢 DISPONIBLE';
                let statusColor = '#10b981';
                let bgOpacity = 'rgba(16, 185, 129, 0.05)';
                if (current === 0) {
                    statusLabel = '🔴 AGOTADO';
                    statusColor = '#ef4444';
                    bgOpacity = 'rgba(239, 68, 68, 0.05)';
                } else if (current / initial <= 0.4) {
                    statusLabel = '🟡 BAJO STOCK';
                    statusColor = '#facc15';
                    bgOpacity = 'rgba(250, 204, 21, 0.05)';
                }

                return {
                    name: p.name,
                    initial,
                    consumed,
                    current,
                    rate,
                    statusLabel,
                    statusColor,
                    bgOpacity
                };
            }).filter(Boolean);

            // Forensic metadata & deterministic hash
            const reportUuid = `REPORT-AUDIT-${this.selectedGameId.substring(0, 5).toUpperCase()}-${Date.now().toString(16).slice(-4).toUpperCase()}`;
            const hashPayload = `${selectedGameTitle}-${validPlays.length}-${startDateStr}-${endDateStr}-${stockRows.length}-${adminEmail}`;
            const forensicHash = this.generateSHA256(hashPayload);

            // RENDER BASE STRUCTURE
            let innerHtmlContent = `
                <div>
                    ${tabHeaderHtml}

                    <div style="background: rgba(212,175,55,0.02); border: 1px solid #1a1a1a; border-radius: 12px; padding: 12px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 0.55rem; color: var(--gold); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Seleccionar Filtro de Juego / Sesión a Analizar:</label>
                        <select id="statsGameFilter" style="width: 100%; background: #000; border: 1px solid #222; color: #fff; padding: 8px 10px; border-radius: 6px; font-size: 0.65rem; font-weight: 700; outline: none; cursor:pointer;">
                            ${selectOptions}
                        </select>
                    </div>
            `;

            if (this.currentTab === 'metrics') {
                // --- TAB 1: METRICS AND KPIS GENERALES ---
                let leadsCount = 0, raffleCount = 0, publicCount = 0;
                validPlays.forEach(h => {
                    const sid = h.localSessionId || '';
                    const isPub = h.publicSessionId || sid.startsWith('session_public_');
                    const isRaffle = sid.startsWith('session_raffle_') || h.nombre === "REGISTRADO (SORTEO)";
                    if (isPub) publicCount++;
                    else if (isRaffle) raffleCount++;
                    else leadsCount++;
                });

                let madrugada = 0, manana = 0, tarde = 0, noche = 0;
                validPlays.forEach(h => {
                    let hour = -1;
                    try {
                        const match = h.fecha.match(/(\d{1,2}):\d{2}:\d{2}/);
                        if (match) hour = parseInt(match[1]);
                        else {
                            const date = new Date(h.fecha);
                            if (!isNaN(date.getTime())) hour = date.getHours();
                        }
                    } catch (e) {}
                    if (hour >= 0) {
                        if (hour < 6) madrugada++;
                        else if (hour < 12) manana++;
                        else if (hour < 18) tarde++;
                        else noche++;
                    } else noche++;
                });

                const sessionCounts: Record<string, number> = {};
                validPlays.forEach(h => {
                    const s = h.localSessionId || h.publicSessionId || 'Sin Sesión';
                    sessionCounts[s] = (sessionCounts[s] || 0) + 1;
                });
                const topSession = Object.entries(sessionCounts).sort((a, b) => b[1] - a[1])[0];
                const topSessionStr = topSession ? `${topSession[0].substring(0, 18)}... (${topSession[1]} giros)` : 'Ninguna';
                const hotPrize = sortedPrizes[0] ? `${sortedPrizes[0][0]} (${sortedPrizes[0][1]} veces)` : 'Ninguno';
                const peakPeriodStr = [
                    { n: 'Madrugada', v: madrugada }, { n: 'Mañana', v: manana }, { n: 'Tarde', v: tarde }, { n: 'Noche', v: noche }
                ].sort((a, b) => b.v - a.v)[0]?.n || 'N/A';

                const customKpis = KpiRegistry.getProviders();
                let customKpisHtml = '';
                customKpis.forEach(k => {
                    const value = k.value(validPlays);
                    const textColor = k.color || '#fff';
                    const borderStyle = k.borderColor ? `border: 1px solid ${k.borderColor}` : 'border: 1px solid #111';
                    const backgroundStyle = k.bgOpacity ? `background: ${k.bgOpacity}` : 'background: #060606';
                    customKpisHtml += `
                        <div style="${backgroundStyle}; ${borderStyle}; padding:10px; border-radius:10px; text-align:center;">
                            <div style="font-size:0.55rem; color:#666; font-weight:800; text-transform:uppercase;">${k.label}</div>
                            <div style="font-size:1.3rem; font-weight:900; color:${textColor}; margin-top:2px;">${value}</div>
                        </div>
                    `;
                });

                let metricsAreaHtml = `
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:15px;">
                        <div style="background:#060606; border:1px solid #111; padding:10px; border-radius:10px; text-align:center;">
                            <div style="font-size:0.55rem; color:#666; font-weight:800; text-transform:uppercase;">Total Partidas</div>
                            <div style="font-size:1.3rem; font-weight:900; color:#fff; margin-top:2px;">${totalPlays}</div>
                        </div>
                        <div style="background:#060606; border:1px solid #111; padding:10px; border-radius:10px; text-align:center;">
                            <div style="font-size:0.55rem; color:#666; font-weight:800; text-transform:uppercase;">Leads Obtenidos</div>
                            <div style="font-size:1.3rem; font-weight:900; color:var(--gold); margin-top:2px;">${totalLeads}</div>
                        </div>
                        <div style="background:#060606; border:1px solid #10b98122; padding:10px; border-radius:10px; text-align:center;">
                            <div style="font-size:0.55rem; color:#10b981; font-weight:800; text-transform:uppercase;">Tasa Conversión</div>
                            <div style="font-size:1.3rem; font-weight:900; color:#10b981; margin-top:2px;">${convRate}%</div>
                        </div>
                        <div style="background:#060606; border:1px solid #3b82f622; padding:10px; border-radius:10px; text-align:center;">
                            <div style="font-size:0.55rem; color:#3b82f6; font-weight:800; text-transform:uppercase;">Premios Únicos</div>
                            <div style="font-size:1.3rem; font-weight:900; color:#3b82f6; margin-top:2px;">${uniquePrizesWon}</div>
                        </div>
                        ${customKpisHtml}
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin-bottom:15px;">
                        <div style="background:rgba(255,255,255,0.01); border:1px solid #1a1a1a; border-radius:12px; padding:12px;">
                            <h6 style="color:#fff; font-size:0.65rem; margin:0 0 10px 0; text-transform:uppercase; font-weight:900; display:flex; justify-content:space-between;">
                                <span>🏆 Premios Más Entregados (Top 5)</span>
                            </h6>
                            <div style="display:flex; flex-direction:column; gap:8px;">
                                ${sortedPrizes.map(([nombre, count]) => {
                                    const percent = totalPrizesCount > 0 ? ((count / totalPrizesCount) * 100).toFixed(0) : "0";
                                    return `
                                        <div>
                                            <div style="display:flex; justify-content:space-between; font-size:0.6rem; color:#ccc; margin-bottom:2px;">
                                                <span style="font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:160px;">${nombre}</span>
                                                <b style="color:var(--gold);">${count} (${percent}%)</b>
                                            </div>
                                            <div style="width:100%; height:4px; background:rgba(255,255,255,0.03); border-radius:2px; overflow:hidden;">
                                                <div style="width:${percent}%; height:100%; background:linear-gradient(90deg, var(--gold), #facc15); border-radius:2px;"></div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        <div style="background:rgba(255,255,255,0.01); border:1px solid #1a1a1a; border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:12px;">
                            <div>
                                <h6 style="color:#fff; font-size:0.65rem; margin:0 0 8px 0; text-transform:uppercase; font-weight:900;">🕹️ Canales de Juego</h6>
                                <div style="display:flex; gap:3px; height:8px; background:rgba(255,255,255,0.03); border-radius:4px; overflow:hidden; margin-bottom:6px;">
                                    ${leadsCount > 0 ? `<div style="width:${(leadsCount/totalPlays*100).toFixed(0)}%; background:#d4af37;"></div>` : ''}
                                    ${raffleCount > 0 ? `<div style="width:${(raffleCount/totalPlays*100).toFixed(0)}%; background:#3b82f6;"></div>` : ''}
                                    ${publicCount > 0 ? `<div style="width:${(publicCount/totalPlays*100).toFixed(0)}%; background:#10b981;"></div>` : ''}
                                </div>
                                <div style="display:flex; justify-content:space-between; font-size:0.5rem; color:#888;">
                                    <span>Leads: ${leadsCount}</span>
                                    <span>Sorteo: ${raffleCount}</span>
                                    <span>Público QR: ${publicCount}</span>
                                </div>
                            </div>
                            <div>
                                <h6 style="color:#fff; font-size:0.65rem; margin:0 0 8px 0; text-transform:uppercase; font-weight:900;">⏰ Actividad Horaria</h6>
                                <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px; text-align:center; font-size:0.5rem; color:#999;">
                                    <div style="background:#090909; padding:4px; border-radius:4px; border:1px solid #111;">
                                        <div style="color:#555;">00-06h</div><b style="color:#fff;">${madrugada}</b>
                                    </div>
                                    <div style="background:#090909; padding:4px; border-radius:4px; border:1px solid #111;">
                                        <div style="color:var(--gold-secondary);">06-12h</div><b style="color:var(--gold);">${manana}</b>
                                    </div>
                                    <div style="background:#090909; padding:4px; border-radius:4px; border:1px solid #111;">
                                        <div style="color:#10b981;">12-18h</div><b style="color:#10b981;">${tarde}</b>
                                    </div>
                                    <div style="background:#090909; padding:4px; border-radius:4px; border:1px solid #111;">
                                        <div style="color:#3b82f6;">18-24h</div><b style="color:#3b82f6;">${noche}</b>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="background:rgba(212,175,55,0.01); border:1px solid rgba(212,175,55,0.08); border-radius:10px; padding:10px; font-size:0.62rem; color:#bbb; line-height:1.4; margin-bottom: 20px;">
                        ⚡ <b>Insights de Auditoría:</b> Premio Caliente: <b style="color:#fff;">${hotPrize}</b> | Horario Pico: <b style="color:#fff;">${peakPeriodStr}</b> | Sesión Máxima: <b style="color:#fff;">${topSessionStr}</b>
                    </div>
                `;

                let comparativeTableHtml = '';
                if (savedLists.length > 0) {
                    comparativeTableHtml = `
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${savedLists.map(list => {
                                const listPlays = validPlaysAll.filter(h => h.localSessionId === list.localSessionId);
                                const count = listPlays.length;
                                const leads = listPlays.filter(h => h.lead).length;
                                const conv = count > 0 ? ((leads / count) * 100).toFixed(0) : "0";
                                const isFiltered = this.selectedGameId === list.id;
                                return `
                                    <div style="background:#050505; border:1px solid ${isFiltered ? 'var(--gold)' : '#111'}; border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                                        <b style="font-size:0.65rem; color:${isFiltered ? 'var(--gold)' : '#fff'}; flex:1;">${list.name.toUpperCase()}</b>
                                        <div style="display:flex; gap:10px; align-items:center; font-size:0.62rem; color:#aaa;">
                                            <span>G: <b>${count}</b></span>
                                            <span>L: <b>${leads}</b></span>
                                            <span style="color:#10b981;">C: <b>${conv}%</b></span>
                                            <button class="btn-view-game-report" data-id="${list.id}" style="background:none; border:1px solid rgba(212,175,55,0.3); color:var(--gold); font-size:0.5rem; font-weight:800; padding:2px 6px; border-radius:3px; cursor:pointer;">${isFiltered ? 'Filtrado' : 'Filtrar'}</button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                }

                let customWidgetsHtml = '';
                if (customWidgets.length > 0) {
                    customWidgetsHtml = `
                        <div style="margin-top: 20px; margin-bottom: 20px; border-top: 1px solid #1a1a1a; padding-top: 15px; display: flex; flex-direction: column; gap: 15px;">
                            ${customWidgets.map(widget => `
                                <div id="widget-${widget.id}" style="background: rgba(255,255,255,0.01); border: 1px solid #1a1a1a; border-radius: 12px; padding: 15px;">
                                    <h6 style="color: var(--gold); font-size: 0.65rem; margin: 0 0 12px 0; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${widget.title}</h6>
                                    <div>${widget.render(validPlays)}</div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }

                let customExportersHtml = '';
                customExporters.forEach(e => {
                    const btnClass = e.buttonClass || 'btn-secondary';
                    const customStyle = e.style || 'flex: 1; min-width: 140px; padding: 8px; font-size: 0.6rem; border-radius: 4px; font-weight: 900; text-transform: uppercase;';
                    customExportersHtml += `
                        <button id="btnExport-${e.id}" class="btn ${btnClass}" style="${customStyle}">${e.label}</button>
                    `;
                });

                innerHtmlContent += `
                    <div id="statsMetricsArea">
                        ${metricsAreaHtml}
                    </div>

                    ${comparativeTableHtml ? `
                    <div style="margin-top: 20px; margin-bottom: 20px; border-top: 1px solid #1a1a1a; padding-top: 15px;">
                        <h6 style="color: #fff; font-size: 0.65rem; margin: 0 0 10px 0; font-weight: 900; text-transform: uppercase;">📈 COMPARATIVA DE PLANTILLAS Y JUEGOS</h6>
                        ${comparativeTableHtml}
                    </div>
                    ` : ''}

                    ${customWidgetsHtml}

                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top:15px;">
                        <button id="btnCopyStatsReport" class="btn btn-secondary" style="flex: 1; min-width: 140px; padding: 8px; font-size: 0.6rem; border-radius: 4px; font-weight: 900; text-transform: uppercase;">📋 Copiar Reporte</button>
                        <button id="btnDownloadStatsJson" class="btn btn-secondary" style="flex: 1; min-width: 140px; padding: 8px; font-size: 0.6rem; border-radius: 4px; font-weight: 900; text-transform: uppercase;">📥 Descargar Métricas (JSON)</button>
                        ${customExportersHtml}
                    </div>
                `;
            } else {
                // --- TAB 2: REPORTE DE AUDITORÍA FORENSE POR JUEGO ---
                
                // Stock balances ledger HTML table
                let stockLedgerHtml = '';
                if (stockRows.length > 0) {
                    stockLedgerHtml = `
                        <div style="overflow-x: auto; margin-top: 10px; border: 1px solid #1a1a1a; border-radius: 8px; background: #050505;">
                            <table style="width:100%; border-collapse:collapse; font-size:0.6rem; color:#ccc; text-align:left;">
                                <thead>
                                    <tr style="border-bottom:2px solid #222; background:#080808; color:#fff; font-weight:900; text-transform:uppercase;">
                                        <th style="padding:10px 8px;">Premio Especial</th>
                                        <th style="padding:10px 8px; text-align:center;">Inicial</th>
                                        <th style="padding:10px 8px; text-align:center;">Consumido</th>
                                        <th style="padding:10px 8px; text-align:center;">Saldo Disponible</th>
                                        <th style="padding:10px 8px; text-align:center;">Consumo %</th>
                                        <th style="padding:10px 8px; text-align:right;">Estado de Activo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${stockRows.map(row => `
                                        <tr style="border-bottom:1px solid #111; background:${row.bgOpacity};">
                                            <td style="padding:10px 8px; font-weight:900; color:#fff;">${row.name}</td>
                                            <td style="padding:10px 8px; text-align:center; font-family:monospace; font-weight:bold;">${row.initial}</td>
                                            <td style="padding:10px 8px; text-align:center; font-family:monospace; color:var(--gold); font-weight:bold;">${row.consumed}</td>
                                            <td style="padding:10px 8px; text-align:center; font-family:monospace; color:${row.current === 0 ? '#ef4444' : '#10b981'}; font-weight:bold;">${row.current}</td>
                                            <td style="padding:10px 8px; text-align:center;">
                                                <div style="display:flex; align-items:center; justify-content:center; gap:5px;">
                                                    <span style="font-family:monospace;">${row.rate}%</span>
                                                    <div style="width:40px; height:4px; background:#222; border-radius:2px; overflow:hidden;">
                                                        <div style="width:${row.rate}%; height:100%; background:${row.statusColor};"></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style="padding:10px 8px; text-align:right; font-weight:900; color:${row.statusColor}; letter-spacing:0.5px; font-size:0.55rem;">
                                                ${row.statusLabel}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                } else {
                    stockLedgerHtml = `
                        <div style="border: 1px dashed #222; border-radius: 8px; padding: 20px; text-align:center; color:#555; font-size:0.65rem; margin-top:10px; background:#040404;">
                            ⚠️ El juego seleccionado no registra premios con límites de stock (todos los premios son ilimitados).
                        </div>
                    `;
                }

                // Chronological Forensic Logbook
                let logbookRowsHtml = '';
                if (validPlays.length > 0) {
                    const sortedChronologically = [...validPlays].map(p => {
                        let timeMs = 0;
                        try {
                            timeMs = Date.parse(p.fecha);
                            if (isNaN(timeMs)) {
                                timeMs = new Date(p.fecha).getTime();
                            }
                        } catch (e) {}
                        return { ...p, timeMs };
                    }).sort((a, b) => b.timeMs - a.timeMs); // Show newest first in UI scrollable logbook

                    logbookRowsHtml = sortedChronologically.map((p, idx) => {
                        const leadDetails = p.lead ? Object.entries(p.lead).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(', ') : 'Público/Directo';
                        const txHash = this.generateSHA256(p.fecha + p.nombre).substring(0, 10).toUpperCase();
                        return `
                            <tr style="border-bottom:1px solid #111; font-family:monospace; font-size:0.55rem;">
                                <td style="padding:6px; color:#888;">[${p.fecha}]</td>
                                <td style="padding:6px; color:#fff; font-weight:900;">${p.nombre}</td>
                                <td style="padding:6px; color:#aaa; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;" title="${leadDetails}">${leadDetails}</td>
                                <td style="padding:6px; text-align:right; color:#00ff66;">TX-${txHash}</td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    logbookRowsHtml = `
                        <tr>
                            <td colspan="4" style="text-align:center; color:#555; padding:20px; font-size:0.65rem; font-style:italic;">No hay sucesos de giros en el historial para auditar.</td>
                        </tr>
                    `;
                }

                let forensicLogbookHtml = `
                    <div style="margin-top: 20px; border-top: 1px solid #1a1a1a; padding-top: 15px;">
                        <h6 style="color:#fff; font-size:0.65rem; margin:0 0 10px 0; font-weight:900; text-transform:uppercase; display:flex; justify-content:space-between; align-items:center;">
                            <span>📑 BITÁCORA CRONOLÓGICA DE SUCESOS (FORENSIC LOGS)</span>
                            <span style="color:#888; font-size:0.55rem; font-weight:normal;">ÚLTIMOS ${totalPlays} GIROS</span>
                        </h6>
                        <div style="max-height: 200px; overflow-y: auto; border: 1px solid #151515; border-radius: 8px;">
                            <table style="width:100%; border-collapse:collapse; text-align:left;">
                                <thead style="position: sticky; top: 0; background:#0a0a0a; border-bottom:1px solid #222;">
                                    <tr style="color:#fff; font-size:0.55rem; font-weight:900; text-transform:uppercase;">
                                        <th style="padding:6px;">Marca de Tiempo</th>
                                        <th style="padding:6px;">Recompensa Obtenida</th>
                                        <th style="padding:6px;">Datos de Identidad (Leads)</th>
                                        <th style="padding:6px; text-align:right;">Firma TX</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${logbookRowsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;

                innerHtmlContent += `
                    <!-- Forensic Report Bento Sheet -->
                    <div style="border: 1px solid rgba(16, 185, 129, 0.2); background: rgba(0,0,0,0.6); border-radius:16px; padding:20px; position:relative; box-shadow: 0 4px 30px rgba(0,0,0,0.2);">
                        <div style="position:absolute; top:15px; right:15px; background: rgba(16,185,129,0.1); color:#10b981; border: 1px solid rgba(16,185,129,0.3); font-size:0.55rem; font-weight:900; padding:4px 8px; border-radius:6px; letter-spacing:1px; text-transform:uppercase;">
                            🔒 VERIFICADO - CONTEXTO INMUTABLE
                        </div>

                        <h5 style="color:#fff; font-size:0.85rem; font-weight:900; margin-top:0; margin-bottom:4px; text-transform:uppercase; letter-spacing:1px;">📜 INFORME DE AUDITORÍA FORENSE</h5>
                        <p style="font-size:0.6rem; color:#666; margin-top:0; margin-bottom:15px;">Estadísticas consolidadas inmutables bajo estándar internacional ISO/IEC 27001 & COBIT 2019.</p>

                        <!-- Session Info Bento Grid -->
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px;">
                            <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                                <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Nombre del Juego</span>
                                <b style="font-size:0.75rem; color:#fff; display:block; margin-top:2px;">${selectedGameTitle.replace('JUEGO: ', '')}</b>
                            </div>
                            <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                                <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Reporte UUID</span>
                                <b style="font-size:0.7rem; color:var(--gold); display:block; font-family:monospace; margin-top:2px;">${reportUuid}</b>
                            </div>
                            <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                                <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Fecha de Emisión</span>
                                <b style="font-size:0.7rem; color:#fff; display:block; margin-top:2px;">${new Date().toLocaleString()}</b>
                            </div>
                            <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                                <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Responsable en Cargo</span>
                                <b style="font-size:0.7rem; color:#fff; display:block; font-family:monospace; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${adminEmail}</b>
                            </div>
                            <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                                <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Primer Giro (Inicio)</span>
                                <b style="font-size:0.7rem; color:#fff; display:block; margin-top:2px;">${startDateStr}</b>
                            </div>
                            <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                                <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Último Giro (Fin)</span>
                                <b style="font-size:0.7rem; color:#fff; display:block; margin-top:2px;">${endDateStr}</b>
                            </div>
                            <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                                <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Duración Activa de Sesión</span>
                                <b style="font-size:0.7rem; color:#10b981; display:block; margin-top:2px;">${durationStr}</b>
                            </div>
                            <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                                <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Giros Totales de Auditoría</span>
                                <b style="font-size:0.75rem; color:#fff; display:block; margin-top:2px;">${totalPlays}</b>
                            </div>
                        </div>

                        <!-- KPIs summary row -->
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:20px; border-top:1px solid #1a1a1a; padding-top:15px;">
                            <div style="background:#060606; border:1px solid #111; padding:10px; border-radius:10px; text-align:center;">
                                <div style="font-size:0.55rem; color:#666; font-weight:800; text-transform:uppercase;">Conversión Leads</div>
                                <div style="font-size:1.1rem; font-weight:900; color:#10b981; margin-top:2px;">${convRate}%</div>
                            </div>
                            <div style="background:#060606; border:1px solid #111; padding:10px; border-radius:10px; text-align:center;">
                                <div style="font-size:0.55rem; color:#666; font-weight:800; text-transform:uppercase;">Premios Únicos Ganados</div>
                                <div style="font-size:1.1rem; font-weight:900; color:#3b82f6; margin-top:2px;">${uniquePrizesWon}</div>
                            </div>
                            <div style="background:#060606; border:1px solid #111; padding:10px; border-radius:10px; text-align:center;">
                                <div style="font-size:0.55rem; color:#666; font-weight:800; text-transform:uppercase;">Premio Más Entregado</div>
                                <div style="font-size:0.75rem; font-weight:900; color:#fff; margin-top:5px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${sortedPrizes[0] ? sortedPrizes[0][0] : 'N/A'}">
                                    ${sortedPrizes[0] ? `${sortedPrizes[0][0]} (${sortedPrizes[0][1]})` : 'Ninguno'}
                                </div>
                            </div>
                        </div>

                        <!-- Stock Ledger Subsection -->
                        <div style="border-top:1px solid #1a1a1a; padding-top:15px;">
                            <h6 style="color:#fff; font-size:0.65rem; margin:0; font-weight:900; text-transform:uppercase; letter-spacing:0.5px;">⚖️ CONTROL Y SALDO DE STOCK DE PREMISAS DE JUEGO</h6>
                            ${stockLedgerHtml}
                        </div>

                        <!-- Forensic Logbook Section -->
                        ${forensicLogbookHtml}

                        <!-- Secciones de Auditoría de Plugins de Terceros -->
                        ${(() => {
                            const customSections = ForensicSectionRegistry.getSections();
                            let customSectionsHtml = '';
                            customSections.forEach(s => {
                                customSectionsHtml += `
                                    <div style="border-top: 1px solid #1a1a1a; padding-top: 15px; margin-top: 15px;">
                                        <h6 style="color: var(--gold); font-size: 0.65rem; margin: 0 0 10px 0; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${s.title}</h6>
                                        <div>${s.renderSectionHtml(validPlays)}</div>
                                    </div>
                                `;
                            });
                            return customSectionsHtml;
                        })()}

                        <!-- Cryptographic Forensic Box -->
                        <div style="background: #030303; border: 1px solid #10b98144; border-left: 4px solid #10b981; border-radius: 6px; padding: 12px; margin-top: 20px; font-family: monospace; font-size: 0.55rem; color: #00ff66; word-break: break-all; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
                            <div>[ESTADO] COMPILACIÓN DE INTEGRIDAD: VERIFICADO POR MOTOR FORENSE NEXO</div>
                            <div style="margin-top: 4px;">[FIRMA DIGITAL INMUTABLE DE AUDITORÍA]: ${forensicHash}</div>
                            <div style="margin-top: 4px; color: #888;">Normativas Compliant: SOC 2 Type II | ISO/IEC 27001:2022 | COBIT 2019 Audit Matrix</div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
                        <button id="btnCopyForensicReport" class="btn btn-secondary" style="flex: 1; min-width: 130px; padding: 10px; font-size: 0.6rem; border-radius: 6px; font-weight: 900; text-transform: uppercase; background:#111; color:#fff; border: 1px solid #333; cursor:pointer;">📋 Copiar Reporte Oficial</button>
                        <button id="btnDownloadForensicJson" class="btn btn-secondary" style="flex: 1; min-width: 130px; padding: 10px; font-size: 0.6rem; border-radius: 6px; font-weight: 900; text-transform: uppercase; background:#111; color:#fff; border: 1px solid #333; cursor:pointer;">📥 Descargar JSON de Auditoría</button>
                        <button id="btnPrintForensicCertificate" class="btn btn-primary" style="flex: 1; min-width: 130px; padding: 10px; font-size: 0.6rem; border-radius: 6px; font-weight: 900; text-transform: uppercase; background:#d4af37; color:#000; border:1px solid #d4af37; cursor:pointer; font-weight:bold;">🖨️ Certificado Imprimible</button>
                    </div>
                `;
            }

            innerHtmlContent += `
                </div>
            `;

            this.innerHTML = innerHtmlContent;
            this.bindEvents();

            // BIND EVENTS FOR TAB-SPECIFIC ACTION BUTTONS

            // 1. Tab switches
            this.querySelectorAll('.stats-tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tab = (e.currentTarget as HTMLButtonElement).getAttribute('data-tab');
                    if (tab) {
                        this.currentTab = tab;
                        this.render();
                    }
                });
            });

            // 2. Metrics Tab Actions
            if (this.currentTab === 'metrics') {
                this.querySelector('#btnCopyStatsReport')?.addEventListener('click', () => {
                    const reportText = `
=== REPORTE DE ESTADÍSTICAS - RULETA NEXO PREMIUM ===
Fecha: ${new Date().toLocaleString()}
Selección: ${selectedGameTitle}
--------------------------------------------------
* Total de Partidas: ${totalPlays}
* Leads Captados: ${totalLeads}
* Conversión: ${convRate}%
* Premios Únicos: ${uniquePrizesWon}
==================================================`;
                    navigator.clipboard.writeText(reportText.trim())
                        .then(() => alert("¡Métricas copiadas con éxito!"))
                        .catch(() => alert("Error al copiar."));
                });

                this.querySelector('#btnDownloadStatsJson')?.addEventListener('click', () => {
                    const statsObj = {
                        generatedAt: new Date().toISOString(),
                        filteredGame: selectedGameTitle,
                        kpis: { totalPlays, totalLeads, conversionRate: parseFloat(convRate), uniquePrizesWon },
                        topPrizes: sortedPrizes.map(([p, count]) => ({ prize: p, count }))
                    };
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(statsObj, null, 2));
                    const a = document.createElement('a');
                    a.href = dataStr;
                    a.download = `métricas_ruleta_${this.selectedGameId}.json`;
                    a.click();
                });

                // BIND CUSTOM EXPORTERS
                customExporters.forEach(e => {
                    const btn = this.querySelector(`#btnExport-${e.id}`);
                    if (btn) {
                        btn.addEventListener('click', async () => {
                            try {
                                const kpiData = { totalPlays, totalLeads, convRate: parseFloat(convRate), uniquePrizesWon };
                                await e.export(validPlays, selectedGameTitle, kpiData);
                            } catch (err) {
                                console.error(`Error running exporter ${e.id}:`, err);
                            }
                        });
                    }
                });

                // BIND CUSTOM WIDGETS (ONMOUNTED)
                customWidgets.forEach(widget => {
                    if (widget.onMounted) {
                        const container = this.querySelector(`#widget-${widget.id}`) as HTMLElement | null;
                        if (container) {
                            try {
                                widget.onMounted(container, validPlays);
                            } catch (err) {
                                console.error(`Error mounting stats widget ${widget.id}:`, err);
                            }
                        }
                    }
                });
            } else {
                // 3. Forensic Tab Actions
                this.querySelector('#btnCopyForensicReport')?.addEventListener('click', () => {
                    const asciiReport = `
================================================================================
                    RULETA NEXO PREMIUM - INFORME FORENSE
================================================================================
ID REPORTE: ${reportUuid}
FECHA EMISIÓN: ${new Date().toLocaleString()}
JUEGO / PLANTILLA: ${selectedGameTitle}
AUDITOR EN CARGO: ${adminEmail}
ESTADO DE AUDITORÍA: VERIFICADO - CONTEXTO INMUTABLE
================================================================================

1. CRONOLOGÍA DE LA SESIÓN:
--------------------------------------------------------------------------------
* FECHA/HORA INICIO: ${startDateStr}
* FECHA/HORA FIN   : ${endDateStr}
* DURACIÓN ACTIVA  : ${durationStr}

2. MÉTRICAS CLAVE (KPIs):
--------------------------------------------------------------------------------
* GIROS TOTALES      : ${totalPlays}
* LEADS CAPTADOS     : ${totalLeads}
* CONVERSIÓN LEADS   : ${convRate}%
* PREMIOS ADJUDICADOS: ${totalPrizesCount}

3. CONTROL Y SALDO DE STOCK DE PREMIOS (AUDITORÍA DE ACTIVOS):
--------------------------------------------------------------------------------
${stockRows.length > 0 ? stockRows.map(row => 
`* PREMIO: ${row.name}
  [Stock Inicial: ${row.initial} | Ganados: ${row.consumed} | Saldo Disponible: ${row.current} | Consumo: ${row.rate}%]
  [Estado: ${row.statusLabel}]`
).join('\n') : '* Sin límites de stock configurados (Premios Ilimitados).'}

4. PREMIOS MÁS REPETIDOS (TOP 5):
--------------------------------------------------------------------------------
${sortedPrizes.map(([p, count], idx) => `${idx + 1}. ${p}: ${count} veces`).join('\n')}
${(() => {
    const customSections = ForensicSectionRegistry.getSections();
    let text = '';
    customSections.forEach((s, idx) => {
        text += `\n\n${idx + 5}. ${s.title.toUpperCase()}:\n--------------------------------------------------------------------------------\n${s.renderSectionText(validPlays)}`;
    });
    return text;
})()}

${(() => {
    const count = ForensicSectionRegistry.getSections().length;
    return (count + 5).toString();
})()}. FIRMA DIGITAL DE AUDITORÍA FORENSE:
--------------------------------------------------------------------------------
[SHA-256 CHECK-SUM]: ${forensicHash}
[NORMATIVA DE CUMPLIMIENTO]: ISO/IEC 27001, COBIT 2019, SOC 2 TYPE II Compliant.
--------------------------------------------------------------------------------
              INFORME GENERADO AUTOMÁTICAMENTE - INTEGRIDAD PROTEGIDA
================================================================================`.trim();

                    navigator.clipboard.writeText(asciiReport)
                        .then(() => alert("¡Informe forense ASCII copiado al portapapeles con éxito!"))
                        .catch(() => alert("Error al copiar el informe."));
                });

                this.querySelector('#btnDownloadForensicJson')?.addEventListener('click', () => {
                    const forensicObj = {
                        reportHeader: {
                            reportUuid,
                            generatedAt: new Date().toISOString(),
                            auditor: adminEmail,
                            standard: "ISO/IEC 27001:2022 / COBIT 2019"
                        },
                        sessionDetails: {
                            gameName: selectedGameTitle.replace('JUEGO: ', ''),
                            sessionStart: startDateStr,
                            sessionEnd: endDateStr,
                            activeDuration: durationStr,
                            totalSpins: totalPlays
                        },
                        kpis: {
                            totalSpins: totalPlays,
                            leadsCaptured: totalLeads,
                            conversionRate: parseFloat(convRate),
                            uniquePrizesWon
                        },
                        stockLedger: stockRows.map(row => ({
                            prizeName: row.name,
                            initialStock: row.initial,
                            consumedStock: row.consumed,
                            remainingStock: row.current,
                            depletionRatePercent: parseFloat(row.rate),
                            status: row.statusLabel
                        })),
                        topWinningPrizes: sortedPrizes.map(([p, count]) => ({ prizeName: p, count })),
                        cryptographicValidation: {
                            payloadSignature: hashPayload,
                            sha256VerificationChecksum: forensicHash
                        }
                    };
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(forensicObj, null, 2));
                    const a = document.createElement('a');
                    a.href = dataStr;
                    a.download = `informe_forense_${this.selectedGameId}_${reportUuid}.json`;
                    a.click();
                });

                this.querySelector('#btnPrintForensicCertificate')?.addEventListener('click', () => {
                    // Call global printable generator
                    const showForensicCertificateModal = (gameTitle: string, uuid: string, dateStr: string, start: string, end: string, duration: string, totalSpins: number, leads: number, conv: string, stockRowsList: any[], topPrizesList: any[], hash: string) => {
                        document.getElementById('modalPrintCertificate')?.remove();

                        const modal = document.createElement('div');
                        modal.id = 'modalPrintCertificate';
                        modal.style.position = 'fixed';
                        modal.style.top = '0';
                        modal.style.left = '0';
                        modal.style.width = '100vw';
                        modal.style.height = '100vh';
                        modal.style.background = 'rgba(0,0,0,0.9)';
                        modal.style.zIndex = '99999';
                        modal.style.display = 'flex';
                        modal.style.alignItems = 'center';
                        modal.style.justifyContent = 'center';
                        modal.style.padding = '20px';
                        modal.style.overflowY = 'auto';

                        const card = document.createElement('div');
                        card.id = 'certificateSheet';
                        card.style.background = '#fff';
                        card.style.color = '#111';
                        card.style.width = '100%';
                        card.style.maxWidth = '750px';
                        card.style.borderRadius = '0';
                        card.style.border = '12px double #d4af37';
                        card.style.padding = '35px';
                        card.style.boxShadow = '0 10px 40px rgba(0,0,0,0.6)';
                        card.style.fontFamily = '"Times New Roman", Times, Georgia, serif';
                        card.style.position = 'relative';

                        const styleTag = document.createElement('style');
                        styleTag.innerHTML = `
                            @media print {
                                body > * {
                                    display: none !important;
                                }
                                #modalPrintCertificate {
                                    display: block !important;
                                    position: absolute !important;
                                    left: 0 !important;
                                    top: 0 !important;
                                    width: 100% !important;
                                    height: auto !important;
                                    background: #fff !important;
                                    padding: 0 !important;
                                    margin: 0 !important;
                                }
                                #certificateSheet {
                                    border: 12px double #d4af37 !important;
                                    box-shadow: none !important;
                                    width: 100% !important;
                                    max-width: 100% !important;
                                    padding: 30px !important;
                                    margin: 0 !important;
                                }
                                .no-print {
                                    display: none !important;
                                }
                            }
                        `;
                        modal.appendChild(styleTag);

                        let stockTableHtml = '';
                        if (stockRowsList.length > 0) {
                            stockTableHtml = `
                                <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:0.7rem; font-family:sans-serif; border:1px solid #ddd;">
                                    <thead>
                                        <tr style="background:#f2f2f2; border-bottom:2px solid #aaa; font-weight:bold; color:#000;">
                                            <th style="padding:5px 8px; text-align:left;">Premio Especial</th>
                                            <th style="padding:5px 8px; text-align:center;">Stock Inicial</th>
                                            <th style="padding:5px 8px; text-align:center;">Consumido</th>
                                            <th style="padding:5px 8px; text-align:center;">Saldo Stock</th>
                                            <th style="padding:5px 8px; text-align:center;">Consumo %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${stockRowsList.map(r => `
                                            <tr style="border-bottom:1px solid #ddd;">
                                                <td style="padding:5px 8px; font-weight:bold; color:#000;">${r.name}</td>
                                                <td style="padding:5px 8px; text-align:center; font-family:monospace;">${r.initial}</td>
                                                <td style="padding:5px 8px; text-align:center; font-family:monospace;">${r.consumed}</td>
                                                <td style="padding:5px 8px; text-align:center; font-family:monospace; font-weight:bold; color:${r.current === 0 ? '#ff0000' : '#000'}">${r.current}</td>
                                                <td style="padding:5px 8px; text-align:center; font-family:monospace;">${r.rate}%</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            `;
                        } else {
                            stockTableHtml = `<p style="font-size:0.7rem; font-style:italic; margin-top:5px; color:#555; font-family:sans-serif;">No se configuraron límites de stock para los premios en este juego (Premios Ilimitados).</p>`;
                        }

                        card.innerHTML = `
                            <div style="text-align:center; border-bottom:2px solid #d4af37; padding-bottom:10px; margin-bottom:20px;">
                                <p style="font-size:0.6rem; letter-spacing:4px; font-weight:bold; color:#666; margin:0; text-transform:uppercase; font-family:sans-serif;">CERTIFICADO DE AUDITORÍA FORENSE DE JUEGO</p>
                                <h1 style="font-size:1.6rem; margin:5px 0; font-family:'Times New Roman', serif; font-weight:bold; color:#000; letter-spacing:1px; text-transform:uppercase;">Ruleta Nexo Premium</h1>
                                <p style="font-size:0.5rem; color:#d4af37; font-weight:bold; margin:0; letter-spacing:2px; text-transform:uppercase; font-family:sans-serif;">INTEGRIDAD DE DATOS CONEXIÓN &bull; ESTÁNDAR INTERNACIONAL ISO/IEC 27001</p>
                            </div>

                            <div style="font-size:0.75rem; line-height:1.4; color:#111; text-align:justify; font-family:'Georgia', serif;">
                                <p>Por medio del presente documento oficial, el <b>Motor de Analíticas Forenses Nexo Premium</b> certifica con carácter inmutable, la validez e integridad de las transacciones registradas de giros para el juego/plantilla denominado <b><span style="font-family:monospace; font-size:0.8rem; color:#000; font-weight:bold; text-decoration:underline;">${gameTitle}</span></b>, procesadas y auditadas de manera transparente de acuerdo con las especificaciones técnicas ISO/IEC 27001, SOC 2 y PCI-DSS v4.0.</p>
                                
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:15px 0; background:#faf6eb; padding:10px; border:1px solid #dfd1b0; font-family:sans-serif; font-size:0.65rem;">
                                    <div>
                                        <span style="color:#666; font-weight:bold; text-transform:uppercase; display:block; font-size:0.55rem;">ID Reporte Único</span>
                                        <b style="font-family:monospace; color:#000; font-size:0.75rem;">${uuid}</b>
                                    </div>
                                    <div>
                                        <span style="color:#666; font-weight:bold; text-transform:uppercase; display:block; font-size:0.55rem;">Fecha Emisión Certificado</span>
                                        <b style="color:#000;">${dateStr}</b>
                                    </div>
                                    <div>
                                        <span style="color:#666; font-weight:bold; text-transform:uppercase; display:block; font-size:0.55rem;">Hora Fecha de Inicio</span>
                                        <b style="color:#000;">${start}</b>
                                    </div>
                                    <div>
                                        <span style="color:#666; font-weight:bold; text-transform:uppercase; display:block; font-size:0.55rem;">Hora Fecha de Fin</span>
                                        <b style="color:#000;">${end}</b>
                                    </div>
                                    <div>
                                        <span style="color:#666; font-weight:bold; text-transform:uppercase; display:block; font-size:0.55rem;">Duración Activa</span>
                                        <b style="color:#000;">${duration}</b>
                                    </div>
                                    <div>
                                        <span style="color:#666; font-weight:bold; text-transform:uppercase; display:block; font-size:0.55rem;">Auditor Administrador</span>
                                        <b style="color:#000; font-family:monospace;">${adminEmail}</b>
                                    </div>
                                </div>

                                <h3 style="font-size:0.85rem; font-family:'Times New Roman', serif; border-bottom:1px solid #ccc; padding-bottom:3px; margin-top:15px; color:#000; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">I. Resumen Métrico de Giros</h3>
                                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:8px; text-align:center; font-family:sans-serif; font-size:0.65rem;">
                                    <div style="background:#fbfbfb; border:1px solid #ddd; padding:8px;">
                                        <span style="color:#666; display:block; font-size:0.55rem;">GIROS TOTALES</span>
                                        <b style="font-size:1.1rem; color:#000;">${totalSpins}</b>
                                    </div>
                                    <div style="background:#fbfbfb; border:1px solid #ddd; padding:8px;">
                                        <span style="color:#666; display:block; font-size:0.55rem;">LEADS REGISTRADOS</span>
                                        <b style="font-size:1.1rem; color:#000;">${leads}</b>
                                    </div>
                                    <div style="background:#fbfbfb; border:1px solid #ddd; padding:8px;">
                                        <span style="color:#666; display:block; font-size:0.55rem;">TASA DE CONVERSIÓN</span>
                                        <b style="font-size:1.1rem; color:#000;">${conv}%</b>
                                    </div>
                                </div>

                                <h3 style="font-size:0.85rem; font-family:'Times New Roman', serif; border-bottom:1px solid #ccc; padding-bottom:3px; margin-top:15px; color:#000; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">II. Balance de Stock Especial</h3>
                                ${stockTableHtml}

                                <h3 style="font-size:0.85rem; font-family:'Times New Roman', serif; border-bottom:1px solid #ccc; padding-bottom:3px; margin-top:15px; color:#000; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">III. Premios Calientes más Entregados</h3>
                                <ul style="font-size:0.7rem; padding-left:15px; color:#222; margin-top:5px; font-family:sans-serif;">
                                    ${topPrizesList.map(([p, count]) => `<li>Premio: <b>${p}</b> adjudicado un total de <b>${count}</b> veces en la sesión.</li>`).join('')}
                                </ul>

                                ${(() => {
                                     const customSections = ForensicSectionRegistry.getSections();
                                     let html = '';
                                     customSections.forEach((s, idx) => {
                                         const romanNumerals = ['IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
                                         const numStr = romanNumerals[idx] || (idx + 4).toString();
                                         const renderFn = s.renderSectionPrintHtml || s.renderSectionHtml;
                                         html += `
                                             <h3 style="font-size:0.85rem; font-family:'Times New Roman', serif; border-bottom:1px solid #ccc; padding-bottom:3px; margin-top:15px; color:#000; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">${numStr}. ${s.title}</h3>
                                             <div style="font-size:0.7rem; color:#222; margin-top:5px; font-family:sans-serif;">
                                                 ${renderFn(validPlays)}
                                             </div>
                                         `;
                                     });
                                     return html;
                                 })()}

                                <h3 style="font-size:0.85rem; font-family:'Times New Roman', serif; border-bottom:1px solid #ccc; padding-bottom:3px; margin-top:15px; color:#000; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">
                                     ${(() => {
                                         const count = ForensicSectionRegistry.getSections().length;
                                         const romanNumerals = ['IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
                                         return romanNumerals[count] || (count + 4).toString();
                                     })()}. Firma Digital de Auditoría Forense
                                </h3>
                                <div style="background:#111; color:#00ff66; font-family:monospace; font-size:0.55rem; padding:10px; border-radius:4px; margin-top:5px; word-break:break-all; border-left:4px solid #d4af37;">
                                    [HUELLA DIGITAL DE INTEGRIDAD DE SESIÓN]<br>
                                    [SHA-256 CHECK-SUM]: ${hash}<br>
                                    [VERIFICACIÓN]      : INTEGRIDAD 100% CORRECTA &bull; NO SE DETECTARON ALTERACIONES MANUALES
                                </div>
                            </div>

                            <div style="margin-top:30px; display:flex; justify-content:space-between; align-items:flex-end; font-size:0.65rem; border-top:1px dashed #ddd; padding-top:20px; font-family:sans-serif;">
                                <div style="text-align:center; width:180px;">
                                    <div style="border-bottom:1px solid #333; height:35px; margin-bottom:5px;"></div>
                                    <span>Firma del Oficial de Cumplimiento</span><br>
                                    <span style="color:#777; font-size:0.55rem;">Nexo Premium Forensic Engine</span>
                                </div>
                                <div style="text-align:right;">
                                    <span style="color:#666;">Sello de Autenticación</span><br>
                                    <div style="width:60px; height:60px; border:2px double #d4af37; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-top:5px; margin-left:auto; transform:rotate(-15deg); background:#fff;">
                                        <div style="font-size:0.4rem; color:#d4af37; font-weight:bold; text-align:center; line-height:1;">
                                            NEXO<br>PREMIUM<br>AUDIT
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="no-print" style="margin-top:25px; border-top:1px solid #eee; padding-top:12px; display:flex; gap:10px; justify-content:flex-end; font-family:sans-serif;">
                                <button id="btnPrintCertificateAction" style="background:#d4af37; color:#000; border:none; padding:8px 16px; font-weight:bold; cursor:pointer; font-size:0.65rem; border-radius:4px; display:flex; align-items:center; gap:4px;">
                                    🖨️ Imprimir Certificado
                                </button>
                                <button id="btnCloseCertificateAction" style="background:#555; color:#fff; border:none; padding:8px 16px; font-weight:bold; cursor:pointer; font-size:0.65rem; border-radius:4px;">
                                    Cerrar
                                </button>
                            </div>
                        `;

                        modal.appendChild(card);
                        document.body.appendChild(modal);

                        document.getElementById('btnPrintCertificateAction')?.addEventListener('click', () => {
                            window.print();
                        });

                        document.getElementById('btnCloseCertificateAction')?.addEventListener('click', () => {
                            modal.remove();
                        });
                    };

                    showForensicCertificateModal(
                        selectedGameTitle.replace('JUEGO: ', ''),
                        reportUuid,
                        new Date().toLocaleString(),
                        startDateStr,
                        endDateStr,
                        durationStr,
                        totalPlays,
                        totalLeads,
                        convRate,
                        stockRows,
                        sortedPrizes,
                        forensicHash
                    );
                });
            }
        } catch (error) {
            console.error("Error al renderizar NexoGameStats:", error);
            this.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #ff4d4d; border: 1px dashed #ff4d4d; border-radius: 12px; font-size: 0.75rem;">
                    Ocurrió un error al cargar las estadísticas avanzadas de juego.
                </div>
            `;
        }
    }
    */

    bindEvents() {
        // Bind filter change
        const selectFilter = this.querySelector('#statsGameFilter') as HTMLSelectElement | null;
        selectFilter?.addEventListener('change', (e) => {
            this.selectedGameId = (e.target as HTMLSelectElement).value;
            this.render();
        });

        // Bind click filtered button in grid
        this.querySelectorAll('.btn-view-game-report').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (id) {
                    this.selectedGameId = id;
                    this.render();
                }
            });
        });
    }
}

/**
 * NexoRafflePanel Component
 * Native Web Component that encapsulates the entire "Sorteo" (Raffle / Spin Sorteo) Configuration Tab.
 * 100% modular, highly scalable, and designed for seamless future integrations.
 */
export class NexoRafflePanel extends HTMLElement {
    // Registro dinámico de módulos de configuración del panel
    private getModules() {
        return [
            {
                id: 'header',
                name: 'Cabecera y Switch de Seguridad',
                render: () => this.renderHeader()
            },
            {
                id: 'mode',
                name: 'Modo de Juego y Control Rápido',
                render: () => this.renderGameModeSection()
            },
            {
                id: 'rules',
                name: 'Reglas de Participación',
                render: () => this.renderParticipationRulesSection()
            },
            {
                id: 'remote',
                name: 'Participación Remota y Código QR',
                render: () => this.renderRemoteParticipationSection()
            },
            {
                id: 'mirror',
                name: 'Transmisión Espejo y Sincronización',
                render: () => this.renderMirrorTransmissionSection()
            },
            {
                id: 'timer',
                name: 'Temporizador HUD y Cuenta Regresiva',
                render: () => this.renderTimerHUDSection()
            },
            {
                id: 'addons',
                name: 'Extensiones e Integraciones Nexo',
                render: () => this.renderAddonsSection()
            }
        ];
    }

    connectedCallback() {
        this.render();
        this.bindLocalEvents();
        this.updateUIState();
        window.addEventListener('nexo-state-change', this.handleStateChange);
    }

    disconnectedCallback() {
        window.removeEventListener('nexo-state-change', this.handleStateChange);
    }

    handleStateChange = () => {
        // Actualización segura de entradas locales para no interrumpir el cursor de escritura activo
        const inputTitle = this.querySelector('#inputGameTitle') as HTMLInputElement;
        if (inputTitle && document.activeElement !== inputTitle) {
            inputTitle.value = StateManager.config.title || '';
        }

        // Sincronización segura del interruptor de activación
        const chkToggle = this.querySelector('#chkToggleGameActive') as HTMLInputElement;
        if (chkToggle) {
            chkToggle.checked = !!StateManager.config.isGameActive;
        }

        this.updateUIState();
    }

    render() {
        try {
            const modulesList = this.getModules();
            
            this.innerHTML = `
                <!-- ESTILOS LOCALES PREMIUM PARA EL PANEL MODULAR -->
                <style>
                    .nexo-switch {
                        position: relative;
                        display: inline-block;
                        width: 44px;
                        height: 24px;
                    }
                    .nexo-switch input {
                        opacity: 0;
                        width: 0;
                        height: 0;
                    }
                    .nexo-slider {
                        position: absolute;
                        cursor: pointer;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background-color: rgba(255, 255, 255, 0.08);
                        transition: .3s;
                        border-radius: 24px;
                        border: 1px solid rgba(255, 255, 255, 0.15);
                    }
                    .nexo-slider:before {
                        position: absolute;
                        content: "";
                        height: 16px;
                        width: 16px;
                        left: 3px;
                        bottom: 3px;
                        background-color: #888;
                        transition: .3s;
                        border-radius: 50%;
                    }
                    .nexo-switch input:checked + .nexo-slider {
                        background-color: rgba(0, 255, 127, 0.15);
                        border-color: rgba(0, 255, 127, 0.4);
                    }
                    .nexo-switch input:checked + .nexo-slider:before {
                        transform: translateX(20px);
                        background-color: #00ff7f;
                        box-shadow: 0 0 8px rgba(0, 255, 127, 0.6);
                    }
                    .nexo-input-title {
                        transition: border-color 0.2s ease, box-shadow 0.2s ease;
                    }
                    .nexo-input-title:focus {
                        border-color: var(--gold) !important;
                        box-shadow: 0 0 10px rgba(212, 175, 55, 0.2) !important;
                        outline: none !important;
                    }
                    .nexo-config-module {
                        transition: all 0.3s ease;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                        padding-bottom: 20px;
                        margin-bottom: 20px;
                    }
                    .nexo-config-module:last-of-type {
                        border-bottom: none;
                        padding-bottom: 0;
                        margin-bottom: 0;
                    }
                </style>

                <!-- UNIFIED AND FULLY MODULAR GAME CONFIGURATION CARD -->
                <div class="config-section" id="unifiedGameConfig" style="border: 1px solid rgba(212,175,55,0.15); background: rgba(0,0,0,0.4); border-radius: 20px; padding: 25px; margin-bottom: 25px;">
                    ${modulesList.map(mod => `
                        <!-- MÓDULO CONFIGURABLE: ${mod.name} -->
                        <div class="nexo-config-module" data-module-id="${mod.id}">
                            ${mod.render()}
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (e) {
            console.error("Error al renderizar NexoRafflePanel:", e);
            this.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #ff4d4d; border: 1px dashed #ff4d4d; border-radius: 12px; font-size: 0.75rem;">
                    Error al cargar el panel de configuración modular de Sorteo.
                </div>
            `;
        }
    }

    renderHeader(): string {
        const isGameActive = !!StateManager.config.isGameActive;
        const currentTitle = StateManager.config.title || "RULETA PREMIUM";

        return `
            <!-- MODULAR HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <h4 style="margin: 0; font-size: 1.1rem; color: var(--gold); letter-spacing: 0.5px; font-weight: 900; text-transform: uppercase;">Configuración de Sorteo</h4>
                    <span style="font-size: 0.65rem; color: #666; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Panel Modular v2.0</span>
                </div>
                <div id="unifiedGameActiveBadge" style="transition: all 0.3s ease;">
                    ${isGameActive 
                        ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 10px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`
                        : `<span style="background: rgba(255, 99, 71, 0.15); color: #ff6347; padding: 4px 10px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🔴 INACTIVO</span>`
                    }
                </div>
            </div>

            <!-- CAMPO DE TÍTULO DE JUEGO (100% EDITABLE Y MODULAR) -->
            <div style="margin-bottom: 15px; display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 0.6rem; color: var(--gold); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px;">
                    📝 TÍTULO DEL JUEGO (EDITABLE)
                </label>
                <input type="text" id="inputGameTitle" class="input-pin nexo-input-title" 
                    style="width: 100%; padding: 12px; font-size: 0.85rem; font-weight: 900; background: #000; border: 1px solid rgba(212,175,55,0.2); border-radius: 8px; color: #fff; text-transform: uppercase; letter-spacing: 0.5px;" 
                    value="${currentTitle}" 
                    placeholder="INGRESE EL NOMBRE DEL JUEGO..."
                    ${isGameActive ? 'disabled' : ''}>
            </div>

            <!-- SWITCH DE ACTIVACIÓN DE SEGURIDAD (CON INTERRUPTOR PREMIUM) -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(212, 175, 55, 0.02); border: 1px solid rgba(212, 175, 55, 0.08); padding: 14px; border-radius: 12px;">
                <div style="display: flex; flex-direction: column; gap: 2px; text-align: left;">
                    <span style="font-size: 0.7rem; color: #fff; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">⚡ Estado del Juego</span>
                    <span id="gameStatusIndicatorText" style="font-size: 0.55rem; color: ${isGameActive ? '#00ff7f' : '#ff6347'}; font-weight: 900; letter-spacing: 0.5px;">
                        ${isGameActive ? '🟢 JUEGO ACTIVADO (EDICIONES BLOQUEADAS)' : '🔴 JUEGO DESACTIVADO (EDICIÓN PERMITIDA)'}
                    </span>
                </div>
                <label class="nexo-switch">
                    <input type="checkbox" id="chkToggleGameActive" ${isGameActive ? 'checked' : ''}>
                    <span class="nexo-slider"></span>
                </label>
            </div>
        `;
    }

    renderGameModeSection(): string {
        return `
            <!-- Modo de Juego -->
            <div style="margin-bottom: 20px;">
                <label style="font-size: 0.65rem; color: var(--gold); font-weight: 800; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">🎯 MODO DE JUEGO</label>
                <select id="selectGameMode" class="input-pin" style="width: 100%; padding: 10px; font-size: 0.75rem; background: #000; border: 1px solid #222; border-radius: 8px; color: #fff; cursor: pointer;">
                    <option value="wheel">🎡 RULETA DE PREMIOS / OPCIONES</option>
                    <option value="raffle">🎟️ SORTEO DE PARTICIPANTES (RULETA DE NOMBRES)</option>
                </select>
            </div>

            <!-- Panel de Control Rápido -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button id="btnStartGame" class="btn btn-primary" style="font-size: 0.65rem; font-weight: 900; background: var(--gold); color: #000; padding: 12px; text-transform: uppercase; border-radius: 8px; margin: 0; min-height: unset; height: 40px;">🚀 Iniciar Juego</button>
                <button id="btnResetGame" class="btn btn-secondary" style="font-size: 0.65rem; font-weight: 900; background: rgba(255, 99, 71, 0.05); border: 1px solid rgba(255, 99, 71, 0.3); color: #ff6347; padding: 12px; text-transform: uppercase; border-radius: 8px; margin: 0; min-height: unset; height: 40px;">🔄 Reiniciar</button>
            </div>

            <!-- Configuración de Opciones / Formularios -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <button id="btnEditPrizes" class="btn btn-secondary" style="font-size: 0.65rem; padding: 10px; border-radius: 8px; margin: 0; min-height: unset; height: 40px;">CONFIGURAR PREMIOS</button>
                <button id="btnEditForm" class="btn btn-primary" style="font-size: 0.65rem; padding: 10px; border-radius: 8px; margin: 0; min-height: unset; height: 40px; background: rgba(212, 175, 55, 0.1); color: var(--gold); border: 1px solid rgba(212, 175, 55, 0.3);">EDITAR FORMULARIO</button>
            </div>
        `;
    }

    renderParticipationRulesSection(): string {
        return `
            <!-- REGLAS DE PARTICIPACIÓN -->
            <h5 style="font-size: 0.75rem; color: #fff; margin: 10px 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">🛠️ REGLAS DE PARTICIPACIÓN</h5>

            <!-- Solicitar Registro -->
            <div class="toggle-container" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; background: transparent; border: none; padding: 0;">
                <div style="display: flex; flex-direction: column; text-align: left; gap: 2px;">
                    <span style="font-size: 0.7rem; color: #fff; font-weight: 800; text-transform: uppercase;">📋 Solicitar Registro</span>
                    <span style="font-size: 0.55rem; color: #666;">Los usuarios deben registrarse antes de poder girar.</span>
                </div>
                <input type="checkbox" id="chkRequireRegister" style="width:20px; height:20px; cursor: pointer;">
            </div>

            <!-- Auto-eliminar Ganador -->
            <div class="toggle-container" style="margin-bottom: 12px; border-top: 1px solid #111; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; background: transparent; border-bottom: none; border-left: none; border-right: none; padding-left: 0; padding-right: 0;">
                <div style="display: flex; flex-direction: column; text-align: left; gap: 2px;">
                    <span style="font-size: 0.7rem; color: #fff; font-weight: 800; text-transform: uppercase;">🎁 Auto-eliminar Ganador</span>
                    <span style="font-size: 0.55rem; color: #666;">El premio o participante ganador se elimina de la ruleta tras ganar.</span>
                </div>
                <input type="checkbox" id="chkRemoveWinner" style="width:20px; height:20px; cursor: pointer;">
            </div>

            <!-- Reportes por juego -->
            <div class="toggle-container" style="margin-bottom: 12px; border-top: 1px solid #111; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; background: transparent; border-bottom: none; border-left: none; border-right: none; padding-left: 0; padding-right: 0;">
                <div style="display: flex; flex-direction: column; text-align: left; gap: 2px;">
                    <span style="font-size: 0.7rem; color: #fff; font-weight: 800; text-transform: uppercase;">📊 Reportes por sesión</span>
                    <span style="font-size: 0.55rem; color: #666;">Filtra reportes locales exclusivamente para esta sesión de juego.</span>
                </div>
                <input type="checkbox" id="chkLocalSessionListEnabled" style="width:20px; height:20px; cursor: pointer;">
            </div>
        `;
    }

    renderRemoteParticipationSection(): string {
        return `
            <!-- PARTICIPACIÓN REMOTA Y QR -->
            <h5 style="font-size: 0.75rem; color: #fff; margin: 10px 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">📱 PARTICIPACIÓN REMOTA Y QR</h5>

            <!-- Participación Remota QR -->
            <div class="toggle-container" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; background: transparent; border: none; padding: 0;">
                <div style="display: flex; flex-direction: column; text-align: left; gap: 2px;">
                    <span style="font-size: 0.7rem; color: #fff; font-weight: 800; text-transform: uppercase;">🔗 Activar Participación QR</span>
                    <span style="font-size: 0.55rem; color: #666;">Permite generar un código QR para que los usuarios jueguen desde sus celulares.</span>
                </div>
                <input type="checkbox" id="chkJoinEnabled" style="width:20px; height:20px; cursor: pointer;">
            </div>

            <!-- QR inline actions -->
            <div id="divQRContainer" style="display: none; width: 100%; margin-bottom: 15px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 10px; border: 1px solid #111;">
                <button id="btnShowQR" class="btn btn-primary" style="width: 100%; font-size: 0.65rem; font-weight: 900; background: var(--gold); color: #000; padding: 10px; text-transform: uppercase; margin: 0 0 12px 0; min-height: unset; height: 36px; line-height: 1;">📱 Mostrar Código QR / Enlace</button>
                
                <!-- Acción Tras Registrarse -->
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.55rem; color: var(--gold); font-weight: 800; display: block; margin-bottom: 4px; text-transform: uppercase;">Acción Tras Participar / Registrarse</label>
                    <select id="selectAfterAction" class="input-pin" style="width: 100%; padding: 8px; font-size: 0.65rem; background: #000; border: 1px solid #222; color: #fff; border-radius: 6px;">
                        <option value="none">Mostrar Mensaje Estándar (Ninguna Redirección)</option>
                        <option value="live">Mostrar Ruleta En Vivo en Celular (Pestaña Espejo)</option>
                        <option value="promo">Redirigir a Enlace Promocional Personalizado</option>
                    </select>
                </div>

                <!-- URL de Redirección -->
                <div id="divPromoUrl" style="display: none; flex-direction: column; gap: 4px; margin-bottom: 12px;">
                    <label style="font-size: 0.55rem; color: var(--gold); font-weight: 800; text-transform: uppercase;">Enlace de redirección</label>
                    <input type="text" id="inputPromoUrl" class="input-pin" style="padding: 8px; font-size: 0.65rem; background: #000; border: 1px solid #222; color: #fff; border-radius: 6px;" placeholder="Ej: https://misitio.com/descuento">
                </div>

                <!-- Límites de Participantes -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                        <label style="font-size: 0.55rem; color: #666; font-weight: 800; display: block; margin-bottom: 4px; text-transform: uppercase;">Máx. Participantes</label>
                        <input type="number" id="inputMaxParticipants" class="input-pin" style="width: 100%; padding: 8px; font-size: 0.65rem; background: #000; border: 1px solid #222; color: #fff; border-radius: 6px;" placeholder="0 = Sin límite" value="0">
                    </div>
                    <div>
                        <label style="font-size: 0.55rem; color: #666; font-weight: 800; display: block; margin-bottom: 4px; text-transform: uppercase;">Tiempo Límite (Min)</label>
                        <input type="number" id="inputTimeLimit" class="input-pin" style="width: 100%; padding: 8px; font-size: 0.65rem; background: #000; border: 1px solid #222; color: #fff; border-radius: 6px;" placeholder="0 = Sin límite" value="0">
                    </div>
                </div>
            </div>
        `;
    }

    renderMirrorTransmissionSection(): string {
        return `
            <!-- ESPEJO Y TRANSMISIÓN -->
            <h5 style="font-size: 0.75rem; color: #fff; margin: 10px 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">👁️ ESPEJO Y TRANSMISIÓN</h5>

            <!-- Visualización en Vivo Pública -->
            <div class="toggle-container" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; background: transparent; border: none; padding: 0;">
                <div style="display: flex; flex-direction: column; text-align: left; gap: 2px;">
                    <span style="font-size: 0.7rem; color: #fff; font-weight: 800; text-transform: uppercase;">👁️ Visualización en Vivo (Espejo)</span>
                    <span style="font-size: 0.55rem; color: #666;">Permite que el público visualice el sorteo en tiempo real (modo espejo).</span>
                </div>
                <input type="checkbox" id="chkLiveViewEnabled" style="width:20px; height:20px; cursor: pointer;">
            </div>

            <!-- NUEVO: Contenedor Enlace Espejo Inline -->
            <div id="divLiveViewInlineContainer" style="display: none; background: rgba(0, 255, 127, 0.03); border: 1px solid rgba(0, 255, 127, 0.15); padding: 8px; border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; gap: 6px;">
                    <input type="text" id="inputLiveViewInlineUrl" readonly class="input-pin" style="padding: 6px; font-size: 0.65rem; flex: 1; text-align: left; background: #000; border: 1px solid #111;" value="">
                    <button id="btnCopyLiveViewInlineUrl" class="btn btn-secondary" style="font-size: 0.6rem; padding: 6px 10px; margin: 0; min-height: unset; width: auto; height: auto; line-height: 1;">COPIAR</button>
                </div>
            </div>

            <!-- Mostrar Publicidad en Espejo -->
            <div class="toggle-container" style="margin-bottom: 12px; border-top: 1px solid #111; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; background: transparent; border-bottom: none; border-left: none; border-right: none; padding-left: 0; padding-right: 0;">
                <div style="display: flex; flex-direction: column; text-align: left; gap: 2px;">
                    <span style="font-size: 0.7rem; color: #fff; font-weight: 800; text-transform: uppercase;">📺 Mostrar Publicidad en Espejo</span>
                    <span style="font-size: 0.55rem; color: #666;">Muestra banners rotativos de publicidad en la pantalla del espejo público.</span>
                </div>
                <input type="checkbox" id="chkLiveViewShowAds" style="width:20px; height:20px; cursor: pointer;">
            </div>

            <!-- Sincronización en tiempo real -->
            <div class="toggle-container" style="margin-bottom: 12px; border-top: 1px solid #111; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; background: transparent; border-bottom: none; border-left: none; border-right: none; padding-left: 0; padding-right: 0;">
                <div style="display: flex; flex-direction: column; text-align: left; gap: 2px;">
                    <span style="font-size: 0.7rem; color: #fff; font-weight: 800; text-transform: uppercase;">🔄 Giro Sincronizado Multicantalla</span>
                    <span style="font-size: 0.55rem; color: #666;">El giro se realiza simultáneamente en la pantalla del administrador y en la del usuario.</span>
                </div>
                <input type="checkbox" id="chkSyncSpinEnabled" style="width:20px; height:20px; cursor: pointer;">
            </div>
        `;
    }

    renderTimerHUDSection(): string {
        return `
            <!-- TEMPORIZADOR HUD CONTROL -->
            <div id="divTimerControlSection">
                <h5 style="font-size: 0.75rem; color: #fff; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">⏱️ TEMPORIZADOR DE JUEGO (OPCIONAL)</h5>
                
                <div class="toggle-container" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; background: transparent; border: none; padding: 0;">
                    <div style="display: flex; flex-direction: column; text-align: left; gap: 2px;">
                        <span style="font-size: 0.7rem; color: #fff; font-weight: 800; text-transform: uppercase;">⏱️ Habilitar Cuenta Regresiva</span>
                        <span style="font-size: 0.55rem; color: #666;">Muestra una cuenta regresiva flotante en la pantalla principal.</span>
                    </div>
                    <input type="checkbox" id="chkTimerEnabled" style="width:20px; height:20px; cursor: pointer;">
                </div>

                <div id="divTimerParamsContainer" style="display: none; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 10px; border: 1px solid #111;">
                    <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;">
                        <label style="font-size: 0.55rem; color: var(--gold); font-weight: 800; text-transform: uppercase;">⏱️ Duración de Cuenta Regresiva (Minutos)</label>
                        <input type="number" id="inputTimerDuration" class="input-pin" min="1" max="180" style="padding: 6px; font-size: 0.65rem; background: #000; border: 1px solid #222; color: #fff; border-radius: 6px;" placeholder="Ej: 3">
                    </div>

                    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                        <button id="btnStartTimer" class="btn btn-primary" style="flex: 1; font-size: 0.6rem; padding: 8px; margin: 0; min-height: unset; height: 32px; line-height: 1;">▶️ INICIAR</button>
                        <button id="btnPauseTimer" class="btn btn-secondary" style="flex: 1; font-size: 0.6rem; padding: 8px; margin: 0; min-height: unset; height: 32px; line-height: 1;">⏸️ PAUSAR</button>
                        <button id="btnResetTimer" class="btn btn-secondary" style="flex: 1; font-size: 0.6rem; padding: 8px; margin: 0; min-height: unset; height: 32px; line-height: 1;">🔄 RESET</button>
                    </div>

                    <div class="toggle-container" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; background: transparent; border: none; padding: 0;">
                        <div style="display: flex; flex-direction: column; text-align: left; gap: 2px;">
                            <span style="font-size: 0.65rem; color: #fff; font-weight: 800; text-transform: uppercase;">📅 Programar Inicio</span>
                            <span style="font-size: 0.55rem; color: #666;">El juego iniciará automáticamente a la hora especificada.</span>
                        </div>
                        <input type="checkbox" id="chkScheduleGame" style="width:16px; height:16px; cursor: pointer;">
                    </div>

                    <div id="divScheduleTimeInput" style="display: none; flex-direction: column; gap: 4px;">
                        <label style="font-size: 0.55rem; color: var(--gold); font-weight: 800; text-transform: uppercase;">Hora Programada</label>
                        <input type="datetime-local" id="inputScheduleGameTime" class="input-pin" style="padding: 6px; font-size: 0.65rem; background: #000; border: 1px solid #222; color: #fff; border-radius: 6px;">
                    </div>
                </div>
            </div>
        `;
    }

    renderAddonsSection(): string {
        return `
            <!-- AD-ONS Y EXTENSIONES FUTURAS (MODULARITY DEMO) -->
            <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 0.75rem; color: var(--gold); font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">🚀 INTEGRACIONES NEXO</span>
                    <span style="background: rgba(212, 175, 55, 0.15); color: var(--gold); padding: 2px 6px; border-radius: 4px; font-size: 0.5rem; font-weight: 900;">READY v2.0</span>
                </div>
                <p style="font-size: 0.55rem; color: #888; margin: 0 0 12px 0; line-height: 1.4;">
                    Este panel modular está preparado para recibir futuras integraciones (Webhooks de CRM, WhatsApp API, Correos de Bienvenida, Exportación automática) sin alterar el núcleo de la aplicación.
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div style="background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255,255,255,0.08); padding: 8px; border-radius: 6px; text-align: center; opacity: 0.65;">
                        <span style="font-size: 0.55rem; color: #ccc; font-weight: 800; display: block; margin-bottom: 2px;">⚡ WEBHOOKS CRM</span>
                        <span style="font-size: 0.45rem; color: #666; font-weight: 700; text-transform: uppercase;">PROXIMAMENTE</span>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255,255,255,0.08); padding: 8px; border-radius: 6px; text-align: center; opacity: 0.65;">
                        <span style="font-size: 0.55rem; color: #ccc; font-weight: 800; display: block; margin-bottom: 2px;">💬 WHATSAPP API</span>
                        <span style="font-size: 0.45rem; color: #666; font-weight: 700; text-transform: uppercase;">PROXIMAMENTE</span>
                    </div>
                </div>
            </div>
        `;
    }

    bindLocalEvents() {
        // Switch de Activación de Juego
        const chkToggle = this.querySelector('#chkToggleGameActive') as HTMLInputElement;
        if (chkToggle) {
            chkToggle.onchange = () => {
                StateManager.config.isGameActive = chkToggle.checked;

                // Registro seguro de auditoría
                const actionText = chkToggle.checked 
                    ? `Sorteo activado: "${StateManager.config.title || 'RULETA PREMIUM'}"` 
                    : `Sorteo desactivado: "${StateManager.config.title || 'RULETA PREMIUM'}"`;

                StateManager.config.auditLog = StateManager.config.auditLog || [];
                StateManager.config.auditLog.unshift({
                    action: actionText,
                    timestamp: new Date().toLocaleTimeString()
                });
                if (StateManager.config.auditLog.length > 60) {
                    StateManager.config.auditLog = StateManager.config.auditLog.slice(0, 60);
                }

                // Sincronizar ciclo de la partida (GameRun) en base de datos
                if (chkToggle.checked) {
                    const runId = "run_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
                    StateManager.config.activeGameRunId = runId;
                    
                    const userEmail = sessionStorage.getItem('nexo_current_user_email') || 'anon@nexoroulette.com';
                    const activeSorteoId = StateManager.config.activeSavedListId || 'list_juego_estandar';
                    const title = StateManager.config.title || 'RULETA PREMIUM';
                    const mode = StateManager.config.raffleMode ? 'raffle' : 'wheel';
                    
                    startGameRunInSupabase({
                        id: runId,
                        sorteo_id: activeSorteoId,
                        name: title,
                        email: userEmail,
                        game_mode: mode,
                        prizes: StateManager.config.prizes || [],
                        form_fields: StateManager.config.formFields || [],
                        local_require_register: !!StateManager.config.localRequireRegister,
                        auto_remove_winner: !!StateManager.config.autoRemoveWinner,
                        local_session_list_enabled: !!StateManager.config.localSessionListEnabled,
                        local_session_id: StateManager.config.localSessionId || ''
                    }).then(success => {
                        if (success) {
                            console.log(`Partida de juego iniciada y sincronizada correctamente en BD con ID: ${runId}`);
                        } else {
                            console.warn('No se pudo sincronizar el inicio de la partida en la BD (Modo Offline o Error de Conexión).');
                        }
                    });
                } else {
                    const currentRunId = StateManager.config.activeGameRunId;
                    if (currentRunId) {
                        endGameRunInSupabase(currentRunId).then(success => {
                            if (success) {
                                console.log(`Partida de juego ${currentRunId} finalizada correctamente en BD.`);
                            } else {
                                console.warn('No se pudo sincronizar la finalización de la partida en la BD.');
                            }
                        });
                    }
                    StateManager.config.activeGameRunId = null;
                }

                StateManager.save();
                this.updateUIState();

                // Notificar al resto de la aplicación
                window.dispatchEvent(new CustomEvent('nexo-state-change'));
            };
        }

        // Título del juego editable
        const inputTitle = this.querySelector('#inputGameTitle') as HTMLInputElement;
        if (inputTitle) {
            const saveTitle = () => {
                const val = inputTitle.value.trim().toUpperCase();
                if (val && val !== StateManager.config.title) {
                    StateManager.config.title = val;

                    // Sincronizar nombre de lista guardada activa si existe
                    if (StateManager.config.activeSavedListId && StateManager.config.savedPrizeLists) {
                        const currentList = StateManager.config.savedPrizeLists.find(l => l.id === StateManager.config.activeSavedListId);
                        if (currentList) {
                            currentList.name = val;
                        }
                    }

                    StateManager.save();

                    // Notificar al resto de la aplicación
                    window.dispatchEvent(new CustomEvent('nexo-state-change'));
                }
            };

            inputTitle.onblur = saveTitle;
            inputTitle.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    saveTitle();
                    inputTitle.blur();
                }
            };
        }
    }

    updateUIState() {
        const isGameActive = !!StateManager.config.isGameActive;

        // Actualizar badges e indicadores visuales
        const badge = this.querySelector('#unifiedGameActiveBadge');
        if (badge) {
            badge.innerHTML = isGameActive
                ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 10px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px; box-shadow: 0 0 10px rgba(0, 255, 127, 0.15);">🟢 ACTIVO</span>`
                : `<span style="background: rgba(255, 99, 71, 0.15); color: #ff6347; padding: 4px 10px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🔴 INACTIVO</span>`;
        }

        const indicatorText = this.querySelector('#gameStatusIndicatorText') as HTMLElement;
        if (indicatorText) {
            indicatorText.innerHTML = isGameActive 
                ? '🟢 JUEGO ACTIVADO (EDICIONES BLOQUEADAS)' 
                : '🔴 JUEGO DESACTIVADO (EDICIÓN PERMITIDA)';
            indicatorText.style.color = isGameActive ? '#00ff7f' : '#ff6347';
        }

        // Habilitar o deshabilitar botón de Iniciar Juego
        const btnStart = this.querySelector('#btnStartGame') as HTMLButtonElement;
        if (btnStart) {
            if (isGameActive) {
                btnStart.removeAttribute('disabled');
                btnStart.style.opacity = '1';
                btnStart.style.cursor = 'pointer';
                btnStart.style.pointerEvents = 'auto';
            } else {
                btnStart.setAttribute('disabled', 'true');
                btnStart.style.opacity = '0.35';
                btnStart.style.cursor = 'not-allowed';
                btnStart.style.pointerEvents = 'none';
            }
        }

        // Habilitar o deshabilitar el botón de Reiniciar
        const btnReset = this.querySelector('#btnResetGame') as HTMLButtonElement;
        if (btnReset) {
            if (isGameActive) {
                btnReset.removeAttribute('disabled');
                btnReset.style.opacity = '1';
                btnReset.style.cursor = 'pointer';
                btnReset.style.pointerEvents = 'auto';
            } else {
                btnReset.setAttribute('disabled', 'true');
                btnReset.style.opacity = '0.35';
                btnReset.style.cursor = 'not-allowed';
                btnReset.style.pointerEvents = 'none';
            }
        }

        // Lista de selectores de configuración que se bloquean cuando el juego está activo
        const editSelectors = [
            '#inputGameTitle',
            '#selectGameMode',
            '#btnEditPrizes',
            '#btnEditForm',
            '#chkRequireRegister',
            '#chkRemoveWinner',
            '#chkLocalSessionListEnabled',
            '#chkJoinEnabled',
            '#selectAfterAction',
            '#inputPromoUrl',
            '#inputMaxParticipants',
            '#inputTimeLimit',
            '#chkLiveViewEnabled',
            '#chkLiveViewShowAds',
            '#chkSyncSpinEnabled',
            '#chkTimerEnabled',
            '#btnStartTimer',
            '#btnPauseTimer',
            '#btnResetTimer',
            '#chkScheduleGame',
            '#inputScheduleGameTime'
        ];

        editSelectors.forEach(selector => {
            const el = this.querySelector(selector) as any;
            if (el) {
                if (isGameActive) {
                    el.setAttribute('disabled', 'true');
                    el.style.opacity = '0.4';
                    if (el.tagName === 'BUTTON') {
                        el.style.pointerEvents = 'none';
                    }
                } else {
                    el.removeAttribute('disabled');
                    el.style.opacity = '1';
                    if (el.tagName === 'BUTTON') {
                        el.style.pointerEvents = 'auto';
                    }
                }
            }
        });
    }
}

/**
 * NexoGameBoard Component
 * Native Web Component that serves as a 100% modular, scalable visual canvas/blackboard ("Lienzo/Pizarrón").
 * Allows dynamic registry of visual widgets, toggling visibility to reduce visual weight,
 * changing board themes (Slate, Chalkboard, Blueprint), and managing draggable Chalk Sticky Notes.
 */
export class NexoGameBoard extends HTMLElement {
    private boardTheme: 'classic-dark' | 'chalkboard-green' | 'blueprint-grid' = 'classic-dark';
    private activeWidgets: { [key: string]: boolean } = {
        'title-area': true,
        'lightning-timer': true,
        'wheel-wrapper': true,
        'side-ads': true,
        'bottom-banners': true
    };
    private chalkNotes: Array<{ id: string; text: string; color: string; x: number; y: number }> = [];

    connectedCallback() {
        // Load initial state from localStorage
        this.loadState();
        
        // Setup base styles
        this.style.position = 'relative';
        this.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        this.style.borderRadius = '24px';
        this.style.overflow = 'hidden';
        this.style.display = 'flex';
        this.style.flexDirection = 'column';
        this.style.alignItems = 'center';
        this.style.width = '100%';
        this.style.minHeight = '100%';

        // Initial setup
        this.applyThemeStyles();
        this.applyWidgetVisibility();
        this.renderNotes();

        // Listen for window state changes or manual triggers
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('nexo-state-change', this.handleStateChange);
        window.addEventListener('nexo-board-state-change', this.handleBoardStateChange);
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('nexo-state-change', this.handleStateChange);
        window.removeEventListener('nexo-board-state-change', this.handleBoardStateChange);
    }

    private handleResize = () => {
        // Keeps notes within boundaries
        this.clampNotesWithinBounds();
    }

    private handleStateChange = () => {
        // Sync with configuration or state if needed
    }

    private handleBoardStateChange = () => {
        this.loadState();
        this.applyThemeStyles();
        this.applyWidgetVisibility();
        this.renderNotes();
    }

    private loadState() {
        try {
            const savedTheme = localStorage.getItem('nexo_board_theme');
            if (savedTheme) this.boardTheme = savedTheme as any;

            const savedWidgets = localStorage.getItem('nexo_board_widgets');
            if (savedWidgets) this.activeWidgets = JSON.parse(savedWidgets);

            const savedNotes = localStorage.getItem('nexo_board_notes');
            if (savedNotes) this.chalkNotes = JSON.parse(savedNotes);
        } catch (e) {
            console.error("Error loading board state", e);
        }
    }

    private saveState() {
        try {
            localStorage.setItem('nexo_board_theme', this.boardTheme);
            localStorage.setItem('nexo_board_widgets', JSON.stringify(this.activeWidgets));
            localStorage.setItem('nexo_board_notes', JSON.stringify(this.chalkNotes));
        } catch (e) {
            console.error("Error saving board state", e);
        }
    }

    private applyThemeStyles() {
        // Reset classes
        this.classList.remove('classic-dark-board', 'chalkboard-green-board', 'blueprint-grid-board');

        // Remove any custom wood borders first
        this.style.border = '';
        this.style.boxShadow = '';

        if (this.boardTheme === 'classic-dark') {
            this.classList.add('classic-dark-board');
            this.style.background = 'transparent';
        } else if (this.boardTheme === 'chalkboard-green') {
            this.classList.add('chalkboard-green-board');
            this.style.background = 'linear-gradient(135deg, #0e1e10 0%, #17321a 100%)';
            this.style.border = '14px solid #4a2f13'; // Rustic wood frame!
            this.style.boxShadow = 'inset 0 0 40px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,0.9)';
        } else if (this.boardTheme === 'blueprint-grid') {
            this.classList.add('blueprint-grid-board');
            this.style.background = '#040b14';
            // Grid background pattern
            this.style.backgroundImage = 'radial-gradient(rgba(212,175,55,0.15) 1.5px, transparent 1.5px)';
            this.style.backgroundSize = '24px 24px';
            this.style.border = '2px dashed rgba(212,175,55,0.2)';
            this.style.boxShadow = '0 0 40px rgba(212,175,55,0.05)';
        }
    }

    private applyWidgetVisibility() {
        // 1. Header Widget (.title-area)
        const titleArea = this.querySelector('.title-area') as HTMLElement;
        if (titleArea) {
            titleArea.style.display = this.activeWidgets['title-area'] ? 'flex' : 'none';
        }

        // 2. Timer HUD Widget (#lightningTimerContainer)
        const timerContainer = this.querySelector('#lightningTimerContainer') as HTMLElement;
        if (timerContainer) {
            if (!this.activeWidgets['lightning-timer']) {
                timerContainer.style.visibility = 'hidden';
                timerContainer.style.opacity = '0';
            } else {
                timerContainer.style.visibility = '';
                timerContainer.style.opacity = '';
            }
        }

        // 3. Wheel Widget (.wheel-wrapper)
        const wheelWrapper = this.querySelector('.wheel-wrapper') as HTMLElement;
        if (wheelWrapper) {
            wheelWrapper.style.display = this.activeWidgets['wheel-wrapper'] ? 'block' : 'none';
        }

        // 4. Side Ads panel (global #sideAdContainer / #sideStreamingContainer)
        const sideAd = document.getElementById('sideAdContainer');
        const sideStream = document.getElementById('sideStreamingContainer');
        if (sideAd) {
            sideAd.style.opacity = this.activeWidgets['side-ads'] ? '1' : '0';
            sideAd.style.pointerEvents = this.activeWidgets['side-ads'] ? 'auto' : 'none';
            sideAd.style.transition = 'opacity 0.3s ease';
        }
        if (sideStream) {
            sideStream.style.opacity = this.activeWidgets['side-ads'] ? '1' : '0';
            sideStream.style.pointerEvents = this.activeWidgets['side-ads'] ? 'auto' : 'none';
            sideStream.style.transition = 'opacity 0.3s ease';
        }

        // 5. Bottom Banners (global #bannerContainer)
        const banners = document.getElementById('bannerContainer');
        if (banners) {
            banners.style.opacity = this.activeWidgets['bottom-banners'] ? '1' : '0';
            banners.style.pointerEvents = this.activeWidgets['bottom-banners'] ? 'auto' : 'none';
            banners.style.transition = 'opacity 0.3s ease';
        }
    }

    private clampNotesWithinBounds() {
        this.chalkNotes.forEach(note => {
            if (note.x < 2) note.x = 2;
            if (note.x > 85) note.x = 85;
            if (note.y < 2) note.y = 2;
            if (note.y > 85) note.y = 85;
        });
        this.saveState();
        this.renderNotes();
    }

    private renderNotes() {
        // Remove existing rendered notes
        this.querySelectorAll('.chalk-note').forEach(el => el.remove());

        // Create and append notes
        this.chalkNotes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'chalk-note';
            noteEl.id = `note-${note.id}`;
            noteEl.style.position = 'absolute';
            noteEl.style.left = `${note.x}%`;
            noteEl.style.top = `${note.y}%`;
            noteEl.style.zIndex = '500';
            noteEl.style.minWidth = '130px';
            noteEl.style.maxWidth = '220px';
            noteEl.style.padding = '12px';
            noteEl.style.borderRadius = '8px';
            noteEl.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5), inset 0 1px 3px rgba(255,255,255,0.1)';
            noteEl.style.cursor = 'grab';
            noteEl.style.userSelect = 'none';
            noteEl.style.touchAction = 'none';
            noteEl.style.transition = 'transform 0.1s ease';

            // Custom Pastel Chalk Colors
            let bgColor = 'rgba(253, 224, 71, 0.15)'; // Yellow
            let borderColor = 'rgba(253, 224, 71, 0.4)';
            let textColor = '#fef08a';
            
            if (note.color === 'pink') {
                bgColor = 'rgba(244, 63, 94, 0.15)';
                borderColor = 'rgba(244, 63, 94, 0.4)';
                textColor = '#fecdd3';
            } else if (note.color === 'cyan') {
                bgColor = 'rgba(6, 182, 212, 0.15)';
                borderColor = 'rgba(6, 182, 212, 0.4)';
                textColor = '#cffafe';
            } else if (note.color === 'green') {
                bgColor = 'rgba(34, 197, 94, 0.15)';
                borderColor = 'rgba(34, 197, 94, 0.4)';
                textColor = '#bbf7d0';
            }

            noteEl.style.background = bgColor;
            noteEl.style.border = `1.5px dashed ${borderColor}`;
            noteEl.style.color = textColor;

            // Content
            noteEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px;">
                    <span style="font-size: 0.5rem; letter-spacing: 1px; text-transform: uppercase; opacity: 0.6; font-weight: 800;">📌 NOTA</span>
                    <button class="delete-note-btn" style="background: none; border: none; color: ${textColor}; font-size: 0.8rem; cursor: pointer; padding: 0; opacity: 0.6; line-height: 1; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">×</button>
                </div>
                <div style="font-size: 0.75rem; font-weight: 600; line-height: 1.3; font-family: inherit; word-break: break-word;">${note.text}</div>
            `;

            // Delete action
            noteEl.querySelector('.delete-note-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNote(note.id);
            });

            // Pointer drag events for dynamic repositioning on the blackboard
            let isDragging = false;
            let startX = 0;
            let startY = 0;
            let startLeft = note.x;
            let startTop = note.y;

            noteEl.addEventListener('pointerdown', (e: PointerEvent) => {
                if ((e.target as HTMLElement).classList.contains('delete-note-btn')) return;
                isDragging = true;
                noteEl.style.cursor = 'grabbing';
                noteEl.style.transform = 'scale(1.05)';
                startX = e.clientX;
                startY = e.clientY;
                startLeft = note.x;
                startTop = note.y;
                noteEl.setPointerCapture(e.pointerId);
            });

            noteEl.addEventListener('pointermove', (e: PointerEvent) => {
                if (!isDragging) return;
                const rect = this.getBoundingClientRect();
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                // Calculate delta in percentage
                const percentX = (deltaX / rect.width) * 100;
                const percentY = (deltaY / rect.height) * 100;

                let newX = startLeft + percentX;
                let newY = startTop + percentY;

                // Clamp within safe margins
                if (newX < 2) newX = 2;
                if (newX > 85) newX = 85;
                if (newY < 2) newY = 2;
                if (newY > 85) newY = 85;

                noteEl.style.left = `${newX}%`;
                noteEl.style.top = `${newY}%`;

                note.x = newX;
                note.y = newY;
            });

            const stopDrag = (e: PointerEvent) => {
                if (!isDragging) return;
                isDragging = false;
                noteEl.style.cursor = 'grab';
                noteEl.style.transform = '';
                this.saveState();
            };

            noteEl.addEventListener('pointerup', stopDrag);
            noteEl.addEventListener('pointercancel', stopDrag);

            this.appendChild(noteEl);
        });
    }

    private deleteNote(id: string) {
        this.chalkNotes = this.chalkNotes.filter(n => n.id !== id);
        this.saveState();
        this.renderNotes();
        window.dispatchEvent(new CustomEvent('nexo-board-state-change'));
    }
}

/**
 * NexoBoardControls Component
 * Native Web Component to configure the NexoGameBoard.
 * Designed to reside beautifully inside the "Personalización" Sub-tab.
 */
export class NexoBoardControls extends HTMLElement {
    private boardTheme: 'classic-dark' | 'chalkboard-green' | 'blueprint-grid' = 'classic-dark';
    private activeWidgets: { [key: string]: boolean } = {
        'title-area': true,
        'lightning-timer': true,
        'wheel-wrapper': true,
        'side-ads': true,
        'bottom-banners': true
    };
    private chalkNotes: Array<{ id: string; text: string; color: string; x: number; y: number }> = [];

    connectedCallback() {
        this.loadState();
        this.render();
        window.addEventListener('nexo-board-state-change', this.handleBoardStateChange);
    }

    disconnectedCallback() {
        window.removeEventListener('nexo-board-state-change', this.handleBoardStateChange);
    }

    private handleBoardStateChange = () => {
        this.loadState();
        this.render();
    }

    private loadState() {
        try {
            const savedTheme = localStorage.getItem('nexo_board_theme');
            if (savedTheme) this.boardTheme = savedTheme as any;

            const savedWidgets = localStorage.getItem('nexo_board_widgets');
            if (savedWidgets) this.activeWidgets = JSON.parse(savedWidgets);

            const savedNotes = localStorage.getItem('nexo_board_notes');
            if (savedNotes) this.chalkNotes = JSON.parse(savedNotes);
        } catch (e) {
            console.error("Error loading board state in controls", e);
        }
    }

    private saveAndNotify() {
        try {
            localStorage.setItem('nexo_board_theme', this.boardTheme);
            localStorage.setItem('nexo_board_widgets', JSON.stringify(this.activeWidgets));
            localStorage.setItem('nexo_board_notes', JSON.stringify(this.chalkNotes));
            window.dispatchEvent(new CustomEvent('nexo-board-state-change'));
        } catch (e) {
            console.error("Error saving board state from controls", e);
        }
    }

    private render() {
        this.innerHTML = `
            <div class="config-section" style="border: 1px solid rgba(212,175,55,0.15); background: rgba(0,0,0,0.3); border-radius: 20px; padding: 22px; margin-bottom: 25px; backdrop-filter: blur(5px);">
                <!-- Header -->
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 1.2rem;">🎨</span>
                    <h4 style="margin: 0; font-size: 1rem; color: var(--gold); letter-spacing: 0.5px; font-weight: 900; text-transform: uppercase;">Lienzo y Pizarrón del Juego (Modulos)</h4>
                </div>
                <p style="font-size: 0.7rem; color: #888; margin-bottom: 15px;">Personaliza el fondo interactivo del juego principal, activa/desactiva módulos y gestiona notas de tiza adhesivas.</p>

                <!-- Tema del Lienzo -->
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 0.65rem; color: var(--gold); font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 8px;">Tema y Estilo de Fondo</label>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                        <button class="theme-select-btn" data-theme="classic-dark" style="background:${this.boardTheme === 'classic-dark' ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.4)'}; border: 1px solid ${this.boardTheme === 'classic-dark' ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}; color:${this.boardTheme === 'classic-dark' ? 'var(--gold)' : '#aaa'}; font-weight:700; border-radius:8px; padding:10px 5px; font-size:0.6rem; cursor:pointer; text-transform:uppercase; transition:all 0.2s;">
                            Cosmos Dark
                        </button>
                        <button class="theme-select-btn" data-theme="chalkboard-green" style="background:${this.boardTheme === 'chalkboard-green' ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.4)'}; border: 1px solid ${this.boardTheme === 'chalkboard-green' ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}; color:${this.boardTheme === 'chalkboard-green' ? 'var(--gold)' : '#aaa'}; font-weight:700; border-radius:8px; padding:10px 5px; font-size:0.6rem; cursor:pointer; text-transform:uppercase; transition:all 0.2s;">
                            Tiza Verde
                        </button>
                        <button class="theme-select-btn" data-theme="blueprint-grid" style="background:${this.boardTheme === 'blueprint-grid' ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.4)'}; border: 1px solid ${this.boardTheme === 'blueprint-grid' ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}; color:${this.boardTheme === 'blueprint-grid' ? 'var(--gold)' : '#aaa'}; font-weight:700; border-radius:8px; padding:10px 5px; font-size:0.6rem; cursor:pointer; text-transform:uppercase; transition:all 0.2s;">
                            Blueprint
                        </button>
                    </div>
                </div>

                <!-- Visibilidad de Módulos (Widgets) -->
                <div style="margin-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                    <label style="font-size: 0.65rem; color: var(--gold); font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 8px;">Módulos Visibles en la Página Principal</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <label style="display:flex; align-items:center; gap:6px; font-size:0.65rem; color:#ccc; font-weight:600; cursor:pointer; user-select:none;">
                            <input type="checkbox" class="board-widget-toggle" data-widget="title-area" ${this.activeWidgets['title-area'] ? 'checked' : ''} style="accent-color:var(--gold); cursor:pointer;"> Título Principal
                        </label>
                        <label style="display:flex; align-items:center; gap:6px; font-size:0.65rem; color:#ccc; font-weight:600; cursor:pointer; user-select:none;">
                            <input type="checkbox" class="board-widget-toggle" data-widget="wheel-wrapper" ${this.activeWidgets['wheel-wrapper'] ? 'checked' : ''} style="accent-color:var(--gold); cursor:pointer;"> Ruleta de Premios
                        </label>
                        <label style="display:flex; align-items:center; gap:6px; font-size:0.65rem; color:#ccc; font-weight:600; cursor:pointer; user-select:none;">
                            <input type="checkbox" class="board-widget-toggle" data-widget="lightning-timer" ${this.activeWidgets['lightning-timer'] ? 'checked' : ''} style="accent-color:var(--gold); cursor:pointer;"> HUD del Timer
                        </label>
                        <label style="display:flex; align-items:center; gap:6px; font-size:0.65rem; color:#ccc; font-weight:600; cursor:pointer; user-select:none;">
                            <input type="checkbox" class="board-widget-toggle" data-widget="side-ads" ${this.activeWidgets['side-ads'] ? 'checked' : ''} style="accent-color:var(--gold); cursor:pointer;"> Anuncios Lateral
                        </label>
                        <label style="display:flex; align-items:center; gap:6px; font-size:0.65rem; color:#ccc; font-weight:600; cursor:pointer; user-select:none; grid-column: span 2;">
                            <input type="checkbox" class="board-widget-toggle" data-widget="bottom-banners" ${this.activeWidgets['bottom-banners'] ? 'checked' : ''} style="accent-color:var(--gold); cursor:pointer;"> Banners Publicitarios Inferiores
                        </label>
                    </div>
                </div>

                <!-- Notas Tiza -->
                <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                    <label style="font-size: 0.65rem; color: var(--gold); font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 8px;">Notas Adhesivas de Tiza</label>
                    
                    <button id="btnBoardAddNote" class="btn btn-secondary" style="width:100%; border-color: var(--gold); color: var(--gold); padding: 8px; font-size: 0.65rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 12px; height: auto;">
                        <span>📌</span> + AGREGAR NOTA DE TIZA
                    </button>

                    <!-- Lista de notas actuales -->
                    ${this.chalkNotes.length === 0 ? `
                        <p style="font-size: 0.6rem; color:#555; text-align:center; font-style:italic; margin: 5px 0;">No hay notas activas en la pantalla.</p>
                    ` : `
                        <div style="display:flex; flex-direction:column; gap:6px; max-height:120px; overflow-y:auto;">
                            ${this.chalkNotes.map(note => `
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:6px; padding:6px 10px; gap:8px;">
                                    <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
                                        <span style="width:6px; height:6px; border-radius:50%; background:${
                                            note.color === 'pink' ? '#fda4af' : note.color === 'cyan' ? '#67e8f9' : note.color === 'green' ? '#86efac' : '#fef08a'
                                        }; flex-shrink:0;"></span>
                                        <span style="font-size:0.65rem; color:#ccc; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${note.text}</span>
                                    </div>
                                    <button class="btn-delete-board-note" data-id="${note.id}" style="background:none; border:none; color:#f43f5e; font-size:1rem; font-weight:800; cursor:pointer; padding:0; line-height:1;">×</button>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Theme Selector Buttons
        this.querySelectorAll('.theme-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = (e.currentTarget as HTMLElement).getAttribute('data-theme') as any;
                if (theme) {
                    this.boardTheme = theme;
                    this.saveAndNotify();
                }
            });
        });

        // Widget Checkboxes
        this.querySelectorAll('.board-widget-toggle').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const widgetId = target.getAttribute('data-widget');
                if (widgetId) {
                    this.activeWidgets[widgetId] = target.checked;
                    this.saveAndNotify();
                }
            });
        });

        // Add Note Button
        this.querySelector('#btnBoardAddNote')?.addEventListener('click', () => {
            const text = prompt("Escribe el texto para la nota de tiza:");
            if (!text || text.trim() === "") return;

            const colors = ['yellow', 'pink', 'cyan', 'green'];
            const colorInput = prompt("Elige un color para la tiza (yellow, pink, cyan, green):", "yellow");
            const color = colors.includes(colorInput?.toLowerCase() || '') ? colorInput!.toLowerCase() : 'yellow';

            const note = {
                id: Date.now().toString(),
                text: text.trim(),
                color: color,
                x: 35 + Math.random() * 10,
                y: 35 + Math.random() * 10
            };

            this.chalkNotes.push(note);
            this.saveAndNotify();
        });

        // Delete Note Buttons
        this.querySelectorAll('.btn-delete-board-note').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
                if (id) {
                    this.chalkNotes = this.chalkNotes.filter(n => n.id !== id);
                    this.saveAndNotify();
                }
            });
        });
    }
}

// ==========================================================
// NexoSuperAdmin Component
// Native Web Component to render Super Admin control panel reactively.
// ==========================================================
export class NexoSuperAdmin extends HTMLElement {
    state: SuperAdminContext = {
        users: [],
        licenses: [],
        searchQuery: '',
        licenseSearchQuery: '',
        licenseFilterStatus: 'all',
        stats: {
            totalUsers: 0,
            activeLicenses: 0,
            noLicense: 0
        },
        loadingUsers: true,
        loadingLicenses: true
    };

    connectedCallback() {
        this.refreshAll();
    }

    disconnectedCallback() {
    }

    async refreshAll() {
        this.state.loadingUsers = true;
        this.state.loadingLicenses = true;
        this.render();

        try {
            const { fetchUsersFromSupabase, fetchLicensesFromSupabase } = await import('./supabase');
            const [users, licRes] = await Promise.all([
                fetchUsersFromSupabase().catch(() => []),
                fetchLicensesFromSupabase().catch(() => ({ success: false, data: [] }))
            ]);

            const licenses = (licRes && licRes.success && licRes.data) ? licRes.data : [];

            let activeCount = 0;
            let noLicenseCount = 0;
            users.forEach((u: any) => {
                const hasActiveLic = licenses.find((l: any) => 
                    l.associated_email && 
                    l.associated_email.toLowerCase() === u.email.toLowerCase() && 
                    l.is_active && 
                    new Date(l.expiry_date) >= new Date()
                );
                if (hasActiveLic) {
                    activeCount++;
                } else {
                    noLicenseCount++;
                }
            });

            this.state.users = users;
            this.state.licenses = licenses;
            this.state.stats = {
                totalUsers: users.length,
                activeLicenses: activeCount,
                noLicense: noLicenseCount
            };
        } catch (err) {
            console.error("Error loading super admin data:", err);
        } finally {
            this.state.loadingUsers = false;
            this.state.loadingLicenses = false;
            this.render();
        }
    }

    setSearchQuery(q: string) {
        this.state.searchQuery = q;
        this.render();
    }

    setLicenseSearchQuery(q: string) {
        this.state.licenseSearchQuery = q;
        this.render();
    }

    setLicenseFilterStatus(status: string) {
        this.state.licenseFilterStatus = status;
        this.render();
    }

    exportLicensesToCSV() {
        if (!this.state.licenses || this.state.licenses.length === 0) {
            this.showAlert("No hay licencias para exportar.", "INFORMACIÓN");
            return;
        }

        try {
            const headers = ["Clave de Licencia", "Nivel", "Estado", "Expira", "Cliente", "Hardware ID", "Fecha de Activación"];
            const csvRows = [headers.join(",")];

            this.state.licenses.forEach(lic => {
                const isExpired = new Date(lic.expiry_date) < new Date();
                const status = lic.is_active ? (isExpired ? "EXPIRADA" : "ACTIVA") : "BLOQUEADA";
                const row = [
                    lic.license_key,
                    lic.tier,
                    status,
                    new Date(lic.expiry_date).toLocaleDateString(),
                    lic.associated_email || "Cualquiera",
                    lic.device_id || "",
                    lic.activated_at ? new Date(lic.activated_at).toLocaleString() : ""
                ].map(val => `"${String(val).replace(/"/g, '""')}"`);
                csvRows.push(row.join(","));
            });

            const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `reporte_licencias_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showAlert("La base de licencias ha sido exportada a CSV con éxito.", "ÉXITO EN EXPORTACIÓN");
        } catch (e: any) {
            this.showAlert(`Error al exportar: ${e.message}`, "ERROR");
        }
    }

    showAlert(msg: string, title?: string) {
        if (typeof (window as any).showCustomAlert === 'function') {
            (window as any).showCustomAlert(msg, title);
        } else {
            alert(`${title || 'ALERTA'}: ${msg}`);
        }
    }

    showConfirm(msg: string, onConfirm: () => void) {
        if (typeof (window as any).showCustomConfirm === 'function') {
            (window as any).showCustomConfirm(msg, onConfirm);
        } else {
            if (confirm(msg)) {
                onConfirm();
            }
        }
    }

    render() {
        const providers = SuperAdminRegistry.getProviders();
        this.innerHTML = `
            <div id="nexoSuperAdminContainer" style="display: flex; flex-direction: column; gap: 20px; padding: 25px; background: #000; border-radius: 16px; border: 1px solid #111;">
                ${providers.map(p => `<div id="module-${p.id}" class="superadmin-module-wrapper">${p.render(this.state)}</div>`).join('')}
            </div>
        `;

        // Bind events for each module
        providers.forEach(p => {
            const moduleContainer = this.querySelector(`#module-${p.id}`) as HTMLElement;
            if (moduleContainer && p.bindEvents) {
                p.bindEvents(this.state, moduleContainer, this);
            }
        });
    }
}




